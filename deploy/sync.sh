#!/bin/sh
# CV Sketch deploy step — runs inside the one-shot sync container on every deploy.
# 1. puts the current plugin code in place
# 2. supplies Predis for the Redis object-cache drop-in (the wordpress image has no phpredis)
# 3. installs the object-cache drop-in itself
# Every step is best-effort: a failure leaves the old files working instead of breaking the site.
set -u

HTML=${HTML:-/var/www/html}
PLUGINS="$HTML/wp-content/plugins"
MARKER=/tmp/cv-sketch-sync.log

log() { echo "[cv-sketch] $*"; }

[ -d "$HTML/wp-content" ] || { log "no wp-content at $HTML — is the volume mounted?"; exit 0; }
mkdir -p "$PLUGINS"

# --- Predis 2.x, taken from the WordPress.org copy of Redis Object Cache ----
# github.com is not reachable from this server; downloads.wordpress.org is.
PREDIS="$PLUGINS/redis-cache/dependencies/predis/predis"
if [ ! -f "$PREDIS/autoload.php" ]; then
	log "installing Predis from wordpress.org"
	RC=$(mktemp -d)
	if wget -q -O "$RC/redis-cache.zip" https://downloads.wordpress.org/plugin/redis-cache.latest-stable.zip; then
		if unzip -q "$RC/redis-cache.zip" -d "$RC/x"; then
			mkdir -p "$PLUGINS/redis-cache/dependencies"
			rm -rf "$PLUGINS/redis-cache/dependencies/predis"
			if cp -r "$RC/x/redis-cache/dependencies/predis" "$PLUGINS/redis-cache/dependencies/"; then
				log "Predis ok"
			else
				log "!! could not copy Predis"
			fi
		else
			log "!! could not unzip redis-cache.zip"
		fi
	else
		log "!! download of redis-cache.zip failed"
	fi
	rm -rf "$RC"
fi

# --- Redis object-cache drop-in ---------------------------------------------
if [ -f "$PLUGINS/cv-sketch/deploy/object-cache.php" ]; then
	if cp "$PLUGINS/cv-sketch/deploy/object-cache.php" "$HTML/wp-content/object-cache.php"; then
		log "object-cache.php installed"
	else
		log "!! could not write object-cache.php"
	fi
else
	log "!! plugin files missing"
fi

# --- permissions (33 = www-data in the wordpress image) ----------------------
rm -rf "$PLUGINS/cv-sketch.old"

chown -R 33:33 "$PLUGINS/cv-sketch" "$PLUGINS/redis-cache" "$HTML/wp-content/object-cache.php" 2>/dev/null || true

log "done $(date -u +%Y-%m-%dT%H:%M:%SZ)"