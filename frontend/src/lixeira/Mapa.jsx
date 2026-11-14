import { useEffect, useRef, useState } from "react";
import Botao from "../componentes/Botao.jsx";
import Icone from "../componentes/Icone.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { CENTRO_BRASILIA, distanciaKm, ordenarPorDistancia, textoAPe as aPe, textoDistancia as km } from "./geo.js";
import { buscarMercados, LISTA_SALVA } from "./mercados.js";

const ESTILO = "https://tiles.openfreemap.org/styles/positron"; // OpenFreeMap: sem chave (DEF-03)
const CREDITO = "© OpenFreeMap © colaboradores do OpenStreetMap";
const LONGE_KM = 40; // além disso a pessoa está fora do DF: parte do centro (ponto de atenção 4)

const ORIGEM = {
  centro: "Partindo do centro de Brasília. Use sua localização para ver o mercado mais perto de você.",
  procurando: "Procurando sua localização…",
  pessoa: "Partindo da sua localização.",
  negada: "Não deu para usar sua localização. Partindo do centro de Brasília.",
  fora: "Você está fora de Brasília, e os mercados da demonstração são daqui. Partindo do centro de Brasília.",
};

const rota = (de, para) =>
  "https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=" +
  encodeURIComponent(`${de.lat},${de.lng};${para.lat},${para.lng}`);

function pino(classe, icone) {
  const el = document.createElement("span");
  el.className = `lx-pino ${classe}`;
  el.innerHTML = `<span class="rc-icon rc-icon--fill" aria-hidden="true">${icone}</span>`;
  return el;
}

// Mercado mais perto de quem usa (ou do centro de Brasília), com mapa e lista em texto.
export default function Mapa() {
  const [origem, setOrigem] = useState({ ponto: CENTRO_BRASILIA, tipo: "centro" });
  const [busca, setBusca] = useState(null); // { fonte: "provisoria" | "osm" | "salva", mercados ordenados }
  const [mapaPronto, setMapaPronto] = useState(false);
  const [mapaFalhou, setMapaFalhou] = useState(false);
  const caixaRef = useRef(null);
  const mapaRef = useRef(null);
  const libRef = useRef(null);
  const menosAnimacao = useMenosAnimacao();
  const { ponto } = origem;
  const perto = busca?.mercados[0];

  useEffect(() => {
    const controle = new AbortController();
    // A lista salva aparece na hora; a busca real a substitui quando chegar.
    setBusca({ fonte: "provisoria", mercados: ordenarPorDistancia(ponto, LISTA_SALVA.mercados) });
    buscarMercados(ponto, controle.signal)
      .then((r) => setBusca({ fonte: r.fonte, mercados: ordenarPorDistancia(ponto, r.mercados) }))
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

  useEffect(() => {
    if (!mapaPronto || mapaFalhou || !perto) return undefined;
    const { Marker } = libRef.current;
    const marcadores = [
      new Marker({ element: pino("lx-pino--pessoa", "person") }).setLngLat([ponto.lng, ponto.lat]),
      new Marker({ element: pino("lx-pino--mercado", "storefront"), anchor: "bottom" }).setLngLat([perto.lng, perto.lat]),
    ].map((m) => m.addTo(mapaRef.current));
    mapaRef.current.fitBounds(
      [
        [Math.min(ponto.lng, perto.lng), Math.min(ponto.lat, perto.lat)],
        [Math.max(ponto.lng, perto.lng), Math.max(ponto.lat, perto.lat)],
      ],
      { padding: 64, maxZoom: 16, animate: !menosAnimacao }
    );
    return () => marcadores.forEach((m) => m.remove());
  }, [mapaPronto, mapaFalhou, ponto, perto, menosAnimacao]);

  function usarLocalizacao() {
    if (origem.tipo === "procurando") return;
    if (!navigator.geolocation) {
      setOrigem({ ponto: CENTRO_BRASILIA, tipo: "negada" });
      return;
    }
    setOrigem((o) => ({ ...o, tipo: "procurando" }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude };
        setOrigem(distanciaKm(p, CENTRO_BRASILIA) > LONGE_KM ? { ponto: CENTRO_BRASILIA, tipo: "fora" } : { ponto: p, tipo: "pessoa" });
      },
      () => setOrigem({ ponto: CENTRO_BRASILIA, tipo: "negada" }),
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  const avisoOrigem = origem.tipo === "negada" || origem.tipo === "fora";

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
        {perto && (
          <p className="sr-only">
            Mais perto: {perto.nome}, {km(perto.km)}, {aPe(perto.km)} a pé.
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

        {busca && (
          <div className="lx-mapa__lado">
            {perto && (
              <div className="lx-mapa__destaque">
                <p className="lx-mapa__selo">Mais perto</p>
                <h3 className="lx-resultado__sub">{perto.nome}</h3>
                {perto.endereco && <p className="lx-resultado__texto">{perto.endereco}</p>}
                <p className="rc-num">
                  {km(perto.km)} em linha reta · {aPe(perto.km)} a pé
                </p>
                <Botao
                  href={rota(ponto, perto)}
                  target="_blank"
                  rel="noopener noreferrer"
                  icone="directions_walk"
                  pequeno
                  aria-label={`Abrir rota até ${perto.nome} (OpenStreetMap, em nova aba)`}
                >
                  Abrir rota
                </Botao>
              </div>
            )}
            <ol className="lx-mapa__lista" aria-label="Os 3 mercados mais perto">
              {busca.mercados.slice(0, 3).map((m, i) => (
                <li key={`${m.lat},${m.lng},${i}`}>
                  <strong>{m.nome}</strong>
                  {m.endereco && <span>{m.endereco}</span>}
                  <span className="rc-num">
                    {km(m.km)} · {aPe(m.km)} a pé
                  </span>
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
