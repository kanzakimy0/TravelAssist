# TASK-010 Browser QA

The navigation loop was exercised against the production build at the required
1440×900, 1024×768, and 390×844 viewports.

The automated check covers the home entry, mock Personal Center link, standard
Start entry, the `entry=step3` deep link and focus, invalid-entry fallback,
selected-plan bridge, Planner header destinations, browser back/forward, console
errors, hydration errors, and horizontal overflow.

The pre-existing missing `/favicon.ico` request is excluded from the console
gate because it is outside this navigation-only task. No application or
hydration error was observed.

Run `tools/qa/task-010-navigation-check.mjs` with an external Playwright module
and local Chrome. Neither is added to the application dependencies.
