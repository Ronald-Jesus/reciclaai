import { useEffect, useMemo, useRef, useState } from "react";
import Botao from "../componentes/Botao.jsx";
import Icone from "../componentes/Icone.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { CENTRO_BRASILIA, distanciaKm, ordenarPorDistancia, textoAPe as aPe, textoDistancia as km } from "./geo.js";
import { buscarMercados, LISTA_SALVA } from "./mercados.js";

const ESTILO = "https://tiles.openfreemap.org/styles/positron"; // OpenFreeMap: sem chave (DEF-03)
const CREDITO = "© OpenFreeMap © colaboradores do OpenStreetMap";
const LONGE_KM = 40; // além disso a pessoa está fora do DF: parte do centro (ponto de atenção 4)
const MAXIMO = 15; // mercados na lista e no mapa

const ORIGEM = {
  centro: "Partindo do centro de Brasília. Use sua localização para ver o mercado mais perto de você.",
  procurando: "Procurando sua localização…",
  pessoa: "Partindo da sua localização.",
  negada: "A permissão de localização foi negada. Partindo do centro de Brasília. Para usar a sua, libere a localização no navegador e toque de novo.",
  demorou: "A localização demorou mais de 10 segundos. Partindo do centro de Brasília. Toque de novo para tentar outra vez.",
  semSuporte: "Este navegador ou esta página não permite usar a localização. Partindo do centro de Brasília.",
  falhou: "Não foi possível descobrir sua localização. Partindo do centro de Brasília.",
  fora: "Você está fora de Brasília, e os mercados da demonstração são daqui. Partindo do centro de Brasília.",
};

const rota = (de, para) =>
  "https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=" +
  encodeURIComponent(`${de.lat},${de.lng};${para.lat},${para.lng}`);

// Pino como no protótipo: o MapLibre posiciona o elemento externo com transform, então a gota
// girada fica num span interno. Com rótulo vira botão (pino de mercado).
function pino(classe, icone, rotulo) {
  const el = document.createElement(rotulo ? "button" : "span");
  el.className = "lx-pino-alvo";
  if (rotulo) {
    el.type = "button";
    el.setAttribute("aria-label", rotulo);
  }
  el.innerHTML = `<span class="lx-pino ${classe}"><span class="rc-icon rc-icon--fill" aria-hidden="true">${icone}</span></span>`;
  return el;
}

// Conteúdo do popup do pino: nome, distância e "Escolher este".
function conteudoPopup(m, aoEscolher) {
  const caixa = document.createElement("div");
  caixa.className = "lx-popup";
  const nome = document.createElement("strong");
  nome.textContent = m.nome;
  const distancia = document.createElement("span");
  distancia.textContent = `${km(m.km)} · ${aPe(m.km)} a pé`;
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "rc-btn rc-btn--filled rc-btn--small";
  botao.textContent = "Escolher este";
  botao.addEventListener("click", aoEscolher);
  caixa.append(nome, distancia, botao);
  return caixa;
}

