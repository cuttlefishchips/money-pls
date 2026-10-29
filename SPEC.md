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
5. Participants are identified only by a participant code, given in the URL fragment of their personal link (for example `https://.../#p=P3`) or typed on the code screen. The code is never sent to a server. The app does not start without a code.
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
| 1 | Enter my take-home pay and the fixed costs that are the same every month, so the tool knows my starting point. | Must |
| 2 | Pick what I want money for in the next few years from Today, after my starting numbers, and enter a rough price for each, so my target reflects the life I want. | Must |
| 3 | Merged into story 2. Picking a single item covers starting with one goal. | n/a |
| 4 | Answer "Not now" to goals and keep a safety floor and starting split, then come back to it later, so I can start without deciding what I want yet. | Must |
| 5 | See my target, monthly amount and target date, and adjust them, so the target feels like mine. | Must |
| 17 | Add a goal later from Today, so I can start before I know everything I want. | Must |
| 21 | Set a monthly budget instead of entering my pay and fixed costs, so I can start with the number I already think in. | Must |

### Spending decisions
| # | Story | Priority |
|---|---|---|
| 6 | See a daily number tied to my target, so I know what I can spend today without working it out. | Must |
| 7 | Be told how much is free to enjoy when I am ahead of pace, so I can spend without guilt. | Should |
| 18 | See how pricing a goal changes my daily number, so each goal has a visible effect. | Must |

### Spending log
| # | Story | Priority |
|---|---|---|
| 8 | Log any spend that varies, with an optional note, in a few seconds, so my daily number stays accurate. | Must |
| 9 | Edit or delete an entry, so a mistake does not distort my number. | Must |
| 10 | See when I last caught up on logging, so I know how far to trust my number. | Must |
| 20 | Catch up on several past spends in one go, so logging after the fact is quick. | Must |

### Monthly review
| # | Story | Priority |
|---|---|---|
| 11 | See whether I am on pace this month and how my target date moves with it, so I know where I stand each week. | Should |
| 22 | Enter my total savings once a month and see it beside what the plan expected, so I can check the plan against reality. | Must |

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
| 19 | Start over, so I can redo set-up without losing my participant link. | Must |

### Not in scope
Accounts, logins, bank connections, account lists, categories, splitting a spend with others, preset cost ranges, "what if I buy this", spends priced in life terms, reminders or notifications, refinement prompts, guided catch-up, any analytics sent automatically.

## 4. Set-up flow and Today (stories 1 to 10, 13, 16 to 22)

On iPhone and iPad, set-up starts only in the installed app, because iOS gives an app added to the home screen its own storage, separate from the browser. Opened in a browser there, the app shows "Add Money Pls to your home screen first" with the Safari steps and the participant code from the link, and stores nothing. The installed app opens without the link's fragment, so the code screen asks "Enter your participant code", with the same rules as the link. Other browsers keep the link flow.

Set-up is one screen, then Today. Goals are picked and priced on Today, whenever the person is ready.

1. **Starting numbers.** Under the heading: "So we can work out what you can spend each day. Roughly is fine." Take-home pay per month and fixed costs per month. Fixed costs are only costs that are the same amount every month, such as rent or mortgage, bills, insurance and supporting family. The help text says groceries, transport and anything that varies go in the log. A link, "Rather set a monthly budget?", swaps the two questions for one (story 21): "How much do you want to spend for the rest of this month, on top of rent and bills?" in the set-up month, and "How much do you want to spend this month, on top of rent and bills?" when the budget is changed in a later month A link back, "Use my pay and fixed costs instead", returns to the pay questions. Continue opens Today.

