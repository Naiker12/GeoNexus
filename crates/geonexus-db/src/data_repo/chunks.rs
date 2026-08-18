use geonexus_core::DocumentChunk;
use crate::DataRepository;
use crate::data_repo::row_to_chunk;

impl DataRepository {
    /// Guarda un fragmento (chunk) en la base de datos.
    pub async fn insert_document_chunks(&self, chunks: &[DocumentChunk]) -> Result<(), String> {
        for chunk in chunks {
            sqlx::query(
                "INSERT INTO document_chunks (id, asset_id, chunk_index, content, token_count, page_number, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                    content     = excluded.content,
                    token_count = excluded.token_count,
                    page_number = excluded.page_number"
            )
            .bind(&chunk.id)
            .bind(&chunk.asset_id)
            .bind(chunk.chunk_index)
            .bind(&chunk.content)
            .bind(chunk.token_count)
            .bind(chunk.page_number)
            .bind(chunk.created_at)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error insertando chunk: {e}"))?;
        }
        Ok(())
    }

    /// Lista los fragmentos (chunks) de un activo ordenados por su índice.
    pub async fn list_document_chunks(&self, asset_id: &str) -> Result<Vec<DocumentChunk>, String> {
        let rows = sqlx::query("SELECT * FROM document_chunks WHERE asset_id = ? ORDER BY chunk_index ASC")
            .bind(asset_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| format!("Error listando chunks: {e}"))?;

        let mut list = Vec::new();
        for r in rows {
            list.push(row_to_chunk(&r)?);
        }
        Ok(list)
    }

    /// Elimina todos los fragmentos (chunks) asociados a un activo.
    pub async fn delete_document_chunks(&self, asset_id: &str) -> Result<(), String> {
        sqlx::query("DELETE FROM document_chunks WHERE asset_id = ?")
            .bind(asset_id)
            .execute(&self.pool)
            .await
            .map_err(|e| format!("Error eliminando chunks del asset: {e}"))?;
        Ok(())
    }
}
