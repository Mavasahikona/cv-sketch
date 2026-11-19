=== CV Sketch App ===
Requires at least: 6.0
Requires PHP: 7.4
Stable tag: 2.0.0
License: GPLv2 or later

Makes the CV Sketch pages work: JSON validation, CV templates, PDF and Word export,
saved profiles (browser + account), email login, and a custom-coded My Profiles page.

== What it does ==

* Workspace: copy the master prompt, paste JSON from any AI chat, live validation with friendly errors, example CV, Generate.
* The eraser: when pasted JSON is broken, one click repairs it (missing or trailing commas, curly or single quotes, unquoted names and dates, comments, True/False/None, quotes inside text, chat text and code fences, cut-off JSON). Shows what it fixed and offers Undo. Also used when importing files on My Profiles.
* Templates: 16 real templates rendered with your own data, filters and sorting. The six original cards come from the Elementor gallery; templates 7-16 are drawn by the app into the same grid (assets/cvs-app.js).
* My Profiles: a custom-coded page served by the plugin itself (templates/page-profiles.php with assets/cvs-profiles.js and .css). It replaces the Elementor layout for the "my-profiles" slug: own top bar, stats, search, status filters, sorting, live CV thumbnails, duplicate, JSON export, delete, backup, import and drag-and-drop restore.
* Preview & Download: template switcher, accent colour, text size, section toggles, page count, requirements check, PDF (via the browser's "Save as PDF", A4, selectable text), Word (.docx) and JSON downloads.
* Sign up / Log in: email + password accounts (WordPress users with the Subscriber role), rate limited, with a hidden spam trap.
* Storage: CVs are always saved in the visitor's browser. When logged in they also sync to the account (user meta "cvs_profiles"), newest change wins, deletions sync too.

Everything is free. No external services are used except Google Fonts and (on the server) Redis.

== Redis object cache ==

The deployment installs wp-content/object-cache.php (source: deploy/object-cache.php) plus
Predis, so the WordPress object cache and transients live in Redis instead of MySQL. Constants
at the top of that drop-in set WP_REDIS_HOST=redis, prefix "cvsketch:" and a 24h max TTL. The
server image has no phpredis extension, so the drop-in uses the bundled Predis client.

Health probe: GET /wp-json/cv-sketch/v1/health
  objectCache / dropIn / cacheProbe -> true when Redis is serving the cache
  persistentHandles                 -> increments per request only when the cache really
                                       persists between requests (the real proof)
  redis.reachable / redis.client    -> live connection state reported by the drop-in

== Deploying ==

docker-compose.yml (kept in the Docker Compose service on Dokploy) runs a one-shot
"cvsketch_sync" container before WordPress starts. It fetches this release from jsDelivr at a
pinned commit (deploy/files.txt lists the files), swaps the plugin folder atomically, installs
the drop-in and caches the release in /var/www/html/.cvsketch, so a later deploy still works
when the CDN is unreachable. Deploy log: /cv-sync.log.

GitHub is not reachable from the server; jsDelivr and downloads.wordpress.org are.

== How it finds the page elements ==

The Elementor pages (workspace, templates, preview-download, sign-up-log-in) are hooked by element id (the `data-id` / `data-interaction-id` attributes). The ids are listed at the top of assets/cvs-app.js in the IDS object. If you delete and rebuild one of those elements in Elementor, update its id there. Editing text, colours or layout in Elementor is fine and needs no change.

My Profiles is not Elementor: any page with the slug "my-profiles" is rendered by
templates/page-profiles.php.

== REST API ==

GET  /wp-json/cv-sketch/v1/health
POST /wp-json/cv-sketch/v1/login     { email, password }
POST /wp-json/cv-sketch/v1/register  { email, password }
POST /wp-json/cv-sketch/v1/sync      { profiles: [...] }  (logged in, X-WP-Nonce)