Then **Today**, where the app always opens after set-up:
- **What are you saving up for?** (stories 2 and 4). On the pay route, until it is answered, Today shows a card under the daily number with the same multi-select chips as before: Travel, First home (BTO, renovation, moving out), Emergency fund, Wedding, Further studies, Career break, Big purchase (car, gadgets), and Something else, where the person types their own name. Hint: "Pick all that apply. You can add prices later, and it's fine not to know yet." Continue keeps the picks as unpriced goal cards. "Not now" clears the picks and keeps the safety floor and starting split. Either answer logs `start_route` once. With no goals, "Add a goal" reopens the card.
- **Budget route** (story 21). Today shows the budget as "Your monthly budget" and the daily number "within your monthly budget", with no set-aside amount, safety floor, goals or target date. In place of the goals, a card says "Add your pay to see how much you're saving". It opens the starting numbers screen, and saving it switches to the pay route and shows the goal card. "Change your monthly budget" replaces "Change pay or fixed costs".
- **Your monthly check** (story 22). On the pay routes, from the first month after set-up, Today shows a card once a month. It asks "How much do you have saved in total?" (Save, or "Skip this month"), then shows the total beside the plan's expected total: the last entered total plus the monthly set-aside amount for each month since. The first check has no expected total and says it shows from next month. It also shows, for the month just ended, "the most you were on pace to set aside" = `P − F − spends`, labelled as an estimate that depends on complete logs, with the number of days not logged. Nothing is adjusted automatically. Entries are stored on the phone with an `owner`, and no event is logged.
- The daily number as the headline, with what it is tied to: "keeps you on track for [soonest unfinished goal]" on the target route, or "while you build your safety floor" on the floor route.
- Set aside and left to spend each month, the pace line, a Log a spend button, and when the number was last updated.
- The "needs more" card when the priced goals need more than `P − F`, or the "check your numbers" card.
- Each picked item as a goal card. An unpriced card says "Add a price and date". Opening a card edits its name, rough price ("Not sure, use 3 months of my fixed costs" on the Emergency fund), "By when" (month and year, this month up to 10 years ahead) and "Saved so far" (optional). Prompt: think of the last time you paid for something similar. No example price ranges. A goal can be removed from its card, and new goals added from Today.
- Until at least one item is priced, Today uses the floor route. Once one is, it uses the target route over the priced items only. Removing every priced item returns to the floor route.
- When an item is first priced, Today shows "Adding [item] by [month]: S$[new] a day, down from S$[old]". When the daily number does not change because the safety saving already covers the goal, it shows "Adding [item] by [month]: still S$[n] a day, your safety saving already covers it".
- On the first visit, a one-time card shows the home-screen guide and a link to the rating form (URL configurable, pre-filled with the participant code).
- **Log a spend** (stories 8 and 20) has one text box, "Amount and note". A simple local rule, with no AI, reads the amount from the start of the text (or the end, if the start is not a number), and the rest is an optional note: "12.50 white beehoon" saves S$12.50 with the note "white beehoon". A preview shows what will be saved. The date is set with chips for Today, Yesterday and Pick a date (up to 31 days back, never in the future). "Save and add another" saves and keeps the chosen date for the next spend. Copy: "Log every spend that varies, like groceries and transport." and "Log only your share. Use the day you paid. Transfers and card bill payments don't count." Each new spend fires `spend_logged`.
- Notes stay on the phone. They show in this month's spends list and never appear in usage events or exports.
- "This month's spends" lists this month's spends on Today, newest first, with their notes. Tapping one edits it in the same text box, or deletes it. Edits and deletes update the number but fire no event.
- **Last caught up** (story 10) is the time of the most recent save, edit or delete of a spend, whatever date the spend is for, or the set-up day before any spend. Today always shows "Last caught up: [day]". When that was 2 or more days ago, Today hides "free to enjoy" and "Within this month's budget" and shows "Based on spends logged up to [day]" under the daily number. Over-budget still shows, because logged spends can only undercount.
- Pay and fixed costs can be changed from Today.
- **Your usage log** (story 15), from the ⋯ menu, lists every usage event in plain words, grouped by day, newest first, with no amounts or notes: for example "Opened the app, 3 minutes", "Logged a spend", "Looked at the daily number", "Priced a goal". "Save usage file" exports the events as a JSON array named `usage-<code>-<date>.json`, through the phone's share sheet where available, or as a download. "Copy usage log" copies the same JSON as text. Entries that fail the allowed list are left out of both and counted on screen.
- A small menu on Today offers "Start over", with a confirmation. It clears the goals, numbers and spends on the phone, and keeps the participant code and the usage log.

Set-up progress and Today are saved on the device, so leaving part-way resumes where the person stopped.

