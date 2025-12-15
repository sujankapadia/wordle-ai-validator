# Repository Guidelines

## Project Structure & Module Organization
- `wordle-ai-validator.html`: main UI and client logic (Gemini calls, word fetching, filtering, IndexedDB cache).
- `test-gemini.ts`: Node mirror of the browser flow; expects `GEMINI_API_KEY` via `.env.local` or CLI arg.
- `test-intersection.ts`, `test-wordlist-fetch.ts`: quick fetch/pagination diagnostics for bestwordlist.com scraping.
- Docs live at the repo root (`README.md`, `STRATEGY_EVOLUTION.md`, `WORD_FREQUENCY_RESEARCH.md`); tooling config in `package.json` and `tsconfig.json`.

## Build, Test, and Development Commands
- `npm install`: install TypeScript/tsx dependencies.
- `npm run dev` / `npm run test:gemini`: run the Gemini DSL + fetch pipeline in Node; requires `GEMINI_API_KEY`.
- `tsx test-intersection.ts` or `tsx test-wordlist-fetch.ts`: manual checks for scraping and pagination behavior.
- Open `wordle-ai-validator.html` directly in a browser to exercise the UI; no build step needed.

## Coding Style & Naming Conventions
- TypeScript/ESNext modules with strict typing; prefer 2-space indentation, semicolons, and `const`/`let` over `var`.
- Keep helpers close to their usage; browser code stays inline with Tailwind CDN, no bundler expected.
- Add brief comments around API calls, parsing, and retry logic; keep functions pure and deterministic where possible.
- Maintain DSL parsing rules exactly (`[LETTER] at [POS]`, `[LETTER] in word`, `no X, Y`, `LENGTH: N`).

## Testing Guidelines
- Use Node 18+ for built-in `fetch` compatibility.
- Primary check: `npm run test:gemini` (covers DSL translation, pagination, filtering; needs `GEMINI_API_KEY`).
- Lightweight checks: `tsx test-intersection.ts` and `tsx test-wordlist-fetch.ts` to validate scraping intersections and pagination.
- Name new diagnostics `test-*.ts` in the repo root; keep console output concise and log network retries/delays.

## Commit & Pull Request Guidelines
- Write imperative, concise commit messages; group related doc/code changes together.
- PRs should describe the problem, approach, and test commands run; note any API/key requirements.
- Attach screenshots/GIFs for UI updates to `wordle-ai-validator.html` when applicable.
- Never commit secrets or large datasets; rely on `.env.local` (gitignored) and runtime downloads.

## Security & External Services
- Do not hardcode API keys; accept user input in-browser or load from `.env.local` for Node scripts.
- Be gentle to bestwordlist.com: keep pagination logic intact, avoid parallel flooding, and preserve small delays/backoff.
