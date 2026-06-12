#[cfg(test)]
mod tests {
    use crate::allowlist::{extension_permitida, verificar_ruta, AllowlistError};

    #[test]
    fn extension_permitida_acepta_geojson() {
        assert!(extension_permitida("predios.geojson"));
    }

    #[test]
    fn extension_permitida_acepta_shapefile() {
        assert!(extension_permitida("barrios.shp"));
        assert!(extension_permitida("barrios.dbf"));
        assert!(extension_permitida("barrios.prj"));
    }

    #[test]
    fn extension_permitida_rechaza_ejecutables() {
        assert!(!extension_permitida("virus.exe"));
        assert!(!extension_permitida("script.sh"));
        assert!(!extension_permitida("foto.jpg")); // imágenes no GIS
    }

    #[test]
    fn extension_permitida_es_case_insensitive() {
        assert!(extension_permitida("MAPA.GEOJSON"));
        assert!(extension_permitida("Capa.Shp"));
    }

    #[test]
    fn verificar_ruta_rechaza_path_traversal() {
        let tmp = std::env::temp_dir().join("geonexus_test_root");
        std::fs::create_dir_all(&tmp).unwrap();

        // Crear archivo de prueba dentro de root
        let dentro = tmp.join("archivo.geojson");
        std::fs::write(&dentro, b"test").unwrap();

        // Validar ruta permitida
        let res = verificar_ruta(&tmp, &dentro);
        assert!(res.is_ok());

        // Intentar salir del root con ../
        let ruta_maliciosa = tmp.join("../otro_archivo.geojson");
        // Escribimos fuera para que canonicalize no falle por inexistencia
        let fuera_temp = tmp.parent().unwrap().join("otro_archivo.geojson");
        std::fs::write(&fuera_temp, b"fuera").unwrap();

        let resultado = verificar_ruta(&tmp, &ruta_maliciosa);
        assert!(resultado.is_err());
        assert!(matches!(resultado, Err(AllowlistError::OutOfScope(_))));

        // Limpiar
        let _ = std::fs::remove_file(dentro);
        let _ = std::fs::remove_file(fuera_temp);
        let _ = std::fs::remove_dir_all(&tmp);
    }
}
