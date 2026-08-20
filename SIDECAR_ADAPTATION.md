# Adaptación de `fix/sidecar-requests` a `main`

La rama histórica no se puede fusionar directamente: sus archivos pertenecen a
la aplicación anterior, que `main` reemplazó por la estructura `studio/`.

Se verificó que los dos arreglos de streaming que todavía aplican ya están
implementados en la nueva arquitectura:

- `studio/spartan-frontend/src/features/chat/api/chat-api.ts` convierte un EOF sin
  señal terminal en `StreamInterruptedError`, en lugar de mostrar una respuesta
  truncada.
- `studio/spartan_backend/core/inference/external_provider.py` finaliza correctamente
  las herramientas activas cuando un proveedor cierra el stream sin `[DONE]`.

El cambio histórico de eliminar TTS no se trasladó: `main` usa un subsistema de
audio distinto y mantiene TTS como una capacidad independiente.

Por ello esta rama queda como evidencia de la adaptación y base segura para una
PR separada, sin reintroducir archivos obsoletos de la aplicación anterior.
