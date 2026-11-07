# Ilustração da máquina ReciclaAI

Máquina de retorno de embalagens em 2D, em corte, estilo neo-brutalism (contorno preto de 3 unidades, cores chapadas, sombras duras sem desfoque). Genérica: sem marca nem logotipo.

- `maquina.svg`: a ilustração (viewBox `0 0 400 640`).
- `montagem-demo.html`: demonstração autocontida da montagem ao rolar (GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13, via CDN).

## Camadas (ids)

Ordem no arquivo = ordem de montagem (1 é desenhada primeiro, embaixo).

| Ordem | id | `data-peca` | Faixa (y) |
|---|---|---|---|
| 0 | `contorno` | (nenhum) | corpo todo, tracejado |
| 1 | `peca-1-compartimentos` | `compartimentos` | 538 a 618 |
| 2 | `peca-2-separador` | `separador` | 483 a 538 |
| 3 | `peca-3-compactador` | `compactador` | 423 a 483 |
| 4 | `peca-4-balanca` | `balanca` | 373 a 423 |
| 5 | `peca-5-esteira` | `esteira` | 318 a 373 |
| 6 | `peca-6-leitor` | `leitor` | 268 a 318 |
| 7 | `peca-7-camera-ia` | `camera-ia` | 198 a 268 |
| 8 | `peca-8-abertura` | `abertura` | 128 a 198 |
| 9 | `peca-9-tela-impressora` | `tela-impressora` | 28 a 128 |

Ids internos úteis: `bin-plastico`, `bin-metal`, `bin-vidro`, `laser`, `esteira-marcas`, `luz-estado` (luz da abertura), `tela-desligada`, `tela-ligada`.

## Como animar

- Cada peça é um bloco com a própria "baia" de fundo (retângulo creme com sombra), então lê bem isolada. Ao encaixar, as baias se empilham sem folga.
- Estado inicial: `opacity: 0`, deslocamento fora do lugar (de baixo ou dos lados) e rotação de uns 9°; final: `x:0, y:0, rotation:0`. Valores em unidades do viewBox. Use `transformOrigin: "50% 50%"` e `overflow: visible` no `<svg>`.
- Selecione com `svg.querySelectorAll("[data-peca]")` (já vem na ordem 1 a 9). O `contorno` fica sempre visível.
- Tela: `tela-ligada` vem com `display="none"`. No fim, troque os atributos `display` de `tela-desligada` (`none`) e `tela-ligada` (`inline`). O texto "Insira uma embalagem" é o único texto do SVG.
- `luz-estado` pode pulsar (escala) e mudar `fill` (laranja ocupado, verde pronta). No arquivo ela é verde.
- A sombra é um deslocamento de 8 unidades para a direita; não use `filter` nem blur.

## Cores

- Materiais (CONAMA 275): plástico `#c8453a`, metal `#c99700`, vidro `#2e8b57` (tampas em `#9c3229`, `#957000`, `#1f6a41`).
- Contorno e sombra: `#111`. Fundo das baias: `#fff1c9`.
- Destaques das peças: azul `#2f6db5`, ciano `#3cc8e0`, laranja `#ff8a00`, rosa `#ff6fb5`, lima `#b6e03c`, amarelo `#ffd400`, laser `#e0202a`, cinzas `#4a4a5a`, `#6b6f6a`, `#9aa0a6`, `#b9bec4`, `#c9ced3`.
- Tela ligada: fundo `#d8ff8a`; desligada: `#2a2d3a`.

## Demo

Fixa a seção e avança uma peça por passo de rolagem (380 px por passo no desktop, 200 px abaixo de 600 px de largura). Mostra "N de 9 peças", nome e motivo de cada peça (tabela 6.3 de `docs/visao-do-produto.md`). Com `prefers-reduced-motion: reduce` (ou se o GSAP não carregar) não há fixação: aparece a máquina pronta, com a tela ligada, e a lista das 9 peças.
