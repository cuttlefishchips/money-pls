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

## 2026-10-27
- Story 10 tracks "last caught up", the last time any spend was saved, edited or deleted, in place of "nothing spent today" or per-day "not logged" marks. People log in batches after the fact, so confirming each day was a chore.
- When the last catch-up is 2 or more days old, "free to enjoy" is hidden and the daily number says which day it is based on, because unlogged days would otherwise look like days with no spending. Over-budget still shows, because logged spends can only undercount.
- Logging uses one text box: "12.50 white beehoon" becomes S$12.50 with the note "white beehoon". A simple local rule reads it, with no AI. Notes help people recognise entries later and stay on the phone, never in usage events or exports.
- Quick date chips and "Save and add another", which keeps the chosen date, make catching up on several past spends quick (story 20, now a must-have).
- The log screen says "Log only your share", because splits are not supported, so people log only what they paid themselves.
- When last caught up is 2 or more days ago, "Within this month's budget" is hidden too, and only over-budget and used-up still show. With days unlogged, being within budget is not known, while going over is, because logged spends can only undercount.
- The usage log is shown in plain words before it is saved, grouped by day, so people can see exactly what they would share. The file is a plain JSON array of the allowed events, with nothing added. Entries that fail the allowed list are left out of both the screen and the file.
- The file is saved through the phone's share sheet where available, because downloads from an installed web app are unreliable on iPhone. Elsewhere it downloads.
- On iPhone and iPad, set-up starts only in the app added to the home screen. iOS gives that app storage separate from Safari and opens it without the link's #p= code, so a code and set-up done in Safari never carried over. Opened in a browser there, the app now shows the home-screen steps and the participant code first, and stores nothing.
- The code screen accepts a typed participant code, with the same rules as the link, so the installed app can start without the link. The code still never leaves the phone, and constraint 5 is reworded to cover a typed code.
- The usage log screen adds "Copy usage log", which copies the same JSON as text, because saving files from an installed web app on iPhone is unreliable and pasting into a message always works.
- The welcome card checks whether the app is installed with the same platform check as the install screen, which covers iOS's own flag, so the installed iPhone app no longer shows home-screen steps it no longer needs. Found in the pre-launch browser run.
- Set-up now asks for take-home pay and fixed costs first, then "What are you saving up for?", which has a Back button to the numbers and opens Today. The base numbers do not depend on the goals, so they come first. The numbers screen adds "So we can work out what you can spend each day" under its heading so people know why it is asked. `start_route` still fires on the goals screen and "Not sure yet" still leads to the floor route. Saved progress from the old order without both numbers resumes on the numbers screen.

## 2026-10-29

- Set-up is now only the pay and fixed costs screen, and "What are you saving up for?" is a card on Today with the same list and "Not now". People see their daily number before being asked about goals, so the goal question no longer stands between them and the main screen. "Not now" keeps the safety floor and starting split, and "Add a goal" reopens the card when there are no goals. Picks are kept in the card until it is answered, so the route is recorded only from a real answer.
- `start_route` now fires when the goal card is answered, with `route` (`items`, `none`) and a new `entry` field (`pay`, `budget`). The route values stay `items` and `none`, rather than the `one`, `areas` and `none` in the request, because the app keeps several goals and `areas` is a retired route. A person who stays on the budget route never sees the goal card, so logs no `start_route`; this gap was accepted. Events logged before `entry` existed are read as `entry: pay`, the only way in at the time, so existing usage logs still export in full.
- Story 21 adds a budget route from the first screen: "Rather set a monthly budget?" swaps in one question, "How much do you want to spend this month, on top of rent and bills?" Safe-to-spend is the budget, with no saving, floor or target date. The first month is not prorated, because the person answers for this month. "Add your pay to see how much you're saving" opens the pay screen and then the goal card, and the event keeps `entry: budget` for how they started.
- Fixed costs now mean only costs that are the same amount every month, including supporting family, and every spend that varies goes in the log, such as groceries and transport. Varying costs were hard to estimate as a fixed amount and hid real spending from the daily number. The log screen adds "Use the day you paid." next to "Log only your share." People who set up before this change keep their numbers, which may still include groceries or transport, until they change them.
- Story 22 adds a monthly check on the pay routes. Once a month it asks for total savings and shows it beside the plan's expected total, the last entered total plus the monthly set-aside amount for each month since. For the month just ended it shows "the most you were on pace to set aside" (pay − fixed costs − logged spends), labelled as depending on complete logs, with days not logged. Days not logged are the days before set-up and after the last catch-up, because the app has no per-day marks and a day with no spends can be a real zero. Nothing is adjusted automatically, and no event is logged, so no amount can leave the phone.
- Saved set-up answers survive the update. Progress on the old goals screen becomes the goal card on Today with its picks kept, an already answered Today stays answered, and new fields get safe defaults.
- Stories 21 and 22 are Must. The savings check stays on the pay routes only, skipped months use the current saving amount, and no prompt is added for fixed costs entered before the new definition, because no participants have started.
- In the set-up month the budget question asks "How much do you want to spend for the rest of this month, on top of rent and bills?", and later months use "How much do you want to spend this month, on top of rent and bills?". The budget route stays unprorated, so the wording makes clear the first amount covers only the days left.
