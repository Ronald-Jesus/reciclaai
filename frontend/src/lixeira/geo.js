// Contas de mapa: distância em linha reta (haversine) e tempo a pé.
export const CENTRO_BRASILIA = { lat: -15.7939, lng: -47.8828 }; // Eixo Monumental, perto da Rodoviária

export function distanciaKm(a, b) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Devolve cópias com `km`, do mais perto para o mais longe.
export function ordenarPorDistancia(origem, mercados) {
  return mercados.map((m) => ({ ...m, km: distanciaKm(origem, m) })).sort((a, b) => a.km - b.km);
}

export const maisProximo = (origem, mercados) => ordenarPorDistancia(origem, mercados)[0];

// 5 km/h, arredondado para cima; nunca menos de 1 minuto.
export const minutosAPe = (km) => Math.max(1, Math.ceil((km / 5) * 60));

// Texto da distância; decide pela medida já arredondada (0,996 km vira "1,0 km", não "1000 m").
export function textoDistancia(km) {
  const metros = Math.round(km * 100) * 10;
  return metros < 1000 ? `${metros} m` : `${(Math.round(km * 10) / 10).toFixed(1).replace(".", ",")} km`;
}

export function textoAPe(km) {
  const min = minutosAPe(km);
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}