## 5. Calculation rules

Put all of this in a pure module (`src/calc/`) with unit tests. Screens call it and never compute money themselves.

### Inputs
- `P` take-home pay per month
- `F` fixed costs per month: only costs that are the same amount every month, including supporting family
- Items `i`, all one-off, each with a price `price_i`, saved so far `S_i` (0 if blank) and a target date `T_i` (last day of its chosen month)
- An emergency fund item can use `price_i = 3 × F` in place of a typed price
- Today `t`
- `spent` = sum of spends logged in the current calendar month, which are every spend that varies
- `budget` the monthly budget on the budget route

### Target route ("I've got things in mind")
- `n_i` = whole months from the start month to `T_i`, counting the start month and the month of `T_i`, minimum 1. Example: start in October, `T_i` in December, `n_i = 3`.
- `A_i` = `max(0, price_i − S_i) / n_i`, rounded up to the cent
- An item with `S_i ≥ price_i` is already covered and has `A_i = 0`
- `A_goals` = `Σ A_i`
- Safety saving = `min(0.2 × P, P − F)`, the same as the floor route's saving
- `A` (monthly amount) = `max(A_goals, safety saving)`, so pricing a goal never raises the daily number above the floor route's
- `B` (monthly safe-to-spend) = `P − F − A`

### Floor route ("Not sure yet")
- `floor = 3 × F` (adjustable)
- `A = min(0.2 × P, P − F)`, which is saved towards the floor
- If `P < F`, `A = 0` and the person is asked to check their numbers, as on the target route.
- `B = P − F − A`
- Show the split as needs (`F`), spending (`B`) and saving (`A`), labelled as a starting point to adjust.

### Budget route ("Rather set a monthly budget?")
- `B = budget`. There is no saving, floor, goal or target date, so `A = 0` and no delay is shown.
- The first month is not prorated, because in the set-up month the question asks for the rest of this month: `B_first = budget`, with the month still treated as starting on the set-up day for the daily number and pace.

### Daily number
- `days_left` = days left in the month, including today
- `daily = (B − spent) / days_left`
- In the first month, prorate: `B_first = B × days_left_at_start / days_in_month`. The first month's daily number and pace use `B_first` in place of `B`, with the month treated as starting on the set-up day (so `days_in_month` becomes `days_left_at_start` and `days_elapsed` counts from the set-up day).

### Pace and permission (stories 7 and 11)
- `even_share = B × days_elapsed / days_in_month`, where `days_elapsed` includes today
- Ahead when `spent < even_share − B / days_in_month`. Show "free to enjoy" = `even_share − spent`.
- Over when `spent > B`. The overspend moves the soonest unfinished item's date: delay in weeks = `(spent − B) / A_i × 4.35` using that item's `A_i`, rounded up to the next whole week. The soonest unfinished item is the one with the earliest `T_i` that still has `A_i > 0` and whose month has not passed, the first listed on a tie. Not shown on the floor route, or when no item is unfinished.

### Monthly check (story 22)
- Shown on the pay routes from the first month after set-up, once per calendar month.
- `expected = last_total + A × months`, where `last_total` is the most recent entered total from an earlier month, `months` is the number of months since it (minimum 1), and `A` is the current monthly set-aside amount. Missing when there is no earlier total or no `A` (needs-more or check-numbers).
- For the month just ended: `most_on_pace = max(0, P − F − spent_last_month)`.
- `days_not_logged` = days of that month before the set-up day, plus days after the last catch-up (story 10). A day with no spends inside that span counts as logged, because spending nothing is a real answer.
- Nothing is adjusted automatically.

### Rounding
- All amounts are stored and calculated in whole cents.
- The daily number and "free to enjoy" are rounded down to the cent, so they never overstate what is available.
- The target date delay is rounded up to the next whole week.

### Edge cases
- `A_goals > P − F`: if `P − F > 0`, show "Your goals need S$[A_goals] a month and you have S$[P − F]", and let the person move dates or remove items. Otherwise ask them to check their numbers.
- `S_i ≥ price_i`: show that item as already covered, adding 0 to `A`.
- `daily ≤ 0`: show that this month's spending is used up, kindly, with the target date effect if any.
- No entries for some days: show when logging was last caught up, and in the monthly check the number of days not logged. Never estimate the missing spends.

