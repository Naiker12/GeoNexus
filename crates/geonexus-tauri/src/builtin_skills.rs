use tauri::{AppHandle, Manager};

/// Contenido del SKILL.md built-in pot-analyzer
pub const POT_ANALYZER_MD: &str = r#"---
name: pot-analyzer
description: Analiza documentos POT colombianos. Extrae zonas, usos de suelo, norma urbanística y aprovechamientos.
version: 1.0.0
author: Code Clean / GeoNexus
category: gis
tags: [POT, PBOT, EOT, plan-ordenamiento, usos-suelo, colombia, norma-urbana, aprovechamiento, zonificacion]
---

# POT Analyzer

## Cuándo activar este skill
Actívate cuando el usuario mencione: POT, PBOT, EOT, Plan de Ordenamiento,
uso de suelo, zonificación, norma urbana, aprovechamiento, área de actividad,
índice de construcción, índice de ocupación, afectaciones, cesiones.

## Clasificación de POT por escala
- **EOT** (Esquema de Ordenamiento Territorial): municipios < 30.000 hab
- **PBOT** (Plan Básico): 30.000 - 100.000 hab
- **POT** (Plan de Ordenamiento): > 100.000 hab

## Protocolo de análisis

### Paso 1 — Identificar el documento
 1. Confirmar municipio y año de vigencia
 2. Si no se encuentra, preguntar al usuario

### Paso 2 — Estructura a extraer
- Clasificación del suelo (urbano, rural, expansión)
- Áreas de actividad o zonificación
- Usos principales, complementarios, restringidos y prohibidos
- Índice de construcción (IC) e índice de ocupación (IO)
- Alturas permitidas
- Aislamientos y retiros
- Afectaciones (vías, rondas hídricas, riesgo)
- Cesiones tipo A y B

### Paso 3 — Formato de respuesta obligatorio
1. Resumen ejecutivo (2-3 párrafos)
2. Clasificación del suelo (tabla)
3. Norma urbanística (tabla)
4. Restricciones y afectaciones
5. Fuente y vigencia

## Reglas de voz
- Citar artículos específicos
- Advertir desactualización
- No inventar índices
"#;

/// Instala los skills built-in en la base de datos.
pub fn install_builtin_skills(app: &AppHandle, pool: &sqlx::SqlitePool) -> Result<(), String> {
    tauri::async_runtime::block_on(async {
        let skills_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Error obteniendo app_data_dir: {e}"))?
            .join("skills");

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64;

        let tmp = std::env::temp_dir().join("geonexus_builtin_pot_analyzer.md");
        std::fs::write(&tmp, POT_ANALYZER_MD)
            .map_err(|e| format!("Error escribiendo temp: {e}"))?;

        let _ = geonexus_db::skills::registry::install_from_file(
            pool,
            tmp.to_str().ok_or("Ruta temp inválida")?,
            &skills_dir,
            None,
            now,
            true,
        )
        .await;

        let _ = std::fs::remove_file(&tmp);

        Ok::<_, String>(())
    })
}
