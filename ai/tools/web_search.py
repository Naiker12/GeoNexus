"""Web search tools for the AI agent."""

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


def _search_duckduckgo_lite(query: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        resp = requests.get(
            "https://lite.duckduckgo.com/lite/",
            params={"q": query},
            timeout=10,
        )
        from html.parser import HTMLParser

        class LinkParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.results = []
                self._capture = False
                self._current = {}

            def handle_starttag(self, tag, attrs):
                attrs_dict = dict(attrs)
                if tag == "a":
                    self._current["url"] = attrs_dict.get("href", "")
                    self._capture = True

            def handle_data(self, data):
                if self._capture and "url" in self._current:
                    self._current.setdefault("title", "")

            def handle_endtag(self, tag):
                pass

        parser = LinkParser()
        parser.feed(resp.text)
        return [{"url": r.get("url", ""), "title": r.get("title", ""), "snippet": "", "status": "done"} for r in parser.results[:max_results]]
    except Exception as e:
        logger.warning("DuckDuckGo lite fallback failed: %s", e)
        return []


def _search_google(query: str, api_key: str, cse_id: str, max_results: int = 10) -> list[dict[str, Any]]:
    try:
        resp = requests.get(
            "https://www.googleapis.com/customsearch/v1",
            params={"key": api_key, "cx": cse_id, "q": query, "num": min(max_results, 10)},
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
        return []


def search_web(query: str, provider: str = "duckduckgo", api_key: str | None = None, cse_id: str | None = None, max_results: int = 10) -> list[dict[str, Any]]:
    if provider == "google" and api_key and cse_id:
        return _search_google(query, api_key, cse_id, max_results)
    return _search_duckduckgo(query, max_results)


def search_web_deep(query: str, provider: str = "duckduckgo", api_key: str | None = None, cse_id: str | None = None, max_results: int = 10) -> list[dict[str, Any]]:
    results = search_web(query, provider, api_key, cse_id, max_results)
    enriched = []
    for r in results:
        try:
            resp = requests.get(r["url"], timeout=5)
            if resp.status_code == 200:
                import re
                text = resp.text
                text = re.sub(r'<[^>]+>', ' ', text)
                text = re.sub(r'\s+', ' ', text).strip()
                r["content_preview"] = text[:500]
        except Exception:
            r["content_preview"] = ""
        enriched.append(r)
    return enriched
