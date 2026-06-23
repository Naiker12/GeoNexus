import os
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class WorkspaceConfig:
    working_directory: str = "."
    code_execution_mode: str = "project"
    persistent_shell: bool = True
    env_passthrough: list[str] = field(default_factory=list)
    file_read_limit: int = 100_000


class PersistentShell:
    def __init__(self, working_dir: str, env_passthrough: list[str]):
        self.working_dir = Path(working_dir).resolve()
        self.env = self._build_env(env_passthrough)
        self._cwd = str(self.working_dir)
        self._history: list[tuple[str, str, int]] = []

    def _build_env(self, passthrough: list[str]) -> dict:
        base = {"PATH": os.environ.get("PATH", ""), "HOME": os.environ.get("HOME", "")}
        for key in passthrough:
            if key in os.environ:
                base[key] = os.environ[key]
        return base

    def run(self, command: str, timeout: int = 30) -> dict:
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self._cwd,
                env=self.env,
                timeout=timeout
            )
            output = result.stdout + result.stderr
            self._history.append((command, output[:2000], result.returncode))

            if command.strip().startswith("cd "):
                new_dir = command.strip()[3:].strip()
                try:
                    new_path = (Path(self._cwd) / new_dir).resolve()
                    if new_path.is_dir():
                        self._cwd = str(new_path)
                except Exception:
                    pass

            return {
                "output": output[:self._get_limit()],
                "exit_code": result.returncode,
                "cwd": self._cwd,
                "truncated": len(output) > self._get_limit()
            }
        except subprocess.TimeoutExpired:
            return {"output": f"Timeout después de {timeout}s", "exit_code": -1, "cwd": self._cwd, "truncated": False}
        except Exception as e:
            return {"output": str(e), "exit_code": -1, "cwd": self._cwd, "truncated": False}

    def _get_limit(self) -> int:
        return 8000

    def get_project_structure(self, max_depth: int = 3) -> str:
        lines = []
        base = Path(self._cwd)
        self._tree(base, base, lines, 0, max_depth)
        return "\n".join(lines[:100])

    def _tree(self, base: Path, current: Path, lines: list, depth: int, max_depth: int):
        if depth >= max_depth:
            return
        try:
            entries = sorted(current.iterdir(), key=lambda p: (p.is_file(), p.name))
            for entry in entries:
                if entry.name.startswith(".") or entry.name in ("node_modules", "target", "__pycache__", ".venv"):
                    continue
                prefix = "  " * depth + ("├── " if depth > 0 else "")
                lines.append(f"{prefix}{entry.name}{'/' if entry.is_dir() else ''}")
                if entry.is_dir():
                    self._tree(base, entry, lines, depth + 1, max_depth)
        except PermissionError:
            pass
