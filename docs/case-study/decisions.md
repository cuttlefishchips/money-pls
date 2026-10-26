   # Money Pls decision log

   One entry per product or technical decision: date, what was chosen, and why.

   ## 2026-10-20
   - Proof of concept runs as a web app on each person's phone, with no server, so amounts never leave the phone.
   - Participants are identified by a code in the link, with no accounts.
   - The repository is public on GitHub Pages, with no participant data committed.
   - Months to the target count the start month (October to December is 3 months), and the target date is picked as a month and year that means the end of that month. People think "save each month from now until December", and a month picker removes the ambiguity of a mid-month date.
   - The first month is prorated from the set-up day, and its daily number and pace both use the prorated budget. Otherwise people who start mid-month look over pace for the whole first month.
   - On the floor route, if pay is below fixed costs, the saving amount is 0 and the person is asked to check their numbers, instead of showing a negative saving.
   - Transfers and card bill payments are excluded by one line of copy on the logging screen, with no toggle, to keep logging to a few seconds.
   - The "budget viewed" usage event fires once per screen visit, including when the app comes back to the foreground on that screen, so re-renders do not inflate it.
   - All maths is in cents. The daily number and "free to enjoy" round down so they never overstate, and the target date delay rounds up so it never understates.
   - The rating form link and the app description use placeholders until confirmed.
   - Each build step ships as its own pull request.
   - The prorated first-month budget is rounded down to the cent, in line with never overstating what is available.
   - The monthly amount set aside is rounded up to the cent on both routes, so the target is always reached and spending is never overstated.
   - When fixed costs leave nothing to spend from take-home pay, the tool says so and asks the person to adjust their numbers, even if savings already cover the target. One wording covers costs equal to pay and costs above it. The message does not assume a mistake, because students and NSFs can genuinely have costs above their allowance.
   - Spending above an even share but inside the month's budget is shown as "Within this month's budget", never "behind" or "on track".
   - The participant code is stored on the phone the first time a link is opened, and the app refuses to start only if no code has ever been stored. This is because an app installed on Android opens without the code in its address. The code still never reaches the server.
   - If a link with a different code is opened later, the app asks before switching. Entries on the phone stay as they are, and only new usage events carry the new code.
   - Participant codes are 1 to 12 letters or numbers, treated as upper case, so a code cannot carry free text or amounts into the usage file.
   - The organiser uses the code ORG1. Every usage event and the export file name carry the code, so the organiser's data can be left out of analysis by filtering on ORG1.
   - The browser theme colour uses the board colour, and the app icon is "MP" on the accent colour, so the installed app matches the design tokens.
   - Accent red is used only for the one main button on a screen and the app icon, and never as a status. Over-budget uses the care tint. This keeps red from reading as alarm next to money, in line with kind, non-judgemental copy.
   - Set-up has two routes, "I've got things in mind" and "Not sure yet", replacing three. "A few things" and "one specific thing" were the same flow with a different count, so picking one item now covers the single-goal case.
   - Step 2 asks "What do you want money for in the next few years?" with concrete item chips (Travel, Wedding, Home, Further studies, Career break, Big purchase, Emergency fund, Supporting family, A better everyday life, Something else) in place of eight abstract life areas. Each item has a pre-set one-off or monthly type that the person can change on the next screen.
   - The `start_route` usage event now takes `items` or `none`. The event version stays at 1, because no participant data had been collected yet.
   - Step 2 now asks "What are you saving up for?", and every item is one-off: Travel, First home, Emergency fund, Wedding, Further studies, Career break, Big purchase, Something else.
   - Monthly items are removed from set-up and the calculation. They double-counted: ongoing costs like supporting family are already in fixed costs, and ongoing spending like eating out is already what the daily number covers. Supporting family is now named in the fixed costs helper text instead.
   - Every item needs a price above zero before continuing, so the target is never built on a missing number.
   - The target month is picked with separate month and year lists, from this month up to 10 years ahead. Months already past are not offered, and changing the year clears a month that would fall in the past.
   - Savings set aside are asked for only on "I've got things in mind", because the floor route's calculation does not use them. On that route, 0 is a valid answer.
   - Amounts are typed as plain text with a decimal keypad and an S$ label. Commas and a leading $ are accepted, and anything unreadable counts as missing rather than being guessed.

## 2026-10-21
- Each goal has its own price, date and saved so far, in place of one shared date and one savings figure. One shared date was unrealistic once goals became concrete items, such as a trip next June and a home in three years.
- The monthly amount is worked out per goal and added up. An overspend moves the soonest unfinished goal's date, using that goal's monthly amount, because that is the goal the person would feel first.
- When the goals need more than is left after fixed costs, the result says how much they need against how much is available, and the person moves dates or removes goals. The automatic earliest-date calculation is dropped, because with several dates there is no single date to suggest.
- A goal whose savings already cover its price shows as already covered and adds nothing to the monthly amount.
- The emergency fund can be priced at 3 months of fixed costs for people who are not sure what to aim for, matching the safety floor on the "Not sure yet" route.
- The result screen offers "Try a safety floor instead", which counts as rejecting the target, so the usage data can show how often people turn a target down.
- Amounts on the result screen are whole dollars, rounding up what to set aside and down what to spend, so the plan never overstates what is free to spend.
- Onboarding is progressive: two set-up screens, then Today, where each goal is priced from its card when the person is ready. The gated survey delayed all value: nobody saw a daily number until every goal had a price, a date and savings filled in.
- Today uses the safety-floor split until at least one goal is priced, then the target over priced goals only, so there is always a daily number from the first visit.
- Pricing a goal shows how the daily number moves ("Adding Travel by June 2027: S$82 a day, up from S$60"), so each price has a visible effect. The first goal can raise the number, because the floor's 20% saving is replaced by that goal's monthly amount.
- `target_decision` now records goal-level choices: accepted when a goal is first priced, adjusted when a priced goal is edited, and rejected when a goal is removed. "Try a safety floor instead" is dropped, because removing every priced goal already returns to the floor.
- The first evaluation question becomes "Does a person price at least one item in the first session?", since set-up no longer forces a target.
- The home-screen guide and rating link move to a one-time card on the first visit to Today.
- Once goals are priced, the amount set aside is whichever is more: the goals' total or the 20% safety saving from the floor route. Without this, pricing a small or far-off goal dropped the safety saving and raised the daily number, so adding a goal could mean saving less than having none. When a newly priced goal leaves the number unchanged, Today says the safety saving already covers it, so the price still has a visible effect.
- `rejected` is logged only when a priced goal is removed. An unpriced goal was never part of a target, so removing it is not a target decision.
- Set-up screen 2 has a Back button, so people can change their picks before seeing Today.
- Today has a small menu with "Start over", behind a confirmation. It clears goals, numbers and spends, and keeps the participant code and usage log, so a fresh start does not break the study data.

## 2026-10-26
- Logging a spend asks for an amount and a date only, with the date set to today, so it takes a few seconds. There is no note field, because notes add effort and are not needed to keep the number right.
- Spends can be dated up to 31 days back, so people who forget a day can catch up, but never in the future.
- This month's spends are listed on Today and open for editing or deleting, so a mistake never distorts the number.
- `spend_logged` fires only for new spends, matching "each optional spend saved". Edits and deletes are corrections, not new logging, so they are not counted.
- "Last updated" shows when the spends last changed, including edits and deletes, because that is when the number last moved.
