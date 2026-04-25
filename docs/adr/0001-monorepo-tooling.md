# ADR 0001 — Monorepo Tooling: pnpm + Turborepo + uv

- **Status**: Accepted
- **Date**: 2026-04-26
- **Deciders**: Bobomurod, Faxriddin
- **Supersedes**: —

## Context

LanguagePro AI is a polyglot project (Python backends + TypeScript frontends + shared libraries) with **6 deployable apps** and **6 shared packages**. Two students develop in parallel with overlapping touch points (shared `auth-api`, `packages/`, `python/`). We need a workspace setup that:

1. Allows fast cross-package refactoring (TypeScript ↔ TypeScript, Python ↔ Python).
2. Has incremental, cached builds (CI must complete in < 10 min).
3. Lets each student work in their domain without breaking the other.
4. Has minimal cognitive overhead — students are intermediate, not advanced, in monorepo tooling.

## Considered options

| Option | Pros | Cons |
|---|---|---|
| **A. pnpm workspaces + Turborepo + uv** | Industry standard for Next.js mono; uv is fastest Python pkg mgr; remote cache | Two tooling stacks to learn |
| B. Nx (full-stack) | Single tool for JS+Python via plugins | Overkill; Python plugin less mature |
| C. Bazel | Hermetic, scales to Google-size | Steep learning curve; overkill for thesis |
| D. Separate repos per app | Simplest mental model | Cross-package refactor painful; CI duplication; defeats monorepo purpose |
| E. pnpm + Lerna + Poetry | Mature combo | Lerna deprecated 2024; Poetry slower than uv |

## Decision

**Option A**: `pnpm` workspaces (TypeScript), Turborepo (orchestration & cache), `uv` workspaces (Python).

Rationale:
- `pnpm`: strict dependency resolution (no phantom deps), fastest installs after first, symlink-based, lockfile is text-diffable.
- `Turborepo`: simple `turbo.json`, remote cache via Vercel free tier, integrates trivially with `pnpm`.
- `uv`: 10–100× faster than pip; native workspace support since 0.5; single lockfile across Python apps.

JS workspace covers: `apps/landing`, `apps/data-engine-web`, `apps/exam-platform-web`, `packages/*`.
Python workspace covers: `apps/auth-api`, `apps/data-engine-api`, `apps/exam-platform-api`, `python/*`.

## Consequences

- ✅ Single `pnpm install` and `uv sync` covers everything.
- ✅ Turborepo `turbo build` parallelizes across apps with cache.
- ✅ Easy onboarding: 4 commands in contributor-guide.md.
- ⚠️ Two lockfiles (`pnpm-lock.yaml`, `uv.lock`) — both must be committed.
- ⚠️ CI matrix: separate `pnpm test` and `uv run pytest` jobs.
- 🔮 Future: if we outgrow Turborepo cache, switch to Bazel (months 12+, post-defense).

## References

- pnpm workspaces: https://pnpm.io/workspaces
- Turborepo: https://turbo.build/repo
- uv workspaces: https://docs.astral.sh/uv/concepts/projects/workspaces/
