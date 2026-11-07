# Sistema de design ReciclaAI

Neo-brutalismo com Material Design 3. Base para a landing page e para o app Lixeira Pessoal.

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | Variáveis em `:root`: paletas, papéis de cor M3, materiais CONAMA, tipo, forma, borda, sombra, espaço, movimento, z-index |
| `componentes.css` | Classes `.rc-*`: botões, FAB, chips, segmented, card, campo de texto, snackbar, navigation bar, badge, progresso, tag de material |
| `especime.html` | Página com todos os tokens e componentes (abrir no navegador; testada em 360 px e 1280 px) |

Carregue nesta ordem: fontes do Google Fonts, `tokens.css`, `componentes.css`. Os links das fontes estão no `<head>` do `especime.html`.

## Decisões

**Cor semente `#C6F432` (verde-limão).** Diz reciclagem e tecnologia, e é a cor clara que mais contrasta com as linhas pretas do neo-brutalismo (16,4:1 com texto preto). Não se confunde com os materiais: o verde do vidro (`#2e8b57`) é escuro e azulado, o ocre do metal (`#c99700`) é amarelo queimado; o limão é muito mais claro e saturado. As paletas foram geradas com `@material/material-color-utilities` 0.3.0: primary com o croma da semente (matiz HCT 124), secondary croma 16, tertiary na matiz da semente + 220° (rosa-magenta, 344) com croma 40, neutral croma 3.

**Onde o limão aparece.** A semente tem tom 90, então o limão vivo é o `primary-container` (o mesmo valor está em `--rc-brand`). Ele cobre as ações: botão filled, FAB, badge, barra de progresso, card de destaque, sombra do snackbar. Texto sobre limão sempre escuro (`--md-sys-color-on-primary-container` ou `--rc-on-brand`, 13–16:1); branco sobre limão dá 1,3:1 e é proibido. O `primary` gerado (tom 40, oliva `#506600`) fica para links, botão text e ícones sobre fundo claro (6,2:1). Limão como texto ou linha fina sobre fundo claro também é proibido.

**Fontes.** Bricolage Grotesque (peso 700–800) para display, headline e title-large: larga, pesada, com eixo de tamanho óptico. Atkinson Hyperlegible Next para corpo, rótulos e números: feita para baixa visão, distingue 1, l e I. Ícones: Material Symbols Rounded, peso 600.

**Borda e sombra.** Preto puro (`--rc-ink`), nunca cinza escuro. Borda padrão 3 px; 2 px em peças pequenas (chip, tag, badge); 4 px só em destaque raro. Sombra dura, sem desfoque, para baixo e à direita: `sm` 3 px (botões), `md` 6 px (cards, FAB), `lg` 10 px (uma peça principal por tela).

**Estados.** Hover: sobe 2 px e a sombra cresce 2 px. Pressionado: desloca exatamente o valor da sombra e a sombra some (o botão "afunda"). A camada de estado do M3 (`::after` com `currentColor`, 8/10/12%) fica por cima, então o estado não depende só de movimento. Foco: anel rosa-magenta (`tertiary`) de 3 px com afastamento de 3 px; sobre fundo escuro, limão.

**Papéis M3 nos componentes.**

| Papel | Uso |
|---|---|
| `primary` (oliva) | links, botão text, ícone do chip assist |
| `primary-container` (limão, `--rc-brand`) | botão filled, FAB, badge, barra de progresso, card de destaque, sombra do snackbar |
| `secondary-container` | botão tonal |
| `tertiary-container` (rosa) | seleção: chip de filtro, segmented, indicador da navigation bar |
| `tertiary` | anel de foco |
| `surface-container-lowest` | fundo de card, campo, botão outlined |
| `surface-container` | navigation bar |
| `inverse-surface` | snackbar (com sombra limão) |
| `error` | só campo inválido e mensagem de erro, sempre com ícone |

**Movimento.** Durações e curvas do M3 (`--md-sys-motion-*`) e atalhos `--rc-motion-press/hover/enter/exit`. Com `prefers-reduced-motion: reduce`, as durações viram 0,01 ms, `--rc-lift-hover` vira 0 e `--rc-motion-distance` vira 0. A barra indeterminada vira listras paradas.

## Regras para quem desenha as telas

1. Todo card: `.rc-card` (borda 3 px + `--rc-shadow-md`, canto `large` 16 px). Não crie card sem borda.
2. Cores de material só identificam materiais: tag, faixa do card de material, ícone do resultado. Nunca em botão, link, fundo decorativo ou gráfico sem relação com material.
3. Material sempre com nome escrito ao lado da cor (`.rc-tag`). A cor confirma, não informa sozinha.
4. Texto na cor do material sobre fundo claro: use `--rc-material-*-strong`, não a base.
5. Limão só com texto escuro por cima, e nunca como texto ou linha fina sobre fundo claro. Para cor de marca use `--rc-brand` ou `--md-sys-color-primary-container`.
6. Um botão filled por tela. As demais ações: tonal, outlined ou text.
7. Vermelho de erro é vizinho do vermelho do plástico. Erro sempre com ícone `error` e frase que diz como corrigir. Badge usa o limão, não `error`.
8. Cantos por hierarquia, não um valor para tudo: botões e segmented em pílula, chips 8 px, campos 8 px, cards 16 px, FAB 16 px (grande 28 px), tags 4 px.
9. Só sombras de `tokens.css`. Nada de sombra com desfoque, gradiente decorativo ou cinza no lugar do preto.
10. Rótulo do campo sempre visível acima; placeholder não substitui rótulo. Campo com 16 px de fonte.
11. Alvo de toque mínimo 48 px. Margem lateral de 16 px no celular (`--rc-gutter`).
12. Remoção de item mostra `.rc-snackbar` com "Desfazer" por 6 s.
13. Animações de GSAP, Lenis e Vanta devem checar `prefers-reduced-motion` (ou `--rc-motion-distance`) e ficar paradas quando reduzido.
14. Use os papéis (`--md-sys-color-*`), não os tons de referência (`--md-ref-palette-*`), nos componentes.

## Ainda não definido

Tema escuro (só existe o claro), diálogo e folha inferior. Se precisar, gere os papéis escuros a partir da mesma semente e mantenha bordas e sombras em preto sobre superfícies claras de cartão.
