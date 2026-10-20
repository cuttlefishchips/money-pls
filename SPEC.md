# Money Pls proof of concept: build spec

Source of truth for the build. Product reasoning lives on the "Money Tracking Whiteboard" artifact (tabs 12 to 16). If this file and the board disagree, raise it before building.

## 1. What this is

A web app that runs on a person's phone. It turns a few numbers and the life they want into a target and a daily amount to spend that keeps them on track for it.

- Users: 3 to 5 participants plus the organiser, for 4 weeks.
- Goal of the build: answer the seven questions in section 8, not to be a finished product.
- All amounts stay on the device. There is no server, no accounts and no AI.

## 2. Hard constraints

1. No amount of money ever leaves the device. Not in network calls, not in logs, not in the usage export.
2. No backend. Static files only, deployed to GitHub Pages.
3. Installable progressive web app that works offline after the first load.
4. Logic is deterministic rules in a standalone module, with no AI.
5. Participants are identified only by a code in the URL fragment, for example `https://.../#p=P3`. The fragment is never sent to the server. The app does not start without a code.
6. Usage data is limited to the six event types in section 6. Anything else is a bug.
7. Missing data is shown as missing and never estimated.
8. Transfers and card bill payments never count as spending.
9. Every number is framed as an estimate the person decides on. No financial advice wording.
10. Currency is SGD. Copy is plain, kind and non-judgemental.

## 3. User stories

Priority: Must = needed for the test to work. Should = add if time allows. Build all Musts first.

### Target and plan (set-up)
| # | As a participant, I want to | Priority |
|---|---|---|
| 1 | Enter my take-home pay, fixed costs including everyday essentials, and savings set aside, so the tool knows my starting point. | Must |
| 2 | Pick the areas of life that matter to me and enter a rough cost for each, so my target reflects the life I want. | Must |
| 3 | Enter a single goal with an amount and a date instead, so I can start without planning my whole life. | Must |
| 4 | Skip the goal and get a safety floor and starting split, so I can start without deciding what I want yet. | Must |
| 5 | See my target, monthly amount and target date, and adjust them, so the target feels like mine. | Must |

### Spending decisions
| # | Story | Priority |
|---|---|---|
| 6 | See a daily number tied to my target, so I know what I can spend today without working it out. | Must |
| 7 | Be told how much is free to enjoy when I am ahead of pace, so I can spend without guilt. | Should |

### Spending log
| # | Story | Priority |
|---|---|---|
| 8 | Log an optional spend in a few seconds, so my daily number stays accurate. | Must |
| 9 | Edit or delete an entry, so a mistake does not distort my number. | Must |
| 10 | See when my number was last updated and which days have no entries, so I know how far to trust it. | Should |

### Monthly review
| # | Story | Priority |
|---|---|---|
| 11 | See whether I am on pace this month and how my target date moves with it, so I know where I stand each week. | Should |

### Money picture
| # | Story | Priority |
|---|---|---|
| 12 | Update my savings or fixed costs when they change, so the number stays right. | Should |

### Taking part in the test
| # | Story | Priority |
|---|---|---|
| 13 | Add the tool to my home screen, so I can glance at it like an app and my phone does not clear its data. | Must |
| 14 | Open the tool from my own link, so my usage file carries my participant code without an account. | Must |
| 15 | Read and export my usage log in weeks 2 and 4, so I control exactly what I share. | Must |
| 16 | Be offered a one-tap rating form at the end of my first session, so my first impression is captured while it is fresh. | Must |

### Not in scope
Accounts, logins, bank connections, account lists, categories, several goals, preset cost ranges, "what if I buy this", spends priced in life terms, reminders or notifications, refinement prompts, guided catch-up, any analytics sent automatically.

## 4. Set-up flow (stories 1 to 5 and 16)

1. **Choose a route.** "What would make the next few years feel good?" Options: a few things in my life, one specific thing, not sure yet.
2. **Pick areas** (route 1 only). Pick up to three of: Work, Home, Health, Family care, Education, Experiences, Everyday living, Giving and legacy. Each has a one-line description.
3. **Price each one.** Name in their own words, rough cost, one-off or monthly. Prompt: think of the last time you paid for something similar. No example price ranges. Route 2 enters one item here.
4. **Set a date.** One month and year for all one-off items, picked with a month and year picker. The target date `T` is the last day of that month.
5. **Starting numbers.** Take-home pay per month, fixed costs per month including everyday essentials (show what counts: rent or mortgage, bills, insurance, groceries, transport, other essentials), and savings set aside for this. "Roughly is fine."
6. **See the result.** Target, monthly amount, target date and daily number, or the floor and split for route 3. Every cost and the date can be edited. Then Accept, then a link to the rating form (URL configurable).

Route 3 ("not sure yet") goes 1 → 5 → 6.

Set-up progress is saved on the device, so leaving part-way resumes where the person stopped.

## 5. Calculation rules

Put all of this in a pure module (`src/calc/`) with unit tests. Screens call it and never compute money themselves.

### Inputs
- `P` take-home pay per month
- `F` fixed costs per month, including everyday essentials
- `S` savings set aside for the target
- One-off items `O_i`, monthly items `M_j`
- Target date `T` (last day of the chosen month), today `t`
- `spent` = sum of optional spends logged in the current calendar month

### Target route (routes 1 and 2)
- `target = Σ O_i`
- `n` = whole months from the start month to `T`, counting the start month and the month of `T`, minimum 1. Example: start in October, `T` in December, `n = 3`.
- `A` (monthly amount) = `max(0, target − S) / n`
- `M` = `Σ M_j` (monthly upgrades, which come off spending from now on)
- `B` (monthly safe-to-spend) = `P − F − A − M`

