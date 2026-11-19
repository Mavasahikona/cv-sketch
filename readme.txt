=== CV Sketch App ===
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later

Makes the CV Sketch Elementor pages work.

== What it does ==

* Workspace: copy the master prompt, paste JSON from any AI chat, live validation with friendly errors, example CV, Generate.
* The eraser: when pasted JSON is broken, one click repairs it (missing or trailing commas, curly or single quotes, unquoted names and dates, comments, True/False/None, quotes inside text, chat text and code fences, cut-off JSON). Shows what it fixed and offers Undo. Also used when importing files on My Profiles.
* Templates: 6 real templates rendered with your own data, filters and sorting.
* Preview & Download: template switcher, accent colour, text size, section toggles, page count, requirements check, PDF (via the browser's "Save as PDF", A4, selectable text), Word (.docx) and JSON downloads.
* My Profiles: saved CVs with open, duplicate, delete, submitted toggle, backup, import and clear.
* Sign up / Log in: email + password accounts (WordPress users with the Subscriber role), rate limited, with a hidden spam trap.
* Storage: CVs are always saved in the visitor's browser. When logged in they also sync to the account (user meta "cvs_profiles"), newest change wins, deletions sync too.

Everything is free. No external services are used except Google Fonts.

== How it finds the page elements ==

The script hooks into the Elementor pages by element id (the `data-id` / `data-interaction-id`
attributes). The ids are listed at the top of assets/cvs-app.js in the IDS object.
If you delete and rebuild one of those elements in Elementor, update its id there.
Editing text, colours or layout in Elementor is fine and needs no change.

Page slugs it expects: workspace, templates, preview-download, my-profiles, sign-up-log-in.

== REST API ==

POST /wp-json/cv-sketch/v1/login     { email, password }
POST /wp-json/cv-sketch/v1/register  { email, password }
POST /wp-json/cv-sketch/v1/sync      { profiles: [...] }  (logged in, X-WP-Nonce)
