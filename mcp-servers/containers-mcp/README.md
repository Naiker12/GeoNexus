# containers-mcp

Servidor MCP JSON-RPC para exponer operaciones de contenedores a Geo Agents.

Fase 4 implementa el proveedor `local`. Los proveedores cloud quedan preparados
para Fase 5, cuando entren OAuth y credenciales.

## Ejecutar

```powershell
$env:GEONEXUS_LOCAL_ROOT="D:\GeoNexus"
python mcp-servers\containers-mcp\server.py
```

## Tools

- `container_list`
- `container_get`
- `container_search`
- `container_sync`
- `container_upload`

`container_sync` y `container_upload` devuelven `requires_confirmation` hasta
que el caller envie `confirmed=true`.
