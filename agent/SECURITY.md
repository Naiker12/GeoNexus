# Security Policy

## Supported Versions

Only the latest release of GeoNexus receives security updates.
Alpha/beta builds and development branches are not covered.

## What's Protected

GeoNexus is a desktop application that runs locally (Tauri v2).
It does not expose network services by default. The following
guidelines apply to all contributors and users.

## Files and Directories That MUST Never Be Committed

These paths are already in `.gitignore` — verify they stay there:

| Pattern | Reason |
|---------|--------|
| `.env`, `.env.*` | API keys, secrets, tokens |
| `*.credentials.json` | Third-party auth credentials |
| `*.pem`, `*.key`, `*.p12`, `*.pfx` | TLS/SSL private keys |
| `*.db`, `*.sqlite`, `*.sqlite3` | Local databases (messages, conversations, embeddings) |
| `chroma_db/`, `chroma/` | Vector store data |
| `agent-projects/`, `generated-projects/` | User-generated project files created by the Coding Agent |
| `logs/` | Debug and application logs that may contain message content |
| `target/`, `dist/`, `.vite/` | Build artifacts |

**Before every commit**, run:
```
git grep -n -I -E '(sk-[[:alnum:]]+|xox[bps]-[[:alnum:]]+|AIza[[:alnum:]_\-]+|Bearer\s+[[:alnum:]]+)' -- .
```
This detects accidentally committed API keys for OpenAI, Slack,
Google, and Bearer tokens. If it matches anything, rotate the key
immediately.

## API Key Storage Risk (Critical)

**Status**: Open — see issue [#api-key-storage]

Connector API keys (`apiKey` on `AiConnector`) are currently stored
in `localStorage` under `geonexus.connectors`. This is a known risk:

- `localStorage` is accessible to any JavaScript running in the same
  origin (including third-party scripts or compromised dependencies).
- Keys persist on disk in plaintext in the browser profile.

**Recommended fix**: Migrate to `tauri-plugin-store` with OS-level
encryption, or to `tauri-plugin-stronghold`. Until then:

- Do NOT share localStorage dumps or screenshots of the Connectors
  configuration panel.
- If you suspect a key was exposed, rotate it at the provider.

## Privileged Functionality

The following features are considered **privileged admin
operations**. Access to them should be treated with the same
caution as shell access:

- **MCP Servers** — can execute arbitrary commands and access the
  file system.
- **Skills** — custom tools that run within the agent pipeline.
- **Connectors / AI Providers** — contain API keys and control
  which models process your data.
- **Coding Agent** — can create, modify, and overwrite files in
  `agent-projects/`.

If GeoNexus ever adds multi-user or network-accessible modes, all
of the above MUST require authentication and SHOULD be
role-restricted.

## Reporting a Vulnerability

Open a GitHub issue with the label `security` or contact the
maintainer directly. Do NOT post vulnerability details in public
discussions until a fix has been released.

## Incident Response: Key Rotation

If an API key is found in any log, commit, screenshot, or shared
chat:

1. Revoke the key at the provider immediately.
2. Generate a new key and update the Connector configuration.
3. Document how the exposure happened to prevent recurrence.

## ChromaDB

The local ChromaDB instance (`chroma_db/`) listens on an internal
port bound to `127.0.0.1` only. It MUST never be bound to `0.0.0.0`
or exposed outside the local machine. This is verified at startup.

## Dependency Supply Chain

- Rust crates are fetched from crates.io with Cargo.lock pinned.
- npm packages are fetched from the public registry.
- Review `Cargo.lock` and `package-lock.json` changes during code
  review.
- If a dependency is added, prefer well-known, actively maintained
  packages.
