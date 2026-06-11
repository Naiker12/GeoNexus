use geonexus_core::agent::Agent;
use sqlx::SqlitePool;
use sqlx::Row;

fn unix_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub async fn list_agents(pool: &SqlitePool) -> Result<Vec<Agent>, String> {
    let rows = sqlx::query("SELECT * FROM agents ORDER BY name ASC")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error al listar agentes: {e}"))?;

    let mut agents = Vec::new();
    for r in rows {
        agents.push(Agent {
            id: r.get("id"),
            project_id: r.get("project_id"),
            name: r.get("name"),
            kind: r.get("kind"),
            description: r.get("description"),
            is_active: r.get::<i64, _>("is_active") != 0,
            config: r.get("config"),
            model: r.get("model"),
            provider: r.get("provider"),
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        });
    }
    Ok(agents)
}

pub async fn toggle_agent(pool: &SqlitePool, agent_id: &str, active: bool) -> Result<(), String> {
    let val: i64 = if active { 1 } else { 0 };
    sqlx::query("UPDATE agents SET is_active = ?, updated_at = ? WHERE id = ?")
        .bind(val)
        .bind(unix_now())
        .bind(agent_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error al actualizar agente: {e}"))?;
    Ok(())
}

pub async fn seed_default_agents(pool: &SqlitePool) -> Result<(), String> {
    let now = unix_now();

    let defaults: Vec<(&str, &str, &str, &str)> = vec![
        ("agent-indexer", "Indexador", "Indexa documentos y extrae texto", "document"),
        ("agent-embedder", "Embedder", "Genera embeddings vectoriales", "embedding"),
        ("agent-graph", "Grafo", "Construye y mantiene el grafo de conocimiento", "graph"),
        ("agent-classifier", "Clasificador", "Clasifica activos por tipo y contenido", "classifier"),
        ("agent-chat", "Chat IA", "Responde consultas con contexto del proyecto", "chat"),
    ];

    for (id, name, desc, kind) in defaults {
        let exists: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM agents WHERE id = ?")
            .bind(id)
            .fetch_one(pool)
            .await
            .map_err(|e| format!("Error al verificar agente: {e}"))?;

        if exists.0 == 0 {
            sqlx::query(
                "INSERT INTO agents (id, project_id, name, kind, description, is_active, config, model, provider, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, 1, '{}', NULL, NULL, ?, ?)"
            )
            .bind(id)
            .bind("project-default")
            .bind(name)
            .bind(kind)
            .bind(desc)
            .bind(now)
            .bind(now)
            .execute(pool)
            .await
            .map_err(|e| format!("Error al insertar agente: {e}"))?;
        }
    }

    Ok(())
}
