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
| 2 | Pick what I want money for in the next few years and enter a rough price for each, so my target reflects the life I want. | Must |
| 3 | Merged into story 2 on 2026-10-20. Picking a single item covers starting with one goal. | n/a |
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

1. **Choose a route.** "What would make the next few years feel good?" Options: "I've got things in mind" and "Not sure yet".
2. **Pick items** ("I've got things in mind" only). Question: "What are you saving up for?" Hint: "Pick all that apply. You'll put a rough price on each next." Multi-select chips, all one-off: Travel, First home (BTO, renovation, moving out), Emergency fund, Wedding, Further studies, Career break, Big purchase (car, gadgets), and Something else, where the person types their own name.
3. **Price each one.** Each picked item gets a card with its name (pre-filled and editable), a rough price, "By when" (month and year, from this month up to 10 years ahead) and "Saved so far" (optional, blank counts as 0). The Emergency fund card also offers "Not sure, use 3 months of my fixed costs" in place of a price. Prompt: think of the last time you paid for something similar. No example price ranges.
4. Removed on 2026-10-21. Each item now has its own date on step 3.
5. **Starting numbers.** Take-home pay per month and fixed costs per month including everyday essentials (show what counts: rent or mortgage, bills, insurance, groceries, transport, supporting family, other essentials), on both routes. "Roughly is fine."
6. **See the result.** The daily number, the total set aside each month and what is left to spend, then each item with its price, date, saved so far and monthly amount, or "Already covered". The floor and split for "Not sure yet". Every item, date and number can be changed. Then Accept, then the home-screen guide and a link to the rating form (URL configurable, pre-filled with the participant code).

"Not sure yet" goes 1 → 5 → 6. "I've got things in mind" goes 1 → 2 → 3 → 5 → 6.

Set-up progress is saved on the device, so leaving part-way resumes where the person stopped.

## 5. Calculation rules

Put all of this in a pure module (`src/calc/`) with unit tests. Screens call it and never compute money themselves.

### Inputs
- `P` take-home pay per month
- `F` fixed costs per month, including everyday essentials
- Items `i`, all one-off, each with a price `price_i`, saved so far `S_i` (0 if blank) and a target date `T_i` (last day of its chosen month)
- An emergency fund item can use `price_i = 3 × F` in place of a typed price
- Today `t`
- `spent` = sum of optional spends logged in the current calendar month

### Target route ("I've got things in mind")
- `n_i` = whole months from the start month to `T_i`, counting the start month and the month of `T_i`, minimum 1. Example: start in October, `T_i` in December, `n_i = 3`.
- `A_i` = `max(0, price_i − S_i) / n_i`, rounded up to the cent
- An item with `S_i ≥ price_i` is already covered and has `A_i = 0`
- `A` (monthly amount) = `Σ A_i`
- `B` (monthly safe-to-spend) = `P − F − A`

### Floor route ("Not sure yet")
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
- Over when `spent > B`. The overspend moves the soonest unfinished item's date: delay in weeks = `(spent − B) / A_i × 4.35` using that item's `A_i`, rounded up to the next whole week. The soonest unfinished item is the one with the earliest `T_i` that still has `A_i > 0` and whose month has not passed, the first listed on a tie. Not shown on the floor route, or when no item is unfinished.

### Rounding
- All amounts are stored and calculated in whole cents.
- The daily number and "free to enjoy" are rounded down to the cent, so they never overstate what is available.
- The target date delay is rounded up to the next whole week.

### Edge cases
- `B < 0` at set-up: if `P − F > 0`, show "Your goals need S$[A] a month and you have S$[P − F]", and let the person move dates or remove items. Otherwise ask them to check their numbers.
- `S_i ≥ price_i`: show that item as already covered, adding 0 to `A`.
- `daily ≤ 0`: show that this month's spending is used up, kindly, with the target date effect if any.
- No entries for some days: show "not logged" for those days, and the time the number was last updated.

## 6. Usage events (the only data that can leave the device)

Store in a separate usage log. Every event has `{ v: 1, code, type, ts }` plus only the fields listed. Never add amounts, names, notes or free text.

