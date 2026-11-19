/* CV Sketch: CV data model, templates and Word export. No dependencies. */
(function (root) {
	'use strict';

	/* ---------- helpers ---------- */

	function esc(s) {
		return String(s == null ? '' : s)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}
	function str(x) {
		if (x == null) return '';
		if (typeof x === 'object') return '';
		return String(x).trim();
	}
	function arr(x) {
		if (Array.isArray(x)) return x;
		return x == null || x === '' ? [] : [x];
	}
	function compact(list) {
		return list.filter(function (x) { return x && String(x).trim() !== ''; });
	}

	var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	function fmtDate(s) {
		s = str(s);
		var m = /^(\d{4})-(\d{1,2})/.exec(s);
		if (m) {
			var mi = parseInt(m[2], 10) - 1;
			return (MONTHS[mi] || '') + ' ' + m[1];
		}
		return s;
	}
	function range(start, end, ongoingIfEmpty) {
		var a = fmtDate(start);
		var b = fmtDate(end);
		if (!b && a && ongoingIfEmpty) b = 'Present';
		if (a && b) return a + ' – ' + b;
		return a || b;
	}

	/* ---------- data model ---------- */

	function location(x) {
		if (x && typeof x === 'object') {
			return compact([str(x.city), str(x.region), str(x.countryCode || x.country)]).join(', ');
		}
		return str(x);
	}

	function normStatus(s) {
		s = str(s).toLowerCase();
		if (/^(met|yes|true|full|matched|strong)/.test(s)) return 'met';
		if (/^(partial|partly|some|weak|maybe)/.test(s)) return 'partial';
		return 'missing';
	}

	// Accepts our schema and the common JSON Resume variations, returns one shape.
	function normalize(o) {
		var b = o.basics && typeof o.basics === 'object' ? o.basics : {};
		var t = o.target && typeof o.target === 'object' ? o.target : {};
		var img = str(b.image || b.picture || b.photo);
		if (img && !/^(https?:\/\/|data:image\/)/i.test(img)) img = '';

		return {
			target: {
				jobTitle: str(t.jobTitle || t.title || t.role || t.position),
				company: str(t.company || t.employer || t.organisation || t.organization),
				location: location(t.location),
				deadline: str(t.deadline || t.closingDate || t.applyBy),
				status: str(t.status).toLowerCase()
			},
			basics: {
				name: str(b.name),
				label: str(b.label || b.title || b.headline),
				email: str(b.email),
				phone: str(b.phone),
				url: str(b.url || b.website),
				location: location(b.location),
				summary: str(b.summary || o.summary),
				image: img,
				profiles: compact(arr(b.profiles).map(function (p) {
					if (typeof p === 'string') return p;
					return str(p && (p.url || p.username));
				}))
			},
			work: arr(o.work || o.experience).filter(Boolean).map(function (w) {
				return {
					position: str(w.position || w.title || w.role),
					company: str(w.company || w.name || w.employer || w.organization),
					location: location(w.location),
					startDate: str(w.startDate || w.start),
					endDate: str(w.endDate || w.end),
					summary: str(w.summary || w.description),
					highlights: compact(arr(w.highlights || w.bullets || w.achievements).map(str))
				};
			}),
			education: arr(o.education).filter(Boolean).map(function (e) {
				return {
					institution: str(e.institution || e.school || e.university),
					studyType: str(e.studyType || e.degree),
					area: str(e.area || e.field || e.major),
					startDate: str(e.startDate || e.start),
					endDate: str(e.endDate || e.end),
					score: str(e.score || e.grade || e.honors)
				};
			}),
			skills: arr(o.skills).filter(Boolean).map(function (s) {
				if (typeof s === 'string') return { name: s.trim(), keywords: [] };
				return { name: str(s.name), keywords: compact(arr(s.keywords).map(str)) };
			}),
			projects: arr(o.projects).filter(Boolean).map(function (p) {
				return {
					name: str(p.name),
					description: str(p.description || p.summary),
					url: str(p.url),
					highlights: compact(arr(p.highlights).map(str))
				};
			}),
			certificates: arr(o.certificates || o.certifications || o.awards).filter(Boolean).map(function (c) {
				if (typeof c === 'string') return { name: c, issuer: '', date: '' };
				return { name: str(c.name || c.title), issuer: str(c.issuer || c.awarder), date: str(c.date) };
			}),
			languages: arr(o.languages).filter(Boolean).map(function (l) {
				if (typeof l === 'string') return { language: l, fluency: '' };
				return { language: str(l.language || l.name), fluency: str(l.fluency || l.level) };
			}),
			references: arr(o.references).filter(Boolean).map(function (r) {
				if (typeof r === 'string') return { name: r, reference: '' };
				return { name: str(r.name), reference: str(r.reference || r.contact) };
			}),
			requirements: arr(o.requirements).filter(Boolean).map(function (r) {
				if (typeof r === 'string') return { requirement: r, status: 'partial', note: '' };
				return {
					requirement: str(r.requirement || r.item || r.name),
					status: normStatus(r.status),
					note: str(r.note || r.evidence || r.comment)
				};
			})
		};
	}

	var SECTIONS = [
		{ key: 'summary', label: 'Summary' },
		{ key: 'work', label: 'Experience' },
		{ key: 'skills', label: 'Skills' },
		{ key: 'education', label: 'Education' },
		{ key: 'projects', label: 'Projects' },
		{ key: 'certificates', label: 'Certifications' },
		{ key: 'languages', label: 'Languages' },
		{ key: 'references', label: 'References' }
	];

	function hasSection(doc, key) {
		if (key === 'summary') return !!doc.basics.summary;
		return (doc[key] || []).length > 0;
	}

	function sectionReport(doc) {
		var parts = ['basics'];
		SECTIONS.forEach(function (s) {
			if (s.key === 'summary' || !hasSection(doc, s.key)) return;
			var n = doc[s.key].length;
			parts.push(s.key + (n > 1 && (s.key === 'work' || s.key === 'education' || s.key === 'projects') ? ' (' + n + ' entries)' : ''));
		});
		if (doc.requirements.length) parts.push('requirements (' + doc.requirements.length + ')');
		return parts;
	}

	// Rough completeness score out of 100, shown on the preview page.
	function completeness(doc) {
		var b = doc.basics;
		var score = 0;
		if (b.name) score += 10;
		if (b.email || b.phone) score += 10;
		if (b.location) score += 5;
		if (b.summary) score += 15;
		if (doc.work.length) score += 15;
		var bullets = [];
		doc.work.forEach(function (w) { bullets = bullets.concat(w.highlights); });
		if (bullets.length >= 3) score += 10;
		var numbers = bullets.filter(function (x) { return /\d/.test(x); }).length;
		if (bullets.length) score += Math.round(10 * Math.min(1, numbers / bullets.length / 0.6));
		if (doc.skills.length) score += 15;
		if (doc.education.length) score += 10;
		return Math.min(100, score);
	}

	/* ---------- templates ---------- */

	var TEMPLATES = [
		{ id: 'minimal', name: 'The Minimalist ATS', columns: 1, tags: ['ats', 'one'] },
		{ id: 'zurich', name: 'Zurich Executive', columns: 2, side: 'right', tags: ['two', 'classic'] },
		{ id: 'nordic', name: 'Nordic Clean', columns: 1, tags: ['one', 'modern', 'compact'] },
		{ id: 'studio', name: 'Creative Studio', columns: 2, side: 'left', tags: ['photo', 'two', 'creative'] },
		{ id: 'ivy', name: 'Ivy League Standard', columns: 1, tags: ['ats', 'classic', 'one'] },
		{ id: 'techlead', name: 'Tech Lead Modern', columns: 2, side: 'right', tags: ['two', 'modern', 'compact'] },
		{ id: 'banner', name: 'Banner Bold', columns: 1, tags: ['modern', 'one'] },
		{ id: 'timeline', name: 'Timeline Story', columns: 1, tags: ['modern', 'creative', 'one'] },
		{ id: 'editorial', name: 'Editorial Feature', columns: 2, side: 'right', tags: ['classic', 'two'] },
		{ id: 'mono', name: 'Monospace Engineer', columns: 1, tags: ['ats', 'compact', 'one'] },
		{ id: 'graduate', name: 'Graduate Compact', columns: 1, order: ['summary', 'education', 'skills', 'work', 'projects', 'certificates', 'languages', 'references'], tags: ['compact', 'ats', 'one'] },
		{ id: 'executive', name: 'Executive Dark Panel', columns: 2, side: 'left', photo: true, tags: ['classic', 'two', 'photo'] },
		{ id: 'swiss', name: 'Swiss Grid', columns: 2, side: 'right', tags: ['modern', 'two', 'compact'] },
		{ id: 'academic', name: 'Academic CV', columns: 1, tags: ['classic', 'one'] },
		{ id: 'colourblock', name: 'Colour Block', columns: 1, tags: ['creative', 'one', 'modern'] },
		{ id: 'atspro', name: 'ATS Plain Pro', columns: 1, tags: ['ats', 'compact', 'one'] }
	];

	var ACCENTS = [
		{ id: 'pencil', name: 'Pencil Black', hex: '#222222' },
		{ id: 'navy', name: 'Navy Ink', hex: '#1f3a68' },
		{ id: 'forest', name: 'Forest', hex: '#2f6b3f' },
		{ id: 'maroon', name: 'Maroon', hex: '#7a1f2b' },
		{ id: 'marker', name: 'Marker Red', hex: '#c62f2f' }
	];

	function getTemplate(id) {
		for (var i = 0; i < TEMPLATES.length; i++) if (TEMPLATES[i].id === id) return TEMPLATES[i];
		return TEMPLATES[0];
	}
	function getAccent(id) {
		for (var i = 0; i < ACCENTS.length; i++) if (ACCENTS[i].id === id) return ACCENTS[i];
		return ACCENTS[0];
	}

	function defaultSettings() {
		return { template: 'minimal', accent: 'pencil', size: 'm', hidden: ['references'] };
	}

	function sec(title, inner) {
		if (!inner) return '';
		return '<section class="cvs-sec"><h2 class="cvs-st">' + esc(title) + '</h2>' + inner + '</section>';
	}
	function list(items) {
		items = compact(items);
		if (!items.length) return '';
		return '<ul class="cvs-ul">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
	}
	function row(left, right) {
		return '<div class="cvs-row"><div class="cvs-rl">' + left + '</div>' + (right ? '<div class="cvs-rr">' + esc(right) + '</div>' : '') + '</div>';
	}

	var blocks = {
		summary: function (d) {
			return d.basics.summary ? sec('Summary', '<p class="cvs-p">' + esc(d.basics.summary) + '</p>') : '';
		},
		work: function (d) {
			return sec('Experience', d.work.map(function (w) {
				var title = '<strong>' + esc(w.position) + '</strong>' + (w.company ? '<span class="cvs-org"> — ' + esc(w.company) + '</span>' : '');
				var meta = compact([range(w.startDate, w.endDate, true), w.location]).join(' • ');
				return '<div class="cvs-item">' + row(title, meta) +
					(w.summary ? '<p class="cvs-p">' + esc(w.summary) + '</p>' : '') + list(w.highlights) + '</div>';
			}).join(''));
		},
		skills: function (d) {
			if (!d.skills.length) return '';
			var grouped = d.skills.some(function (s) { return s.keywords.length; });
			var inner;
			if (grouped) {
				inner = d.skills.map(function (s) {
					return '<p class="cvs-p cvs-skillrow">' + (s.name ? '<strong>' + esc(s.name) + ':</strong> ' : '') + esc(s.keywords.join(', ')) + '</p>';
				}).join('');
			} else {
				inner = '<p class="cvs-p cvs-skills">' + d.skills.map(function (s) { return '<span class="cvs-skill">' + esc(s.name) + '</span>'; }).join('') + '</p>';
			}
			return sec('Skills', inner);
		},
		education: function (d) {
			return sec('Education', d.education.map(function (e) {
				var degree = compact([e.studyType, e.area]).join(' in ');
				var title = '<strong>' + esc(degree || e.institution) + '</strong>' + (degree && e.institution ? '<span class="cvs-org"> — ' + esc(e.institution) + '</span>' : '');
				return '<div class="cvs-item">' + row(title, range(e.startDate, e.endDate, false)) +
					(e.score ? '<p class="cvs-p cvs-muted">' + esc(e.score) + '</p>' : '') + '</div>';
			}).join(''));
		},
		projects: function (d) {
			return sec('Projects', d.projects.map(function (p) {
				return '<div class="cvs-item">' + row('<strong>' + esc(p.name) + '</strong>', p.url) +
					(p.description ? '<p class="cvs-p">' + esc(p.description) + '</p>' : '') + list(p.highlights) + '</div>';
			}).join(''));
		},
		certificates: function (d) {
			return sec('Certifications', list(d.certificates.map(function (c) {
				return compact([c.name, c.issuer, fmtDate(c.date)]).join(' • ');
			})));
		},
		languages: function (d) {
			return sec('Languages', list(d.languages.map(function (l) {
				return compact([l.language, l.fluency]).join(' — ');
			})));
		},
		references: function (d) {
			return sec('References', list(d.references.map(function (r) {
				return compact([r.name, r.reference]).join(' — ');
			})));
		}
	};

	var SIDE_KEYS = ['skills', 'education', 'certificates', 'languages', 'references'];

	function renderCV(doc, settings) {
		settings = settings || defaultSettings();
		var tpl = getTemplate(settings.template);
		var accent = getAccent(settings.accent);
		var hidden = settings.hidden || [];
		var b = doc.basics;

		var contact = compact([b.location, b.email, b.phone, b.url].concat(b.profiles));
		var photo = (tpl.photo || tpl.id === 'studio') && b.image ? '<img class="cvs-photo" src="' + esc(b.image) + '" alt="">' : '';
		var header = '<header class="cvs-head">' + photo + '<div class="cvs-headtext">' +
			'<h1 class="cvs-name">' + esc(b.name || 'Your Name') + '</h1>' +
			(b.label ? '<p class="cvs-label">' + esc(b.label) + '</p>' : '') +
			(contact.length ? '<p class="cvs-contact">' + contact.map(esc).join('<span class="cvs-dot"> • </span>') + '</p>' : '') +
			'</div></header>';

		var keys = SECTIONS.map(function (s) { return s.key; }).filter(function (k) {
			return hidden.indexOf(k) === -1 && hasSection(doc, k);
		});
		if (tpl.order) {
			keys.sort(function (a, b) { return tpl.order.indexOf(a) - tpl.order.indexOf(b); });
		}

		var body;
		if (tpl.columns === 2) {
			var main = keys.filter(function (k) { return SIDE_KEYS.indexOf(k) === -1; });
			var side = keys.filter(function (k) { return SIDE_KEYS.indexOf(k) !== -1; });
			var mainHtml = '<div class="cvs-main">' + main.map(function (k) { return blocks[k](doc); }).join('') + '</div>';
			var sideHtml = '<aside class="cvs-side">' + side.map(function (k) { return blocks[k](doc); }).join('') + '</aside>';
			body = '<div class="cvs-body cvs-two cvs-side-' + tpl.side + '">' + (tpl.side === 'left' ? sideHtml + mainHtml : mainHtml + sideHtml) + '</div>';
		} else {
			body = '<div class="cvs-body">' + keys.map(function (k) { return blocks[k](doc); }).join('') + '</div>';
		}

		return '<div class="cvs-paper cvs-t-' + tpl.id + ' cvs-size-' + esc(settings.size || 'm') + '" style="--cv-accent:' + accent.hex + '">' + header + body + '</div>';
	}

	/* ---------- Word (.docx) export ---------- */

	var CRC_TABLE = (function () {
		var t = new Uint32Array(256);
		for (var n = 0; n < 256; n++) {
			var c = n;
			for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
			t[n] = c >>> 0;
		}
		return t;
	})();
	function crc32(bytes) {
		var crc = 0xFFFFFFFF;
		for (var i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
		return (crc ^ 0xFFFFFFFF) >>> 0;
	}

	// Minimal "stored" (uncompressed) zip writer, enough for a .docx package.
	function zip(files) {
		var enc = new TextEncoder();
		var chunks = [];
		var central = [];
		var offset = 0;
		files.forEach(function (f) {
			var name = enc.encode(f.name);
			var data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
			var crc = crc32(data);
			var h = new DataView(new ArrayBuffer(30));
			h.setUint32(0, 0x04034b50, true);
			h.setUint16(4, 20, true);
			h.setUint16(6, 0x0800, true);
			h.setUint16(8, 0, true);
			h.setUint16(10, 0, true);
			h.setUint16(12, 33, true);
			h.setUint32(14, crc, true);
			h.setUint32(18, data.length, true);
			h.setUint32(22, data.length, true);
			h.setUint16(26, name.length, true);
			h.setUint16(28, 0, true);
			chunks.push(new Uint8Array(h.buffer), name, data);

			var c = new DataView(new ArrayBuffer(46));
			c.setUint32(0, 0x02014b50, true);
			c.setUint16(4, 20, true);
			c.setUint16(6, 20, true);
			c.setUint16(8, 0x0800, true);
			c.setUint16(10, 0, true);
			c.setUint16(12, 0, true);
			c.setUint16(14, 33, true);
			c.setUint32(16, crc, true);
			c.setUint32(20, data.length, true);
			c.setUint32(24, data.length, true);
			c.setUint16(28, name.length, true);
			c.setUint32(42, offset, true);
			central.push(new Uint8Array(c.buffer), name);
			offset += 30 + name.length + data.length;
		});
		var cdSize = central.reduce(function (n, a) { return n + a.length; }, 0);
		var e = new DataView(new ArrayBuffer(22));
		e.setUint32(0, 0x06054b50, true);
		e.setUint16(8, files.length, true);
		e.setUint16(10, files.length, true);
		e.setUint32(12, cdSize, true);
		e.setUint32(16, offset, true);
		var parts = chunks.concat(central, [new Uint8Array(e.buffer)]);
		var total = parts.reduce(function (n, a) { return n + a.length; }, 0);
		var out = new Uint8Array(total);
		var pos = 0;
		parts.forEach(function (a) { out.set(a, pos); pos += a.length; });
		return out;
	}

	function x(s) {
		return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}

	function buildDocx(doc, settings) {
		settings = settings || defaultSettings();
		var accent = getAccent(settings.accent).hex.replace('#', '');
		var hidden = settings.hidden || [];
		var base = settings.size === 's' ? 19 : settings.size === 'l' ? 23 : 21; // half-points
		var b = doc.basics;
		var out = [];

		function run(text, o) {
			o = o || {};
			var pr = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>' +
				(o.bold ? '<w:b/>' : '') + (o.italic ? '<w:i/>' : '') + (o.caps ? '<w:caps/>' : '') +
				(o.color ? '<w:color w:val="' + o.color + '"/>' : '') +
				'<w:sz w:val="' + (o.size || base) + '"/>';
			return '<w:r><w:rPr>' + pr + '</w:rPr><w:t xml:space="preserve">' + x(text) + '</w:t></w:r>';
		}
		function para(runs, o) {
			o = o || {};
			var pr = '<w:spacing w:before="' + (o.before || 0) + '" w:after="' + (o.after == null ? 60 : o.after) + '"/>' +
				(o.indent ? '<w:ind w:left="' + o.indent + '" w:hanging="200"/>' : '') +
				(o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="' + accent + '"/></w:pBdr>' : '') +
				(o.tab ? '<w:tabs><w:tab w:val="right" w:pos="9900"/></w:tabs>' : '') +
				(o.center ? '<w:jc w:val="center"/>' : '');
			out.push('<w:p><w:pPr>' + pr + '</w:pPr>' + runs + '</w:p>');
		}
		function heading(text) {
			para(run(text, { bold: true, caps: true, color: accent, size: base + 1 }), { before: 200, after: 80, border: true });
		}
		function bullets(items) {
			compact(items).forEach(function (it) { para(run('•  ' + it), { indent: 360, after: 30 }); });
		}
		function dated(left, right) {
			para(left + (right ? '<w:r><w:tab/></w:r>' + run(right, { color: '555555', size: base - 2 }) : ''), { tab: true, before: 80, after: 30 });
		}

		para(run(b.name || 'Your Name', { bold: true, size: base + 19 }), { after: 40 });
		if (b.label) para(run(b.label, { bold: true, color: accent, size: base + 3 }), { after: 40 });
		var contact = compact([b.location, b.email, b.phone, b.url].concat(b.profiles));
		if (contact.length) para(run(contact.join('  •  '), { color: '555555', size: base - 2 }), { after: 120 });

		SECTIONS.forEach(function (s) {
			var k = s.key;
			if (hidden.indexOf(k) !== -1 || !hasSection(doc, k)) return;
			heading(s.label);
			if (k === 'summary') para(run(b.summary));
			if (k === 'work') doc.work.forEach(function (w) {
				dated(run(w.position, { bold: true }) + (w.company ? run(' — ' + w.company) : ''), compact([range(w.startDate, w.endDate, true), w.location]).join(' • '));
				if (w.summary) para(run(w.summary));
				bullets(w.highlights);
			});
			if (k === 'skills') {
				var grouped = doc.skills.some(function (sk) { return sk.keywords.length; });
				if (grouped) doc.skills.forEach(function (sk) { para((sk.name ? run(sk.name + ': ', { bold: true }) : '') + run(sk.keywords.join(', '))); });
				else para(run(doc.skills.map(function (sk) { return sk.name; }).join(', ')));
			}
			if (k === 'education') doc.education.forEach(function (e) {
				var degree = compact([e.studyType, e.area]).join(' in ');
				dated(run(degree || e.institution, { bold: true }) + (degree && e.institution ? run(' — ' + e.institution) : ''), range(e.startDate, e.endDate, false));
				if (e.score) para(run(e.score, { italic: true, color: '555555' }));
			});
			if (k === 'projects') doc.projects.forEach(function (p) {
				dated(run(p.name, { bold: true }), p.url);
				if (p.description) para(run(p.description));
				bullets(p.highlights);
			});
			if (k === 'certificates') bullets(doc.certificates.map(function (c) { return compact([c.name, c.issuer, fmtDate(c.date)]).join(' • '); }));
			if (k === 'languages') bullets(doc.languages.map(function (l) { return compact([l.language, l.fluency]).join(' — '); }));
			if (k === 'references') bullets(doc.references.map(function (r) { return compact([r.name, r.reference]).join(' — '); }));
		});

		var document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
			'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
			out.join('') +
			'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>' +
			'</w:body></w:document>';

		var bytes = zip([
			{ name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
			{ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
			{ name: 'word/document.xml', data: document }
		]);
		return bytes;
	}

	/* ---------- JSON repair ("the eraser") ----------
	 * A forgiving parser that reads JSON the way AI chats tend to break it and
	 * writes it back out as strict JSON. Returns { text, changes, notes, truncated }
	 * or null when there is no JSON-like content at all.
	 */

	var REPAIR_NOTES = {
		fence: 'removed the ``` code fence',
		prose: 'removed the chat text around the JSON',
		wrap: 'added the missing outer { }',
		comment: 'removed comments',
		quotes: 'swapped curly or single quotes for straight ones',
		escape: 'fixed broken backslashes',
		newline: 'fixed line breaks inside text',
		innerQuote: 'escaped quotes inside text',
		keys: 'put quotes around names',
		colon: 'added missing colons',
		missingComma: 'added missing commas',
		trailing: 'removed trailing commas',
		extraComma: 'removed extra commas',
		missingValue: 'filled in empty values',
		literal: 'fixed True / False / None',
		number: 'tidied numbers',
		unquoted: 'put quotes around text',
		unclosedString: 'closed unfinished text',
		unclosed: 'closed unfinished brackets',
		bracket: 'fixed mismatched brackets',
		stray: 'removed stray characters',
		trailingText: 'removed text after the JSON'
	};

	function repairJson(input) {
		var changes = {};
		function note(k) { changes[k] = (changes[k] || 0) + 1; }

		var t = String(input == null ? '' : input).replace(/^\uFEFF/, '').trim();
		if (!t) return null;
		if (/^```/.test(t) || /```\s*$/.test(t)) {
			t = t.replace(/^```[a-z]*\s*/i, '').replace(/\s*```\s*$/, '');
			note('fence');
		}
		var keyStart = /^\s*["“'‘]?[A-Za-z_$][\w$-]*["”'’]?\s*:/;
		var start = t.search(/[{\[]/);
		if (keyStart.test(t)) {
			t = '{' + t + '}';
			note('wrap');
		} else if (start === -1) {
			return null;
		} else if (start > 0) {
			t = t.slice(start);
			note('prose');
		}

		var QUOTE = { '"': '"', "'": "'", '“': '”', '”': '”', '‘': '’', '`': '`' };
		var i = 0;
		var n = t.length;
		var depth = 0;

		function ws() {
			while (i < n) {
				var c = t[i];
				if (c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\u00a0') { i++; continue; }
				if (c === '/' && t[i + 1] === '/') { var e = t.indexOf('\n', i); i = e === -1 ? n : e; note('comment'); continue; }
				if (c === '/' && t[i + 1] === '*') { var e2 = t.indexOf('*/', i + 2); i = e2 === -1 ? n : e2 + 2; note('comment'); continue; }
				if (c === '#') { var e3 = t.indexOf('\n', i); i = e3 === -1 ? n : e3; note('comment'); continue; }
				break;
			}
		}

		// After a possible closing quote: is this really the end of the text?
		function endsHere(at) {
			var j = at;
			while (j < n && (t[j] === ' ' || t[j] === '\t')) j++;
			if (j >= n) return true;
			var c = t[j];
			return c === ',' || c === '}' || c === ']' || c === ':' || c === '\n' || c === '\r' || QUOTE[c] !== undefined || c === '/';
		}

		function string() {
			var open = t[i];
			var close = QUOTE[open];
			if (open !== '"') note('quotes');
			i++;
			var out = '';
			while (i < n) {
				var c = t[i];
				if (c === '\\') {
					var nx = t[i + 1];
					if (nx === undefined) { i++; break; }
					if ('"\\/bfnrt'.indexOf(nx) !== -1) { out += JSON.parse('"\\' + nx + '"'); i += 2; continue; }
					if (nx === 'u' && /^[0-9a-fA-F]{4}$/.test(t.substr(i + 2, 4))) { out += String.fromCharCode(parseInt(t.substr(i + 2, 4), 16)); i += 6; continue; }
					out += nx; i += 2; note('escape'); continue;
				}
				var closes = c === close || (open === '“' && c === '"') || (open === '‘' && c === "'");
				if (closes) {
					if (endsHere(i + 1)) { i++; return JSON.stringify(out); }
					out += c; i++; note('innerQuote'); continue;
				}
				if (c === '\n' || c === '\r') {
					// A line break right before the next key or a closing bracket means the quote was never closed.
					if (/^\s*(["“'‘][^"\n]*["”'’]\s*:|[}\]])/.test(t.slice(i + 1, i + 200))) { note('unclosedString'); return JSON.stringify(out.replace(/\s+$/, '')); }
					if (c === '\r' && t[i + 1] === '\n') i++;
					out += '\n'; i++; note('newline'); continue;
				}
				if (c === '\t') { out += '\t'; i++; continue; }
				out += c; i++;
			}
			note('unclosedString');
			return JSON.stringify(out);
		}

		var LITERALS = { 'true': 'true', 'false': 'false', 'null': 'null', 'none': 'null', 'undefined': 'null', 'nan': 'null', 'nil': 'null' };

		function word() {
			var j = i;
			while (j < n && ',}]\n\r'.indexOf(t[j]) === -1) j++;
			var raw = t.slice(i, j).replace(/\s+$/, '');
			if (!raw) { note('missingValue'); return 'null'; }
			i += raw.length;
			var lit = LITERALS[raw.toLowerCase()];
			if (lit) { if (lit !== raw) note('literal'); return lit; }
			note('unquoted');
			return JSON.stringify(raw);
		}

		function number() {
			var j = i;
			while (j < n && ',}]\n\r \t'.indexOf(t[j]) === -1) j++;
			var tok = t.slice(i, j);
			if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(tok)) { i = j; return tok; }
			if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(tok) && !/^[+-]?0\d/.test(tok)) {
				i = j; note('number'); return String(Number(tok));
			}
			return word(); // dates like 2021-03, phone numbers, "1st", ...
		}

		function value() {
			ws();
			if (i >= n) { note('missingValue'); return 'null'; }
			var c = t[i];
			if (c === '{') return object();
			if (c === '[') return array();
			if (QUOTE[c] !== undefined) return string();
			if (c === '-' || c === '+' || c === '.' || (c >= '0' && c <= '9')) return number();
			return word();
		}

		function object() {
			i++; depth++;
			var parts = [];
			for (;;) {
				ws();
				if (i >= n) { note('unclosed'); break; }
				var c = t[i];
				if (c === '}') { i++; break; }
				if (c === ']') { i++; note('bracket'); break; }
				if (c === ',') { i++; note('extraComma'); continue; }
				var key;
				if (QUOTE[c] !== undefined) {
					key = string();
				} else {
					var m = /^[A-Za-z0-9_$\-À-￿]+/.exec(t.slice(i, i + 200));
					if (!m) { i++; note('stray'); continue; }
					key = JSON.stringify(m[0]);
					i += m[0].length;
					note('keys');
				}
				ws();
				if (t[i] === ':' || t[i] === '=') { if (t[i] === '=') note('colon'); i++; } else { note('colon'); }
				parts.push(key + ':' + value());
				ws();
				if (t[i] === ',') { i++; ws(); if (t[i] === '}') note('trailing'); continue; }
				if (i >= n || t[i] === '}' || t[i] === ']') continue;
				note('missingComma');
			}
			depth--;
			return '{' + parts.join(',') + '}';
		}

		function array() {
			i++; depth++;
			var parts = [];
			for (;;) {
				ws();
				if (i >= n) { note('unclosed'); break; }
				var c = t[i];
				if (c === ']') { i++; break; }
				if (c === '}') { i++; note('bracket'); break; }
				if (c === ',') { i++; note('extraComma'); continue; }
				var before = i;
				parts.push(value());
				if (i === before) { i++; note('stray'); parts.pop(); continue; }
				ws();
				if (t[i] === ',') { i++; ws(); if (t[i] === ']') note('trailing'); continue; }
				if (i >= n || t[i] === ']' || t[i] === '}') continue;
				note('missingComma');
			}
			depth--;
			return '[' + parts.join(',') + ']';
		}

		var text = value();
		ws();
		if (i < n) note('trailingText');

		try { JSON.parse(text); } catch (e) { return null; }

		// Most meaningful fixes first; housekeeping (fences, chat text) last.
		var ORDER = ['missingComma', 'trailing', 'extraComma', 'quotes', 'keys', 'colon', 'innerQuote', 'unclosedString', 'unclosed', 'bracket',
			'newline', 'escape', 'unquoted', 'literal', 'number', 'missingValue', 'stray', 'comment', 'wrap', 'trailingText', 'prose', 'fence'];
		var notes = Object.keys(changes).sort(function (a, b) { return ORDER.indexOf(a) - ORDER.indexOf(b); }).map(function (k) {
			var label = REPAIR_NOTES[k] || k;
			return changes[k] > 1 && /commas|colons|values|characters|brackets/.test(label) ? label + ' (' + changes[k] + ')' : label;
		});
		return {
			text: text,
			changes: changes,
			notes: notes,
			truncated: !!(changes.unclosed || changes.unclosedString)
		};
	}

	/* ---------- prompt and example ---------- */

	var PROMPT = [
		'You are an expert CV writer and recruiter. I will paste a job description below.',
		'',
		'1. Use everything you already know about me from our previous chats (my experience, skills, education, achievements). If something important is missing, make a sensible placeholder in [square brackets] so I can fill it in.',
		'2. Tailor the CV to the job: lead with the most relevant experience, mirror the job\'s key terms honestly, and write achievement bullets with numbers where you can.',
		'3. Compare the job\'s requirements with my background and list each one in "requirements" with status "met", "partial" or "missing", plus a short note.',
		'',
		'Reply with ONLY a valid JSON object (no markdown, no code fences, no commentary) in exactly this shape:',
		'',
		'{',
		'  "target": { "jobTitle": "", "company": "", "location": "", "deadline": "YYYY-MM-DD" },',
		'  "basics": {',
		'    "name": "", "label": "Target professional title", "email": "", "phone": "",',
		'    "location": "City, Country", "url": "", "profiles": ["linkedin.com/in/..."],',
		'    "summary": "3-line career summary tailored to the job"',
		'  },',
		'  "work": [',
		'    { "position": "", "company": "", "location": "", "startDate": "YYYY-MM", "endDate": "YYYY-MM or empty if current",',
		'      "highlights": ["Achievement with a number", "..."] }',
		'  ],',
		'  "education": [ { "institution": "", "studyType": "", "area": "", "startDate": "YYYY", "endDate": "YYYY", "score": "" } ],',
		'  "skills": [ { "name": "Category", "keywords": ["skill", "skill"] } ],',
		'  "projects": [ { "name": "", "description": "", "url": "", "highlights": [] } ],',
		'  "certificates": [ { "name": "", "issuer": "", "date": "YYYY-MM" } ],',
		'  "languages": [ { "language": "", "fluency": "" } ],',
		'  "references": [ { "name": "", "reference": "Available on request" } ],',
		'  "requirements": [ { "requirement": "", "status": "met | partial | missing", "note": "" } ]',
		'}',
		'',
		'Leave out any section that doesn\'t apply instead of inventing facts.',
		'',
		'JOB DESCRIPTION:',
		'[paste the full job posting here]'
	].join('\n');

	var EXAMPLE = {
		target: { jobTitle: 'Senior Product Designer', company: 'Stripe', location: 'Remote', deadline: '2026-11-15' },
		basics: {
			name: 'Alex Taylor',
			label: 'Staff Product Designer',
			email: 'alex@design.io',
			phone: '(415) 890-2341',
			location: 'San Francisco, CA',
			url: 'alextaylor.work',
			profiles: ['linkedin.com/in/alextaylor'],
			summary: 'Staff Product Designer with 10+ years shaping design systems, web canvas engines and developer tooling. Turns complex business rules into calm, frictionless interfaces used by 450k+ daily practitioners.'
		},
		work: [
			{
				position: 'Principal Designer', company: 'Figma', location: 'San Francisco, CA', startDate: '2021-03', endDate: '',
				highlights: [
					'Launched the Token Canvas, cutting design-to-dev handoff time by 42% across 18 enterprise pilots.',
					'Mentored 14 senior designers and co-wrote the multi-year canvas rendering roadmap with the VP of Engineering.',
					'Added automated accessibility checks to component reviews, reaching 100% WCAG 2.1 AA on shared modules.'
				]
			},
			{
				position: 'Senior Staff Interaction Designer', company: 'Stripe', location: 'South Park, CA', startDate: '2017-01', endDate: '2021-02',
				highlights: [
					'Redesigned checkout components used in 135 currencies, lifting payment completion by 2.4%.',
					'Built an interactive sandbox CLI so engineers could preview state transitions in isolated staging containers.'
				]
			}
		],
		education: [{ institution: 'Carnegie Mellon University', studyType: 'B.S.', area: 'Human-Computer Interaction', startDate: '2009', endDate: '2013', score: 'Magna Cum Laude' }],
		skills: [
			{ name: 'Design', keywords: ['Design Systems', 'Interaction Specs', 'Rapid Prototyping', 'Accessibility'] },
			{ name: 'Technical', keywords: ['Figma Tokens', 'JSON Schema', 'TypeScript', 'Front-End Architecture'] }
		],
		certificates: [{ name: 'Certified Scrum Product Owner (CSPO)', issuer: 'Scrum Alliance', date: '2019-05' }],
		languages: [{ language: 'English', fluency: 'Native' }, { language: 'Spanish', fluency: 'Professional' }],
		references: [{ name: 'Available on request', reference: '' }],
		requirements: [
			{ requirement: '8+ years of product design experience', status: 'met', note: '10+ years across Figma and Stripe.' },
			{ requirement: 'Experience with payments products', status: 'met', note: 'Checkout redesign at Stripe across 135 currencies.' },
			{ requirement: 'Quantified impact on key metrics', status: 'partial', note: 'The sandbox CLI bullet has no number yet; add usage or time saved.' },
			{ requirement: 'Portuguese (B2)', status: 'missing', note: 'Not in your background. Mention it in your cover letter if you are learning.' }
		]
	};

	root.CVSketch = {
		esc: esc,
		normalize: normalize,
		sectionReport: sectionReport,
		completeness: completeness,
		hasSection: hasSection,
		SECTIONS: SECTIONS,
		TEMPLATES: TEMPLATES,
		ACCENTS: ACCENTS,
		getTemplate: getTemplate,
		getAccent: getAccent,
		defaultSettings: defaultSettings,
		renderCV: renderCV,
		buildDocx: buildDocx,
		repairJson: repairJson,
		PROMPT: PROMPT,
		EXAMPLE: EXAMPLE
	};
})(typeof window !== 'undefined' ? window : globalThis);
