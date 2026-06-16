# Plan para el Primer Release de GeoNexus

## Paso 1: Preparar el repositorio
1. Asegúrate de que todos los cambios estén commiteados en la rama `main`
2. Ve a la página de tu repositorio en GitHub: https://github.com/Naiker12/GeoNexus

## Paso 2: Eliminar el tag anterior (si existe)
1. En tu terminal, navega a la carpeta `D:\GeoNexus`
2. Ejecuta:
   ```bash
   git tag -d v0.1.0-beta.1
   git push --delete origin v0.1.0-beta.1
   ```

## Paso 3: Crear un nuevo tag
1. Ejecuta:
   ```bash
   git tag -a v0.1.0-beta.2 -m "Segunda beta pública con workflow de releases arreglado"
   git push origin v0.1.0-beta.2
   ```
2. Esto activará automáticamente el workflow de GitHub Actions que compilará la app para Windows, macOS y Linux

## Paso 4: Esperar a que termine el workflow
1. Ve a la sección de "Actions" en tu repositorio
2. Espera a que el job "Build and Release" termine (puede tardar ~15-30 minutos)
3. Cuando termine, se creará automáticamente un release en GitHub con los assets

## Paso 5: Verificar el release
1. Ve a la sección de "Releases" en tu repositorio
2. Abre el release "GeoNexus v0.1.0-beta.2"
3. Verifica que estén los assets:
   - GeoNexus_0.1.0_x64_en-US.msi (Windows x64)
   - GeoNexus_0.1.0_x64.dmg (macOS Intel)
   - GeoNexus_0.1.0_aarch64.dmg (macOS Apple Silicon)
   - GeoNexus_0.1.0_amd64.AppImage (Linux x64)

## Paso 6: Actualizar los enlaces en Geo-Agents en futuras versiones
1. Cuando cambies la versión en `crates/geonexus-tauri/tauri.conf.json`, actualiza los links en Geo-Agents para que coincidan con el nuevo número de versión!

