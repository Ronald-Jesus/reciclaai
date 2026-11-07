/* ==========================================================================
   ReciclaAI · landing page (protótipo)
   GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13 · three.js r134 + Vanta 0.5.24 (DOTS)
   Efeitos no estilo React Bits, refeitos em JS puro (o site final é React):
     SplitText   → título do topo entra palavra por palavra
     ScrollFloat → frases das fotos sobem letra a letra com a rolagem
     CountUp     → números do Brasil × Alemanha e do simulador
     Magnet      → botão final puxa na direção do cursor
     ClickSpark  → faíscas no clique do botão final
   Tudo checa prefers-reduced-motion e a falta de cada biblioteca.
   ========================================================================== */

/* --- Configuração da sequência de quadros da máquina (vídeo exportado) ---
   Enquanto os quadros não existirem, a seção anima o SVG em camadas. */
var MAQUINA_FRAMES = {
  pasta: "../video/frames/",
  prefixo: "frame_",
  digitos: 4,              // frame_0001.webp
  extensao: ".webp",
  total: 240,              // número de quadros
  largura: 1920,           // tamanho de origem (só para a proporção)
  altura: 1080,
  // em que fração do vídeo cada peça termina de encaixar (9 valores, 0–1).
  // null = dividido igualmente entre as 9 peças, com o trecho final para a tela ligar.
  marcos: null
};

var PECAS = [
  ["Compartimentos (PET, lata, vidro)", "Separar já na máquina deixa o material mais valioso para o reciclador."],
  ["Separador", "Desvia cada embalagem para o compartimento certo depois da decisão da IA."],
  ["Compactador", "Amassa PET e lata: cabe muito mais até o próximo esvaziamento. Vidro segue inteiro."],
  ["Balança", "Confere o peso: garrafa ainda cheia é devolvida."],
  ["Esteira", "Gira a embalagem na frente da câmera e do leitor."],
  ["Leitor de código de barras", "Nas máquinas alemãs, confirma que a embalagem faz parte do sistema. Aqui reforça a decisão da IA."],
  ["Câmera e IA", "O coração da máquina: identifica o material. É a IA que você testa no app."],
  ["Abertura de entrada", "Recebe um item por vez, com luz indicando quando está pronta."],
  ["Tela e impressora de voucher", "Mostra o resultado e entrega o crédito."]
];

