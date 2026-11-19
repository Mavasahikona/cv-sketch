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

# --- Predis 2.4.1 (matches the version the drop-in was tested with) -----------
if [ ! -f "$PLUGINS/redis-cache/dependencies/predis/predis/autoload.php" ]; then
	log "installing Predis"
	mkdir -p "$PLUGINS/redis-cache/dependencies/predis"
	if git clone --depth 1 --branch v2.4.1 https://github.com/predis/predis.git "$PLUGINS/redis-cache/dependencies/predis/predis"; then
		log "Predis ok"
	else
		log "!! Predis clone failed — object cache will stay off"
	fi
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
chown -R 33:33 "$PLUGINS/cv-sketch" "$PLUGINS/redis-cache" "$HTML/wp-content/object-cache.php" 2>/dev/null || true

log "done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
