import gsap from "gsap";

// Faíscas no ponto do clique: o "ClickSpark" do React Bits, recriado com GSAP (o React Bits
// não está instalado). Quem chama confere antes se o sistema pede menos animação.
export function faiscas(x, y, n = 10) {
  for (let i = 0; i < n; i += 1) {
    const s = document.createElement("span");
    s.className = "lx-faisca";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    document.body.append(s);
    const a = ((360 / n) * i * Math.PI) / 180;
    gsap.fromTo(
      s,
      { rotation: (360 / n) * i, x: 0, y: 0, opacity: 1, scaleY: 1 },
      { x: Math.sin(a) * 34, y: -Math.cos(a) * 34, opacity: 0, scaleY: 0.3, duration: 0.55, ease: "power2.out", onComplete: () => s.remove() }
    );
  }
}

// Miniatura da foto voando do botão até a sacola (retângulos de getBoundingClientRect).
export function voar(url, de, para) {
  const img = document.createElement("img");
  img.src = url;
  img.alt = "";
  img.className = "lx-voo";
  const x = de.left + de.width / 2;
  const y = de.top + de.height / 2;
  img.style.left = `${x - 28}px`;
  img.style.top = `${y - 28}px`;
  document.body.append(img);
  gsap.to(img, {
    x: para.left + para.width / 2 - x,
    y: para.top + para.height / 2 - y,
    scale: 0.3,
    rotation: 200,
    duration: 0.7,
    ease: "power2.in",
    onComplete: () => img.remove(),
  });
}
