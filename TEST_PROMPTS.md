# Prompts para verificar implementación

## 3.2 Drag & drop global
1. Arrastra un archivo .txt/.pdf desde el explorador al área de chat (no solo al input)
   → Debería aparecer overlay "Suelta los archivos aquí"
2. Suelta el archivo → el overlay desaparece

## 3.3 Paste de imágenes
1. Copia una imagen al portapapeles (Ctrl+C en un explorador)
2. Pégala en el composer (Ctrl+V)
   → Debería aparecer como chip/preview en el input

## 3.4 Shortcuts configurables
1. Abre Configuración → Atajos
2. Haz clic en un atajo, presiona nueva combinación
3. Cierra y prueba el nuevo atajo globalmente

## 3.6 Archivar + buscar
1. En la sidebar de conversaciones, pon el ratón sobre una conversación
   → Aparece icono de archivar (📦)
2. Haz clic en archivar → la conversación se mueve a pestaña "Archivadas"
3. Escribe en la barra de búsqueda → resultados con FTS5 destacados
4. Desde Archivadas, haz clic en restaurar → vuelve a Activas

## 3.8 Borradores
1. Empieza a escribir un mensaje largo en el composer
2. Cambia a otra conversación (sidebar)
3. Vuelve a la conversación original → el texto debería mantenerse

## 3.10 Theming instalable
1. Abre selector de temas (icono paleta en sidebar)
2. Al final, haz clic en "Importar tema"
3. Selecciona un archivo JSON con formato:
   ```json
   { "id": "mi-tema", "name": "Mi Tema", "variables": { "background": "#1a1a2e", "foreground": "#e0e0e0", "primary": "#0f3460", "card": "#16213e", "border": "#0f3460", "muted": "#1a1a2e" } }
   ```
   → El tema aparece en la lista y se aplica