## 6. Usage events (the only data that can leave the device)

Store in a separate usage log. Every event has `{ v: 1, code, type, ts }` plus only the fields listed. Never add amounts, names, notes or free text.

| type | extra fields | when |
|---|---|---|
| `session` | `duration_s` | when a session ends (page hidden or closed) |
| `spend_logged` | none | each optional spend saved |
| `budget_viewed` | none | once per screen visit that shows the daily number or target date, and again when the app returns to the foreground on that screen |
| `start_route` | `route`: `items`, `none`; `entry`: `pay`, `budget` | once, when the person first answers the goal card on Today. `entry` is how set-up was completed. A person who stays on the budget route never sees the card, so logs no `start_route`. Events logged before `entry` existed are read as `entry: pay` |
| `target_decision` | `decision`: `accepted`, `adjusted`, `rejected` | `accepted` when an item is first priced, `adjusted` when a priced item is edited, `rejected` when a priced item is removed. Removing an unpriced item logs nothing |
| `target_set_later` | none | once, when a person who chose "Not sure yet" first prices an item |

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

1. Does a person price at least one item in the first session?
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
- 2026-10-21: Onboarding is progressive. Set-up is "What are you saving up for?" (or "Not sure yet") and starting numbers, then Today. Goals are priced from their cards on Today. Today uses the floor route until one item is priced, then the target route over priced items. The "Try a safety floor instead" option and the separate result and done screens are removed. `target_decision` follows pricing, editing and removing items.
- 2026-10-21: On the target route, the amount set aside is the larger of the goals' total and the floor route's safety saving, so pricing a goal never raises the daily number. `rejected` is logged only when a priced item is removed. Set-up screen 2 has a Back button, and Today has a "Start over" menu option that keeps the participant code and usage log.
- 2026-10-26: Spends are logged, edited and deleted from Today. A spend has an amount and a date from the last 31 days, with no note. `spend_logged` fires only for new spends. "Last updated" is the time of the last add, edit or delete, and Start over clears it.
- 2026-10-27: Logging uses one "Amount and note" text box read by a local rule, date chips (Today, Yesterday, Pick a date) and "Save and add another". Notes stay on the phone. Story 10 becomes "last caught up", with no per-day marks: when it is 2 or more days old, "free to enjoy" is hidden and the number says which day it is based on. Stories 10 and 20 are Must. Stories 17 to 20 are added and story 3 stays merged into story 2.
- 2026-10-27: When last caught up is 2 or more days ago, "Within this month's budget" is hidden as well as "free to enjoy"; over-budget and used-up still show.
- 2026-10-27: The usage log screen (story 15) is reached from the ⋯ menu. It shows events in plain words and exports a plain JSON array of the allowed events.
- 2026-10-29: Set-up is the starting numbers screen only. "What are you saving up for?" moves to a card on Today, with "Not now" in place of "Not sure yet". `start_route` fires when the card is answered and gains `entry` (`pay`, `budget`).
- 2026-10-29: Story 21 adds a budget route: one question in place of pay and fixed costs, `B = budget` with no proration, saving, floor or goals, and "Add your pay" to switch to the pay route.
- 2026-10-29: In the set-up month the budget question asks for "the rest of this month"; later months use the original wording. The budget is not prorated.
- 2026-10-29: Fixed costs are only costs that are the same every month, including supporting family. Every spend that varies is logged, and the log screen adds "Use the day you paid."
- 2026-10-29: Story 22 adds a monthly savings check on the pay routes, with the month-end "most you were on pace to set aside" and days not logged counted outside the caught-up span. Nothing is adjusted automatically.
- 2026-10-27: Set-up order is starting numbers first, then "What are you saving up for?" with a Back button to the numbers, because the base numbers do not depend on the goals.
- 2026-10-27: On iPhone and iPad, set-up starts only in the installed app, and the code screen accepts a typed participant code. Constraint 5 now covers a typed code as well as the link. The usage log screen adds "Copy usage log".
