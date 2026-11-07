# Protótipo de interface · ReciclaAI

Protótipo navegável do site de vendas e do app Lixeira Pessoal, feito antes da versão em React
para validar o visual, o fluxo e as heurísticas de Nielsen (issue #13). Os dados são de exemplo:
a classificação por IA, o banco de dados e o voucher reais entram nas partes seguintes do
[plano de construção](../plano-de-construcao.md).

## O que tem aqui

| Pasta / arquivo | O que é |
|---|---|
| [`sistema/`](sistema/) | Sistema de design: paleta Material You gerada da cor semente verde-limão `#C6F432`, tipografia, bordas e sombras neo-brutalistas e componentes. A página `especime.html` mostra tudo |
| [`landing/`](landing/) | Página de vendas: fundo animado (Vanta), rolagem suave (Lenis), animações (GSAP), efeitos inspirados no React Bits e o palco escuro com a montagem da máquina |
| [`app/`](app/) | App Lixeira Pessoal: foto, análise, resultado, sacola com desfazer, mapa com supermercados reais (OpenStreetMap) e voucher. No computador, um botão mostra onde cada heurística de Nielsen aparece |
| [`maquina/`](maquina/) | Ilustração da máquina em 9 peças (SVG em camadas) e a demonstração da montagem ao rolar |
| [`video/`](video/) | Pesquisa sobre as máquinas de retorno alemãs e o roteiro e os prompts do vídeo fotorrealista da máquina |
| [`comparacao-cores.html`](comparacao-cores.html) | Comparação das cores semente avaliadas (magenta, verde-limão, coral) e a escolha do verde-limão |

## Como abrir

- **Online:** pelo GitHub Pages do repositório, em `prototipo/` (link no README principal).
- **No computador:** dentro da pasta `docs/prototipo`, rode `python -m http.server 8765` e abra
  `http://localhost:8765`. Abrir os arquivos direto do disco funciona, mas a localização do
  navegador só é liberada em `localhost` ou HTTPS.

## Decisões de design

As decisões e os motivos estão na [visão do produto](../visao-do-produto.md) (seções 6 a 9). Em
resumo: neo-brutalismo inspirado no Material Design 3, um sistema de design definido antes das
telas (tokens → componentes → páginas), cores de material fixas pela Resolução CONAMA 275,
bibliotecas de animação maduras e toda animação desligada quando o sistema pede menos movimento.

## Créditos

Mapa: © colaboradores do OpenStreetMap, OpenFreeMap; busca de supermercados pelas APIs Overpass e
Photon (komoot). Fontes: Bricolage Grotesque, Atkinson Hyperlegible Next e Material Symbols
(Google Fonts). As fotos da página de vendas ainda são espaços reservados.
