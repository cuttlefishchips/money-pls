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
