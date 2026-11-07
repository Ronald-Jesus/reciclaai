# Máquina ReciclaAI: referência para o vídeo de vista explodida

## 1. Como funcionam as máquinas na Alemanha

Resumo factual do sistema de Pfand (depósito) alemão e das máquinas de devolução (RVM, "Leergutautomat"). Itens marcados com **(incerto)** não foram confirmados em fonte oficial.

**Fatos com fonte**
- O sistema de embalagens descartáveis (Einweg) é operado pela DPG. Cada embalagem com depósito vale 0,25 euro, e há mais de 40 mil máquinas ativas. Fonte: [DPG, "Technological top performers"](https://dpg-pfandsystem.de/en/the-one-way-deposit-system/useful-information/press-releases/technological-top-performers.html).
- A máquina usa **até seis câmeras** de alta sensibilidade para checar, em frações de segundo, os elementos de segurança (logotipo DPG e código de barras do distribuidor principal). Modelos novos põem as câmeras **em círculo ao redor da abertura de entrada**. Mesma fonte.
- O item é reconhecido pela combinação de marca DPG, código GTIN, peso e formato; o dígito verificador do GTIN confirma que o código foi lido direito. Fonte: [DPG, GTIN no sistema DPG](https://dpg-pfandsystem.de/en/the-one-way-deposit-system/useful-information/press-releases/the-global-trade-item-number-gtin-and-its-role-in-the-dpg-system.html).
- O reconhecido é comparado a um banco de dados e atribuído a um material; os materiais vão para recipientes de coleta separados atrás da abertura. Depois de um botão final, o **comprovante (Pfandbon) sai em segundos**. Fonte: DPG, "Technological top performers".
- Um código de barras comum é fácil de copiar com impressora; por isso o sistema usa marca de segurança lida por luz e câmera. Fonte: [patente DE10247252B4](https://patents.google.com/patent/DE10247252B4/de).
- Máquinas de varejo: a TOMRA R2 tem unidade frontal compacta, na parede, voltada ao cliente, com o resto do equipamento na área de estoque (backroom), e uma área de entrada grande onde se despejam várias embalagens (multi-feed). Medidas citadas: 950 mm de largura, 2100 mm de profundidade, altura mínima 1800 mm (página em subdomínio "prep.", conferir). Fontes: [TOMRA R2](https://prep.tomra.com/reverse-vending/our-offering/reverse-vending-machines/tomra-r2/) e [Waste Advantage](https://wasteadvantagemag.com/tomra-r2-makes-leap-forward-in-reverse-vending-design-and-usability/) (esta página não abriu para mim; só o resumo da busca).
- Compactação integrada reduz a frequência de coleta e o espaço de estoque (TOMRA R2). A primeira máquina de latas com compactação é de 1983 (Suécia). Fonte: [TOMRA R2, página demo](https://prep.tomra.com/pageblocklibrary/page-demos/product-page-demo--tomra-r2/), via resumo de busca.
- Máquinas de entrada unitária: o item entra por uma abertura, é girado e escaneado; peso, material e marca são analisados; itens aceitos são esmagados (evita vazamento, ganha volume) e seguem para o espaço do seu material. Vidro costuma ser tratado à parte. Fonte: [Wikipedia, Reverse vending machine](https://en.wikipedia.org/wiki/Reverse_vending_machine).
- Princípio mecânico: em rampa inclinada com atrito, a embalagem gira em torno do próprio eixo, o que permite ler o código em 360 graus. Fonte: [patente DE3935334A1](https://patents.google.com/patent/DE3935334A1/en). O modelo de balcão Sielaff SiOne tem tambor rotativo, leitor de código e até 30 embalagens por minuto. Fonte: [Sielaff, folheto SiOne](https://cdn.shopify.com/s/files/1/0546/0295/6985/files/SiOne_Broschuere.pdf).
- Limite de 60 garrafas (15 euros) por rodada na Lidl, quando a máquina exige imprimir o comprovante para continuar. Fonte: [echo24](https://www.echo24.de/verbraucher/einweg-leergut-pet-flasche-dose-kaputt-pfand-kasse-rueckgabe-supermarkt-kunden-automat-geld-93054285.html) (fonte de consumo, menos autoritativa).

**Não confirmado (incerto)**
- Altura/largura exatas do módulo frontal, formato da abertura, tamanho da tela e tipo de impressora: não achei fonte. Na prática, as frontais alemãs costumam ter tela sensível ao toque, abertura com aba, luz de status e botão de "Pfandbon". Tratar como convenção de design, não como dado.
- Como o comprovante é protegido (código lido no caixa) e quais são os acessos de limpeza e manutenção: sem fonte; costuma ser por portas e painéis com chave.
- Detalhes do desvio (separador), da balança e da prensa em máquinas comerciais: sem fonte pública detalhada; a lógica abaixo é a da própria ReciclaAI.

## 2. Descrição da máquina ReciclaAI

**Visão geral.** Torre vertical de supermercado, autônoma, **sem marca nem texto**. Proporção alta e estreita, cerca de **1 : 2,3 : 0,8 (largura : altura : profundidade)**, por exemplo 90 cm x 205 cm x 75 cm. Formas **grossas, levemente exageradas**, bordas retas com quinas chanfradas pequenas, vincos e juntas pretas bem marcadas (linhas grossas). Sensação sólida, industrial, um pouco "grosseira", porém realista (parafusos grandes, dobradiças visíveis).

**Materiais e cores**
- Carcaça externa: chapa pintada **preto fosco** nas laterais e no topo.
- Painéis frontais de destaque: **verde-limão #C6F432**, pintura fosca.
- Frente inferior e molduras: **aço inox escovado** (reflexo linear horizontal).
- Juntas e fendas: preto profundo.
- Compartimentos: plástico **vermelho #c8453a**, metal **amarelo #c99700**, vidro **verde #2e8b57**, em polímero fosco com borda preta.

**Carcaça (casca externa).** Caixa em quatro faces (frente, laterais, topo) que, no vídeo, sobe como uma peça única e sai do quadro, revelando o miolo. A frente é dividida em faixa limão alta no alto, painel preto no meio e base em inox. Sem textos.

**As 9 peças (de baixo para cima)**, com tamanho aproximado em relação à altura do miolo:

1. **Compartimentos** (base, cerca de 22%). Três gavetas largas lado a lado: vermelha (plástico), amarela (metal), verde (vidro), cada uma com alça frontal preta e borda inox. Isolado: módulo largo e baixo com três bocas abertas em cima. Fica no chão, ocupando toda a largura.
2. **Separador** (cerca de 8%). Funil/placa articulada de aço escovado com aba móvel preta e dois atuadores cilíndricos; três saídas voltadas às gavetas. Isolado: um desviador em "Y" de três vias, chato e largo.
3. **Compactador** (cerca de 12%). Bloco de aço escuro com câmara retangular e pistão grosso de inox, placas laterais pretas e dois parafusos grandes. Isolado: prensa compacta com a face do pistão visível.
4. **Balança** (cerca de 5%). Plataforma plana de inox escovado sobre quatro células de carga cilíndricas pretas nos cantos. Isolada: bandeja fina em quatro pés.
5. **Esteira** (cerca de 8%). Calha curta com 2 a 3 rolos de borracha preta e eixos de inox, estrutura lateral limão. Isolada: rolos paralelos, uma mini esteira de rolos.
6. **Leitor de código de barras** (cerca de 5%). Módulo preto retangular com janela de vidro escuro e aro limão fino. Isolado: scanner de caixa de supermercado, grosso.
7. **Câmera e IA** (cerca de 8%). Anel metálico preto ao redor do trajeto, com 4 a 6 lentes redondas apontando para dentro e uma placa eletrônica limão atrás. Isolado: anel de câmeras (como nas entradas das máquinas alemãs).
8. **Abertura de entrada** (cerca de 10%). Boca retangular larga com borda inox grossa, aba preta articulada e uma **luz de status** em faixa (brilha limão). Isolada: moldura-túnel curta.
9. **Tela e impressora de voucher** (topo, cerca de 15%). Painel preto inclinado com tela sem texto (apenas brilho liso limão) e, abaixo, fenda de impressora com um papel em branco saindo; moldura limão. Isolado: console de quiosque.

**Fluxo de uma garrafa.** (1) A pessoa insere na abertura (8) e a luz de status indica pronta; (2) a garrafa desliza para a esteira (5), que a gira; (3) o leitor (6) e a câmera com IA (7) leem código e material; (4) a balança (4) confere o peso (garrafa cheia é devolvida); (5) PET e lata passam pelo compactador (3), vidro segue inteiro; (6) o separador (2) desvia para o compartimento certo (1); (7) a tela (9) mostra o resultado e a impressora entrega o voucher. Na máquina real o fluxo desce por gravidade; a ordem de montagem é de baixo para cima.

## 3. Roteiro do vídeo

Duração: **9 s** (faixa 8 a 10 s). Câmera **fixa**, vista 3/4 frontal, levemente de baixo (cerca de 10 a 15 graus abaixo do centro), enquadramento que cabe a máquina explodida inteira. Fundo **preto puro**. Luz de estúdio com luz de contorno (rim light) branca-fria e reflexos nos aços.

| Tempo | Ação |
|---|---|
| 0,0 a 1,0 s | Máquina totalmente montada, parada, no centro. Luz de status da abertura acesa em limão. |
| 1,0 a 2,5 s | A carcaça externa sobe devagar (ease in) e sai do quadro por cima. |
| 2,5 a 7,5 s | As 9 peças se separam na vertical, de baixo para cima, com espaçamento igual entre camadas. Movimento lento e suave (ease in/out). A peça 1 quase não sobe; a 9 sobe mais. Opcional: poeira ou faíscas finas e discretas. |
| 7,5 a 8,0 s | Desacelera até parar. |
| 8,0 a 9,0 s | **Totalmente explodida e imóvel por 1 s.** |

Regras: nenhuma peça gira, muda de forma, aparece ou some; só translação vertical. **Para a versão de montagem, basta inverter o vídeo (reverse).**

## 4. Prompts prontos

### 4.1 Prompt mestre (inglês)
```
Photorealistic studio product video, fixed camera, 3/4 front view from slightly below, pure black seamless background, cinematic rim light with soft reflections on brushed steel. A tall industrial reverse vending machine for bottles and cans, chunky and slightly oversized shapes with thick black seams, matte black body, lime green #C6F432 painted panels, brushed stainless steel details, three colored bins at the base (red, yellow, green). No logos, no text, screen glows plain lime. The machine starts fully assembled and still. Then the outer casing lifts straight up and away, and nine internal modules separate vertically into floating layers with equal gaps, bottom to top: three bins, diverter, compactor, scale plate, roller conveyor, barcode scanner, camera ring, entrance opening with glowing status light, screen with ticket printer. Slow smooth ease-in ease-out motion, only vertical translation, no rotation. Ends fully exploded and perfectly still for one second. 24 fps, 9 seconds, sharp, high detail.
```

### 4.2 Prompt negativo
```
text, letters, logos, brand names, watermark, people, hands, camera movement, camera shake, zoom, pan, morphing, warping, melting, extra parts, missing parts, duplicated parts, parts rotating, changing shapes, background objects, floor clutter, colorful background, cartoon, low quality, blur
```

### 4.3 Google Veo 3
```
A fixed-camera, photorealistic studio shot on a pure black background: a tall chunky industrial recycling machine (matte black, lime green #C6F432 panels, brushed steel, three colored bins at the bottom). Static for the first second. Then its outer shell lifts straight up out of frame and nine internal modules float apart vertically with equal spacing, bottom to top: bins, diverter, compactor, scale, roller conveyor, barcode scanner, camera ring, entrance opening with glowing light, screen with printer. Slow, smooth ease-in/out. Camera does not move. Final second: everything perfectly still. Soft rim light, no text, no logos, no people. Audio: very quiet low mechanical hum only, no voices, no music.
Negative prompt: text, logos, people, camera movement, morphing, extra parts, background objects.
```

### 4.4 Kling 2.x
```
Fixed locked camera, product exploded-view, pure black background. Tall industrial recycling kiosk, matte black with lime green panels and brushed steel, three red/yellow/green bins at the base. Casing rises away, then nine internal parts separate vertically in order with even gaps: bins, diverter, compactor, scale, conveyor rollers, barcode scanner, camera ring, entrance opening with glowing light, screen and ticket printer. Very slow, smooth motion, parts only translate vertically, no rotation. Ends static. Photorealistic, studio rim light, 9 seconds. Camera motion: none.
Negative prompt: text, logo, watermark, people, camera movement, shake, zoom, morphing, extra parts, background objects, blur
```
Dica: no Kling, use o modo de primeiro e último quadro (imagens 4.6 e 4.7) e relevância/adesão ao prompt alta.

### 4.5 Runway Gen-4
```
Locked-off camera. The machine in the first frame stays still, then its outer casing lifts upward and out of frame while nine internal modules smoothly separate vertically into evenly spaced floating layers. Slow, cinematic, soft rim lighting, pure black background. No camera movement, no rotation of parts, no text.
```
Anexar a imagem do primeiro quadro (4.6). O Gen-4 funciona melhor com prompt curto sobre o movimento, porque a imagem já descreve o objeto.

### 4.6 Imagem do PRIMEIRO quadro (montada), Midjourney / Imagen / GPT-image
```
Photorealistic studio product photograph of a tall freestanding industrial reverse vending machine for bottles and cans, 3/4 front view from slightly below, pure black seamless background, cinematic rim light, soft reflections on brushed stainless steel. Chunky, slightly oversized forms with thick black seams and visible big bolts. Matte black body, lime green #C6F432 painted front panels, brushed steel base. Slanted black screen glowing plain lime with no text, a ticket slot with blank paper, a wide entrance opening with a glowing lime status light. No logos, no text, no people. 16:9, ultra detailed. --ar 16:9 --style raw
```

### 4.7 Imagem do ÚLTIMO quadro (explodida)
```
Photorealistic studio product photograph, same machine as the previous frame but fully exploded: nine modules floating vertically in the air with equal gaps, exact order from bottom to top: 1 three bins (red #c8453a, yellow #c99700, green #2e8b57), 2 three-way diverter, 3 compactor press, 4 scale plate on four load cells, 5 roller conveyor, 6 barcode scanner, 7 camera ring with 4-6 lenses, 8 entrance opening with glowing lime status light, 9 slanted screen with ticket printer. Outer casing removed and not visible. Matte black, lime green #C6F432 panels, brushed steel. 3/4 front view from slightly below, pure black background, rim light. No logos, no text, no people. --ar 16:9 --style raw
```
Para 9:16, troque `--ar 16:9` por `--ar 9:16` e deixe mais espaço livre acima e abaixo para a máquina explodida caber.

## 5. Dicas para gerar e aproveitar

- **Formato:** gerar em **16:9** para desktop e uma versão **9:16** para celular (não recortar do 16:9, o objeto ficaria pequeno). Resolução 1080p, ou 4K se o modelo permitir (reduzir depois). **24 fps.**
- **Takes:** gere de 6 a 10 versões e escolha a mais consistente. Fixe a seed quando o modelo permitir. Prefira o modo de primeiro e último quadro para controlar começo e fim.
- **Checagem de peças:** pause no quadro final e confira (a) 9 camadas, (b) ordem de baixo para cima como em 4.7, (c) espaços iguais, (d) cores dos 3 compartimentos, (e) nenhum texto ou logo, (f) fundo realmente preto. Compare com o primeiro quadro: nada pode aparecer ou sumir no meio.
- **Se falhar:** modelos de vídeo tendem a inventar peças. Encurte o prompt, use as imagens 4.6 e 4.7, ou gere em duas partes (casca subindo; peças se separando) e emende.
- **Versão de montagem:** `ffmpeg -i in.mp4 -vf reverse out.mp4`.
- **Extração de cerca de 120 quadros** (WebP, 1920 px de largura, distribuídos igualmente), onde D é a duração em segundos (descubra com `ffprobe -v error -show_entries format=duration -of csv=p=0 maquina.mp4`):
```
ffmpeg -i maquina.mp4 -vf "fps=120/D,scale=1920:-2" -c:v libwebp -quality 80 frames/f_%03d.webp
```
Exemplo para 9 s: `fps=120/9`. Crie antes a pasta `frames`. Para a versão vertical, use `scale=1080:-2`. Como o fundo é preto puro, o WebP fica leve; ajuste `-quality` para equilibrar peso e nitidez.
