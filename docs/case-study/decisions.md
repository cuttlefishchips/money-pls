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
   - When fixed costs and monthly upgrades leave nothing to spend from take-home pay, the tool says so and asks the person to adjust their numbers or remove a monthly item, even if savings already cover the target. The floor route uses the same message without monthly items. One wording covers costs equal to pay and costs above it. The message does not assume a mistake, because students and NSFs can genuinely have costs above their allowance.
   - Spending above an even share but inside the month's budget is shown as "Within this month's budget", never "behind" or "on track".
   - The participant code is stored on the phone the first time a link is opened, and the app refuses to start only if no code has ever been stored. This is because an app installed on Android opens without the code in its address. The code still never reaches the server.
   - If a link with a different code is opened later, the app asks before switching. Entries on the phone stay as they are, and only new usage events carry the new code.
   - Participant codes are 1 to 12 letters or numbers, treated as upper case, so a code cannot carry free text or amounts into the usage file.
   - The organiser uses the code ORG1. Every usage event and the export file name carry the code, so the organiser's data can be left out of analysis by filtering on ORG1.
   - The browser theme colour uses the board colour, and the app icon is "MP" on the accent colour, so the installed app matches the design tokens.
   - Accent red is never used for neutral or positive states, such as "Within this month's budget" or "free to enjoy".
   - The eight area descriptions on set-up step 2 are drafts for review.
