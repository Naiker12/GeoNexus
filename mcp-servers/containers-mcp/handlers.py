from pathlib import Path
from typing import Any

from permissions import PermissionGuard

guard = PermissionGuard()

IGNORED_DIRS = {
    ".git",
    ".next",
    ".nuxt",
    ".pytest_cache",
    ".ruff_cache",
    ".tauri",
    ".turbo",
    ".venv",
    "__pycache__",
    "dist",
    "node_modules",
    "target",
}

MAX_LIST_RESULTS = 250


async def handle_tool_call(tool_name: str, args: dict) -> dict[str, Any]:
    if tool_name == "container_list":
        return await _handle_list(args)
    if tool_name == "container_get":
        return await _handle_get(args)
    if tool_name == "container_search":
        return await _handle_search(args)
    if tool_name == "container_sync":
        return await _handle_sync(args)
    if tool_name == "container_upload":
        return await _handle_upload(args)
    raise ValueError(f"Tool desconocida: {tool_name}")


async def _handle_list(args: dict) -> dict[str, Any]:
    path = args.get("path", "/")
    root = guard.resolve_local_path(path)
    files, truncated = _collect_allowed_files(root)
    return {
        "status": "success",
        "provider": "local",
        "path": path,
        "count": len(files),
        "truncated": truncated,
        "limit": MAX_LIST_RESULTS,
        "files": files,
    }


async def _handle_get(args: dict) -> dict[str, Any]:
    file_id = args["file_id"]
    file_path = guard.resolve_local_path(file_id)
    if not file_path.is_file():
        raise FileNotFoundError(f"Archivo no encontrado: {file_id}")
    return {
        "status": "downloaded",
        "provider": "local",
        "file_id": file_id,
        "local_cache_path": str(file_path),
        "ready_to_load": True,
    }


async def _handle_search(args: dict) -> dict[str, Any]:
    query = args["query"].lower()
    root = guard.resolve_local_path("/")
    files: list[dict[str, Any]] = []
    truncated = False
    for file in _iter_allowed_files(root):
        if query in file.name.lower() or query in str(file).lower():
            files.append(_file_to_dict(file))
            if len(files) >= MAX_LIST_RESULTS:
                truncated = True
                break
    return {
        "status": "success",
        "provider": "local",
        "query": query,
        "results": len(files),
        "truncated": truncated,
        "limit": MAX_LIST_RESULTS,
        "files": files,
    }


async def _handle_sync(args: dict) -> dict[str, Any]:
    if not args.get("confirmed", False):
        return {
            "status": "requires_confirmation",
            "operation": "sync",
            "provider": "local",
            "message": "Confirma la sincronizacion con confirmed=true.",
        }
    root = guard.resolve_local_path(args.get("local_dir", "/"))
    count = sum(1 for _ in _iter_allowed_files(root))
    return {
        "status": "completed",
        "added": count,
        "updated": 0,
        "deleted": 0,
        "conflicts": [],
    }


async def _handle_upload(args: dict) -> dict[str, Any]:
    if not args.get("confirmed", False):
        return {
            "status": "requires_confirmation",
            "operation": "upload",
            "provider": "local",
            "destination": args["path"],
            "message": "container_upload siempre requiere confirmacion explicita.",
        }
    return {
        "status": "error",
        "message": "Upload confirmado queda reservado para proveedores cloud de Fase 5.",
    }


def _iter_allowed_files(root: Path):
    if root.is_file():
        candidates = [root]
    else:
        candidates = _walk_files(root)

    for path in candidates:
        try:
            guard._validate_extension(path.name)
            yield path
        except PermissionError:
            continue


def _walk_files(root: Path):
    stack = [root]
    while stack:
        current = stack.pop()
        try:
            children = sorted(current.iterdir(), key=lambda child: child.name.lower())
        except OSError:
            continue

        for child in children:
            if child.is_dir():
                if child.name not in IGNORED_DIRS:
                    stack.append(child)
            elif child.is_file():
                yield child


def _collect_allowed_files(root: Path) -> tuple[list[dict[str, Any]], bool]:
    files: list[dict[str, Any]] = []
    truncated = False
    for file in _iter_allowed_files(root):
        files.append(_file_to_dict(file))
        if len(files) >= MAX_LIST_RESULTS:
            truncated = True
            break
    return files, truncated


def _file_to_dict(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "id": str(path),
        "name": path.name,
        "path": str(path),
        "size_bytes": stat.st_size,
        "modified": int(stat.st_mtime),
    }
