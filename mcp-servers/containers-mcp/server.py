import asyncio
import json
import sys

from handlers import handle_tool_call
from permissions import PermissionGuard
from tools import TOOLS_SCHEMA

guard = PermissionGuard()


async def handle_request(request: dict) -> dict:
    method = request.get("method")
    request_id = request.get("id")

    try:
        if method == "tools/list":
            result = {"tools": TOOLS_SCHEMA}
        elif method == "tools/call":
            params = request.get("params", {})
            tool_name = params["name"]
            args = params.get("arguments", {})
            guard.validate(tool_name, args)
            result = {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(await handle_tool_call(tool_name, args)),
                    }
                ]
            }
        else:
            raise ValueError(f"Metodo no soportado: {method}")

        return {"jsonrpc": "2.0", "id": request_id, "result": result}
    except Exception as exc:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32000, "message": str(exc)},
        }


async def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        response = await handle_request(json.loads(line))
        print(json.dumps(response), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