| type | extra fields | when |
|---|---|---|
| `session` | `duration_s` | when a session ends (page hidden or closed) |
| `spend_logged` | none | each optional spend saved |
| `budget_viewed` | none | once per screen visit that shows the daily number or target date, and again when the app returns to the foreground on that screen |
| `start_route` | `route`: `items`, `none` | once, at set-up step 1 |
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
- UI styling lives in src/ui/tokens.css (colours, fonts, radii, dark mode). Fonts are bundled from npm, never loaded from a CDN, so the app works offline. The UI rules are in CLAUDE.md.
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

### Before the first participant
- [ ] Rating form link: a Google Form, with the participant code pre-filled through the form's pre-filled link. A placeholder is used until the link is sent.
- [ ] Manifest description confirmed.
- [ ] Route descriptions on set-up step 1 reviewed (drafts for now).

## 10. Decisions confirmed while building

- 2026-10-20: `n` counts the start month. The target date is picked as a month and year and means the end of that month.
- 2026-10-20: The first month is prorated, and its daily number and pace use `B_first`.
- 2026-10-20: On the floor route, `P < F` gives `A = 0` with the "check your numbers" message.
- 2026-10-20: Transfers and card bill payments are excluded by one line of copy on the logging screen, with no toggle or category.
- 2026-10-20: `budget_viewed` fires once per screen visit, and again when the app returns to the foreground on that screen.
- 2026-10-20: Amounts are in cents. The daily number and "free to enjoy" round down, and the target date delay rounds up.
- 2026-10-20: The prorated first-month budget `B_first` is rounded down to the cent.
- 2026-10-20: The monthly amount `A` is rounded up to the cent on both routes, so the target is always reached and spending is never overstated.
- 2026-10-20: When fixed costs leave nothing to spend (`P − F ≤ 0` on the target route, even if savings cover the target, or `P < F` on the floor route), both routes show: "Your fixed costs leave nothing to spend from your take-home pay. If that's right, the tool can't set a spending amount yet. You can adjust your numbers." The same wording covers costs equal to pay and costs above it. The copy must not assume a mistake, because students and NSFs can genuinely have costs above their allowance.
- 2026-10-20: Pace between "ahead" and "over" is shown as "Within this month's budget", never "behind" or "on track".
- 2026-10-20: The participant code is stored on the phone the first time a link is opened. The app refuses to start only if no code has ever been stored. A link with a different code asks before switching, and entries on the phone are kept.
- 2026-10-20: Participant codes are 1 to 12 letters or numbers, treated as upper case.
- 2026-10-20: The organiser's code is ORG1. Leave ORG1 out of analysis by filtering on the `code` field or the export file name.
- 2026-10-20: Accent red is used only for the one main button on a screen and the app icon, and never as a status. Over-budget uses the care tint.
- 2026-10-20: Set-up has two routes, "I've got things in mind" and "Not sure yet". The areas list and the one-item route are replaced by concrete item chips with a pre-set type. `start_route` takes `items` or `none`.
- 2026-10-20: All items are one-off. Monthly items and `M` are removed, so `B = P − F − A`. Supporting family is counted in fixed costs at step 5.
- 2026-10-20: Set-up step 3 needs a price above zero for every item. Step 4 offers this month up to 10 years ahead, and clears the month if a change of year would put it in the past. Step 5 asks for savings only on "I've got things in mind", because the floor route does not use them.
- 2026-10-21: Each item has its own price, date and saved so far, and the shared date step is removed. `A = Σ A_i`. Overspend moves the soonest unfinished item's date using its `A_i`. When the goals need more than `P − F`, the person moves dates or removes items, with no automatic earliest date.
- 2026-10-21: The result screen's secondary "Try a safety floor instead" logs `target_decision` as `rejected` and switches to the floor route. Accepting logs `accepted`, or `adjusted` if anything was changed after the result was first shown. The floor route logs no `target_decision`.
- 2026-10-21: Shown amounts are whole dollars: amounts to set aside round up, and amounts to spend round down. Typed amounts show their cents.
