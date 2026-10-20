   # Money Pls decision log

   One entry per product or technical decision: date, what was chosen, and why.

   ## 2026-10-20
   - Proof of concept runs as a web app on each person's phone, with no server, so amounts never leave the phone.
   - Participants are identified by a code in the link, with no accounts.
   - The repository is public on GitHub Pages, with no participant data committed.
   - Months to the target count the start month (October to December is 3 months).
   - The target date is picked as a month and year and means the end of that month.
   - The first month is prorated from the set-up day, and its daily number and pace both use the prorated budget, so a person who starts mid-month is not shown as behind on day one.
   - On the floor route, if pay is below fixed costs, the saving amount is 0 and the person is asked to check their numbers, instead of showing a negative saving.
   - Transfers and card bill payments are excluded by one line of copy on the logging screen, with no toggle, to keep logging to a few seconds.
   - The "budget viewed" usage event fires once per screen visit, including when the app comes back to the foreground on that screen, so re-renders do not inflate it.
   - All maths is in cents. The daily number and "free to enjoy" round down so they never overstate, and the target date delay rounds up so it never understates.
   - The rating form link and the app description use placeholders until confirmed.
   - Each build step ships as its own pull request.
