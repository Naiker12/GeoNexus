TOOLS_SCHEMA = [
    {
        "name": "container_list",
        "description": "Lista archivos de un contenedor conectado.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {
                    "type": "string",
                    "enum": ["local", "onedrive", "google_drive", "sharepoint", "dropbox", "s3"],
                },
                "path": {"type": "string", "default": "/"},
            },
            "required": ["provider"],
        },
    },
    {
        "name": "container_get",
        "description": "Obtiene un archivo permitido desde el contenedor local.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "file_id": {"type": "string"},
            },
            "required": ["provider", "file_id"],
        },
    },
    {
        "name": "container_search",
        "description": "Busca archivos por nombre o ruta.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "query": {"type": "string"},
            },
            "required": ["provider", "query"],
        },
    },
    {
        "name": "container_sync",
        "description": "Sincroniza metadata local. Requiere confirmacion explicita.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "remote_path": {"type": "string"},
                "local_dir": {"type": "string"},
                "confirmed": {"type": "boolean", "default": False},
            },
            "required": ["provider"],
        },
    },
    {
        "name": "container_upload",
        "description": "Sube un archivo a un contenedor. Siempre requiere confirmacion explicita.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "provider": {"type": "string"},
                "path": {"type": "string"},
                "local_path": {"type": "string"},
                "confirmed": {"type": "boolean", "default": False},
            },
            "required": ["provider", "path", "local_path"],
        },
    },
]
