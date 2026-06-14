import json
import logging
from typing import Any

import requests

logger = logging.getLogger(__name__)

DDG_MAX_RETRIES = 2

def _search_duckduckgo(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    from ddgs import DDGS

    for attempt in range(DDG_MAX_RETRIES):
        try:
            with DDGS() as ddgs:
                results: list[dict[str, Any]] = []
                for i, r in enumerate(ddgs.text(query, max_results=max_results)):
                    if i >= max_results:
                        break
                    results.append({
                        "url": r.get("href", ""),
                        "title": r.get("title", ""),
                        "snippet": r.get("body", ""),
                        "status": "done",
                    })
                return results if results else _search_duckduckgo_lite(query, max_results)
        except Exception:
            if attempt == DDG_MAX_RETRIES - 1:
                logger.warning("DuckDuckGo HTML fallback after exception")
                return _search_duckduckgo_lite(query, max_results)


def _search_duckduckgo_lite(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        params = {"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"}
        resp = requests.get(
            "https://api.duckduckgo.com/",
            params=params,
            timeout=10,
            headers={"User-Agent": "GeoAgents/1.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        results: list[dict[str, Any]] = []
        for topic in data.get("RelatedTopics", []):
            if "Text" in topic and "FirstURL" in topic:
                results.append({
                    "url": topic["FirstURL"],
                    "title": topic.get("Text", "").split(" - ")[0],
                    "snippet": topic.get("Text", ""),
                    "status": "done",
                })
                if len(results) >= max_results:
                    break
            if "Topics" in topic:
                for sub in topic["Topics"]:
                    if "Text" in sub and "FirstURL" in sub:
                        results.append({
                            "url": sub["FirstURL"],
                            "title": sub.get("Text", "").split(" - ")[0],
                            "snippet": sub.get("Text", ""),
                            "status": "done",
                        })
                        if len(results) >= max_results:
                            break
        return results
    except Exception as e:
        logger.warning("DuckDuckGo Lite fallback failed: %s", e)
        return []


def _search_google(query: str, api_key: str, cse_id: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        resp = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={
                "key": api_key,
                "cx": cse_id,
                "q": query,
                "num": min(max_results, 10),
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return [
            {
                "url": item.get("link", ""),
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "status": "done",
            }
            for item in data.get("items", [])
        ]
    except Exception as e:
        logger.warning("Google search failed: %s", e)
        raise


def _search_bing(query: str, api_key: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        resp = requests.get(
            "https://api.bing.microsoft.com/v7.0/search",
            params={"q": query, "count": max_results},
            headers={"Ocp-Apim-Subscription-Key": api_key},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return [
            {
                "url": item.get("url", ""),
                "title": item.get("name", ""),
                "snippet": item.get("snippet", ""),
                "status": "done",
            }
            for item in data.get("webPages", {}).get("value", [])
        ]
    except Exception as e:
        logger.warning("Bing search failed: %s", e)
        raise


def _search_serpapi(query: str, api_key: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        resp = requests.get(
            "https://serpapi.com/search",
            params={
                "q": query,
                "api_key": api_key,
                "engine": "google",
                "num": max_results,
            },
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        return [
            {
                "url": item.get("link", ""),
                "title": item.get("title", ""),
                "snippet": item.get("snippet", ""),
                "status": "done",
            }
            for item in data.get("organic_results", [])
        ]
    except Exception as e:
        logger.warning("SerpAPI search failed: %s", e)
        raise


PROVIDERS = {
    "duckduckgo": _search_duckduckgo,
    "google": _search_google,
    "bing": _search_bing,
    "serpapi": _search_serpapi,
}

DEFAULT_PROVIDER = "duckduckgo"


def search_web(
    query: str,
    provider: str = DEFAULT_PROVIDER,
    api_key: str | None = None,
    cse_id: str | None = None,
    max_results: int = 10,
) -> list[dict[str, Any]]:
    provider = provider or DEFAULT_PROVIDER

    if provider not in PROVIDERS:
        error_msg = f"Proveedor de busqueda desconocido: {provider}. Usa: {', '.join(PROVIDERS)}"
        logger.error(error_msg)
        return [{"url": "", "title": error_msg, "snippet": "", "status": "done"}]

    fn = PROVIDERS[provider]

    try:
        if provider == "google":
            if not api_key:
                raise ValueError("Google requires api_key")
            results = fn(query, api_key, cse_id or "default", max_results)
        elif provider in ("bing", "serpapi"):
            if not api_key:
                raise ValueError(f"{provider} requires api_key")
            results = fn(query, api_key, max_results)
        else:
            results = fn(query, max_results)

        if results:
            return results
    except Exception as e:
        logger.warning("Primary provider %s failed: %s. Falling back to DuckDuckGo.", provider, e)

    # Fallback: DuckDuckGo (no API key needed)
    if provider != DEFAULT_PROVIDER:
        logger.info("Fallback to DuckDuckGo")
        return search_web(query, provider=DEFAULT_PROVIDER, max_results=max_results)

    return []


def search_web_deep(
    query: str,
    provider: str = DEFAULT_PROVIDER,
    api_key: str | None = None,
    cse_id: str | None = None,
    max_results: int = 20,
) -> list[dict[str, Any]]:
    """Multi-query deep search — runs multiple related queries and deduplicates by URL."""
    queries = [
        query,
        f"{query} tutorial guía",
        f"{query} documentación oficial",
    ]
    all_results: list[dict[str, Any]] = []
    seen_urls: set[str] = set()
    per_query = max(max_results // len(queries), 5)

    for q in queries:
        try:
            results = search_web(q, provider=provider, api_key=api_key, cse_id=cse_id, max_results=per_query)
            for r in results:
                url = r.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(r)
        except Exception as e:
            logger.warning("Deep search sub-query failed for '%s': %s", q, e)

    return all_results[:max_results]
