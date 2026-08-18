import os
from pathlib import Path

ALLOWED_EXTENSIONS = {
    ".geojson", ".shp", ".shx", ".dbf", ".prj", ".dxf", ".dwg",
    ".kml", ".kmz", ".gpx", ".gdb", ".gpkg", ".tif", ".tiff",
    ".geotiff", ".csv", ".pdf", ".xlsx", ".xls", ".zip", ".json",
    ".docx", ".doc", ".xlsm", ".cpg", ".img", ".ecw",
}

WRITE_TOOLS = {"container_sync", "container_upload"}


class PermissionGuard:
    def validate(self, tool_name: str, args: dict) -> None:
        provider = args.get("provider")
        if provider != "local":
            raise PermissionError(
                f"Proveedor '{provider}' queda preparado para Fase 5; Fase 4 ejecuta 'local'."
            )

        if tool_name == "container_get":
            self._validate_extension(args.get("file_id", ""))

        if tool_name == "container_upload":
            self._validate_extension(args.get("local_path", ""))
            self._validate_local_path(args.get("local_path", ""))

    def resolve_local_path(self, relative_path: str = "/") -> Path:
        root = os.environ.get("GEONEXUS_LOCAL_ROOT")
        if not root:
            raise PermissionError("GEONEXUS_LOCAL_ROOT no esta definido para containers-mcp.")

        root_path = Path(root).expanduser().resolve()
        requested = (root_path / relative_path.lstrip("/\\")).resolve()
        if root_path != requested and root_path not in requested.parents:
            raise PermissionError(f"Ruta fuera de allowlist: {relative_path}")
        return requested

    def _validate_extension(self, filename: str) -> None:
        suffixes = Path(filename).suffixes
        ext = "".join(suffixes[-2:]).lower() if suffixes[-2:] == [".tar", ".gz"] else Path(filename).suffix.lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise PermissionError(f"Extension fuera de allowlist: {ext}")

    def _validate_local_path(self, path: str) -> None:
        resolved = Path(path).expanduser().resolve()
        home = Path.home().resolve()
        cwd = Path.cwd().resolve()
        if home not in resolved.parents and cwd not in resolved.parents and resolved not in {home, cwd}:
            raise PermissionError("local_path fuera de directorios permitidos.")
