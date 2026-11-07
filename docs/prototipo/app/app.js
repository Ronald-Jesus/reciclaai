/* Lixeira Pessoal · protótipo clicável (dados de exemplo, sem servidor)
   Efeitos recriados em JS puro, inspirados no React Bits:
   - CountUp    -> total da sacola e valor do voucher (countUp)
   - ClickSpark -> faíscas ao clicar em "Adicionar à sacola" (clickSpark)
   GSAP: linha de leitura, item voando para a sacola, entrada de listas, revelação do voucher. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduced = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var canAnimate = function () { return !!window.gsap && !reduced(); };

  /* ---------- Dados de exemplo ---------- */
  var MATERIALS = {
    plastico: { name: 'Plástico', bin: 'Vermelha', binLong: 'lixeira vermelha', accepts: 'PET · R$ 0,10', icon: 'local_drink' },
    metal:    { name: 'Metal', bin: 'Amarela', binLong: 'lixeira amarela', accepts: 'Lata · R$ 0,15', icon: 'sports_bar' },
    vidro:    { name: 'Vidro', bin: 'Verde', binLong: 'lixeira verde', accepts: 'Vidro · R$ 0,25', icon: 'wine_bar' },
    papel:    { name: 'Papel', bin: 'Azul', binLong: 'lixeira azul', accepts: '', icon: 'description' },
    organico: { name: 'Orgânico', bin: 'Marrom', binLong: 'lixeira marrom', accepts: '', icon: 'nutrition' },
    rejeito:  { name: 'Rejeito', bin: 'Cinza', binLong: 'lixeira cinza', accepts: '', icon: 'delete' }
  };
  var ACCEPTED = { plastico: true, metal: true, vidro: true };
  // kind -> item que a máquina paga (valor em centavos)
  var KINDS = {
    pet:   { mat: 'plastico', label: 'Garrafa PET', cents: 10 },
    can:   { mat: 'metal', label: 'Lata', cents: 15 },
    glass: { mat: 'vidro', label: 'Garrafa de vidro', cents: 25 }
  };
  var VARIANTS = {
    a: { mat: 'plastico', conf: 94, probs: [['plastico', 94], ['vidro', 4], ['metal', 2]] },
    b: { mat: 'organico', conf: 88, probs: [['organico', 88], ['rejeito', 8], ['papel', 4]] },
    c: { mat: 'plastico', conf: 52, probs: [['plastico', 52], ['vidro', 31], ['metal', 17]] }
  };

  var state = {
    screen: 'captura',
    photo: null,            // { src?, scene, name, variant? }
    variant: 'a',
    bag: [],
    uid: 0,
    cycle: 0,
    undo: null,
    timers: {}
  };

  /* ---------- Util ---------- */
  function brl(cents) { return 'R$ ' + (cents / 100).toFixed(2).replace('.', ','); }
  function matTag(mat, large) {
    var m = MATERIALS[mat];
    return '<span class="rc-tag rc-tag--' + mat + (large ? ' rc-tag--large' : '') + '">' +
      '<span class="rc-tag__material"><span class="rc-icon" aria-hidden="true">' + m.icon + '</span>' + m.name + '</span>' +
      '<span class="rc-tag__bin">' + m.bin + '</span></span>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* Ilustrações de exemplo (SVG inline, cores só por variáveis do sistema) */
  function scene(kind) {
    var f = function (v) { return 'style="fill:var(' + v + ')"'; };
    var bg = '<rect width="100" height="100" ' + f('--md-sys-color-surface-container-high') + '/>' +
             '<rect y="78" width="100" height="22" ' + f('--md-sys-color-surface-container-highest') + '/>';
    var body = '';
    if (kind === 'pet' || kind === 'blur') {
      body = '<rect class="ink" x="40" y="10" width="20" height="9" rx="2" ' + f('--rc-material-plastico-strong') + '/>' +
        '<path class="ink" d="M42 19h16l2 12c10 6 12 14 12 24v26a5 5 0 0 1-5 5H33a5 5 0 0 1-5-5V55c0-10 2-18 12-24z" ' + f('--rc-material-plastico-container') + '/>' +
        '<rect class="ink" x="30" y="50" width="40" height="18" ' + f('--rc-material-plastico') + '/>';
    } else if (kind === 'can') {
      body = '<rect class="ink" x="32" y="22" width="36" height="62" rx="6" ' + f('--rc-material-metal') + '/>' +
        '<rect class="ink" x="35" y="16" width="30" height="8" rx="3" ' + f('--rc-material-metal-container') + '/>' +
        '<rect x="32" y="46" width="36" height="14" ' + f('--rc-material-metal-on-container') + '/>';
    } else if (kind === 'glass') {
      body = '<path class="ink" d="M44 8h12v24c10 6 14 12 14 22v30a5 5 0 0 1-5 5H35a5 5 0 0 1-5-5V54c0-10 4-16 14-22z" ' + f('--rc-material-vidro') + '/>' +
        '<rect x="38" y="54" width="24" height="16" ' + f('--rc-material-vidro-container') + '/>';
    } else if (kind === 'organic') {
      body = '<path class="ink" d="M20 52c0-16 14-24 30-24s30 8 30 24c0 16-10 26-30 26S20 68 20 52z" ' + f('--rc-material-organico-container') + '/>' +
        '<path class="ink" d="M30 52c0-8 8-14 20-14s20 6 20 14" fill="none"/>' +
        '<path class="ink" d="M50 28c0-8 4-14 12-16" fill="none"/>' +
        '<circle cx="42" cy="58" r="3" ' + f('--rc-material-organico') + '/><circle cx="58" cy="60" r="3" ' + f('--rc-material-organico') + '/>';
    }
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">' + bg + body + '</svg>';
  }
  function thumbHTML(photo, cls, alt) {
    var inner = photo && photo.src
      ? '<img src="' + photo.src + '" alt="' + esc(alt) + '">'
      : '<span role="img" aria-label="' + esc(alt) + '" style="display:block;width:100%;height:100%">' + scene(photo ? photo.scene : 'pet') + '</span>';
    return '<span class="thumb ' + (cls || '') + (photo && photo.scene === 'blur' ? ' is-blur' : '') + '">' + inner + '</span>';
  }

  /* ---------- Efeitos ---------- */
  // React Bits · CountUp
  function countUp(el, toCents, ms) {
    var from = parseInt(el.dataset.v || '0', 10);
    el.dataset.v = toCents;
    if (!canAnimate() || from === toCents) { el.textContent = brl(toCents); return; }
    var o = { v: from };
    gsap.to(o, { v: toCents, duration: ms || 0.7, ease: 'power2.out',
      onUpdate: function () { el.textContent = brl(Math.round(o.v)); },
      onComplete: function () { el.textContent = brl(toCents); } });
  }
  // React Bits · ClickSpark
  function clickSpark(host, x, y) {
    if (!canAnimate()) return;
    var n = 10;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      s.style.left = x + 'px'; s.style.top = y + 'px';
      var a = (360 / n) * i;
      s.style.transform = 'rotate(' + a + 'deg)';
      host.appendChild(s);
      (function (el, ang) {
        var r = ang * Math.PI / 180;
        gsap.fromTo(el, { x: 0, y: 0, opacity: 1, scaleY: 1 },
          { x: Math.sin(r) * 34, y: -Math.cos(r) * 34, opacity: 0, scaleY: 0.3, duration: 0.55, ease: 'power2.out',
            onComplete: function () { el.remove(); } });
      })(s, a);
    }
  }
  function enter(els) {
    if (!canAnimate() || !els.length) return;
    gsap.from(els, { y: 16, opacity: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out', clearProps: 'all' });
  }

  /* ---------- Navegação ---------- */
  var NAV_OF = { captura: 'captura', analisando: 'captura', resultado: 'captura', sacola: 'sacola', deposito: 'sacola', mapa: 'mapa' };
  function go(name, opts) {
    state.screen = name;
    $$('.screen').forEach(function (s) { s.hidden = s.id !== 's-' + name; });
    $$('.rc-navbar__item').forEach(function (b) {
      if (b.dataset.nav === NAV_OF[name]) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    $$('#steps li').forEach(function (li) { li.classList.toggle('is-now', li.dataset.step.split(',').indexOf(name) > -1); });
    var main = $('#main'); main.scrollTop = 0;
    var h = $('#h-' + name);
    if (h && !(opts && opts.noFocus)) h.focus({ preventScroll: true });
    enter($$('#s-' + name + ' .screen > *, #s-' + name + ' > *:not(h2)').slice(0, 8));
    if (name === 'mapa') initMap();
    if (name === 'sacola') renderBag(true);
  }
  $$('[data-nav]').forEach(function (b) { b.addEventListener('click', function () {
    if (state.screen === 'analisando') cancelAnalysis(true);
    go(b.dataset.nav);
  }); });

  /* ---------- Legenda ---------- */
  (function buildLegend() {
    var keys = ['plastico', 'metal', 'vidro', 'papel', 'organico', 'rejeito'];
    $('#legend-inline').innerHTML = keys.map(function (k) { return matTag(k); }).join('');
    $('#legend-sheet').innerHTML = keys.map(function (k) {
      var ok = ACCEPTED[k];
      return '<li>' + matTag(k, true) + '<span class="accept"><span class="rc-icon rc-icon--fill" aria-hidden="true">' + (ok ? 'check_circle' : 'do_not_disturb_on') + '</span>' +
        (ok ? 'Máquina paga · ' + MATERIALS[k].accepts.split(' · ')[1] : 'Máquina não aceita') + '</span></li>';
    }).join('');
  })();
  var sheet = $('#sheet'), lastFocus = null;
  function openSheet() { lastFocus = document.activeElement; sheet.hidden = false; $('#sheet-close').focus(); if (canAnimate()) gsap.from('.sheet', { y: 60, duration: 0.3, ease: 'power3.out' }); }
  function closeSheet() { sheet.hidden = true; if (lastFocus) lastFocus.focus(); }
  $('#btn-legenda').addEventListener('click', openSheet);
  $('#sheet-close').addEventListener('click', closeSheet);
  sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(); });
  sheet.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') { // mantém o foco dentro da folha
      var f = $$('button, [href]', sheet); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- Snackbar ---------- */
  function snack(text, actionLabel, cb, ms) {
    var el = $('#snack');
    $('#snack-text').textContent = text;
    var a = $('#snack-action');
    a.hidden = !actionLabel; a.textContent = actionLabel || '';
    a.onclick = function () { hideSnack(); if (cb) cb(); };
    el.hidden = false;
    clearTimeout(state.timers.snack);
    state.timers.snack = setTimeout(hideSnack, ms || 6000);
  }
  function hideSnack() { $('#snack').hidden = true; clearTimeout(state.timers.snack); }

  /* ---------- 1. Captura ---------- */
  var dz = $('#dropzone');
  function showError(msg) { $('#cap-error-text').textContent = msg; $('#cap-error').hidden = false; }
  function clearError() { $('#cap-error').hidden = true; }
  function setPhoto(p) {
    state.photo = p;
    var has = !!p;
    $('#dz-empty').hidden = has; $('#dz-preview').hidden = !has;
    $('#btn-analisar').hidden = !has;
    $('#btn-camera').classList.toggle('rc-btn--filled', !has);
    $('#btn-camera').classList.toggle('rc-btn--tonal', has);
    if (has) {
      $('#dz-thumb').outerHTML = thumbHTML(p, 'thumb--xl', 'Foto escolhida: ' + p.name).replace('class="thumb', 'id="dz-thumb" class="thumb');
      $('#dz-name').textContent = p.name;
      if (canAnimate()) gsap.from('#dz-thumb', { scale: 0.85, rotate: -3, duration: 0.4, ease: 'back.out(2)' });
    }
  }
  function handleFile(file) {
    clearError();
    if (!file) return;
    if (!/^image\//.test(file.type)) { showError('Esse arquivo não é uma imagem. Escolha uma foto JPG, PNG ou WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { showError('A foto passa de 5 MB. Envie uma menor ou tire uma nova com a câmera.'); return; }
    setPhoto({ src: URL.createObjectURL(file), scene: 'pet', name: file.name || 'Foto colada' });
    go('captura', { noFocus: true });
    $('#btn-analisar').focus();
  }
  $('#btn-camera').addEventListener('click', function () { $('#in-camera').click(); });
  $('#btn-escolher').addEventListener('click', function () { $('#in-file').click(); });
  $('#in-camera').addEventListener('change', function (e) { handleFile(e.target.files[0]); e.target.value = ''; });
  $('#in-file').addEventListener('change', function (e) { handleFile(e.target.files[0]); e.target.value = ''; });
  $('#btn-remover').addEventListener('click', function () { setPhoto(null); clearError(); });
  ['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
  dz.addEventListener('drop', function (e) { handleFile(e.dataTransfer.files[0]); });
  document.addEventListener('paste', function (e) {
    var items = (e.clipboardData || {}).items || [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') { go('captura', { noFocus: true }); handleFile(items[i].getAsFile()); return; }
    }
  });
  var SAMPLES = {
    pet: { scene: 'pet', name: 'Exemplo: garrafa', variant: 'a' },
    organic: { scene: 'organic', name: 'Exemplo: casca de banana', variant: 'b' },
    blur: { scene: 'blur', name: 'Exemplo: foto tremida', variant: 'c' }
  };
  $$('[data-sample]').forEach(function (b) { b.addEventListener('click', function () {
    clearError(); setPhoto(Object.assign({}, SAMPLES[b.dataset.sample])); $('#btn-analisar').focus();
  }); });

  /* ---------- 2. Analisando ---------- */
  var scanTween = null;
  var SCAN_TEXTS = ['Lendo a imagem…', 'Reconhecendo o material…', 'Conferindo a lixeira certa…'];
  $('#btn-analisar').addEventListener('click', startAnalysis);
  function startAnalysis() {
    if (!state.photo) return;
    $('#scan-thumb').outerHTML = thumbHTML(state.photo, 'thumb--scan', 'Foto em análise').replace('class="thumb', 'id="scan-thumb" class="thumb');
    var v = state.photo.variant || ['a', 'b', 'c'][state.cycle++ % 3];
    state.variant = v;
    go('analisando');
    var line = $('#scan-line'), i = 0;
    $('#scan-text').textContent = SCAN_TEXTS[0];
    if (canAnimate()) {
      gsap.set(line, { y: 0 });
      scanTween = gsap.to(line, { y: function () { return $('#scan').clientHeight - 6; }, duration: 1.1, ease: 'sine.inOut', repeat: -1, yoyo: true });
    } else { line.style.top = '50%'; }
    clearInterval(state.timers.txt);
    state.timers.txt = setInterval(function () { i = (i + 1) % SCAN_TEXTS.length; $('#scan-text').textContent = SCAN_TEXTS[i]; }, 900);
    clearTimeout(state.timers.scan);
    state.timers.scan = setTimeout(function () { stopScan(); showResult(v); }, 2800);
  }
  function stopScan() { clearInterval(state.timers.txt); clearTimeout(state.timers.scan); if (scanTween) { scanTween.kill(); scanTween = null; } }
  function cancelAnalysis(silent) {
    stopScan();
    if (!silent) { go('captura'); snack('Análise cancelada.'); }
  }
  $('#btn-cancelar').addEventListener('click', function () { cancelAnalysis(false); });

  /* ---------- 3. Resultado ---------- */
  function probsHTML(v) {
    return VARIANTS[v].probs.map(function (p) {
      return '<div class="prob rc-mat--' + p[0] + '"><span>' + MATERIALS[p[0]].name.split(' ')[0] + '</span>' +
        '<div class="rc-progress" role="img" aria-label="' + MATERIALS[p[0]].name + ' ' + p[1] + '%"><div class="rc-progress__bar" style="--rc-progress:' + p[1] + '%"></div></div>' +
        '<span class="prob__v rc-num">' + p[1] + '%</span></div>';
    }).join('');
  }
  function whyHTML(v) {
    return '<details class="why" data-h="9"><summary><span class="rc-icon" aria-hidden="true">psychology</span>Por que a IA decidiu isso?<span class="rc-icon chev" aria-hidden="true">expand_more</span></summary>' +
      '<div class="why__body"><p class="rc-body-small muted">Três materiais mais prováveis (dados de demonstração):</p>' + probsHTML(v) + '</div></details>';
  }
  function confHTML(conf) {
    return '<div><p class="rc-progress-label"><span>Confiança da IA</span><span>' + conf + '%</span></p>' +
      '<div class="rc-progress" role="progressbar" aria-label="Confiança" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + conf + '"><div class="rc-progress__bar" style="--rc-progress:' + conf + '%"></div></div></div>';
  }
  function showResult(v) {
    state.variant = v;
    $$('[data-variant]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.variant === v)); });
    var d = VARIANTS[v], m = MATERIALS[d.mat], ph = state.photo || { scene: 'pet', name: 'Foto' };
    var thumb = thumbHTML(ph, 'thumb--lg', 'Foto analisada');
    var html = '';
    if (v === 'a') {
      html = '<div class="card-stack"><article class="rc-card rc-card--material rc-mat--plastico">' +
        '<div class="result-head">' + thumb + '<div><h3 class="result-title">Plástico · lixeira vermelha · 94%</h3>' + matTag('plastico', true) + '</div></div></article>' +
        '<div class="value-box"><span class="rc-icon rc-icon--fill" aria-hidden="true">payments</span><p><strong>Vale R$ 0,10</strong><br><span class="rc-body-medium">na máquina (garrafa PET)</span></p></div>' +
        '<p class="tip rc-body-medium"><span class="rc-icon" aria-hidden="true">lightbulb</span>Dica: esvazie e amasse a garrafa antes de colocar na máquina.</p>' +
        confHTML(94) + whyHTML('a') +
        '<div class="stack"><button class="rc-btn rc-btn--filled rc-btn--block" id="btn-add" type="button" data-h="3"><span class="rc-icon" aria-hidden="true">add_shopping_cart</span>Adicionar à sacola</button>' +
        '<button class="rc-btn rc-btn--outlined rc-btn--block" id="btn-outra" type="button"><span class="rc-icon" aria-hidden="true">photo_camera</span>Fotografar outra</button></div></div>';
    } else if (v === 'b') {
      html = '<div class="card-stack"><article class="rc-card rc-card--material rc-mat--organico">' +
        '<div class="result-head">' + thumb + '<div><h3 class="result-title">Orgânico · lixeira marrom</h3>' + matTag('organico', true) + '</div></div></article>' +
        '<div class="warn"><span class="rc-icon rc-icon--fill" aria-hidden="true">block</span><div><p class="rc-title-medium">A máquina não aceita este item.</p>' +
        '<p class="rc-body-medium">Ela recebe só plástico (PET), lata e vidro. Restos de comida vão na lixeira marrom ou na compostagem.</p></div></div>' +
        confHTML(88) + whyHTML('b') +
        '<div class="stack"><button class="rc-btn rc-btn--filled rc-btn--block" id="btn-outra" type="button"><span class="rc-icon" aria-hidden="true">photo_camera</span>Fotografar outra</button>' +
        '<button class="rc-btn rc-btn--outlined rc-btn--block" id="btn-leg2" type="button"><span class="rc-icon" aria-hidden="true">palette</span>Ver legenda das lixeiras</button></div></div>';
    } else {
      html = '<div class="card-stack"><div class="warn" role="alert"><span class="rc-icon rc-icon--fill" aria-hidden="true">warning</span><div><p class="rc-title-medium">A IA não teve certeza (52%).</p>' +
        '<p class="rc-body-medium">Abaixo de 70% o item é devolvido. Reposicione a embalagem e tente de novo.</p></div></div>' +
        '<article class="rc-card rc-card--filled"><div class="result-head">' + thumb + '<div><p class="rc-label-large muted">Palpite mais provável</p>' + matTag('plastico') + '</div></div></article>' +
        confHTML(52) +
        '<div><p class="rc-title-small" style="margin-bottom:6px">Para uma foto melhor</p><ul class="tips-list rc-body-medium"><li>Chegue mais perto da embalagem.</li><li>Use luz clara e fundo liso.</li><li>Segure firme para a imagem não tremer.</li></ul></div>' +
        whyHTML('c') +
        '<div class="stack"><button class="rc-btn rc-btn--filled rc-btn--block" id="btn-outra" type="button"><span class="rc-icon" aria-hidden="true">photo_camera</span>Tentar outra foto</button></div></div>';
    }
    $('#result-body').innerHTML = html;
    var wasResult = state.screen === 'resultado';
    if (!wasResult) go('resultado'); else enter($$('#result-body .card-stack > *'));
    var again = $('#btn-outra'); if (again) again.addEventListener('click', function () { setPhoto(null); go('captura'); });
    var l2 = $('#btn-leg2'); if (l2) l2.addEventListener('click', openSheet);
    var add = $('#btn-add'); if (add) add.addEventListener('click', function (e) { addToBag(add, e); });
  }
  $$('[data-variant]').forEach(function (b) { b.addEventListener('click', function () { showResult(b.dataset.variant); }); });

  /* ---------- Sacola ---------- */
  function bagTotal() { return state.bag.reduce(function (s, i) { return s + KINDS[i.kind].cents; }, 0); }
  function updateBadge(bump) {
    var n = state.bag.length, b = $('#nav-badge');
    b.textContent = n; b.setAttribute('aria-label', n + (n === 1 ? ' item' : ' itens'));
    b.hidden = n === 0;
    if (bump && canAnimate()) gsap.fromTo(b, { scale: 1.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  }
  function renderBag(animateTotal) {
    var list = $('#bag-list');
    list.innerHTML = state.bag.map(function (it) {
      var k = KINDS[it.kind];
      return '<li class="bag-item" data-id="' + it.id + '">' + thumbHTML(it.photo, '', k.label) +
        '<div class="bag-item__main"><p class="bag-item__name">' + k.label + '</p>' + matTag(k.mat) +
        '<p class="rc-body-medium rc-num">Vale ' + brl(k.cents) + '</p></div>' +
        '<button class="rc-btn rc-btn--outlined rc-btn--icon" type="button" data-remove="' + it.id + '" aria-label="Remover ' + k.label + ' da sacola"><span class="rc-icon" aria-hidden="true">delete</span></button></li>';
    }).join('');
    $$('[data-remove]', list).forEach(function (b) { b.addEventListener('click', function () { removeItem(+b.dataset.remove); }); });
    $('#bag-empty').hidden = state.bag.length > 0;
    $('#btn-cheguei').disabled = state.bag.length === 0;
    $('#btn-cheguei').setAttribute('aria-disabled', String(state.bag.length === 0));
    $('#cheguei-help').hidden = state.bag.length > 0;
    var t = bagTotal();
    var el = $('#bag-total');
    if (animateTotal) countUp(el, t, 0.8); else { el.dataset.v = t; el.textContent = brl(t); }
    $('#bag-total-sr').textContent = brl(t) + ' a receber na máquina';
    updateBadge(false);
  }
  function removeItem(id) {
    var idx = state.bag.findIndex(function (i) { return i.id === id; });
    if (idx < 0) return;
    var item = state.bag.splice(idx, 1)[0];
    state.undo = { item: item, idx: idx };
    renderBag(true);
    snack('Item removido · ' + KINDS[item.kind].label, 'Desfazer', function () {
      state.bag.splice(Math.min(state.undo.idx, state.bag.length), 0, state.undo.item);
      state.undo = null;
      renderBag(true);
    });
    var nextBtn = $('[data-remove]'); if (nextBtn) nextBtn.focus(); else $('#btn-mais').focus();
  }
  function addToBag(btn, evt) {
    var ph = state.photo || { scene: 'pet', name: 'Foto' };
    var item = { id: ++state.uid, kind: 'pet', photo: ph };
    var app = $('#app'), ar = app.getBoundingClientRect(), br = btn.getBoundingClientRect();
    var cx = br.left - ar.left + (evt && evt.clientX ? evt.clientX - br.left : br.width / 2);
    var cy = br.top - ar.top + (evt && evt.clientY ? evt.clientY - br.top : br.height / 2);
    clickSpark(app, cx, cy);                      // React Bits · ClickSpark
    btn.classList.add('is-added');
    btn.innerHTML = '<span class="rc-icon" aria-hidden="true">check</span>Adicionada à sacola';
    var finish = function () {
      state.bag.push(item);
      updateBadge(true); renderBag(false);
      snack('Adicionada à sacola', 'Ver sacola', function () { go('sacola'); });
      btn.classList.remove('is-added');
      btn.innerHTML = '<span class="rc-icon" aria-hidden="true">add_shopping_cart</span>Adicionar mais um';
    };
    var badge = $('#nav-badge');
    if (!canAnimate()) { finish(); return; }
    var fr = badge.getBoundingClientRect();
    var fly = document.createElement('div');
    fly.className = 'fly'; fly.innerHTML = thumbHTML(ph, '', 'Item voando para a sacola');
    fly.style.left = (br.left - ar.left + br.width / 2 - 28) + 'px';
    fly.style.top = (br.top - ar.top + br.height / 2 - 28) + 'px';
    app.appendChild(fly);
    gsap.to(fly, { x: fr.left - br.left - br.width / 2 + 28, y: fr.top - br.top - br.height / 2 + 20, scale: 0.3, rotation: 200, duration: 0.7, ease: 'power2.in',
      onComplete: function () { fly.remove(); finish(); } });
  }
  $('#btn-mais').addEventListener('click', function () { setPhoto(null); go('captura'); });
  $('#btn-cheguei').addEventListener('click', startDeposit);

  /* ---------- Mapa (MapLibre GL + OpenFreeMap + Overpass) ---------- */
  var BSB = { lat: -15.7939, lng: -47.8828 };
  var map = null, userPos = { lat: BSB.lat, lng: BSB.lng }, markers = [], meMarker = null, places = [], selected = -1, reqId = 0, placesLoaded = false;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Lista salva (offline): supermercados reais de Brasília, vindos do OpenStreetMap via Overpass.
  var OFFLINE_PLACES = [
    { name: 'Horti Mais', lat: -15.81032, lng: -47.88894, addr: 'CLS 203, Bloco D, Loja 35' },
    { name: 'Biomundo', lat: -15.79521, lng: -47.88410, addr: 'SDS' },
    { name: 'Carrefour', lat: -15.80986, lng: -47.88449, addr: 'Ciclovia L2 Sul' },
    { name: 'Carrefour', lat: -15.77473, lng: -47.88761, addr: 'EQN 504/505' }
  ];
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dist(a, b) {
    var R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    var h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function fmtDist(m) { return m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km'; }
  function fmtWalk(m) { var min = Math.max(1, Math.ceil(m / (5000 / 60))); return min >= 60 ? Math.floor(min / 60) + ' h ' + (min % 60) + ' min' : min + ' min'; }
  function moveTo(lat, lng, zoom) {
    if (!map) return;
    var o = { center: [lng, lat], zoom: zoom };
    if (reduceMotion) map.jumpTo(o); else map.flyTo(o);
  }
  function pinEl(cls, icon, label, tag) {
    var el = document.createElement(tag || 'button');
    if (!tag) el.type = 'button';
    el.className = 'pin-wrap';
    el.setAttribute('aria-label', label);
    el.innerHTML = '<span class="pin ' + cls + '"><span class="rc-icon rc-icon--fill" aria-hidden="true">' + icon + '</span></span>';
    return el;
  }
  function initMap() {
    if (!map) {
      if (!window.maplibregl) {
        $('#map').innerHTML = '<p class="field-error" style="margin:16px"><span class="rc-icon" aria-hidden="true">error</span>Não foi possível carregar o mapa. Verifique a conexão e recarregue a página.</p>';
        setPlaceStatus('Sem o mapa, a lista de mercados fica indisponível. Verifique a conexão e recarregue a página.', true);
        return;
      }
      map = new maplibregl.Map({
        container: 'map', style: 'https://tiles.openfreemap.org/styles/positron',
        center: [userPos.lng, userPos.lat], zoom: 13, attributionControl: false, cooperativeGestures: true
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenFreeMap © colaboradores do OpenStreetMap' }));
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }
    setTimeout(function () { map.resize(); }, 60);
    if (!placesLoaded) { setLoc('Partindo do centro de Brasília.', false); loadPlaces(); }
  }
  function setPlaceStatus(text, warn, busy) {
    var p = $('#place-status'); if (!p) return;
    p.hidden = !text; $('#place-text').textContent = text || '';
    p.classList.toggle('is-denied', !!warn);
    var ic = p.querySelector('.rc-icon');
    ic.textContent = busy ? 'progress_activity' : warn ? 'cloud_off' : 'info';
    ic.classList.toggle('spin', !!busy);
  }
  function overpass(r) {
    var q = '[out:json][timeout:15];nwr["shop"="supermarket"](around:' + r + ',' + userPos.lat + ',' + userPos.lng + ');out center 40;';
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 20000);
    return fetch('https://overpass-api.de/api/interpreter', { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body: 'data=' + encodeURIComponent(q) })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (j) {
        clearTimeout(t);
        return (j.elements || []).map(function (e) {
          var c = e.center || e, tg = e.tags || {};
          if (typeof c.lat !== 'number') return null;
          var addr = tg['addr:street'] ? tg['addr:street'] + (tg['addr:housenumber'] ? ', ' + tg['addr:housenumber'] : '') : '';
          return { name: tg.name || 'Supermercado (sem nome no mapa)', lat: c.lat, lng: c.lon, addr: addr };
        }).filter(Boolean);
      }, function (err) { clearTimeout(t); throw err; });
  }
  // Segunda fonte: Photon (komoot), busca reversa nos dados do OpenStreetMap, já ordenada por distância.
  function photon(km) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 15000);
    var url = 'https://photon.komoot.io/reverse?lat=' + userPos.lat + '&lon=' + userPos.lng + '&osm_tag=shop:supermarket&limit=15&radius=' + km;
    return fetch(url, { signal: ctl.signal })
      .then(function (res) { if (!res.ok) throw new Error('http ' + res.status); return res.json(); })
      .then(function (j) {
        clearTimeout(t);
        return (j.features || []).map(function (f) {
          var pr = f.properties || {}, c = (f.geometry || {}).coordinates || [];
          if (typeof c[1] !== 'number') return null;
          var addr = pr.street ? pr.street + (pr.housenumber ? ', ' + pr.housenumber : '') : '';
          return { name: pr.name || 'Supermercado (sem nome no mapa)', lat: c[1], lng: c[0], addr: addr };
        }).filter(Boolean);
      }, function (err) { clearTimeout(t); throw err; });
  }
  function buscarMercados() {
    return overpass(3000)
      .then(function (r) { return r.length < 3 ? overpass(6000).catch(function () { return r; }) : r; })
      .catch(function () {
        return photon(3).then(function (r) { return r.length < 3 ? photon(6).catch(function () { return r; }) : r; });
      });
  }
  function loadPlaces() {
    var id = ++reqId; placesLoaded = true;
    setPlaceStatus('Procurando mercados por perto…', false, true);
    $('#place-list').setAttribute('aria-busy', 'true');
    buscarMercados()
      .then(function (r) {
        if (id !== reqId) return;
        if (!r.length) { places = []; setPlaceStatus('Não encontramos supermercados num raio de 6 km. Tente de novo em outro lugar ou mais tarde.', true); }
        else { places = r; setPlaceStatus('', false); }
        renderPlaces(true);
      })
      .catch(function () {
        if (id !== reqId) return;
        places = OFFLINE_PLACES.map(function (p) { return Object.assign({}, p); });
        setPlaceStatus('Não deu para buscar os mercados agora. Mostrando uma lista salva de Brasília (offline). Toque em “Usar minha localização” para tentar de novo.', true);
        renderPlaces(true);
      });
  }
  function select(i, fromList) {
    selected = i;
    $$('.place').forEach(function (c, k) { c.classList.toggle('is-selected', k === i); });
    markers.forEach(function (m, k) { m.getElement().classList.toggle('is-selected', k === i); });
    var p = places[i]; if (!p) return;
    moveTo(p.lat, p.lng, 16);
    var beh = reduceMotion ? 'auto' : 'smooth';
    if (fromList) { var w = $('.map-wrap'); if (w) w.scrollIntoView({ block: 'nearest', behavior: beh }); }
    else { var c = $$('.place')[i]; if (c) c.scrollIntoView({ block: 'nearest', behavior: beh }); }
  }
  function renderPlaces(fit) {
    places.forEach(function (p) { p.d = dist(userPos, p); });
    places.sort(function (a, b) { return a.d - b.d; });
    selected = -1;
    $('#place-list').removeAttribute('aria-busy');
    $('#place-list').innerHTML = places.map(function (p, i) {
      var url = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=' + encodeURIComponent(userPos.lat + ',' + userPos.lng + ';' + p.lat + ',' + p.lng);
      return '<li class="place' + (i === 0 ? ' is-near' : '') + '">' +
        '<button class="place__main" type="button" data-i="' + i + '" aria-label="Mostrar ' + esc(p.name) + ' no mapa">' +
        '<span class="rc-icon rc-icon--fill" aria-hidden="true" style="font-size:30px">storefront</span>' +
        '<span class="place__txt">' + (i === 0 ? '<span class="place__star">Mais perto</span>' : '') + '<strong>' + esc(p.name) + '</strong>' +
        (p.addr ? '<span class="rc-body-small">' + esc(p.addr) + '</span>' : '') +
        '<span class="rc-body-medium rc-num"><span class="rc-icon" aria-hidden="true" style="font-size:18px;vertical-align:-4px">directions_walk</span> ' + fmtDist(p.d) + ' em linha reta · ' + fmtWalk(p.d) + ' a pé</span></span></button>' +
        '<a class="place__go" href="' + url + '" target="_blank" rel="noopener noreferrer" aria-label="Como chegar a ' + esc(p.name) + ' (abre o OpenStreetMap em nova aba)"><span class="rc-icon" aria-hidden="true">directions</span>Como chegar</a></li>';
    }).join('');
    $$('.place__main').forEach(function (b) { b.addEventListener('click', function () { select(+b.dataset.i, true); }); });
    if (!map) return;
    markers.forEach(function (m) { m.remove(); }); markers = [];
    places.forEach(function (p, i) {
      var el = pinEl(i === 0 ? 'pin--near' : '', 'storefront', p.name + ', ' + fmtDist(p.d) + ' em linha reta');
      el.addEventListener('click', function () { select(i, false); });
      markers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map));
    });
    if (meMarker) meMarker.remove();
    meMarker = new maplibregl.Marker({ element: pinEl('pin--me', 'person', 'Ponto de partida', 'span'), anchor: 'center' }).setLngLat([userPos.lng, userPos.lat]).addTo(map);
    if (fit) fitAll();
  }
  function fitAll() {
    if (!map) return;
    var b = new maplibregl.LngLatBounds([userPos.lng, userPos.lat], [userPos.lng, userPos.lat]);
    places.slice(0, 4).forEach(function (p) { b.extend([p.lng, p.lat]); });
    map.resize();
    map.fitBounds(b, { padding: 50, maxZoom: 15, duration: reduceMotion ? 0 : 800 });
  }
  function setLoc(text, denied, busy) {
    $('#loc-text').textContent = text;
    $('#loc-status').classList.toggle('is-denied', !!denied);
    var ic = $('#loc-status .rc-icon');
    ic.textContent = busy ? 'progress_activity' : denied ? 'location_disabled' : 'pin_drop';
    ic.classList.toggle('spin', !!busy);
  }
  $('#btn-loc').addEventListener('click', function () {
    var btn = this;
    var fallback = function (err) {
      btn.disabled = false;
      userPos = { lat: BSB.lat, lng: BSB.lng };
      var why = !navigator.geolocation ? 'Este navegador ou esta página não permite usar a localização.'
        : err && err.code === 1 ? 'A permissão de localização foi negada.'
        : err && err.code === 3 ? 'A localização demorou mais de 10 segundos.'
        : 'Não foi possível descobrir sua localização.';
      setLoc(why + ' Partindo do centro de Brasília. Para usar a sua, libere a localização no navegador e toque de novo.', true);
      moveTo(BSB.lat, BSB.lng, 13); loadPlaces();
    };
    if (!navigator.geolocation) { fallback(); return; }
    btn.disabled = true;
    setLoc('Buscando sua localização…', false, true);
    try {
      navigator.geolocation.getCurrentPosition(function (pos) {
        btn.disabled = false;
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLoc('Usando a sua localização.', false);
        if (map) moveTo(userPos.lat, userPos.lng, 14);
        loadPlaces();
      }, fallback, { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false });
    } catch (e) { fallback(); }
  });

  /* ---------- 6. Depósito / voucher ---------- */
  function genCode() {
    var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = function (n) { var r = ''; for (var i = 0; i < n; i++) r += A[Math.floor(Math.random() * A.length)]; return r; };
    return 'RVM-' + s(6) + '-' + s(6);
  }
  function startDeposit() {
    if (!state.bag.length) return;
    var items = state.bag.slice();
    var giveBack = $('#sw-return').checked && items.length > 1 ? items[items.length - 1].id : null;
    go('deposito');
    $('#voucher').hidden = true;
    $('#dep-label').textContent = 'Conferindo as embalagens…';
    var bar = $('#dep-bar'), fill = $('.rc-progress__bar', bar);
    fill.style.setProperty('--rc-progress', '0%'); bar.setAttribute('aria-valuenow', 0);
    $('#dep-count').textContent = '0 de ' + items.length;
    $('#check-list').innerHTML = items.map(function (it) {
      var k = KINDS[it.kind];
      return '<li class="check-row" data-row="' + it.id + '">' + thumbHTML(it.photo, '', k.label) +
        '<div class="check-row__txt"><p class="rc-title-medium">' + k.label + '</p><p class="status" data-st><span class="rc-icon spin" aria-hidden="true">progress_activity</span>Conferindo…</p></div>' +
        '<span class="rc-body-medium rc-num">' + brl(k.cents) + '</span></li>';
    }).join('');
    enter($$('#check-list .check-row'));
    var accepted = 0, done = 0, delay = reduced() ? 150 : 900;
    items.forEach(function (it, i) {
      setTimeout(function () {
        var row = $('[data-row="' + it.id + '"] [data-st]');
        var ok = it.id !== giveBack;
        if (ok) { accepted += KINDS[it.kind].cents; row.className = 'status status--ok'; row.innerHTML = '<span class="rc-icon rc-icon--fill" aria-hidden="true">check_circle</span>Aceito'; }
        else { row.className = 'status status--back'; row.innerHTML = '<span class="rc-icon rc-icon--fill" aria-hidden="true">undo</span>Devolvido · reposicione e tente de novo'; }
        it.ok = ok; done++;
        var pct = Math.round(done / items.length * 100);
        fill.style.setProperty('--rc-progress', pct + '%'); bar.setAttribute('aria-valuenow', pct);
        $('#dep-count').textContent = done + ' de ' + items.length;
        if (done === items.length) finishDeposit(items, accepted);
      }, delay * (i + 1));
    });
  }
  function finishDeposit(items, cents) {
    $('#dep-label').textContent = 'Conferência concluída';
    var keep = items.filter(function (i) { return !i.ok; }).map(function (i) { return i.id; });
    state.bag = state.bag.filter(function (i) { return keep.indexOf(i.id) > -1; });
    updateBadge(false); renderBag(false);
    var v = $('#voucher');
    if (!cents) {
      $('#v-title').textContent = 'Nenhuma embalagem aceita';
      $('#v-value').textContent = brl(0); $('#v-code').textContent = 'Sem voucher desta vez';
      $('#btn-copiar').hidden = true;
    } else {
      $('#v-title').innerHTML = '<span class="rc-icon rc-icon--fill" aria-hidden="true" style="vertical-align:-5px">confirmation_number</span> Voucher ReciclaAI';
      $('#v-code').textContent = genCode();
      $('#v-value').dataset.v = 0;
      $('#btn-copiar').hidden = false;
    }
    v.hidden = false;
    if (cents) countUp($('#v-value'), cents, 0.9); // React Bits · CountUp
    if (canAnimate()) {
      gsap.from('#voucher .voucher__card', { y: 40, rotateX: -35, scale: 0.9, opacity: 0, transformPerspective: 600, duration: 0.7, ease: 'back.out(1.6)', clearProps: 'all' });
      gsap.from('#voucher > :not(.voucher__card)', { opacity: 0, y: 12, duration: 0.4, delay: 0.5, stagger: 0.1, clearProps: 'all' });
    }
    v.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
  }
  $('#btn-copiar').addEventListener('click', function () {
    var code = $('#v-code').textContent;
    var done = function () { snack('Código copiado'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallbackCopy); else fallbackCopy();
    function fallbackCopy() {
      var ta = document.createElement('textarea'); ta.value = code; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { snack('Não deu para copiar. Selecione o código e copie.'); }
      ta.remove();
    }
  });
  $('#btn-novo').addEventListener('click', function () { setPhoto(null); go('captura'); });

  /* ---------- Painel e atalhos ---------- */
  $('#sw-heur').addEventListener('change', function (e) { document.body.classList.toggle('show-h', e.target.checked); });
  $('#btn-reset').addEventListener('click', function () {
    stopScan(); hideSnack(); setPhoto(null); clearError();
    seedBag(); state.cycle = 0; go('captura');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) { closeSheet(); return; }
    var t = e.target.tagName;
    if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(t) || !sheet.hidden) return;
    var map3 = { '1': 'captura', '2': 'sacola', '3': 'mapa' };
    if (map3[e.key]) { if (state.screen === 'analisando') cancelAnalysis(true); go(map3[e.key]); }
  });

  function seedBag() {
    state.bag = [
      { id: ++state.uid, kind: 'pet', photo: { scene: 'pet', name: 'Garrafa' } },
      { id: ++state.uid, kind: 'glass', photo: { scene: 'glass', name: 'Vidro' } }
    ];
    renderBag(false); updateBadge(false);
  }

  seedBag();
  go('captura', { noFocus: true });

  // Permite abrir direto numa tela: index.html#sacola (útil para revisar)
  var hash = (location.hash || '').slice(1);
  if (/^(captura|sacola|mapa)$/.test(hash)) go(hash, { noFocus: true });
  else if (/^resultado-[abc]$/.test(hash)) { state.photo = Object.assign({}, SAMPLES[{ a: 'pet', b: 'organic', c: 'blur' }[hash.slice(-1)]]); showResult(hash.slice(-1)); }
  else if (hash === 'analisando') { setPhoto(Object.assign({}, SAMPLES.pet)); startAnalysis(); }
  else if (hash === 'deposito') { startDeposit(); }
})();