### Floor route (route 3)
- `floor = 3 × F` (adjustable)
- `A = min(0.2 × P, P − F)`, which is saved towards the floor
- If `P < F`, `A = 0` and the person is asked to check their numbers, as on the target route.
- `B = P − F − A`
- Show the split as needs (`F`), spending (`B`) and saving (`A`), labelled as a starting point to adjust.

### Daily number
- `days_left` = days left in the month, including today
- `daily = (B − spent) / days_left`
- In the first month, prorate: `B_first = B × days_left_at_start / days_in_month`. The first month's daily number and pace use `B_first` in place of `B`, with the month treated as starting on the set-up day (so `days_in_month` becomes `days_left_at_start` and `days_elapsed` counts from the set-up day).

### Pace and permission (stories 7 and 11)
- `even_share = B × days_elapsed / days_in_month`, where `days_elapsed` includes today
- Ahead when `spent < even_share − B / days_in_month`. Show "free to enjoy" = `even_share − spent`.
- Over when `spent > B`. Target date delay in weeks = `(spent − B) / A × 4.35`, rounded up to the next whole week. Not shown on the floor route, or when `A = 0`.

### Rounding
- All amounts are stored and calculated in whole cents.
- The daily number and "free to enjoy" are rounded down to the cent, so they never overstate what is available.
- The target date delay is rounded up to the next whole week.

### Edge cases
- `B < 0` at set-up: if `P − F − M > 0`, show the earliest workable date, `n_min = ceil((target − S) / (P − F − M))` months, and let the person choose that date or trim items. Otherwise ask them to trim monthly items or check their numbers.
- `target ≤ S`: say savings already cover it, and offer to raise the target or start from the floor.
- Only monthly items, so `target = 0`: no target date. The daily number still reflects the upgrades.
- `daily ≤ 0`: show that this month's spending is used up, kindly, with the target date effect if any.
- No entries for some days: show "not logged" for those days, and the time the number was last updated.

## 6. Usage events (the only data that can leave the device)

Store in a separate usage log. Every event has `{ v: 1, code, type, ts }` plus only the fields listed. Never add amounts, names, notes or free text.

| type | extra fields | when |
|---|---|---|
| `session` | `duration_s` | when a session ends (page hidden or closed) |
| `spend_logged` | none | each optional spend saved |
| `budget_viewed` | none | once per screen visit that shows the daily number or target date, and again when the app returns to the foreground on that screen |
| `start_route` | `route`: `areas`, `one`, `none` | once, at set-up step 1 |
| `target_decision` | `decision`: `accepted`, `adjusted`, `rejected` | at set-up step 6, and when a target is later changed |
| `target_set_later` | none | a floor-route person later sets a target |

Enforce the allowed list in code. The export screen shows the log in plain words, then saves it as a JSON file named `usage-<code>-<date>.json`.

## 7. Architecture

- Vite and TypeScript. A UI framework is optional, so keep it light.
- Installable app via a web manifest and service worker (for example `vite-plugin-pwa`), working offline.
- Storage in IndexedDB, behind one storage interface (`src/storage/`), so it can later become synced storage.
- Every entry has an `owner` field (default `"me"`), so households fit later.
- Events carry a version number `v`.
- Folders: `src/calc` (pure rules and tests), `src/storage`, `src/events` (allowed list and export), `src/ui`.
- Tests: Vitest for `src/calc`, covering every rule and edge case in section 5.
- Deploy to GitHub Pages with GitHub Actions. The repository is `money-pls`. Read the base path from the build environment instead of hard-coding it, so a rename never breaks the build.
- Set-up includes a step that guides adding the app to the home screen (story 13), because iPhones can clear site data otherwise.

## 8. What the test must answer (for context)

1. Does a target from the life people want, or the floor and split, feel useful in the first session?
2. Do people come back each week without being chased? (Check-ins stop after week 2.)
3. Does the budget shape real spending?
4. Do people feel more confident? (A clue only.)
5. Do people without a goal still find it useful? (A clue only.)
6. Is the upkeep light enough? (Under 10 minutes a week.)
7. Does the tool itself cause harm, such as holding back on affordable spends, or stress?

## 9. Open items to confirm while building

- Rating form URL (story 16). A placeholder is used until confirmed.
- Short description for the manifest. The app name is Money Pls. A placeholder is used until confirmed.

## 10. Decisions confirmed while building

- 2026-10-20: `n` counts the start month. The target date is picked as a month and year and means the end of that month.
- 2026-10-20: The first month is prorated, and its daily number and pace use `B_first`.
- 2026-10-20: On the floor route, `P < F` gives `A = 0` with the "check your numbers" message.
- 2026-10-20: Transfers and card bill payments are excluded by one line of copy on the logging screen, with no toggle or category.
- 2026-10-20: `budget_viewed` fires once per screen visit, and again when the app returns to the foreground on that screen.
- 2026-10-20: Amounts are in cents. The daily number and "free to enjoy" round down, and the target date delay rounds up.
- 2026-10-20: The prorated first-month budget `B_first` is rounded down to the cent.
- 2026-10-20: The monthly amount `A` is rounded up to the cent on both routes, so the target is always reached and spending is never overstated.
- 2026-10-20: When `P − F − M ≤ 0`, the target route shows this message even if savings cover the target: "Your fixed costs and monthly upgrades leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers or remove a monthly item." The same wording covers costs equal to pay and costs above it. The copy must not assume a mistake, because students and NSFs can genuinely have costs above their allowance.
- 2026-10-20: When `P < F` on the floor route, it shows: "Your fixed costs leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers."