// Mercados perto de quem usa (ou do centro de Brasília), com mapa e lista em texto.
export default function Mapa() {
  const [origem, setOrigem] = useState({ ponto: CENTRO_BRASILIA, tipo: "centro" });
  const [busca, setBusca] = useState(null); // { fonte: "provisoria" | "osm" | "salva", mercados ordenados }
  const [escolhido, setEscolhido] = useState(0); // índice em `mercados`; 0 = o mais perto
  const [mapaPronto, setMapaPronto] = useState(false);
  const [mapaFalhou, setMapaFalhou] = useState(false);
  const caixaRef = useRef(null);
  const mapaRef = useRef(null);
  const libRef = useRef(null);
  const pinosRef = useRef([]);
  const menosAnimacao = useMenosAnimacao();
  const { ponto } = origem;
  const mercados = useMemo(() => busca?.mercados.slice(0, MAXIMO) ?? [], [busca]);
  const sel = mercados[escolhido] ?? mercados[0];

  useEffect(() => {
    const controle = new AbortController();
    // A lista salva aparece na hora; a busca real a substitui quando chegar.
    // A cada lista nova, o escolhido volta a ser o mais perto.
    const mostrar = (fonte, lista) => {
      setBusca({ fonte, mercados: ordenarPorDistancia(ponto, lista) });
      setEscolhido(0);
    };
    mostrar("provisoria", LISTA_SALVA.mercados);
    buscarMercados(ponto, controle.signal)
      .then((r) => mostrar(r.fonte, r.mercados))
      .catch(() => {}); // só o cancelamento chega aqui
    return () => controle.abort();
  }, [ponto]);

  // O MapLibre (~1 MB) vem num pedaço à parte, só quando esta seção aparece.
  useEffect(() => {
    let vivo = true;
    Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl-worker.mjs?url"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ])
      .then(([lib, worker]) => {
        if (!vivo) return;
        lib.setWorkerUrl(worker.default); // o worker não acompanha o pedaço gerado pelo Vite
        const mapa = new lib.Map({
          container: caixaRef.current,
          style: ESTILO,
          center: [CENTRO_BRASILIA.lng, CENTRO_BRASILIA.lat],
          zoom: 13,
          attributionControl: false, // o crédito fica visível em texto, abaixo do mapa
          cooperativeGestures: true, // a rolagem da página não fica presa no mapa
          locale: {
            "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para mudar o zoom",
            "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para mudar o zoom",
            "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
            "NavigationControl.ZoomIn": "Aproximar",
            "NavigationControl.ZoomOut": "Afastar",
            "Map.Title": "Mapa",
            "Marker.Title": "Mercado",
            "Popup.Close": "Fechar",
          },
        });
        // Estilo ou rede falhou antes de o mapa abrir: mostra o aviso (a lista continua).
        mapa.once("error", () => vivo && !mapa.loaded() && setMapaFalhou(true));
        mapa.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        libRef.current = lib;
        mapaRef.current = mapa;
        setMapaPronto(true);
      })
      .catch(() => vivo && setMapaFalhou(true));
    return () => {
      vivo = false;
      mapaRef.current?.remove();
    };
  }, []);

  // Um pino por mercado; clicar abre o popup com "Escolher este".
  useEffect(() => {
    if (!mapaPronto || mapaFalhou || !mercados.length) return undefined;
    const { Marker, Popup } = libRef.current;
    const mapa = mapaRef.current;
    let popup = null;
    const pinos = mercados.map((m, i) => {
      const el = pino("lx-pino--mercado", "storefront", `${m.nome}, ${km(m.km)}`);
      el.addEventListener("click", (evento) => {
        evento.stopPropagation(); // senão o clique chega ao mapa e o popup (closeOnClick) fecha na hora
        popup?.remove();
        const escolherEste = () => {
          setEscolhido(i);
          popup?.remove();
        };
        popup = new Popup({ offset: 36, maxWidth: "240px" })
          .setLngLat([m.lng, m.lat])
          .setDOMContent(conteudoPopup(m, escolherEste))
          .addTo(mapa);
      });
      return el;
    });
    pinosRef.current = pinos;
    const marcadores = [
      new Marker({ element: pino("lx-pino--pessoa", "person") }).setLngLat([ponto.lng, ponto.lat]),
      ...mercados.map((m, i) => new Marker({ element: pinos[i], anchor: "bottom" }).setLngLat([m.lng, m.lat])),
    ].map((mk) => mk.addTo(mapa));
    // Enquadra a pessoa e os 4 mais perto, como no protótipo.
    const pontos = [ponto, ...mercados.slice(0, 4)];
    const lngs = pontos.map((p) => p.lng);
    const lats = pontos.map((p) => p.lat);
    mapa.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 56, maxZoom: 15, animate: !menosAnimacao }
    );
    return () => {
      popup?.remove();
      marcadores.forEach((mk) => mk.remove());
      pinosRef.current = [];
    };
  }, [mapaPronto, mapaFalhou, ponto, mercados, menosAnimacao]);

  // Destaca (lima) o pino do mercado escolhido.
  useEffect(() => {
    pinosRef.current.forEach((el, i) => el.classList.toggle("is-selected", i === escolhido));
  }, [escolhido, mercados, mapaPronto, mapaFalhou]);

  function escolher(i) {
    setEscolhido(i);
    const m = mercados[i];
    if (mapaPronto && !mapaFalhou) mapaRef.current[menosAnimacao ? "jumpTo" : "flyTo"]({ center: [m.lng, m.lat], zoom: 16 });
  }

  function usarLocalizacao() {
    if (origem.tipo === "procurando") return;
    if (!navigator.geolocation) {
      setOrigem({ ponto: CENTRO_BRASILIA, tipo: "semSuporte" });
      return;
    }
    setOrigem((o) => ({ ...o, tipo: "procurando" }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        setOrigem(distanciaKm(p, CENTRO_BRASILIA) > LONGE_KM ? { ponto: CENTRO_BRASILIA, tipo: "fora" } : { ponto: p, tipo: "pessoa" });
      },
      // err.code: 1 = negada, 3 = passou do tempo, 2 = posição indisponível.
      (err) => setOrigem({ ponto: CENTRO_BRASILIA, tipo: { 1: "negada", 3: "demorou" }[err?.code] ?? "falhou" }),
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  const avisoOrigem = !["centro", "procurando", "pessoa"].includes(origem.tipo);

  return (
    <section className="lx-mapa rc-card" aria-labelledby="lx-mapa-titulo">
      <div className="lx-mapa__cabeca">
        <div>
          <h2 id="lx-mapa-titulo" className="lx-resultado__titulo">
            Onde depositar
          </h2>
          <p className="lx-resultado__texto">A máquina fica em supermercados. Veja o mais perto e leve a sua sacola.</p>
        </div>
        <Botao variante="tonal" icone="my_location" onClick={usarLocalizacao} aria-disabled={origem.tipo === "procurando"}>
          Usar minha localização
        </Botao>
      </div>

      <p className="lx-aviso" role="note">
        <Icone nome="info" preenchido />
        Os mercados aparecem só para demonstração; não são parceiros.
      </p>

      <div role="status" className="lx-mensagens">
        <p className={avisoOrigem ? "lx-aviso lx-aviso--neutro" : "lx-dica"}>
          <Icone nome={avisoOrigem ? "location_off" : "location_on"} />
          {ORIGEM[origem.tipo]}
        </p>
        {busca?.fonte === "provisoria" && (
          <p className="lx-dica">
            <Icone nome="sync" />
            Atualizando com o OpenStreetMap…
          </p>
        )}
        {busca?.fonte === "salva" && (
          <p className="lx-dica">
            <Icone nome="cloud_off" />
            Não deu para buscar os mercados agora. Mostrando uma lista salva de Brasília.
          </p>
        )}
        {sel && (
          <p className="sr-only">
            {escolhido === 0 ? "Mais perto" : "Escolhido"}: {sel.nome}, {km(sel.km)}, {aPe(sel.km)} a pé.
          </p>
        )}
      </div>

      <div className="lx-mapa__corpo">
        {mapaFalhou ? (
          <p className="lx-aviso lx-aviso--neutro lx-mapa__mapa">
            Não deu para carregar o mapa agora. A lista mostra os mercados mais perto.
          </p>
        ) : (
          <div
            ref={caixaRef}
            className="lx-mapa__mapa"
            role="region"
            aria-label="Mapa. As mesmas informações estão na lista de mercados."
            data-lenis-prevent
          />
        )}

        {sel && (
          <div className="lx-mapa__lado">
            <div className="lx-mapa__destaque">
              <p className="lx-mapa__selo">{escolhido === 0 ? "Mais perto" : "Escolhido"}</p>
              <h3 className="lx-resultado__sub">{sel.nome}</h3>
              {sel.endereco && <p className="lx-resultado__texto">{sel.endereco}</p>}
              <p className="rc-num">
                {km(sel.km)} em linha reta · {aPe(sel.km)} a pé
              </p>
              <Botao
                href={rota(ponto, sel)}
                target="_blank"
                rel="noopener noreferrer"
                icone="directions_walk"
                pequeno
                aria-label={`Abrir rota até ${sel.nome} (OpenStreetMap, em nova aba)`}
              >
                Abrir rota
              </Botao>
            </div>
            <ol className="lx-mapa__lista" aria-label="Mercados mais perto, por distância" data-lenis-prevent>
              {mercados.map((m, i) => (
                <li key={`${m.lat},${m.lng},${i}`}>
                  <button type="button" className="lx-mapa__item" aria-pressed={i === escolhido} onClick={() => escolher(i)}>
                    <Icone nome="storefront" preenchido />
                    <span className="lx-mapa__item-texto">
                      <strong>{m.nome}</strong>
                      {m.endereco && <span>{m.endereco}</span>}
                      <span className="rc-num">
                        {km(m.km)} · {aPe(m.km)} a pé
                      </span>
                    </span>
                  </button>
                  <a
                    className="lx-mapa__rota"
                    href={rota(ponto, m)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Como chegar a ${m.nome} (abre o OpenStreetMap em nova aba)`}
                  >
                    <Icone nome="directions" />
                    Como chegar
                  </a>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <p className="lx-legenda__fonte">{CREDITO}</p>
    </section>
  );
}
