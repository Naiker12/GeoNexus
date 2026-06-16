# Plan para el Primer Release de GeoNexus

## Paso 1: Preparar el repositorio
1. Asegúrate de que todos los cambios estén commiteados en la rama `main`
2. Ve a la página de tu repositorio en GitHub: https://github.com/Naiker12/GeoNexus

## Paso 2: Crear el primer tag
1. En tu terminal, navega a la carpeta `D:\GeoNexus`
2. Ejecuta:
   ```bash
   git tag -a v0.1.0-beta.1 -m "Primera beta pública de GeoNexus"
   git push origin v0.1.0-beta.1
   ```
3. Esto activará automáticamente el workflow de GitHub Actions que compilará la app para Windows, macOS y Linux

## Paso 3: Esperar a que termine el workflow
1. Ve a la sección de "Actions" en tu repositorio
2. Espera a que el job "Build and Release" termine (puede tardar ~15-30 minutos)
3. Cuando termine, se creará automáticamente un release en GitHub con los assets

## Paso 4: Verificar el release
1. Ve a la sección de "Releases" en tu repositorio
2. Abre el release "GeoNexus v0.1.0-beta.1"
3. Verifica que estén los assets (instaladores para cada plataforma)

## Paso 5: Actualizar los enlaces en Geo-Agents (si es necesario)
1. Si los archivos tienen nombres con versión (ej: GeoNexus_0.1.0_x64_en-US.msi), actualiza los links en Geo-Agents o edita el release para renombrar los archivos quitando la versión
