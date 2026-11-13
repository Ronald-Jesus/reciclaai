import { useId } from "react";
import { PECAS } from "./pecas.js";
import "./maquina.css";

// Desenho aprovado em docs/prototipo/maquina/maquina.svg (viewBox 400 x 640), uma entrada por peça.
function desenhos(telaLigada) {
  return {
    "compartimentos": (
      <>
        <rect x="348" y="538" width="8" height="8" fill="#111"/>
        <path d="M48 538 H348 V608 a10 10 0 0 1 -10 10 H58 a10 10 0 0 1 -10 -10 Z" fill="#111" transform="translate(8 8)"/>
        <path d="M48 538 H348 V608 a10 10 0 0 1 -10 10 H58 a10 10 0 0 1 -10 -10 Z" fill="#fff1c9" className="rv"/>
        {/* plástico */}
        <g className="maquina-bin-plastico">
          <rect x="62" y="546" width="84" height="64" rx="4" fill="#c8453a" className="rv"/>
          <rect x="58" y="546" width="92" height="12" rx="3" fill="#9c3229" className="rv"/>
          <rect x="84" y="550" width="40" height="4" fill="#111"/>
          <g transform="translate(104 584)"><path d="M-3 -20 h6 v6 l6 6 v22 a3 3 0 0 1 -3 3 h-12 a3 3 0 0 1 -3 -3 v-22 l6 -6 z" fill="#fff" className="rv2"/></g>
        </g>
        {/* metal */}
        <g className="maquina-bin-metal">
          <rect x="156" y="546" width="84" height="64" rx="4" fill="#c99700" className="rv"/>
          <rect x="152" y="546" width="92" height="12" rx="3" fill="#957000" className="rv"/>
          <rect x="178" y="550" width="40" height="4" fill="#111"/>
          <g transform="translate(198 584)"><rect x="-10" y="-14" width="20" height="30" rx="3" fill="#fff" className="rv2"/><path d="M-10 -8 h20 M-10 10 h20" className="rv2" fill="none"/></g>
        </g>
        {/* vidro */}
        <g className="maquina-bin-vidro">
          <rect x="250" y="546" width="84" height="64" rx="4" fill="#2e8b57" className="rv"/>
          <rect x="246" y="546" width="92" height="12" rx="3" fill="#1f6a41" className="rv"/>
          <rect x="272" y="550" width="40" height="4" fill="#111"/>
          <g transform="translate(292 584)"><path d="M-3 -20 H3 V-8 C3 -4 10 -2 10 4 V14 Q10 17 7 17 H-7 Q-10 17 -10 14 V4 C-10 -2 -3 -4 -3 -8 Z" fill="#fff" className="rv2"/></g>
        </g>
      </>
    ),
    "separador": (
      <>
        <rect x="48" y="483" width="300" height="55" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="483" width="300" height="55" fill="#fff1c9" className="rv"/>
        {/* tubos (contorno preto, depois miolo cinza) */}
        <g fill="none" stroke="#111" strokeWidth="22">
          <path d="M198 486 V500 M198 500 V536 M198 500 C198 520 104 516 104 536 M198 500 C198 520 292 516 292 536"/>
        </g>
        <g fill="none" stroke="#b9bec4" strokeWidth="16">
          <path d="M198 486 V500 M198 500 V536 M198 500 C198 520 104 516 104 536 M198 500 C198 520 292 516 292 536"/>
        </g>
        <polygon points="166,484 230,484 208,497 188,497" fill="#3cc8e0" className="rv"/>
        {/* motor e articulação */}
        <path d="M296 512 L226 520" className="rvn" strokeWidth="4"/>
        <rect x="296" y="496" width="38" height="30" rx="4" fill="#2f6db5" className="rv"/>
        <circle cx="315" cy="511" r="6" fill="#fff" className="rv2"/>
        {/* aba desviadora */}
        <g transform="rotate(35 198 500)"><rect x="198" y="496.5" width="42" height="7" rx="2" fill="#ff8a00" className="rv"/></g>
        <circle cx="198" cy="500" r="6" fill="#fff" className="rv"/>
      </>
    ),
    "compactador": (
      <>
        <rect x="48" y="423" width="300" height="60" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="423" width="300" height="60" fill="#fff1c9" className="rv"/>
        <rect x="122" y="430" width="190" height="46" rx="6" fill="#e6dcb8" className="rv"/>
        <rect x="58" y="440" width="64" height="26" rx="4" fill="#2f6db5" className="rv"/>
        <path d="M72 440 V466 M108 440 V466" className="rv2" fill="none"/>
        <rect x="84" y="434" width="10" height="6" fill="#d9d9d9" className="rv2"/>
        <rect x="122" y="449" width="54" height="8" fill="#d9d9d9" className="rv"/>
        <rect x="174" y="434" width="12" height="38" rx="2" fill="#ff8a00" className="rv"/>
        {/* lata amassada */}
        <rect x="276" y="438" width="18" height="30" rx="2" fill="#c9ced3" className="rv"/>
        <path d="M276 446 L294 450 M276 456 L294 460 M276 464 L294 466" className="rv2" fill="none"/>
        {/* aviso */}
        <polygon points="318,468 330,446 342,468" fill="#ffd400" className="rv"/>
        <path d="M330 454 V460" className="rv" fill="none"/>
        <circle cx="330" cy="464.5" r="1.4" fill="#111"/>
      </>
    ),
    "balanca": (
      <>
        <rect x="48" y="373" width="300" height="50" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="373" width="300" height="50" fill="#fff1c9" className="rv"/>
        {/* visor digital */}
        <rect x="58" y="385" width="36" height="26" rx="3" fill="#111" className="rv"/>
        <path d="M64 392 h12 M64 398 h20 M64 404 h8" stroke="#7ddc3c" strokeWidth="3" strokeLinecap="round" fill="none"/>
        {/* base, molas e plataforma */}
        <rect x="108" y="410" width="184" height="9" fill="#6b6f6a" className="rv"/>
        <path d="M140 410 l-6 -3 12 -4 -12 -4 12 -4 -6 -3 M258 410 l-6 -3 12 -4 -12 -4 12 -4 -6 -3" className="rv2" fill="none"/>
        <rect x="104" y="384" width="192" height="12" rx="3" fill="#3cc8e0" className="rv"/>
        {/* mostrador */}
        <circle cx="322" cy="398" r="17" fill="#fff" className="rv"/>
        <path d="M322 398 L332 389" className="rv"/>
        <path d="M308 402 l3 0 M322 384 v3 M336 402 l-3 0" className="rv2" fill="none"/>
      </>
    ),
    "esteira": (
      <>
        <rect x="48" y="318" width="300" height="55" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="318" width="300" height="55" fill="#fff1c9" className="rv"/>
        <rect x="110" y="358" width="12" height="15" fill="#9aa0a6" className="rv2"/>
        <rect x="274" y="358" width="12" height="15" fill="#9aa0a6" className="rv2"/>
        {/* garrafa deitada */}
        <rect x="182" y="322" width="46" height="14" rx="6" fill="#8fd3ff" className="rv"/>
        <rect x="173" y="325" width="9" height="8" rx="1" fill="#c8453a" className="rv2"/>
        {/* correia */}
        <rect x="62" y="336" width="272" height="24" rx="12" fill="#4a4a5a" className="rv"/>
        <g className="maquina-esteira-marcas" stroke="#9aa0a6" strokeWidth="2" strokeLinecap="round">
          <path d="M100 340 v4 M124 340 v4 M148 340 v4 M172 340 v4 M196 340 v4 M220 340 v4 M244 340 v4 M268 340 v4 M292 340 v4 M316 340 v4"/>
        </g>
        <g stroke="#ffd400" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="136,343 142,348 136,353"/><polyline points="256,343 262,348 256,353"/>
        </g>
        <circle cx="76" cy="348" r="13" fill="#ff8a00" className="rv"/><circle cx="76" cy="348" r="3" fill="#fff"/>
        <circle cx="320" cy="348" r="13" fill="#ff8a00" className="rv"/><circle cx="320" cy="348" r="3" fill="#fff"/>
      </>
    ),
    "leitor": (
      <>
        <rect x="48" y="268" width="300" height="50" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="268" width="300" height="50" fill="#fff1c9" className="rv"/>
        <g className="maquina-laser" stroke="#e0202a" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" fill="none">
          <path d="M136 292 L258 281 M136 292 L258 292 M136 292 L258 303"/>
        </g>
        <rect x="62" y="278" width="78" height="28" rx="6" fill="#ff6fb5" className="rv"/>
        <rect x="122" y="283" width="14" height="18" rx="2" fill="#111"/>
        <circle cx="76" cy="292" r="4" fill="#fff" className="rv2"/>
        <rect x="262" y="277" width="70" height="30" fill="#fff" className="rv"/>
        <g fill="#111">
          <rect x="268" y="282" width="3" height="20"/><rect x="274" y="282" width="2" height="20"/><rect x="279" y="282" width="5" height="20"/>
          <rect x="287" y="282" width="2" height="20"/><rect x="292" y="282" width="3" height="20"/><rect x="298" y="282" width="6" height="20"/>
          <rect x="307" y="282" width="2" height="20"/><rect x="312" y="282" width="3" height="20"/><rect x="318" y="282" width="2" height="20"/><rect x="323" y="282" width="4" height="20"/>
        </g>
      </>
    ),
    "camera-ia": (
      <>
        <rect x="48" y="198" width="300" height="70" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="198" width="300" height="70" fill="#fff1c9" className="rv"/>
        <path d="M110 254 V262 H316 V258" className="rvn"/>
        <g stroke="#111" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" fill="none">
          <path d="M194 225 L238 209 M194 241 L238 257"/>
        </g>
        <rect x="62" y="212" width="110" height="42" rx="8" fill="#2f6db5" className="rv"/>
        <circle cx="78" cy="221" r="3" fill="#7ddc3c" className="rv2"/><circle cx="90" cy="221" r="3" fill="#7ddc3c" className="rv2"/>
        <circle cx="172" cy="233" r="22" fill="#111" className="rv"/>
        <circle cx="172" cy="233" r="15" fill="#3cc8e0" className="rv"/>
        <circle cx="172" cy="233" r="8" fill="#111"/>
        <circle cx="169" cy="230" r="2.5" fill="#fff"/>
        {/* moldura de reconhecimento e lata */}
        <rect x="252" y="220" width="18" height="26" rx="3" fill="#c9ced3" className="rv2"/>
        <path d="M238 218 V208 H248 M274 208 H284 V218 M284 248 V258 H274 M248 258 H238 V248" className="rvn"/>
        {/* chip de IA */}
        <path d="M292 224 h6 M292 233 h6 M292 242 h6 M334 224 h6 M334 233 h6 M334 242 h6 M308 208 v6 M324 208 v6 M308 252 v6 M324 252 v6" className="rvn"/>
        <rect x="298" y="214" width="36" height="38" rx="5" fill="#b6e03c" className="rv"/>
        <path d="M308 226 L324 233 M308 241 L324 233 M308 226 V241" className="rv2" fill="none"/>
        <circle cx="308" cy="226" r="3.2" fill="#fff" className="rv2"/><circle cx="308" cy="241" r="3.2" fill="#fff" className="rv2"/><circle cx="324" cy="233" r="3.2" fill="#fff" className="rv2"/>
      </>
    ),
    "abertura": (
      <>
        <rect x="48" y="128" width="300" height="70" fill="#111" transform="translate(8 0)"/>
        <rect x="48" y="128" width="300" height="70" fill="#fff1c9" className="rv"/>
        <rect x="76" y="138" width="168" height="50" rx="10" fill="#3cc8e0" className="rv"/>
        <rect x="88" y="148" width="144" height="30" rx="6" fill="#1a1a24" className="rv"/>
        <g fill="#ff8a00" className="rv2">
          <rect x="92" y="149" width="20" height="22" rx="2"/><rect x="115" y="149" width="20" height="22" rx="2"/><rect x="138" y="149" width="20" height="22" rx="2"/>
          <rect x="161" y="149" width="20" height="22" rx="2"/><rect x="184" y="149" width="20" height="22" rx="2"/><rect x="207" y="149" width="20" height="22" rx="2"/>
        </g>
        <g fill="#111"><circle cx="83" cy="144" r="2.5"/><circle cx="237" cy="144" r="2.5"/><circle cx="83" cy="182" r="2.5"/><circle cx="237" cy="182" r="2.5"/></g>
        <rect x="268" y="140" width="56" height="46" rx="8" fill="#fff" className="rv"/>
        <circle className="maquina-luz-estado rv" cx="296" cy="163" r="14" fill="#7ddc3c"/>
        <circle cx="291" cy="158" r="3.5" fill="#fff"/>
      </>
    ),
    "tela-impressora": (
      <>
        <path d="M48 128 V38 a10 10 0 0 1 10 -10 H338 a10 10 0 0 1 10 10 V128 Z" fill="#111" transform="translate(8 0)"/>
        <path d="M48 128 V38 a10 10 0 0 1 10 -10 H338 a10 10 0 0 1 10 10 V128 Z" fill="#fff1c9" className="rv"/>
        {/* voucher */}
        <path d="M262 66 H322 V116 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 l-5 4 l-5 -4 Z" fill="#fff" className="rv"/>
        <g fill="#9aa0a6"><rect x="270" y="80" width="44" height="3"/><rect x="270" y="88" width="30" height="3"/></g>
        <g fill="#111"><rect x="270" y="98" width="2" height="12"/><rect x="274" y="98" width="4" height="12"/><rect x="281" y="98" width="2" height="12"/><rect x="286" y="98" width="3" height="12"/><rect x="292" y="98" width="5" height="12"/><rect x="300" y="98" width="2" height="12"/><rect x="305" y="98" width="3" height="12"/></g>
        {/* impressora */}
        <rect x="236" y="40" width="104" height="32" rx="6" fill="#ff6fb5" className="rv"/>
        <rect x="248" y="64" width="80" height="8" fill="#111"/>
        <circle cx="252" cy="51" r="4" fill="#b6e03c" className="rv2"/><circle cx="266" cy="51" r="4" fill="#ff8a00" className="rv2"/>
        {/* tela */}
        <rect x="60" y="38" width="166" height="78" rx="8" fill="#111" className="rv"/>
        {telaLigada ? (
          <g className="maquina-tela-ligada">
            <rect x="68" y="46" width="150" height="62" rx="4" fill="#d8ff8a"/>
            <text className="maquina-tela-txt" x="143" y="74">
              <tspan x="143">Insira uma </tspan>
              <tspan x="143" dy="20">embalagem</tspan>
            </text>
          </g>
        ) : (
          <g className="maquina-tela-desligada">
            <rect x="68" y="46" width="150" height="62" rx="4" fill="#2a2d3a"/>
            <polygon points="68,92 68,70 120,46 150,46" fill="#3b3f50"/>
            <polygon points="170,108 218,108 218,84" fill="#3b3f50"/>
          </g>
        )}
      </>
    ),
  };
}

export default function MaquinaSVG({ pecasVisiveis = PECAS.length, telaLigada = false }) {
  const id = useId();
  const partes = desenhos(telaLigada);
  return (
    <svg
      className="maquina-svg"
      viewBox="0 0 400 640"
      role="img"
      aria-labelledby={`${id}-titulo ${id}-desc`}
    >
      <title id={`${id}-titulo`}>Máquina de retorno de embalagens ReciclaAI</title>
      <desc id={`${id}-desc`}>
        Vista em corte com {Math.min(pecasVisiveis, PECAS.length)} de {PECAS.length} peças montadas, de baixo para cima.
      </desc>
      {/* contorno da máquina vazia, sempre visível */}
      <rect x="36" y="16" width="328" height="614" rx="14" fill="none" stroke="#111" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round"/>
      {PECAS.slice(0, pecasVisiveis).map((peca) => (
        <g key={peca.id} data-peca={peca.id} className="maquina-peca">
          {partes[peca.id]}
        </g>
      ))}
    </svg>
  );
}
