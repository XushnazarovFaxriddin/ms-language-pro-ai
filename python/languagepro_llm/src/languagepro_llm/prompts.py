"""Filesystem-based prompt registry. Loads YAML on boot.

Layout:
    prompts/
      <purpose>/
        <sub_purpose>/
          v1.yaml
          v2.yaml
          current -> v2.yaml   (symlink, or `version: <int>` in current.yaml)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml
from jinja2 import Environment, StrictUndefined


@dataclass(frozen=True)
class PromptVersion:
    purpose: str
    sub_purpose: str
    version: int
    system: str
    user: str
    examples: list[dict[str, Any]]
    variables_schema: dict[str, Any]
    response_schema_ref: str | None = None
    file_path: Path | None = None


@dataclass(frozen=True)
class RenderedPrompt:
    messages: list[dict[str, str]]
    response_schema_ref: str | None
    prompt_version: PromptVersion


class PromptRegistry:
    """Loads all prompts from disk. Service may also load DB overrides post-init."""

    def __init__(self, prompts_dir: Path):
        self._dir = Path(prompts_dir)
        self._registry: dict[tuple[str, str, int], PromptVersion] = {}
        self._current: dict[tuple[str, str], int] = {}
        self._jinja = Environment(
            undefined=StrictUndefined, autoescape=False, keep_trailing_newline=True
        )
        self._load()

    def _load(self) -> None:
        if not self._dir.exists():
            return
        for purpose_dir in self._dir.iterdir():
            if not purpose_dir.is_dir():
                continue
            for sub_dir in purpose_dir.iterdir():
                if not sub_dir.is_dir():
                    continue
                for yaml_file in sub_dir.glob("v*.yaml"):
                    data = yaml.safe_load(yaml_file.read_text())
                    pv = PromptVersion(
                        purpose=data.get("purpose", purpose_dir.name),
                        sub_purpose=data.get("sub_purpose", sub_dir.name),
                        version=int(data["version"]),
                        system=data.get("system", ""),
                        user=data.get("user", ""),
                        examples=data.get("examples", []),
                        variables_schema=data.get("variables_schema", {}),
                        response_schema_ref=data.get("response_schema_ref"),
                        file_path=yaml_file,
                    )
                    key = (pv.purpose, pv.sub_purpose, pv.version)
                    self._registry[key] = pv
                    cur_key = (pv.purpose, pv.sub_purpose)
                    if data.get("status") == "active" or cur_key not in self._current:
                        self._current[cur_key] = pv.version

    def get(
        self, purpose: str, sub_purpose: str, version: int | None = None
    ) -> PromptVersion:
        if version is None:
            version = self._current.get((purpose, sub_purpose))
            if version is None:
                raise KeyError(f"No active prompt for {purpose}/{sub_purpose}")
        return self._registry[(purpose, sub_purpose, version)]

    def render(
        self,
        purpose: str,
        sub_purpose: str,
        variables: dict[str, Any],
        version: int | None = None,
    ) -> RenderedPrompt:
        pv = self.get(purpose, sub_purpose, version)
        sys_msg = self._jinja.from_string(pv.system).render(**variables)
        usr_msg = self._jinja.from_string(pv.user).render(**variables)
        msgs: list[dict[str, str]] = []
        if sys_msg.strip():
            msgs.append({"role": "system", "content": sys_msg})
        msgs.append({"role": "user", "content": usr_msg})
        return RenderedPrompt(
            messages=msgs,
            response_schema_ref=pv.response_schema_ref,
            prompt_version=pv,
        )

    def list_purposes(self) -> list[tuple[str, str, int]]:
        return [(p, s, v) for (p, s, v) in self._registry]
