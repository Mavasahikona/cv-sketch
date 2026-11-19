/* CV Sketch: page logic. Hooks into the Elementor pages by element id (data-interaction-id / data-id). */
(function () {
	'use strict';

	var C = window.CVSketch;
	var CFG = window.CVS_CONFIG || {};
	var PAGES = CFG.pages || {};
	if (!C || document.body.classList.contains('elementor-editor-active')) return;

	/* Element ids from the Elementor pages. If a page is rebuilt, update these. */
	var IDS = {
		workspace: {
			jsonBox: '3fd84ccf', jsonPlaceholder: '27e9eaee', validChip: '70fc3fb4', validIcon: '6f14cdea',
			validTitle: '7a5be5e5', validSub: '46d28ce5', readyTag: '45b028c9', errorChip: 'db67922',
			exampleBtn: '6cb83673', generateBtn: '3fb1f3c', copyBtn: '1e797985', saveSnippet: '1f745679',
			promptCode: '25391b77', codeWindow: '3c9b01c7', fileSize: '4ea7b8c1'
		},
		templates: {
			grid: '43bfffca', counter: '774575a', sortChip: '720c756f', rec: '6c898ea6',
			cards: ['7c8c3cdf', '40186502', '5b39dabb', '1cce89a1', '63c2aa57', '58c4bf20'],
			thumbs: ['16bd1477', '2ee007c9', '58df152c', '7ab713c4', '433bf948', '1b00bd9c'],
			chips: {
				all: '4727e4fa', ats: '3a5a1cdf', classic: '15278f6e', modern: '1a51d554', compact: '6bc78f7c',
				creative: '31c7c4c3', two: '2d18b675', photo: '5c4d4002', one: '42260f28'
			}
		},
		preview: {
			cv: '60f16a8b', compiled: '6b1e2aae', selBadge: '442b9d02', ats: '35b5831a', tbFit: '241ac0bf',
			tbGuides: '56e5ce4a', prev: '5af44882', next: '700c5a54', tplSelect: '6780f452', inkName: '5ee7b171',
			swatches: ['6ef9255e', '73e2117a', '1418b961', '18bf3461', '76a2e3b8'],
			sizes: { s: '3334a134', m: '5613a134', l: '22eb123e' },
			pcVal: '6f14390c', fitBadge: '13318e89', sections: '2f57ee99', dlPdf: '3fbc10e3', dlWord: '2f432d0',
			saveProf: '7980d91c', reqBadge: '24932629', reqNote: '70aa2d65', wmLink: '9c19fd7', mbDl: '1343ca5b',
			req: [
				{ box: '8b5978d', t: '2782de82', p: '149c8d85' },
				{ box: '3b7ba52e', t: '33ee7302', p: '51f69612' },
				{ box: '6aad1e2d', t: '3c101b7', p: 'cde4877' }
			]
		},
		profiles: {
			grid: '5927e6c9', newCard: '56ff16be', newBtn: '31d82af3', lead: '273785f', storage: '4e7ef03b',
			sync: '231e8dc5', backup: '751d0ae0', importBtn: '336d8b41', clear: '22fc0e07', log: '4fa729e',
			cards: [
				{ card: '6df75743', tag: '569afb87', t: '68f7fb91', e: '504d727a', tc: '594d7441', mn: '7bf96c84', ml: '7e360df7', mr: 'd04250c', mb: '4bb3eeb0', open: '19bcc111', dup: '27ad5d49', del: '11eb8925' },
				{ card: '6a5ae35b', tag: '3c7b9064', t: '28393aa5', e: '1d82764', tc: '4a52a910', mn: '26f90a64', ml: '41d0b72c', mr: '5a7b95e7', mb: 'bf81488', open: '11c3e32b', dup: '1335a444', del: '52f81a9a' },
				{ card: '4468b728', tag: '2d35a1f5', t: '1cce1dbe', e: '2b0e6f9b', tc: '173b8ceb', mn: '71b3dced', ml: '6689abbc', mr: 'dd46b84', mb: '37d0f340', open: '6213dd', dup: '78613179', del: '2f253b6b' }
			]
		},
		auth: {
			tabCreate: '41d1f225', tabLogin: '67b36ffb', title: '2c153538', sub: '5049e185', google: '2ac3f868',
			orRow: '6e618c64', emailLabel: '5f8bf1c4', emailInput: '512af5e0', emailText: '6a6b83af', pwLabel: '13b5ce8b',
			pwInput: '3a7a33cb', pwText: '992eed5', pwEye: '104a64ea', forgot: '529f8b34', error: '61df1fbb',
			errorText: '3ccc22fd', perk: '5d300790', submit: '4d72f63b', skip: '63f7434a', card: '3d41ded1'
		}
	};

	/* ---------- helpers ---------- */

	function byId(id, scope) {
		scope = scope || document;
		return scope.querySelector('[data-interaction-id="' + id + '"]') || scope.querySelector('[data-id="' + id + '"]');
	}
	function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
	function setText(el, text) { if (el) el.textContent = text; }
	function setHTML(el, html) { if (el) el.innerHTML = html; }
	function hide(el) { if (el) el.classList.add('cvs-hidden'); }
	function show(el) { if (el) el.classList.remove('cvs-hidden'); }
	function clickable(el, fn) {
		if (!el) return;
		el.classList.add('cvs-clickable');
		el.setAttribute('role', 'button');
		el.setAttribute('tabindex', '0');
		el.addEventListener('click', function (e) { e.preventDefault(); fn(e); });
		el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(e); } });
	}
	function param(name) { return new URLSearchParams(location.search).get(name); }
	function withParams(url, params) {
		var u = new URL(url, location.href);
		Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
		return u.toString();
	}
	function debounce(fn, ms) {
		var t;
		return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a); }, ms); };
	}
	function slugify(s) { return String(s || 'cv').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'cv'; }
	function newId() { return 'cv-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
	function ago(ts) {
		var s = Math.round((Date.now() - ts) / 1000);
		if (s < 60) return 'just now';
		if (s < 3600) return Math.round(s / 60) + ' min ago';
		if (s < 86400) return Math.round(s / 3600) + ' h ago';
		return new Date(ts).toLocaleDateString();
	}
	function niceDate(s) {
		var d = new Date(s);
		if (isNaN(d.getTime())) return s;
		return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	var toastEl, toastTimer;
	function toast(msg, isError) {
		if (!toastEl) {
			toastEl = document.createElement('div');
			toastEl.className = 'cvs-toast';
			toastEl.setAttribute('role', 'status');
			document.body.appendChild(toastEl);
		}
		toastEl.textContent = msg;
		toastEl.classList.toggle('is-error', !!isError);
		requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 3800);
	}

	function download(name, data, type) {
		var blob = data instanceof Blob ? data : new Blob([data], { type: type });
		var a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		document.body.appendChild(a);
		a.click();
		setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
	}

	function copyText(text) {
		if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
		return new Promise(function (resolve, reject) {
			var ta = document.createElement('textarea');
			ta.value = text;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			try { document.execCommand('copy') ? resolve() : reject(); } catch (e) { reject(e); }
			ta.remove();
		});
	}

	/* ---------- storage: browser first, account sync when logged in ---------- */

	var LS_KEY = 'cvs_profiles_v1';
	var CUR_KEY = 'cvs_current_v1';
	var memoryStore = {};

	function loadAll() {
		try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return memoryStore; }
	}
	function saveAll(map) {
		try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch (e) { memoryStore = map; toast('Your browser blocked saving. Your CV is only kept until you close this tab.', true); }
	}
	function listProfiles() {
		var m = loadAll();
		return Object.keys(m).map(function (k) { return m[k]; })
			.filter(function (p) { return p && !p.deleted && p.doc; })
			.sort(function (a, b) { return b.updated - a.updated; });
	}
	function getProfile(id) {
		var p = id ? loadAll()[id] : null;
		return p && !p.deleted && p.doc ? p : null;
	}
	function putProfile(p) {
		p.updated = Date.now();
		if (!p.created) p.created = p.updated;
		var m = loadAll();
		m[p.id] = p;
		saveAll(m);
		syncSoon([p]);
		return p;
	}
	function removeProfile(id) {
		var m = loadAll();
		m[id] = { id: id, deleted: true, updated: Date.now() };
		saveAll(m);
		if (currentId() === id) localStorage.removeItem(CUR_KEY);
		syncSoon([m[id]]);
	}
	function currentId() { try { return localStorage.getItem(CUR_KEY); } catch (e) { return null; } }
	function setCurrent(id) { try { localStorage.setItem(CUR_KEY, id); } catch (e) { /* ignore */ } }
	function titleOf(p) { return p.doc.target.jobTitle || p.doc.basics.label || 'Untitled CV'; }

	var syncState = 'off';
	var syncListeners = [];
	function setSyncState(s) { syncState = s; syncListeners.forEach(function (fn) { fn(s); }); }

	function sync(list) {
		if (!CFG.loggedIn || !CFG.restUrl) return Promise.resolve(null);
		setSyncState('syncing');
		return fetch(CFG.restUrl + 'sync', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': CFG.nonce },
			body: JSON.stringify({ profiles: list })
		}).then(function (r) {
			if (!r.ok) throw new Error('sync ' + r.status);
			return r.json();
		}).then(function (data) {
			var merged = {};
			(data.profiles || []).forEach(function (p) { merged[p.id] = p; });
			var local = loadAll();
			Object.keys(local).forEach(function (id) {
				if (!merged[id] || (local[id].updated || 0) > (merged[id].updated || 0)) merged[id] = local[id];
			});
			saveAll(merged);
			setSyncState('ok');
			return merged;
		}).catch(function (err) {
			if (window.console) console.warn('CV Sketch sync failed', err);
			setSyncState('error');
			return null;
		});
	}
	var pending = [];
	var flushSync = debounce(function () { var list = pending; pending = []; sync(list); }, 800);
	function syncSoon(list) { if (!CFG.loggedIn) return; pending = pending.concat(list); flushSync(); }
	function syncAll() {
		var m = loadAll();
		return sync(Object.keys(m).map(function (k) { return m[k]; }));
	}

	/* ---------- JSON parsing with friendly errors ---------- */

	function parseCv(text) {
		var t = String(text || '').trim();
		if (!t) return { ok: false, empty: true };
		t = t.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '');
		var first = t.indexOf('{');
		var last = t.lastIndexOf('}');
		if (first === -1) return { ok: false, syntax: true, msg: 'There\'s no JSON object here. It should start with {' };
		var prefixLines = t.slice(0, first).split('\n').length - 1;
		var body = last > first ? t.slice(first, last + 1) : t.slice(first);
		var obj;
		try {
			obj = JSON.parse(body);
		} catch (e) {
			var msg = String(e.message || '');
			var line = null;
			var m = /line (\d+)/i.exec(msg);
			if (m) line = parseInt(m[1], 10);
			else if ((m = /position (\d+)/i.exec(msg))) line = body.slice(0, parseInt(m[1], 10)).split('\n').length;
			if (/end of (json )?input|unterminated|unexpected end/i.test(msg) || last <= first) {
				return { ok: false, syntax: true, msg: 'The JSON looks cut off. Make sure you copied all of it, down to the last }' };
			}
			if (line != null) return { ok: false, syntax: true, msg: 'Line ' + (line + prefixLines) + ' looks broken, check the commas and quotes' };
			return { ok: false, syntax: true, msg: 'This isn\'t valid JSON yet, check the commas and quotes' };
		}
		if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, msg: 'That\'s JSON, but not a CV. It should be one object starting with {' };
		if (!obj.basics || typeof obj.basics !== 'object') return { ok: false, msg: 'The "basics" section is missing (your name and contact details)' };
		var doc = C.normalize(obj);
		if (!doc.basics.name) return { ok: false, msg: 'Add your name in basics.name so we know whose CV this is' };
		return { ok: true, doc: doc, raw: body };
	}

	/* ---------- CV rendering into a scaled stage ---------- */

	function mountStage(host, doc, settings, opts) {
		opts = opts || {};
		host.innerHTML = '<div class="cvs-stage"><div class="cvs-scaler">' + C.renderCV(doc, settings) + '</div></div>';
		var stage = host.firstChild;
		var scaler = stage.firstChild;
		function fit() {
			var w = stage.clientWidth || host.clientWidth;
			var s = opts.actual ? 1 : Math.min(1, w / 794);
			scaler.style.transform = 'scale(' + s + ')';
			var paper = scaler.firstChild;
			stage.style.height = opts.fixedHeight ? '' : Math.ceil(paper.offsetHeight * s) + 'px';
		}
		fit();
		if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
		if (window.ResizeObserver) {
			var lastW = -1;
			new ResizeObserver(function () {
				if (stage.clientWidth !== lastW) { lastW = stage.clientWidth; fit(); }
			}).observe(stage);
		}
		return { stage: stage, scaler: scaler, paper: scaler.firstChild, fit: fit };
	}

	function printCv(doc, settings) {
		var host = document.getElementById('cvs-print');
		if (!host) {
			host = document.createElement('div');
			host.id = 'cvs-print';
			document.body.appendChild(host);
		}
		host.innerHTML = C.renderCV(doc, settings);
		var oldTitle = document.title;
		document.title = (doc.basics.name || 'My') + ' - CV';
		document.body.classList.add('cvs-printing');
		function done() {
			document.body.classList.remove('cvs-printing');
			document.title = oldTitle;
			window.removeEventListener('afterprint', done);
		}
		window.addEventListener('afterprint', done);
		toast('In the print window, choose "Save as PDF" as the printer.');
		setTimeout(function () {
			var go = function () { window.print(); setTimeout(done, 1000); };
			if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
		}, 60);
	}

	function downloadWord(doc, settings) {
		var bytes = C.buildDocx(doc, settings);
		download(slugify(doc.basics.name) + '-cv.docx', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
		toast('Word file downloaded.');
	}

	/* ---------- header: Log in / Log out ---------- */

	function initHeader() {
		if (!CFG.loggedIn || !PAGES.auth) return;
		var authPath = new URL(PAGES.auth, location.href).pathname;
		Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
			var p;
			try { p = new URL(a.href, location.href).pathname; } catch (e) { return; }
			if (p === authPath && /log\s*in/i.test(a.textContent)) {
				a.textContent = 'Log out';
				a.href = CFG.logoutUrl;
			}
		});
	}

	/* ---------- Workspace ---------- */

	function initWorkspace() {
		var W = IDS.workspace;
		var box = byId(W.jsonBox);
		if (!box) return;

		var editing = param('new') ? null : getProfile(param('id') || currentId());
		var lastResult = { ok: false, empty: true };

		// Prompt panel
		var code = byId(W.promptCode);
		setText(code, C.PROMPT);
		var win = byId(W.codeWindow);
		if (win) win.style.overflow = 'auto';
		setText(byId(W.fileSize), (C.PROMPT.length / 1024).toFixed(1) + ' KB');

		var copyBtn = byId(W.copyBtn);
		var copyLabel = copyBtn ? copyBtn.innerHTML : '';
		on(copyBtn, 'click', function (e) {
			e.preventDefault();
			copyText(C.PROMPT).then(function () {
				copyBtn.innerHTML = '✓ Copied!';
				setTimeout(function () { copyBtn.innerHTML = copyLabel; }, 2000);
			}, function () { toast('Couldn\'t copy automatically. Select the prompt text and copy it.', true); });
		});
		clickable(byId(W.saveSnippet), function () { download('cv-sketch-prompt.txt', C.PROMPT, 'text/plain'); });

		// JSON box
		var ta = document.createElement('textarea');
		ta.className = 'cvs-textarea';
		ta.spellcheck = false;
		ta.setAttribute('aria-label', 'Paste the JSON your AI gave you');
		ta.placeholder = 'Paste the JSON your AI gave you...\n{\n  "basics": {\n    "name": "Alex Taylor",\n    "label": "Product Architect"\n  }\n}';
		box.innerHTML = '';
		box.appendChild(ta);
		on(ta, 'focus', function () { box.classList.add('cvs-focus'); });
		on(ta, 'blur', function () { box.classList.remove('cvs-focus'); });

		var chip = byId(W.validChip);
		var errorChip = byId(W.errorChip);
		var gen = byId(W.generateBtn);
		var icon = byId(W.validIcon);

		// The eraser: appears when the JSON is broken but fixable.
		var ERASER_SVG = '<svg class="cvs-eraser-icon" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">' +
			'<g transform="rotate(-35 16 16)"><rect x="3" y="10" width="26" height="12" rx="3" fill="#ffb3c1" stroke="#2d2d2d" stroke-width="2.5"/>' +
			'<rect x="18" y="10" width="11" height="12" rx="3" fill="#2d5da1" stroke="#2d2d2d" stroke-width="2.5"/>' +
			'<path d="M7 14h7" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/></g></svg>';
		var tools = document.createElement('div');
		tools.className = 'cvs-eraser-row cvs-hidden';
		tools.innerHTML = '<button type="button" class="cvs-eraser">' + ERASER_SVG + '<span class="cvs-eraser-text">Rub it out for me</span></button>' +
			'<span class="cvs-eraser-hint"></span>';
		var eraser = tools.querySelector('.cvs-eraser');
		var eraserHint = tools.querySelector('.cvs-eraser-hint');
		var undo = document.createElement('button');
		undo.type = 'button';
		undo.className = 'cvs-undo cvs-hidden';
		undo.textContent = '↶ Undo the fix';
		if (errorChip && errorChip.parentNode) {
			errorChip.parentNode.insertBefore(tools, errorChip.nextSibling);
			errorChip.parentNode.insertBefore(undo, tools.nextSibling);
		}
		var pendingFix = null;
		var beforeFix = null;
		var undoTimer;

		function offerFix(res) {
			pendingFix = null;
			var rep = C.repairJson(ta.value);
			if (rep && rep.notes.length) {
				var after = parseCv(rep.text);
				if (after.ok || res.syntax) pendingFix = { rep: rep, after: after };
			}
			if (pendingFix) {
				var n = pendingFix.rep.notes.length;
				eraserHint.textContent = n === 1 ? 'Found 1 thing to fix: ' + pendingFix.rep.notes[0] + '.' : 'Found ' + n + ' things to fix.';
				eraser.title = pendingFix.rep.notes.join('\n');
				show(tools);
				setHTML(errorChip, '✗ <u>' + C.esc(res.msg) + '</u>');
			} else {
				hide(tools);
				setHTML(errorChip, '✗ <u>' + C.esc(res.msg) + '</u>' + (res.syntax ? ' <span class="cvs-nofix">(too tangled to fix automatically; ask your AI to send it again)</span>' : ''));
			}
		}

		on(eraser, 'click', function () {
			if (!pendingFix) return;
			var fix = pendingFix;
			eraser.classList.add('is-rubbing');
			box.classList.add('cvs-erasing');
			setTimeout(function () {
				beforeFix = ta.value;
				var obj = JSON.parse(fix.rep.text);
				ta.value = JSON.stringify(obj, null, 2);
				eraser.classList.remove('is-rubbing');
				box.classList.remove('cvs-erasing');
				render(parseCv(ta.value));
				var list = fix.rep.notes.slice(0, 3).join(', ') + (fix.rep.notes.length > 3 ? ', and ' + (fix.rep.notes.length - 3) + ' more' : '');
				toast(fix.rep.truncated
					? 'Fixed: ' + list + '. Your JSON looked cut off, so check the last section is complete.'
					: 'All clean! ' + list.charAt(0).toUpperCase() + list.slice(1) + '.', fix.rep.truncated);
				show(undo);
				clearTimeout(undoTimer);
				undoTimer = setTimeout(function () { hide(undo); }, 20000);
			}, 650);
		});
		on(undo, 'click', function () {
			if (beforeFix == null) return;
			ta.value = beforeFix;
			beforeFix = null;
			hide(undo);
			render(parseCv(ta.value));
		});

		function render(res) {
			lastResult = res;
			if (res.ok || res.empty) hide(tools);
			if (res.ok) {
				show(chip); hide(errorChip);
				var parts = C.sectionReport(res.doc);
				setText(byId(W.validTitle), 'Valid JSON, ' + parts.length + ' sections found');
				setText(byId(W.validSub), parts.join(', '));
				setText(byId(W.readyTag), 'READY');
				setText(icon, '✓');
				if (icon) icon.style.backgroundColor = '#58a36c';
				gen && gen.classList.remove('cvs-disabled');
				gen && gen.removeAttribute('aria-disabled');
			} else if (res.empty) {
				show(chip); hide(errorChip);
				setText(byId(W.validTitle), 'Waiting for your JSON');
				setText(byId(W.validSub), 'Paste it above, or load the example to try things out.');
				setText(byId(W.readyTag), 'WAITING');
				setText(icon, '…');
				if (icon) icon.style.backgroundColor = '#e5e0d8';
				gen && gen.classList.add('cvs-disabled');
				gen && gen.setAttribute('aria-disabled', 'true');
			} else {
				hide(chip); show(errorChip);
				offerFix(res);
				gen && gen.classList.add('cvs-disabled');
				gen && gen.setAttribute('aria-disabled', 'true');
			}
		}
		var check = debounce(function () { render(parseCv(ta.value)); }, 250);
		on(ta, 'input', function () { hide(undo); beforeFix = null; check(); });

		on(byId(W.exampleBtn), 'click', function (e) {
			e.preventDefault();
			editing = null;
			ta.value = JSON.stringify(C.EXAMPLE, null, 2);
			render(parseCv(ta.value));
		});

		on(gen, 'click', function (e) {
			e.preventDefault();
			var res = parseCv(ta.value);
			render(res);
			if (!res.ok) { toast(pendingFix ? 'Tap the eraser to fix the JSON first, then generate.' : 'Fix the JSON first, then generate.', true); return; }
			var p = editing || { id: newId(), settings: C.defaultSettings() };
			p.doc = res.doc;
			p.raw = res.raw;
			putProfile(p);
			setCurrent(p.id);
			location.href = PAGES.templates || gen.href;
		});

		if (editing) ta.value = editing.raw || JSON.stringify(editing.doc, null, 2);
		render(parseCv(ta.value));
	}

	/* ---------- Templates ---------- */

	function initTemplates() {
		var T = IDS.templates;
		var grid = byId(T.grid);
		if (!grid) return;

		var profile = getProfile(currentId());
		var doc = profile ? profile.doc : C.normalize(C.EXAMPLE);
		var baseSettings = profile ? profile.settings : C.defaultSettings();

		setText(byId(T.counter), C.TEMPLATES.length + ' templates');
		setText(byId(T.rec), '★ SAFEST FOR ATS');

		var cards = T.cards.map(function (id, i) {
			var el = byId(id);
			var tpl = C.TEMPLATES[i];
			if (!el || !tpl) return null;
			el.href = withParams(PAGES.preview || el.href, { template: tpl.id });
			var thumb = byId(T.thumbs[i], el);
			if (thumb) {
				thumb.classList.add('cvs-thumb');
				var s = Object.assign({}, baseSettings, { template: tpl.id });
				var st = mountStage(thumb, doc, s, { fixedHeight: true });
				window.addEventListener('resize', st.fit);
			}
			el.setAttribute('data-cvs-tags', tpl.tags.join(' '));
			return { el: el, tpl: tpl, index: i };
		}).filter(Boolean);

		// Templates 7+ have no Elementor card, so draw their cards here and drop them into the same grid.
		var TAG_LABELS = { ats: 'ATS plain', classic: 'Classic', modern: 'Modern', compact: 'Compact', creative: 'Creative', two: 'Two column', photo: 'Photo', one: 'One page' };
		var allCards = cards.slice();
		C.TEMPLATES.slice(T.cards.length).forEach(function (tpl, i) {
			var el = document.createElement('a');
			el.className = 'cvs-gcard';
			el.href = withParams(PAGES.preview || location.href, { template: tpl.id });
			el.setAttribute('data-cvs-tags', tpl.tags.join(' '));
			el.innerHTML = '<span class="cvs-gbadge">New</span><div class="cvs-gthumb"></div>' +
				'<div class="cvs-gmeta"><h3 class="cvs-gname"></h3><div class="cvs-gtags"></div></div>' +
				'<span class="cvs-gcta">Use this template →</span>';
			el.querySelector('.cvs-gname').textContent = tpl.name;
			el.querySelector('.cvs-gtags').textContent = tpl.tags.map(function (t) { return TAG_LABELS[t] || t; }).join(' · ');
			grid.appendChild(el);
			var thumb2 = el.querySelector('.cvs-gthumb');
			var s2 = Object.assign({}, baseSettings, { template: tpl.id });
			var st2 = mountStage(thumb2, doc, s2, { fixedHeight: true });
			window.addEventListener('resize', st2.fit);
			allCards.push({ el: el, tpl: tpl, index: T.cards.length + i });
		});

		// Filters
		var active = 'all';
		var chipEls = {};
		Object.keys(T.chips).forEach(function (key) {
			var chip = byId(T.chips[key]);
			if (!chip) return;
			chipEls[key] = chip;
			clickable(chip, function () {
				active = key;
				Object.keys(chipEls).forEach(function (k) { chipEls[k].classList.toggle('sk-chip-on', k === key); });
				var shown = 0;
				allCards.forEach(function (c) {
					var match = key === 'all' || c.tpl.tags.indexOf(key) !== -1;
					c.el.classList.toggle('cvs-hidden', !match);
					if (match) shown++;
				});
				setText(byId(T.counter), shown + (shown === 1 ? ' template' : ' templates'));
			});
		});
		grid.style.gridTemplateRows = 'none';

		// Sort toggle
		var sortChip = byId(T.sortChip);
		var az = false;
		clickable(sortChip, function () {
			az = !az;
			setText(sortChip, az ? '≡ A–Z ▾' : '≡ Most popular ▾');
			allCards.slice().sort(function (a, b) {
				return az ? a.tpl.name.localeCompare(b.tpl.name) : a.index - b.index;
			}).forEach(function (c) { grid.appendChild(c.el); });
		});
	}

	/* ---------- Preview & Download ---------- */

	function initPreview() {
		var P = IDS.preview;
		var cvEl = byId(P.cv);
		if (!cvEl) return;

		var profile = getProfile(param('id') || currentId());
		var demo = !profile;
		var doc = profile ? profile.doc : C.normalize(C.EXAMPLE);
		var settings = Object.assign(C.defaultSettings(), profile ? profile.settings : {});
		var t = param('template');
		if (t) settings.template = C.getTemplate(t).id;
		if (profile) { setCurrent(profile.id); if (t) { profile.settings = settings; putProfile(profile); } }

		var save = debounce(function () {
			if (!profile) return;
			profile.settings = settings;
			putProfile(profile);
		}, 400);

		// Stage inside the existing paper frame (keep the tape strips)
		Array.prototype.slice.call(cvEl.children).forEach(function (child) {
			if (!child.classList.contains('sk-tape')) child.remove();
		});
		cvEl.style.padding = '14px';
		var host = document.createElement('div');
		cvEl.appendChild(host);
		var notice;
		if (demo) {
			notice = document.createElement('div');
			notice.className = 'cvs-notice';
			notice.innerHTML = 'This is an example CV. <a href="' + C.esc(PAGES.workspace || '#') + '">Paste your own JSON in the Workspace</a> to see yours here.';
			cvEl.insertBefore(notice, host);
		}
		var view = { actual: false, guides: false };
		var st;

		function draw() {
			st = mountStage(host, doc, settings, { actual: view.actual });
			st.stage.classList.toggle('is-actual', view.actual);
			st.stage.classList.toggle('cvs-guides', view.guides);
			var pages = Math.max(1, Math.ceil((st.paper.scrollHeight - 2) / 1123));
			setText(byId(P.pcVal), pages + (pages === 1 ? ' page ✓' : ' pages'));
			setText(byId(P.fitBadge), '📄 ' + pages + '-Page' + (pages === 1 ? ' Fit' : 's'));
			var tpl = C.getTemplate(settings.template);
			var idx = C.TEMPLATES.indexOf(tpl) + 1;
			setText(byId(P.selBadge), '#' + idx + ' Selected');
			if (select) select.value = tpl.id;
			setText(byId(P.inkName), C.getAccent(settings.accent).name);
			markSwatches();
			markSizes();
		}
		window.addEventListener('resize', debounce(function () { if (st) st.fit(); }, 120));

		// Header info
		setHTML(byId(P.compiled), '<span>●</span> ' + (demo ? 'Showing the example CV' : 'Compiled from <strong>' + C.esc(titleOf(profile)) + '</strong> • saved ' + C.esc(ago(profile.updated))));
		var score = C.completeness(doc);
		setHTML(byId(P.ats), '⚙ Completeness: <strong>' + score + '/100</strong> • <span>' + (score >= 80 ? 'Ready to send' : 'Could be stronger') + '</span>');

		// Template switcher
		var selHost = byId(P.tplSelect);
		var select = null;
		if (selHost) {
			select = document.createElement('select');
			select.className = 'cvs-select';
			select.setAttribute('aria-label', 'Template');
			C.TEMPLATES.forEach(function (tp, i) {
				var o = document.createElement('option');
				o.value = tp.id;
				o.textContent = tp.name + ' (#' + (i + 1) + ' of ' + C.TEMPLATES.length + ')';
				select.appendChild(o);
			});
			selHost.innerHTML = '';
			selHost.appendChild(select);
			on(select, 'change', function () { settings.template = select.value; draw(); save(); });
		}
		function step(dir) {
			var i = C.TEMPLATES.indexOf(C.getTemplate(settings.template));
			settings.template = C.TEMPLATES[(i + dir + C.TEMPLATES.length) % C.TEMPLATES.length].id;
			draw(); save();
		}
		clickable(byId(P.prev), function () { step(-1); });
		clickable(byId(P.next), function () { step(1); });

		// Accent swatches
		var sw = P.swatches.map(function (id) { return byId(id); });
		function markSwatches() {
			sw.forEach(function (el, i) {
				if (!el) return;
				var selected = C.ACCENTS[i] && C.ACCENTS[i].id === settings.accent;
				el.style.boxShadow = selected ? '0 0 0 3px #fff9c4, 0 0 0 6px #2d2d2d' : 'none';
			});
		}
		sw.forEach(function (el, i) {
			if (el) {
				el.setAttribute('aria-label', C.ACCENTS[i].name);
				clickable(el, function () { settings.accent = C.ACCENTS[i].id; draw(); save(); });
			}
		});

		// Size toggle
		var sizeEls = { s: byId(P.sizes.s), m: byId(P.sizes.m), l: byId(P.sizes.l) };
		function markSizes() {
			Object.keys(sizeEls).forEach(function (k) {
				var el = sizeEls[k];
				if (!el) return;
				var selected = settings.size === k;
				el.style.backgroundColor = selected ? '#fff9c4' : 'transparent';
				el.style.borderColor = selected ? '#2d2d2d' : 'transparent';
				el.style.borderStyle = 'solid';
				el.style.borderWidth = '2px';
				el.style.borderRadius = '8px';
				el.style.boxShadow = selected ? '2px 2px 0 #2d2d2d' : 'none';
				el.style.fontWeight = selected ? '800' : '600';
			});
		}
		Object.keys(sizeEls).forEach(function (k) {
			clickable(sizeEls[k], function () { settings.size = k; draw(); save(); });
		});

		// Section toggles
		var secHost = byId(P.sections);
		if (secHost) {
			var available = C.SECTIONS.filter(function (s) { return C.hasSection(doc, s.key); });
			var wrap = document.createElement('span');
			wrap.className = 'cvs-checks';
			available.forEach(function (s) {
				var label = document.createElement('label');
				var cb = document.createElement('input');
				cb.type = 'checkbox';
				cb.checked = (settings.hidden || []).indexOf(s.key) === -1;
				on(cb, 'change', function () {
					var h = (settings.hidden || []).filter(function (k) { return k !== s.key; });
					if (!cb.checked) h.push(s.key);
					settings.hidden = h;
					draw(); save();
				});
				label.appendChild(cb);
				label.appendChild(document.createTextNode(s.label));
				wrap.appendChild(label);
			});
			secHost.innerHTML = '';
			secHost.appendChild(wrap);
		}

		// View tools
		var fitEl = byId(P.tbFit);
		clickable(fitEl, function () { view.actual = !view.actual; setText(fitEl, view.actual ? '⌕ Actual size' : '⌕ 100% Fit'); draw(); });
		var guideEl = byId(P.tbGuides);
		clickable(guideEl, function () { view.guides = !view.guides; setText(guideEl, view.guides ? '◉ Hide page breaks' : '◎ Show page breaks'); draw(); });
		setText(guideEl, '◎ Show page breaks');
		var rawLink = byId('6d224f9d');
		if (rawLink && profile) rawLink.href = withParams(PAGES.workspace || rawLink.href, { id: profile.id });

		// Downloads
		function pdf(e) { if (e) e.preventDefault(); printCv(doc, settings); }
		on(byId(P.dlPdf), 'click', pdf);
		on(byId(P.mbDl), 'click', pdf);
		on(byId(P.dlWord), 'click', function (e) { e.preventDefault(); downloadWord(doc, settings); });
		on(byId(P.saveProf), 'click', function (e) {
			e.preventDefault();
			if (demo) {
				var p = { id: newId(), doc: doc, raw: JSON.stringify(C.EXAMPLE, null, 2), settings: settings };
				putProfile(p);
				setCurrent(p.id);
			} else {
				profile.settings = settings;
				putProfile(profile);
			}
			toast('Saved to My Profiles.');
			setTimeout(function () { location.href = PAGES.profiles; }, 700);
		});
		var wm = byId(P.wmLink);
		clickable(wm, function () {
			download(slugify(doc.basics.name) + '-cv.json', (profile && profile.raw) || JSON.stringify(doc, null, 2), 'application/json');
		});

		// Requirements check
		var protos = P.req.map(function (r) {
			var el = byId(r.box);
			return el ? { el: el, ids: r } : null;
		});
		if (protos[0] && protos[1] && protos[2]) {
			var parent = protos[0].el.parentNode;
			var anchor = protos[2].el.nextSibling;
			var tplFor = { met: protos[0], partial: protos[1], missing: protos[2] };
			var items = doc.requirements.length ? doc.requirements : [{
				requirement: 'No requirements in this JSON',
				status: 'partial',
				note: 'Our prompt asks your AI to compare the job with your background. Paste a fresh answer to see the check here.'
			}];
			var made = items.map(function (r) {
				var proto = tplFor[r.status] || tplFor.partial;
				var el = proto.el.cloneNode(true);
				setText(byId(proto.ids.t, el), (r.status === 'missing' && doc.requirements.length ? 'Not met: ' : '') + r.requirement);
				setText(byId(proto.ids.p, el), r.note || (r.status === 'met' ? 'Covered by your CV.' : ''));
				return el;
			});
			protos.forEach(function (p) { p.el.remove(); });
			made.forEach(function (el) { parent.insertBefore(el, anchor); });
			var count = { met: 0, partial: 0, missing: 0 };
			doc.requirements.forEach(function (r) { count[r.status]++; });
			setText(byId(P.reqBadge), doc.requirements.length ? count.met + ' met • ' + count.partial + ' partial • ' + count.missing + ' missing' : 'No job data yet');
		}

		draw();
	}

	/* ---------- My Profiles ---------- */

	function initProfiles() {
		var R = IDS.profiles;
		var grid = byId(R.grid);
		if (!grid) return;

		var protos = R.cards.map(function (c) {
			var el = byId(c.card);
			if (!el) return null;
			var copy = el.cloneNode(true);
			el.remove();
			return { el: copy, ids: c };
		}).filter(Boolean);
		var newCard = byId(R.newCard);
		var newBtn = byId(R.newBtn);
		if (newBtn) newBtn.href = withParams(PAGES.workspace || newBtn.href, { 'new': '1' });
		grid.style.gridTemplateRows = 'none';
		var rendered = [];

		function tagFor(p) {
			var t = p.doc.target;
			if (t.status === 'submitted') return { text: '✓ Submitted', green: true };
			if (t.deadline) return { text: '📅 Apply by ' + niceDate(t.deadline), green: false };
			return { text: '✎ Draft • ' + ago(p.updated), green: false };
		}

		function draw() {
			rendered.forEach(function (el) { el.remove(); });
			rendered = [];
			var list = listProfiles();
			list.forEach(function (p, i) {
				if (!protos.length) return;
				var proto = protos[i % protos.length];
				var el = proto.el.cloneNode(true);
				var ids = proto.ids;
				var d = p.doc;
				var tag = tagFor(p);
				var tagEl = byId(ids.tag, el);
				setText(tagEl, tag.text);
				if (tagEl) {
					tagEl.classList.toggle('sk-badge-green', tag.green);
					tagEl.title = 'Click to mark as submitted / not submitted';
					clickable(tagEl, function () {
						d.target.status = d.target.status === 'submitted' ? '' : 'submitted';
						putProfile(p);
						draw();
					});
				}
				setText(byId(ids.t, el), titleOf(p));
				setHTML(byId(ids.e, el), '<strong>' + C.esc(d.target.company || d.basics.name) + '</strong>' +
					(d.target.location ? ' • ' + C.esc(d.target.location) : ''));
				setText(byId(ids.tc, el), C.getTemplate((p.settings || {}).template).name);
				setText(byId(ids.mn, el), (d.basics.name || '').toUpperCase());
				setText(byId(ids.ml, el), d.basics.location);
				setText(byId(ids.mr, el), d.basics.label);
				var w = d.work[0];
				setHTML(byId(ids.mb, el), w ? '<strong>' + C.esc(w.position) + (w.company ? ' • ' + C.esc(w.company) : '') + '</strong>' +
					(w.highlights[0] ? ' — ' + C.esc(w.highlights[0]) : '') : C.esc(d.basics.summary));
				var open = byId(ids.open, el);
				if (open) {
					open.href = withParams(PAGES.preview || open.href, { id: p.id });
					on(open, 'click', function () { setCurrent(p.id); });
				}
				clickable(byId(ids.dup, el), function () {
					var copy = JSON.parse(JSON.stringify(p));
					copy.id = newId();
					copy.created = 0;
					copy.doc.target.jobTitle = titleOf(p) + ' (copy)';
					copy.doc.target.status = '';
					putProfile(copy);
					toast('Duplicated.');
					draw();
				});
				clickable(byId(ids.del, el), function () {
					if (!window.confirm('Delete "' + titleOf(p) + '"? This can\'t be undone.')) return;
					removeProfile(p.id);
					toast('Deleted.');
					draw();
				});
				grid.insertBefore(el, newCard);
				rendered.push(el);
			});
			setText(byId(R.lead), list.length ? 'All your crafted CV variations, saved in this browser' + (CFG.loggedIn ? ' and synced to your account.' : '.') : 'Nothing here yet. Paste your first job.');
			setHTML(byId(R.storage), '<span>●</span> ' + list.length + (list.length === 1 ? ' CV' : ' CVs') + ' saved in this browser');
			var newest = list[0];
			setText(byId(R.log), newest ? 'Saved on this device • Last change ' + ago(newest.updated) : 'Saved on this device • Nothing saved yet');
			drawSync();
		}

		var syncEl = byId(R.sync);
		function drawSync() {
			if (!syncEl) return;
			if (!CFG.loggedIn) {
				setHTML(syncEl, '○ Account sync: off • <a href="' + C.esc(PAGES.auth) + '">log in to sync</a>');
				return;
			}
			var who = CFG.userName ? ' (' + C.esc(CFG.userName) + ')' : '';
			var text = { syncing: '⟳ Syncing with your account…', ok: '✓ Synced to your account' + who, error: '⚠ Sync failed, saved in this browser only', off: '✓ Account sync on' + who };
			setHTML(syncEl, text[syncState] || text.off);
		}
		syncListeners.push(function (s) { drawSync(); if (s === 'ok') draw(); });

		// Backup / import / clear
		clickable(byId(R.backup), function () {
			download('cv-sketch-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'cv-sketch', version: 1, profiles: listProfiles() }, null, 2), 'application/json');
		});
		var file = document.createElement('input');
		file.type = 'file';
		file.accept = '.json,application/json';
		file.style.display = 'none';
		document.body.appendChild(file);
		clickable(byId(R.importBtn), function () { file.click(); });
		on(file, 'change', function () {
			var f = file.files && file.files[0];
			if (!f) return;
			f.text().then(function (text) {
				var added = 0;
				var data;
				try { data = JSON.parse(text); } catch (e) { data = null; }
				if (data && Array.isArray(data.profiles)) {
					data.profiles.forEach(function (p) {
						if (!p || !p.doc || !p.doc.basics) return;
						putProfile({ id: newId(), doc: C.normalize(p.doc), raw: p.raw || '', settings: Object.assign(C.defaultSettings(), p.settings || {}) });
						added++;
					});
				} else {
					var res = parseCv(text);
					if (!res.ok) {
						var rep = C.repairJson(text);
						if (rep) res = parseCv(JSON.stringify(JSON.parse(rep.text), null, 2));
					}
					if (res.ok) { putProfile({ id: newId(), doc: res.doc, raw: res.raw, settings: C.defaultSettings() }); added = 1; }
				}
				toast(added ? 'Imported ' + added + (added === 1 ? ' CV.' : ' CVs.') : 'That file isn\'t a CV Sketch backup or CV JSON.', !added);
				file.value = '';
				draw();
			});
		});
		clickable(byId(R.clear), function () {
			var msg = CFG.loggedIn ? 'Remove all CVs from this browser? Copies in your account stay safe.' : 'Delete all CVs saved in this browser? Download a backup first if you want to keep them.';
			if (!window.confirm(msg)) return;
			try { localStorage.removeItem(LS_KEY); localStorage.removeItem(CUR_KEY); } catch (e) { /* ignore */ }
			memoryStore = {};
			toast('Desk cleared.');
			draw();
		});

		draw();
	}

	/* ---------- Sign up / Log in ---------- */

	function initAuth() {
		var A = IDS.auth;
		var submit = byId(A.submit);
		if (!submit || !byId(A.emailInput)) return;

		hide(byId(A.google));
		hide(byId(A.orRow));
		var forgot = byId(A.forgot);
		if (forgot && CFG.lostUrl) forgot.href = CFG.lostUrl;

		var errBox = byId(A.error);
		var errText = byId(A.errorText);
		hide(errBox);
		function fail(msg) {
			setHTML(errText, C.esc(msg));
			show(errBox);
		}

		if (CFG.loggedIn) {
			setText(byId(A.title), 'You\'re signed in.');
			setText(byId(A.sub), 'As ' + (CFG.userName || 'you') + '. Your CVs sync to this account automatically.');
			[A.emailLabel, A.emailInput, A.pwLabel, A.pwInput, A.tabLogin].forEach(function (id) { hide(byId(id)); });
			setText(byId(A.tabCreate), '● Your account');
			submit.textContent = 'Go to My Profiles →';
			submit.href = PAGES.profiles;
			var skip = byId(A.skip);
			if (skip) { skip.textContent = 'Log out'; skip.href = CFG.logoutUrl; }
			return;
		}

		// Real inputs
		var email = document.createElement('input');
		email.type = 'email';
		email.className = 'cvs-field';
		email.autocomplete = 'email';
		email.placeholder = 'you@example.com';
		email.setAttribute('aria-label', 'Email address');
		var emailText = byId(A.emailText);
		if (emailText) emailText.replaceWith(email);

		var pw = document.createElement('input');
		pw.type = 'password';
		pw.className = 'cvs-field';
		pw.autocomplete = 'new-password';
		pw.placeholder = 'At least 8 characters';
		pw.setAttribute('aria-label', 'Password');
		var pwText = byId(A.pwText);
		if (pwText) pwText.replaceWith(pw);

		var pwBox = byId(A.pwInput);
		var emailBox = byId(A.emailInput);
		if (pwBox) pwBox.style.borderColor = '#2d2d2d';
		[[email, emailBox], [pw, pwBox]].forEach(function (pair) {
			on(pair[0], 'focus', function () { pair[1] && pair[1].classList.add('cvs-focus'); });
			on(pair[0], 'blur', function () { pair[1] && pair[1].classList.remove('cvs-focus'); });
			on(pair[0], 'input', function () { pair[1] && pair[1].classList.remove('cvs-invalid'); hide(errBox); });
			on(pair[0], 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
		});
		clickable(byId(A.pwEye), function () { pw.type = pw.type === 'password' ? 'text' : 'password'; });

		var honey = document.createElement('input');
		honey.type = 'text';
		honey.name = 'website';
		honey.tabIndex = -1;
		honey.autocomplete = 'off';
		honey.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
		honey.setAttribute('aria-hidden', 'true');
		(byId(A.card) || document.body).appendChild(honey);

		// Tabs
		var mode = param('mode') === 'login' || location.hash === '#login' ? 'login' : 'register';
		var tabCreate = byId(A.tabCreate);
		var tabLogin = byId(A.tabLogin);
		function setMode(m) {
			mode = m;
			if (tabCreate) tabCreate.classList.toggle('sk-chip-on', m === 'register');
			if (tabLogin) tabLogin.classList.toggle('sk-chip-on', m === 'login');
			if (tabCreate) tabCreate.innerHTML = (m === 'register' ? '<span>●</span> ' : '') + 'Create account';
			if (tabLogin) tabLogin.innerHTML = (m === 'login' ? '<span style="color:#d62828">●</span> ' : '') + 'Log in';
			setText(byId(A.title), m === 'register' ? 'Draft your future.' : 'Welcome back.');
			setText(byId(A.sub), m === 'register' ? 'Free forever. An account just keeps your CVs synced across devices.' : 'Log in to pick up your saved CVs on any device.');
			submit.textContent = m === 'register' ? 'Create your free account →' : 'Log in →';
			pw.autocomplete = m === 'register' ? 'new-password' : 'current-password';
			pw.placeholder = m === 'register' ? 'At least 8 characters' : 'Your password';
			hide(byId(A.perk));
			if (m === 'register') show(byId(A.perk));
			hide(errBox);
		}
		clickable(tabCreate, function () { setMode('register'); });
		clickable(tabLogin, function () { setMode('login'); });
		setMode(mode);

		var busy = false;
		function go() {
			if (busy) return;
			var em = email.value.trim();
			var pass = pw.value;
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { emailBox && emailBox.classList.add('cvs-invalid'); fail('That email address doesn\'t look right.'); return; }
			if (mode === 'register' && pass.length < 8) { pwBox && pwBox.classList.add('cvs-invalid'); fail('Password needs at least 8 characters.'); return; }
			if (!pass) { pwBox && pwBox.classList.add('cvs-invalid'); fail('Type your password.'); return; }
			busy = true;
			var label = submit.textContent;
			submit.textContent = 'One moment…';
			submit.classList.add('cvs-disabled');
			fetch(CFG.restUrl + (mode === 'register' ? 'register' : 'login'), {
				method: 'POST',
				credentials: 'same-origin',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: em, password: pass, website: honey.value })
			}).then(function (r) {
				return r.json().then(function (data) { return { ok: r.ok, data: data }; });
			}).then(function (res) {
				if (!res.ok) throw new Error((res.data && res.data.message) || 'Something went wrong. Please try again.');
				toast(mode === 'register' ? 'Account created. Welcome!' : 'Logged in.');
				location.href = param('redirect_to') || PAGES.profiles;
			}).catch(function (err) {
				fail(err.message || 'Something went wrong. Please try again.');
				busy = false;
				submit.textContent = label;
				submit.classList.remove('cvs-disabled');
			});
		}
		on(submit, 'click', function (e) { e.preventDefault(); go(); });
	}

	/* ---------- boot ---------- */

	initHeader();
	initWorkspace();
	initTemplates();
	initPreview();
	initProfiles();
	initAuth();
	if (CFG.loggedIn) syncAll();
})();
