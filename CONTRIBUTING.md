# Contributing & Workflow

## Branching
- Create feature branches from `main` using the pattern: `feat/<short-name>` or `chore/<short-name>`.
- Keep PRs small and focused; prefer incremental merges.

## Commit Style
- Use concise, descriptive messages (present tense):
  - `feat: add real-time pricing from Scryfall`
  - `fix: handle missing price fields`

## Pull Requests
- Include a short summary, screenshots/GIFs for UI changes, and acceptance criteria.
- Request review from a teammate (or self-review checklist if solo).

## Testing
- Add unit tests for new logic (e.g., price transforms, condition multipliers).
- Run `npm test` locally before opening a PR.

## Local Run
- Use VS Code Live Server/Preview or a simple static server:
  - `npx http-server -p 5173` → http://localhost:5173

## Issue Labels (suggested)
- `prio:high|medium|low`
- `type:feature|bug|chore|docs`
- `area:pricing|auth|checkout|ui|mobile|content|ops`

## First Sprint Focus (suggested)
- Implement Feature 2: Real-time pricing.
- Definition of done:
  - Card tiles show current USD price and “as of” time.
  - Graceful fallback when price missing (document multipliers in code and `docs/ROADMAP.md`).
  - Basic tests for price calculation.

