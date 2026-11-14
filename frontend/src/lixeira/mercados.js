// Supermercados perto de um ponto, em cascata (DEF-04): Overpass 3 km (6 km se vier vazio),
// depois Photon 3 km (6 km se vier vazio), e por fim a lista salva. Só o cancelamento (AbortError) chega a quem chamou.
import LISTA_SALVA from "../dados/mercados-brasilia.json";

export { LISTA_SALVA };

const SEM_NOME = "Supermercado (sem nome no mapa)";
const endereco = (rua, numero) => (rua ? rua + (numero ? `, ${numero}` : "") : "");

// Junta o cancelamento de quem chamou com um prazo por etapa.
async function buscarJson(url, opcoes, sinal, prazoMs) {
  sinal?.throwIfAborted();
  const controle = new AbortController();
  const cancelar = () => controle.abort(sinal.reason);
  const prazo = setTimeout(() => controle.abort(), prazoMs);
  sinal?.addEventListener("abort", cancelar, { once: true });
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controle.signal });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.json();
  } finally {
    clearTimeout(prazo);
    sinal?.removeEventListener("abort", cancelar);
  }
}

async function overpass(origem, metros, sinal) {
  const consulta = `[out:json][timeout:15];nwr["shop"="supermarket"](around:${metros},${origem.lat},${origem.lng});out center;`;
  const dados = await buscarJson(
    "https://overpass-api.de/api/interpreter",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "data=" + encodeURIComponent(consulta),
    },
    sinal,
    6000
  );
  return (dados.elements ?? [])
    .map((e) => {
      const c = e.center ?? e;
      const t = e.tags ?? {};
      if (typeof c.lat !== "number") return null;
      return { nome: t.name || SEM_NOME, lat: c.lat, lng: c.lon, endereco: endereco(t["addr:street"], t["addr:housenumber"]) };
    })
    .filter(Boolean);
}

async function photon(origem, km, sinal) {
  const url = `https://photon.komoot.io/reverse?lat=${origem.lat}&lon=${origem.lng}&osm_tag=shop:supermarket&limit=15&radius=${km}`;
  const dados = await buscarJson(url, {}, sinal, 5000);
  return (dados.features ?? [])
    .map((f) => {
      const p = f.properties ?? {};
      const [lng, lat] = f.geometry?.coordinates ?? [];
      if (typeof lat !== "number") return null;
      return { nome: p.name || SEM_NOME, lat, lng, endereco: endereco(p.street, p.housenumber) };
    })
    .filter(Boolean);
}

// Primeiro raio; só tenta o maior se o primeiro vier vazio.
async function emDoisRaios(fonte, origem, [perto, longe], sinal) {
  const r = await fonte(origem, perto, sinal);
  return r.length ? r : fonte(origem, longe, sinal);
}

export async function buscarMercados(origem, sinal) {
  for (const [fonte, raios] of [[overpass, [3000, 6000]], [photon, [3, 6]]]) {
    try {
      const mercados = await emDoisRaios(fonte, origem, raios, sinal);
      if (mercados.length) return { fonte: "osm", mercados };
    } catch (erro) {
      if (sinal?.aborted) throw erro;
    }
  }
  return { fonte: "salva", mercados: LISTA_SALVA.mercados };
}