(function () {
  "use strict";

  var root = document.documentElement;
  var reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var temGsap = !!(window.gsap && window.ScrollTrigger);
  var temLenis = typeof window.Lenis === "function";
  var temVanta = !!(window.VANTA && window.VANTA.DOTS && window.THREE);
  var anima = temGsap && !reduzir;
  var fmt = new Intl.NumberFormat("pt-BR");

  function cssVar(nome) { return getComputedStyle(root).getPropertyValue(nome).trim(); }
  // converte qualquer cor CSS (lida dos tokens) para o número que o Vanta espera
  function corNumero(nome) {
    var c = document.createElement("canvas").getContext("2d");
    c.fillStyle = "#000"; c.fillStyle = cssVar(nome) || "#000";
    var v = c.fillStyle;
    if (v.charAt(0) === "#") return parseInt(v.slice(1), 16);
    var m = v.match(/\d+/g) || [0, 0, 0];
    return (m[0] << 16) | (m[1] << 8) | (m[2] | 0);
  }

  /* ------------------------------------------------------------------
     Menu do celular
     ------------------------------------------------------------------ */
  var topo = document.getElementById("topo");
  var btnMenu = topo.querySelector(".topo__menu");
  btnMenu.addEventListener("click", function () {
    var aberto = topo.classList.toggle("is-open");
    btnMenu.setAttribute("aria-expanded", String(aberto));
    btnMenu.querySelector(".rc-icon").textContent = aberto ? "close" : "menu";
  });
  topo.querySelectorAll(".topo__nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      topo.classList.remove("is-open");
      btnMenu.setAttribute("aria-expanded", "false");
      btnMenu.querySelector(".rc-icon").textContent = "menu";
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && topo.classList.contains("is-open")) { btnMenu.click(); btnMenu.focus(); }
  });

  /* ------------------------------------------------------------------
     Lenis (rolagem suave) ligado ao ticker do GSAP
     ------------------------------------------------------------------ */
  var lenis = null;
  if (anima) gsap.registerPlugin(ScrollTrigger);
  if (anima && temLenis) {
    lenis = new Lenis({ lerp: 0.12 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  // âncoras internas: com Lenis, rola suave descontando o topo fixo
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      var alvo = id.length > 1 && document.querySelector(id);
      if (!alvo) return;
      if (lenis) { e.preventDefault(); lenis.scrollTo(alvo, { offset: -64 }); }
      if (alvo.id === "conteudo") alvo.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------------------------
     Vanta DOTS no topo (cores lidas dos tokens; bloco chapado se falhar)
     ------------------------------------------------------------------ */
  var vanta = null;
  if (temVanta && !reduzir) {
    try {
      vanta = VANTA.DOTS({
        el: "#vanta",
        mouseControls: true, touchControls: false, gyroControls: false,
        minHeight: 200, minWidth: 200, scale: 1, scaleMobile: 1,
        backgroundColor: corNumero("--md-sys-color-primary-container"),
        color: corNumero("--rc-ink"),
        color2: corNumero("--md-sys-color-primary"),
        size: 2.6, spacing: 34, showLines: false
      });
    } catch (err) { vanta = null; }
  }

  /* ------------------------------------------------------------------
     React Bits: SplitText — título entra palavra por palavra
     ------------------------------------------------------------------ */
  var titulo = document.querySelector("[data-split]");
  if (titulo && anima) {
    var texto = titulo.textContent.trim();
    titulo.setAttribute("aria-label", texto);
    titulo.innerHTML = texto.split(" ").map(function (w) {
      return '<span class="split-w" aria-hidden="true"><span>' + w + "</span></span>";
    }).join(" ");
    gsap.from(titulo.querySelectorAll(".split-w > span"), {
      yPercent: 110, rotation: 6, duration: 0.9, ease: "back.out(1.4)", stagger: 0.07, delay: 0.15
    });
    gsap.from(".hero__lead, .hero__acoes, .hero__sobre", { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, delay: 0.55, ease: "power3.out" });
  }

  /* ------------------------------------------------------------------
     React Bits: ScrollFloat — frases das fotos, letra a letra
     ------------------------------------------------------------------ */
  if (anima) {
    document.querySelectorAll("[data-float]").forEach(function (el) {
      var t = el.textContent;
      el.setAttribute("aria-label", t);
      el.innerHTML = t.split("").map(function (c) {
        return '<span class="float-c" aria-hidden="true">' + (c === " " ? " " : c) + "</span>";
      }).join("");
      gsap.fromTo(el.querySelectorAll(".float-c"),
        { yPercent: 120, scaleY: 2.2, scaleX: 0.7, opacity: 0, transformOrigin: "50% 0%" },
        { yPercent: 0, scaleY: 1, scaleX: 1, opacity: 1, ease: "back.inOut(2)", stagger: 0.03,
          scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 55%", scrub: true } });
    });
    document.querySelectorAll(".foto").forEach(function (f, i) {
      gsap.fromTo(f, { y: 60, rotation: i % 2 ? 1.5 : -1.5 },
        { y: 0, rotation: 0, ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "top 40%", scrub: true } });
    });
  }

  /* ------------------------------------------------------------------
     React Bits: CountUp — anima um número até o valor final
     ------------------------------------------------------------------ */
  function countUp(el, de, ate, opts) {
    opts = opts || {};
    var dec = opts.decimais || 0;
    var formata = opts.formata || function (v) {
      return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    if (!anima) { el.textContent = formata(ate); return; }
    var o = { v: de };
    gsap.killTweensOf(el._cu || {});
    el._cu = o;
    gsap.to(o, { v: ate, duration: opts.duracao || 1.1, ease: "power2.out",
      onUpdate: function () { el.textContent = formata(o.v); } });
  }
  document.querySelectorAll("[data-count]").forEach(function (el) {
    var alvo = parseFloat(el.dataset.count), dec = parseInt(el.dataset.decimals || "0", 10);
    if (!anima) return; // o HTML já tem o número final
    el.textContent = (0).toLocaleString("pt-BR", { minimumFractionDigits: dec });
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true,
      onEnter: function () { countUp(el, 0, alvo, { decimais: dec, duracao: 1.6 }); } });
  });

  /* ------------------------------------------------------------------
     6.3 A máquina: sequência de quadros (canvas) ou SVG em camadas
     ------------------------------------------------------------------ */
  var palco = document.getElementById("maquina");
  var svgBox = document.getElementById("palco-svg");
  var svg = svgBox.querySelector("svg");
  var canvas = document.getElementById("palco-canvas");
  var luzFundo = palco.querySelector(".palco__luz");
  var $cont = document.getElementById("palco-contagem"), $est = document.getElementById("palco-estado"),
      $barra = document.getElementById("palco-barra"), $num = document.getElementById("palco-num"),
      $nome = document.getElementById("palco-nome"), $porque = document.getElementById("palco-porque");
  var N = PECAS.length;
  var pecasSvg = svg ? svg.querySelectorAll("[data-peca]") : [];
  var telaOn = svg && svg.querySelector("#tela-ligada"), telaOff = svg && svg.querySelector("#tela-desligada");
  var luzEstado = svg && svg.querySelector("#luz-estado");

  function ligarTela(on) {
    if (!telaOn) return;
    telaOn.setAttribute("display", on ? "inline" : "none");
    telaOff.setAttribute("display", on ? "none" : "inline");
  }

  var passoAtual = -1, ligada = false;
  function mostrarPasso(n, on) {
    if (n === passoAtual && on === ligada) return;
    var mudouPasso = n !== passoAtual;
    passoAtual = n;
    $cont.textContent = n + " de " + N + " peças";
    $barra.setAttribute("aria-valuenow", String(n));
    $barra.setAttribute("aria-valuetext", n + " de " + N + " peças");
    $barra.firstElementChild.style.setProperty("--rc-progress", (n / N * 100) + "%");
    $num.textContent = n < 10 ? "0" + n : String(n);
    if (on) {
      $est.textContent = "Ligada";
      $nome.textContent = "Pronta. Insira uma embalagem.";
      $porque.textContent = "A tela liga quando a última peça encaixa. A partir daqui, cada garrafa vale crédito.";
    } else if (n === 0) {
      $est.textContent = "Máquina vazia";
      $nome.textContent = "Só o contorno.";
      $porque.textContent = "Role para a primeira peça entrar.";
    } else {
      $est.textContent = n === N ? "Montada" : "Montando";
      $nome.textContent = PECAS[n - 1][0];
      $porque.textContent = PECAS[n - 1][1];
    }
    if (on !== ligada) {
      ligada = on;
      ligarTela(on);
      palco.classList.toggle("is-on", on);
      if (anima) gsap.to(luzFundo, { scale: on ? 1 : 0, duration: on ? 0.7 : 0.3, ease: on ? "back.out(1.6)" : "power2.in" });
      if (anima && on && telaOn) gsap.fromTo(telaOn, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 3, yoyo: true, onComplete: function () { gsap.set(telaOn, { opacity: 1 }); } });
    }
    if (anima && mudouPasso) gsap.fromTo([$nome, $porque], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: "power2.out", overwrite: true });
  }

  // progresso (0–1) → peça atual e tela ligada
  function passoPorProgresso(p) {
    var marcos = MAQUINA_FRAMES.marcos;
    var n = 0;
    if (modo === "frames" && marcos && marcos.length === N) {
      for (var i = 0; i < N; i++) if (p >= marcos[i]) n = i + 1;
    } else {
      // N peças + 1 trecho final para ligar: cada peça encaixa ao fim do seu trecho
      n = Math.min(N, Math.floor(p * (N + 1) + 0.15));
    }
    return { n: n, on: p >= (N + 0.4) / (N + 1) };
  }

  function modoEstatico(motivo) {
    palco.classList.add("palco--estatico");
    canvas.hidden = true; svgBox.hidden = false;
    pecasSvg.forEach(function (el) { el.style.opacity = 1; el.style.transform = "none"; });
    mostrarPasso(N, true);
    var lead = palco.querySelector(".palco__lead");
    if (lead) lead.textContent = "Aqui está a máquina pronta. Abaixo, as nove peças de baixo para cima e por que cada uma existe.";
    if (motivo) {
      var aviso = document.getElementById("palco-aviso");
      aviso.innerHTML = '<span class="rc-icon" aria-hidden="true">info</span><span></span>';
      aviso.lastChild.textContent = motivo;
      aviso.hidden = false;
    }
  }

  var modo = "svg";
  var stepPx = function () { return window.innerWidth < 600 ? 200 : 380; };

  function montarSvg() {
    modo = "svg";
    canvas.hidden = true; svgBox.hidden = false;
    ligarTela(false);
    var origens = [{ y: 360 }, { x: -320 }, { x: 320 }];
    var tl = gsap.timeline({ paused: true });
    pecasSvg.forEach(function (el, i) {
      var o = origens[i % 3];
      gsap.set(el, { opacity: 0, x: o.x || 0, y: o.y || 0, rotation: (i % 2 ? 1 : -1) * 9, transformOrigin: "50% 50%" });
      tl.to(el, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.85, ease: "back.out(1.6)" }, i);
    });
    tl.to({}, { duration: 1 }, N);
    if (luzEstado) gsap.set(luzEstado, { transformOrigin: "50% 50%" });
    ScrollTrigger.create({
      trigger: "#palco-pin", start: "top top",
      end: function () { return "+=" + (N + 1) * stepPx(); },
      pin: true, scrub: 0.5, invalidateOnRefresh: true, animation: tl,
      onUpdate: function (st) {
        var s = passoPorProgresso(st.progress);
        mostrarPasso(s.n, s.on);
      }
    });
    mostrarPasso(0, false);
  }

  function montarFrames() {
    modo = "frames";
    canvas.hidden = false; svgBox.hidden = true;
    var ctx = canvas.getContext("2d");
    var cfg = MAQUINA_FRAMES, imgs = new Array(cfg.total), atual = 0;
    function url(i) { return cfg.pasta + cfg.prefixo + String(i + 1).padStart(cfg.digitos, "0") + cfg.extensao; }
    for (var i = 0; i < cfg.total; i++) { imgs[i] = new Image(); imgs[i].decoding = "async"; imgs[i].src = url(i); }
    function ajustar() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      desenhar(atual);
    }
    function desenhar(i) {
      // usa o quadro carregado mais próximo (para trás) enquanto os outros chegam
      var k = i; while (k > 0 && !(imgs[k].complete && imgs[k].naturalWidth)) k--;
      var img = imgs[k]; if (!img.complete || !img.naturalWidth) return;
      var cw = canvas.width, ch = canvas.height, s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      var w = img.naturalWidth * s, h = img.naturalHeight * s;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    }
    imgs[0].onload = ajustar;
    window.addEventListener("resize", ajustar);
    ScrollTrigger.create({
      trigger: "#palco-pin", start: "top top",
      end: function () { return "+=" + (N + 1) * stepPx(); },
      pin: true, scrub: 0.3, invalidateOnRefresh: true,
      onUpdate: function (st) {
        atual = Math.min(cfg.total - 1, Math.round(st.progress * (cfg.total - 1)));
        desenhar(atual);
        var s = passoPorProgresso(st.progress);
        mostrarPasso(s.n, s.on);
      }
    });
    ajustar();
    mostrarPasso(0, false);
  }

  if (!svg) {
    modoEstatico("A ilustração da máquina não carregou. Aqui estão as 9 peças, em ordem.");
  } else if (reduzir) {
    modoEstatico(null);
  } else if (!temGsap) {
    modoEstatico("A animação da montagem não carregou (sem conexão com a biblioteca). Aqui está a máquina pronta, peça por peça.");
  } else {
    // testa o primeiro quadro: se existir, usa o vídeo; se não, o SVG em camadas
    var teste = new Image();
    var decidido = false;
    var decidir = function (temQuadros) {
      if (decidido) return; decidido = true;
      if (temQuadros) montarFrames(); else montarSvg();
      ScrollTrigger.refresh();
    };
    teste.onload = function () { decidir(true); };
    teste.onerror = function () { decidir(false); };
    setTimeout(function () { decidir(false); }, 2500);
    teste.src = MAQUINA_FRAMES.pasta + MAQUINA_FRAMES.prefixo + "1".padStart(MAQUINA_FRAMES.digitos, "0") + MAQUINA_FRAMES.extensao;
    // mostra o estado inicial (só o contorno) enquanto decide
    pecasSvg.forEach(function (el) { el.style.opacity = 0; });
    ligarTela(false);
    mostrarPasso(0, false);
  }

  /* ------------------------------------------------------------------
     6.4 Simulador
     ------------------------------------------------------------------ */
  var MIX = {
    pet:   { p: 0.6, l: 0.3, v: 0.1, txt: "60% PET, 30% lata, 10% vidro" },
    igual: { p: 1 / 3, l: 1 / 3, v: 1 / 3, txt: "Um terço de cada: PET, lata e vidro" },
    vidro: { p: 0.2, l: 0.2, v: 0.6, txt: "20% PET, 20% lata, 60% vidro" }
  };
  var VALOR = { p: 0.10, l: 0.15, v: 0.25 };
  var mixAtual = "pet";
  var $pes = document.getElementById("sim-pessoas"), $tra = document.getElementById("sim-trazem"), $por = document.getElementById("sim-por");
  var $mes = document.getElementById("res-mes"), $cred = document.getElementById("res-credito"), $ano = document.getElementById("res-ano");
  var ultimo = { mes: 45000, cred: 5850, ano: 540000 };
  var reais = function (v) { return "R$ " + fmt.format(Math.round(v)); };
  var inteiro = function (v) { return fmt.format(Math.round(v)); };

  function preencher(input) {
    var p = (input.value - input.min) / (input.max - input.min) * 100;
    input.style.setProperty("--fill", p + "%");
  }
  function calcular() {
    [$pes, $tra, $por].forEach(preencher);
    document.getElementById("out-pessoas").textContent = fmt.format(+$pes.value);
    document.getElementById("out-trazem").textContent = $tra.value + "%";
    document.getElementById("out-por").textContent = $por.value;
    var m = MIX[mixAtual];
    var mes = +$pes.value * (+$tra.value / 100) * +$por.value * 30;
    var medio = m.p * VALOR.p + m.l * VALOR.l + m.v * VALOR.v;
    var novo = { mes: mes, cred: mes * medio, ano: mes * 12 };
    countUp($mes, ultimo.mes, novo.mes, { formata: inteiro, duracao: 0.6 });
    countUp($cred, ultimo.cred, novo.cred, { formata: reais, duracao: 0.6 });
    countUp($ano, ultimo.ano, novo.ano, { formata: inteiro, duracao: 0.6 });
    ultimo = novo;
    document.getElementById("sim-mixtxt").textContent = m.txt;
  }
  [$pes, $tra, $por].forEach(function (i) { i.addEventListener("input", calcular); });
  var mixBtns = document.querySelectorAll("[data-mix]");
  mixBtns.forEach(function (b, idx) {
    b.addEventListener("click", function () {
      mixAtual = b.dataset.mix;
      mixBtns.forEach(function (o) { o.setAttribute("aria-checked", String(o === b)); o.tabIndex = o === b ? 0 : -1; });
      calcular();
    });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return; e.preventDefault();
      var nx = mixBtns[(idx + d + mixBtns.length) % mixBtns.length]; nx.click(); nx.focus();
    });
    b.tabIndex = b.getAttribute("aria-checked") === "true" ? 0 : -1;
  });
  document.getElementById("sim").addEventListener("submit", function (e) { e.preventDefault(); });
  calcular();

  /* ------------------------------------------------------------------
     6.5 Para quem: abas (setas do teclado trocam)
     ------------------------------------------------------------------ */
  var abas = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function ativar(aba, foco) {
    abas.forEach(function (a) {
      var sel = a === aba;
      a.setAttribute("aria-selected", String(sel));
      a.setAttribute("aria-pressed", String(sel));
      a.tabIndex = sel ? 0 : -1;
      document.getElementById(a.getAttribute("aria-controls")).hidden = !sel;
    });
    if (foco) aba.focus();
    if (anima) gsap.fromTo("#" + aba.getAttribute("aria-controls"), { x: 6, y: 6, boxShadow: "0 0 0 0 " + cssVar("--rc-ink") },
      { x: 0, y: 0, boxShadow: "6px 6px 0 0 " + cssVar("--rc-ink"), duration: 0.25, ease: "power2.out", clearProps: "boxShadow,transform" });
  }
  abas.forEach(function (a, i) {
    a.addEventListener("click", function () { ativar(a, false); });
    a.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (e.key === "Home") { e.preventDefault(); ativar(abas[0], true); }
      if (e.key === "End") { e.preventDefault(); ativar(abas[abas.length - 1], true); }
      if (d) { e.preventDefault(); ativar(abas[(i + d + abas.length) % abas.length], true); }
    });
  });

  /* ------------------------------------------------------------------
     Navegação: marca a seção visível (estado visível)
     ------------------------------------------------------------------ */
  var links = document.querySelectorAll('.topo__nav a[href^="#"]');
  if ("IntersectionObserver" in window) {
    var mapa = {};
    links.forEach(function (l) { mapa[l.getAttribute("href").slice(1)] = l; });
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var l = mapa[e.target.id];
        if (l && e.isIntersecting) {
          links.forEach(function (o) { o.removeAttribute("aria-current"); });
          l.setAttribute("aria-current", "true");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(mapa).forEach(function (id) { var sec = document.getElementById(id); if (sec) obs.observe(sec); });
  }

  /* ------------------------------------------------------------------
     React Bits: Magnet + ClickSpark no botão final
     ------------------------------------------------------------------ */
  var ima = document.querySelector("[data-magnet]");
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  if (ima && anima && finePointer) {
    var alvoIma = ima.firstElementChild, forca = 0.35;
    ima.addEventListener("mousemove", function (e) {
      var r = ima.getBoundingClientRect();
      gsap.to(alvoIma, { x: (e.clientX - r.left - r.width / 2) * forca, y: (e.clientY - r.top - r.height / 2) * forca, duration: 0.3, ease: "power3.out" });
    });
    ima.addEventListener("mouseleave", function () { gsap.to(alvoIma, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" }); });
  }
  var sparkEl = document.querySelector("[data-spark]");
  if (sparkEl && anima) {
    sparkEl.addEventListener("click", function (e) {
      var x = e.clientX, y = e.clientY;
      if (!x && !y) { var r = sparkEl.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
      for (var i = 0; i < 10; i++) {
        var s = document.createElement("span"); s.className = "spark"; s.setAttribute("aria-hidden", "true");
        document.body.appendChild(s);
        var ang = (i / 10) * Math.PI * 2;
        gsap.set(s, { left: x - 2, top: y - 7, rotation: ang * 180 / Math.PI + 90 });
        gsap.to(s, { x: Math.cos(ang) * 46, y: Math.sin(ang) * 46, opacity: 0, scaleY: 0.3, duration: 0.45, ease: "power2.out",
          onComplete: (function (n) { return function () { n.remove(); }; })(s) });
      }
    });
  }

  window.addEventListener("load", function () { if (anima) ScrollTrigger.refresh(); });
})();
