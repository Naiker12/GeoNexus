def build_project_context(project_id: str, db_path: str) -> str:
    """
    Construye un resumen del proyecto para inyectar en el prompt del LLM.
    Retorna string vacio si no hay datos. Nunca lanza excepcion.
    """
    import sqlite3

    lines = []

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Assets indexados
        cur.execute(
            """
            SELECT name, kind, status FROM assets
            WHERE workspace_id IN (
                SELECT id FROM workspaces WHERE project_id = ?
            )
            AND status = 'indexed'
            LIMIT 10
        """,
            (project_id,),
        )
        assets = cur.fetchall()
        if assets:
            lines.append("Archivos indexados en el proyecto:")
            for name, kind, status in assets:
                lines.append(f"  - {name} ({kind})")

        # Nodos del grafo (top 8 mas relevantes)
        cur.execute(
            """
            SELECT label, kind FROM graph_nodes
            WHERE project_id = ?
            LIMIT 8
        """,
            (project_id,),
        )
        nodes = cur.fetchall()
        if nodes:
            lines.append("\nConceptos clave del proyecto (Knowledge Graph):")
            for label, kind in nodes:
                lines.append(f"  - {label} [{kind}]")

        conn.close()
    except Exception:
        pass

    return "\n".join(lines)
