# Money Pls

`SPEC.md` is the source of truth for the build. If a request, the spec and the "Money Tracking Whiteboard" disagree, raise it before building.

## Hard constraints (SPEC.md section 2)

Every change must respect all of these. A change that breaks one is a bug, whatever else it achieves.

1. No amount of money ever leaves the device. Not in network calls, not in logs, not in the usage export.
2. No backend. Static files only, deployed to GitHub Pages.
3. Installable progressive web app that works offline after the first load.
4. Logic is deterministic rules in a standalone module, with no AI.
5. Participants are identified only by a code in the URL fragment, for example `https://.../#p=P3`. The fragment is never sent to the server. The app does not start without a code.
6. Usage data is limited to the six event types in SPEC.md section 6. Anything else is a bug.
7. Missing data is shown as missing and never estimated.
8. Transfers and card bill payments never count as spending.
9. Every number is framed as an estimate the person decides on. No financial advice wording.
10. Currency is SGD. Copy is plain, kind and non-judgemental.

## Rules that follow from the constraints

- All money maths lives in `src/calc/` as pure functions with Vitest tests. Screens call it and never compute money themselves.
- All persistence goes through the storage interface in `src/storage/`. Every entry has an `owner` field, default `"me"`.
- Usage events go only through `src/events/`, which enforces the allowed list and the exact fields in SPEC.md section 6. Never add amounts, names, notes or free text to an event.
- No analytics, telemetry, third-party scripts, remote fonts or network calls at runtime.
- Never hard-code the repository name or base path. Read it from the build environment (`GITHUB_REPOSITORY` in GitHub Actions) so a rename never breaks the build.
- Never commit participant data. `usage-*.json` and `private/` are git-ignored.

## Working agreement

- Build in small steps and run typecheck and tests before each commit.
- Record product or technical decisions in `docs/case-study/decisions.md` (date, what was chosen, why).

## UI rules

- Screens use only the tokens in src/ui/tokens.css. No raw hex values and no new fonts.
- At most one accent-filled action per screen. Other actions are outlined.
- Caveat Brush is for the daily number and headings only. Everything else is Instrument Sans.
- The ahead tint means on or ahead of pace. The care tint means take care. Neither is ever used for alarm, and red is never used for a number or a warning.
- Cards use the card radius, buttons are pills, and tap targets are at least 44px high.
- Copy is plain, kind and non-judgemental, in sentence case. Every number is labelled as an estimate.
- Dark mode must work on every screen.
