/*
 * CV Sketch — My Profiles, custom-coded page (v2.0).
 * Reads the same browser storage keys as the workspace, so nothing moves:
 * localStorage.cvs_profiles_v1 { id: profile } and localStorage.cvs_current_v1.
 */
(function () {
	'use strict';

	var C = window.CVSketch;
	var CFG = window.CVSX_CONFIG || {};
	var PAGES = CFG.pages || {};
	if (!C) return;

	var LS_KEY = 'cvs_profiles_v1';
	var CUR_KEY = 'cvs_current_v1';
	var memoryStore = {};

	/* ---------- tiny helpers ---------- */

	function $(id) { return document.getElementById(id); }
	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text !== undefined) n.textContent = text;
		return n;
	}
	function esc(s) { return C.esc(s); }
	function on(n, ev, fn) { if (n) n.addEventListener(ev, fn); }
	function slug(s) { return String(s || 'cv').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cv'; }
	function newId() { return 'cv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
	function withParams(url, params) {
		if (!url) return location.href;
		var u = new URL(url, location.href);
		Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
		return u.toString();
	}
	function ago(ts) {
		var s = Math.round((Date.now() - ts) / 1000);
		if (!ts || s < 45) return 'just now';
		if (s < 5400) return Math.max(1, Math.round(s / 60)) + ' min ago';
		if (s < 129600) return Math.round(s / 3600) + ' h ago';
		if (s < 2592000) return Math.round(s / 86400) + ' d ago';
		return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function niceDate(s) {
		var d = new Date(s);
		if (isNaN(d.getTime())) return s;
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
	}
	function titleOf(p) { return (p.doc.target && p.doc.target.jobTitle) || p.doc.basics.label || 'Untitled CV'; }
	function companyOf(p) { return (p.doc.target && p.doc.target.company) || p.doc.basics.name || ''; }

	var toastEl, toastTimer;
	function toast(msg, isError) {
		toastEl = toastEl || $('cvsx-toast');
		if (!toastEl) return;
		toastEl.textContent = msg;
		toastEl.classList.toggle('is-error', !!isError);
		toastEl.classList.add('is-on');
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3600);
	}

	function download(name, data, type) {
		var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/json' });
		var a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
	}

	/* ---------- storage (identical to the workspace) ---------- */

	function loadAll() {
		try {
			var raw = localStorage.getItem(LS_KEY);
			return raw ? JSON.parse(raw) : {};
		} catch (e) {
			return memoryStore;
		}
	}
	function saveAll(map) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch (e) { memoryStore = map; }
	}
	function listProfiles() {
		var m = loadAll();
		return Object.keys(m).map(function (k) { return m[k]; })
			.filter(function (p) { return p && p.doc && !p.deleted; })
			.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
	}
	function getProfile(id) { var m = loadAll(); return id ? m[id] || null : null; }
	function putProfile(p) {
		p = p || {};
		p.id = p.id || newId();
		p.updated = Date.now();
		p.created = p.created || p.updated;
		p.settings = Object.assign(C.defaultSettings(), p.settings || {});
		var m = loadAll();
		m[p.id] = p;
		saveAll(m);
		syncSoon([p]);
		return p;
	}
	function removeProfile(id) {
		var m = loadAll();
		var p = m[id];
		if (p) {
			m[id] = { id: id, updated: Date.now(), deleted: true };
			saveAll(m);
			syncSoon([m[id]]);
		}
	}
	function setCurrent(id) { try { localStorage.setItem(CUR_KEY, id); } catch (e) { /* ignore */ } }

	/* ---------- account sync ---------- */

	var syncState = CFG.loggedIn ? 'off' : 'off';
	var pending = [];
	var flushTimer;

	function syncSoon(list) {
		if (!CFG.loggedIn) return;
		pending = pending.concat(list);
		clearTimeout(flushTimer);
		flushTimer = setTimeout(flushSync, 700);
	}
	function syncAll() {
		var m = loadAll();
		syncSoon(Object.keys(m).map(function (k) { return m[k]; }));
	}
	function flushSync() {
		var list = pending;
		pending = [];
		if (!CFG.loggedIn || !list.length) return;
		setSyncState('syncing');
		fetch(CFG.restUrl + 'sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': CFG.nonce },
			credentials: 'same-origin',
			body: JSON.stringify({ profiles: list })
		}).then(function (r) { return r.json(); }).then(function (data) {
			var merged = {};
			(data.profiles || []).forEach(function (p) { merged[p.id] = p; });
			var local = loadAll();
			Object.keys(merged).forEach(function (id) {
				var remote = merged[id];
				var mine = local[id];
				if (!mine || (remote.updated || 0) >= (mine.updated || 0)) local[id] = remote;
			});
			saveAll(local);
			setSyncState('ok');
			draw();
		}).catch(function () { setSyncState('error'); });
	}
	function setSyncState(s) {
		syncState = s;
		drawSyncNote();
	}

	/* ---------- CV preview inside a card ---------- */

	function mountPreview(host, doc, settings) {
		host.innerHTML = '<div class="cvs-stage"><div class="cvs-scaler">' + C.renderCV(doc, settings) + '</div></div>';
		var stage = host.firstChild;
		var scaler = stage.firstChild;
		function fit() {
			var w = host.clientWidth || 340;
			var s = Math.min(1, w / 794);
			scaler.style.transform = 'scale(' + s + ')';
		}
		fit();
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
		if (window.ResizeObserver) new ResizeObserver(fit).observe(host);
		return fit;
	}

	/* ---------- filters ---------- */

	var state = { q: '', sort: 'newest', status: 'all' };

	function matches(p) {
		if (state.status === 'draft' && (p.doc.target || {}).status === 'submitted') return false;
		if (state.status === 'submitted' && (p.doc.target || {}).status !== 'submitted') return false;
		if (state.status === 'deadline' && !(p.doc.target || {}).deadline) return false;
		if (!state.q) return true;
		var hay = [
			titleOf(p), companyOf(p), p.doc.basics.name,
			(p.doc.basics.label || ''),
			C.getTemplate((p.settings || {}).template).name
		].join(' ').toLowerCase();
		return hay.indexOf(state.q.toLowerCase()) !== -1;
	}

	function sortList(list) {
		var out = list.slice();
		if (state.sort === 'oldest') out.sort(function (a, b) { return (a.updated || 0) - (b.updated || 0); });
		else if (state.sort === 'az') out.sort(function (a, b) { return titleOf(a).localeCompare(titleOf(b)); });
		else if (state.sort === 'template') out.sort(function (a, b) {
			return C.getTemplate(a.settings && a.settings.template).name.localeCompare(C.getTemplate(b.settings && b.settings.template).name);
		});
		return out;
	}

	/* ---------- rendering ---------- */

	function statusTag(p) {
		var t = p.doc.target || {};
		if (t.status === 'submitted') return { text: '✓ Submitted', cls: 'is-submitted' };
		if (t.deadline) return { text: '⏳ Apply by ' + niceDate(t.deadline), cls: 'is-deadline' };
		return { text: '✎ Draft', cls: '' };
	}

	function cardFor(p) {
		var tpl = C.getTemplate((p.settings || {}).template);
		var card = el('article', 'cvsx-card');
		card.setAttribute('data-id', p.id);

		var thumb = el('div', 'cvsx-thumb');
		var preview = el('div', 'cvsx-prev');
		thumb.appendChild(preview);
		var tag = statusTag(p);
		var status = el('button', 'cvsx-status ' + tag.cls, tag.text);
		status.type = 'button';
		status.title = 'Click to toggle submitted';
		on(status, 'click', function () {
			p.doc.target = p.doc.target || {};
			p.doc.target.status = p.doc.target.status === 'submitted' ? '' : 'submitted';
			putProfile(p);
			draw();
		});
		card.appendChild(status);
		card.appendChild(thumb);

		var body = el('div', 'cvsx-cardbody');
		body.appendChild(el('h3', '', titleOf(p)));
		body.appendChild(el('p', 'cvsx-sub', companyOf(p) + ((p.doc.target || {}).location ? ' • ' + p.doc.target.location : '')));
		var meta = el('div', 'cvsx-cardmeta');
		meta.appendChild(el('span', 'cvsx-tag', tpl.name));
		meta.appendChild(el('span', 'cvsx-when', 'edited ' + ago(p.updated)));
		body.appendChild(meta);
		card.appendChild(body);

		var acts = el('div', 'cvsx-cardactions');
		var open = el('a', 'cvsx-btn is-primary', 'Open');
		open.href = withParams(PAGES.preview || '/', { id: p.id });
		on(open, 'click', function () { setCurrent(p.id); });
		acts.appendChild(open);

		var dup = el('button', 'cvsx-icobtn', '⧉');
		dup.type = 'button';
		dup.title = 'Duplicate';
		on(dup, 'click', function () {
			var copy = JSON.parse(JSON.stringify(p));
			copy.id = newId();
			copy.created = 0;
			copy.doc.target.jobTitle = titleOf(p) + ' (copy)';
			copy.doc.target.status = '';
			putProfile(copy);
			toast('Duplicated.');
			draw();
		});
		acts.appendChild(dup);

		var json = el('button', 'cvsx-icobtn', '{ }');
		json.type = 'button';
		json.title = 'Download CV JSON';
		on(json, 'click', function () {
			download(slug(titleOf(p)) + '-cv.json', JSON.stringify(p.doc, null, 2), 'application/json');
			toast('JSON downloaded.');
		});
		acts.appendChild(json);

		var del = el('button', 'cvsx-icobtn is-danger', '✕');
		del.type = 'button';
		del.title = 'Delete';
		on(del, 'click', function () {
			if (!window.confirm('Delete "' + titleOf(p) + '"? This cannot be undone.')) return;
			removeProfile(p.id);
			toast('Deleted.');
			draw();
		});
		acts.appendChild(del);

		card.appendChild(acts);

		queueMicrotask(function () {
			mountPreview(preview, p.doc, Object.assign({}, C.defaultSettings(), p.settings || {}));
		});
		return card;
	}

	function drawStats(list) {
		var total = list.length;
		var totalEl = $('cvsx-stat-total');
		if (totalEl) totalEl.textContent = total + (total === 1 ? ' CV' : ' CVs');
		var last = list[0];
		var lastEl = $('cvsx-stat-last');
		if (lastEl) lastEl.textContent = last ? ago(last.updated) : 'nothing yet';
		var lead = $('cvsx-lead');
		if (lead) {
			lead.textContent = total
				? 'Every version you have shaped, in one place. Open one to keep editing, or start a fresh sketch.'
				: 'Nothing drafted yet. Paste a job advert into the workspace and the app writes your first CV.';
		}
		drawSyncNote();
	}

	function drawSyncNote() {
		var note = $('cvsx-stat-sync');
		if (!note) return;
		note.classList.toggle('is-synced', syncState === 'ok');
		var b = note.querySelector('b');
		var who = CFG.userName ? ' · ' + CFG.userName : '';
		var map = {
			syncing: 'Syncing…',
			ok: 'Synced' + who,
			error: 'Sync failed',
			off: CFG.loggedIn ? 'On' + who : 'Off'
		};
		if (b) b.textContent = map[syncState] || map.off;
		var small = note.querySelector('span');
		if (small) small.textContent = CFG.loggedIn ? 'account sync' : 'log in to sync';
	}

	var drawQueued = false;
	function draw() {
		if (drawQueued) return;
		drawQueued = true;
		requestAnimationFrame(function () {
			drawQueued = false;
			var grid = $('cvsx-grid');
			if (!grid) return;
			var all = listProfiles();
			var list = sortList(all.filter(matches));
			grid.innerHTML = '';
			list.forEach(function (p) { grid.appendChild(cardFor(p)); });
			var empty = $('cvsx-empty');
			if (empty) empty.hidden = list.length > 0;
			grid.hidden = list.length === 0;
			var count = $('cvsx-count');
			if (count) count.textContent = all.length + (all.length === 1 ? ' saved CV' : ' saved CVs');
			drawStats(all);
		});
	}

	/* ---------- import / backup / clear ---------- */

	function importText(text, sourceName) {
		var added = 0;
		var data = null;
		try { data = JSON.parse(text); } catch (e) { data = null; }

		if (data && Array.isArray(data.profiles)) {
			data.profiles.forEach(function (p) {
				if (!p || !p.doc || !p.doc.basics) return;
				putProfile({ id: newId(), doc: C.normalize(p.doc), raw: p.raw || '', settings: Object.assign(C.defaultSettings(), p.settings || {}) });
				added++;
			});
		} else if (data && data.basics) {
			putProfile({ id: newId(), doc: C.normalize(data), raw: JSON.stringify(data), settings: C.defaultSettings() });
			added = 1;
		} else {
			var repaired = C.repairJson(text);
			if (repaired && repaired.text) {
				try {
					var obj = JSON.parse(repaired.text);
					putProfile({ id: newId(), doc: C.normalize(obj), raw: repaired.text, settings: C.defaultSettings() });
					added = 1;
				} catch (e2) { added = 0; }
			}
		}

		toast(added
			? 'Imported ' + added + (added === 1 ? ' CV' : ' CVs') + (sourceName ? ' from ' + sourceName : '') + '.'
			: 'That file is not a CV Sketch backup or CV JSON.', !added);
		draw();
	}

	function wireImport() {
		var file = document.createElement('input');
		file.type = 'file';
		file.accept = '.json,application/json';
		file.style.display = 'none';
		document.body.appendChild(file);
		on(file, 'change', function () {
			var f = file.files && file.files[0];
			if (!f) return;
			f.text().then(function (t) { importText(t, f.name); file.value = ''; });
		});
		on($('cvsx-import'), 'click', function () { file.click(); });

		var drop = $('cvsx-drop');
		if (!drop) return;
		['dragenter', 'dragover'].forEach(function (ev) {
			on(drop, ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
		});
		['dragleave', 'drop'].forEach(function (ev) {
			on(drop, ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
		});
		on(drop, 'drop', function (e) {
			var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
			if (f) f.text().then(function (t) { importText(t, f.name); });
		});
	}

	/* ---------- boot ---------- */

	function boot() {
		var list = listProfiles();
		drawStats(list);

		on($('cvsx-q'), 'input', function (e) { state.q = e.target.value.trim(); draw(); });
		on($('cvsx-sort'), 'change', function (e) { state.sort = e.target.value; draw(); });

		Array.prototype.forEach.call(document.querySelectorAll('.cvsx-chipbtn'), function (chip) {
			on(chip, 'click', function () {
				state.status = chip.getAttribute('data-status');
				Array.prototype.forEach.call(document.querySelectorAll('.cvsx-chipbtn'), function (c) {
					c.classList.toggle('is-on', c === chip);
				});
				draw();
			});
		});

		on($('cvsx-backup'), 'click', function () {
			download('cv-sketch-backup-' + new Date().toISOString().slice(0, 10) + '.json',
				JSON.stringify({ app: 'cv-sketch', version: 1, exported: Date.now(), profiles: listProfiles() }, null, 2),
				'application/json');
			toast('Backup downloaded.');
		});

		on($('cvsx-clear'), 'click', function () {
			var msg = CFG.loggedIn
				? 'Clear the CVs saved in this browser? Your account copies stay safe and will sync back.'
				: 'Delete every CV saved in this browser? Download a backup first if you want to keep them.';
			if (!window.confirm(msg)) return;
			try { localStorage.removeItem(LS_KEY); localStorage.removeItem(CUR_KEY); } catch (e) { /* ignore */ }
			memoryStore = {};
			toast('Desk cleared.');
			draw();
		});

		wireImport();
		draw();
		if (CFG.loggedIn) syncAll();
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
	else boot();
})();
