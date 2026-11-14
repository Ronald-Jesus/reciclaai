# ReciclaAI · Plano de construção do site

**Objetivo:** construir o site de vendas da ReciclaAI e a subpágina Lixeira Pessoal descritos na
visão do produto, em partes pequenas, cada uma com issue, pull request e aprovação.

**Arquitetura:** o front-end vira um projeto React (Vite) na pasta `frontend/`. O Flask continua
como servidor único: serve o React compilado em `/` e `/lixeira`, mantém a IA (`/predict`), as
regras da máquina (`rvm.py`), a simulação da máquina (agora em `/maquina`) e o painel (`/admin`).

**Tecnologias:** Python 3.12, Flask, PyTorch, pytest · React 18, Vite, Vitest, GSAP (ScrollTrigger),
Lenis, Vanta, React Bits, MapLibre GL com OpenFreeMap e OpenStreetMap · PostgreSQL (Neon) e SQLite · GitHub Actions,
Hugging Face Spaces.

**Especificação:** [docs/visao-do-produto.md](visao-do-produto.md). Toda parte segue a visão;
em caso de dúvida, a visão manda.

**Equipe:** projeto individual, com apoio de um assistente de IA no desenvolvimento.

## Regras que valem para todas as partes

- Todo o trabalho é feito na branch `develop`. Ao terminar cada issue, um pull request
  `develop` → `main` fecha a issue (`Closes #N`). Nada vai para a `main` sem revisão e aprovação.
- Ciclo de cada parte: teste que falha → código mínimo → testes passando → revisão →
  commit e PR.
- Cores de material (CONAMA 275), as mesmas em todo o site: plástico `#c8453a` (vermelha),
  metal `#c99700` (amarela), vidro `#2e8b57` (verde), papel e papelão `#2f6db5` (azul),
  orgânico `#8a5a36` (marrom), rejeito `#6b6f6a` (cinza).
- Valores: plástico R$ 0,10 · metal R$ 0,15 · vidro R$ 0,25. Confiança mínima: 70%.
  Upload máximo: 5 MB.
- Textos em português simples. Nenhum número sem fonte citada. Nenhuma marca ou logotipo de
  fabricante de máquinas ou de supermercado.
- Toda animação respeita `prefers-reduced-motion`.
- Fotos de banco gratuito com crédito do fotógrafo; mapa com "© colaboradores do OpenStreetMap".

## Pontos de atenção (o que mais pode dar errado com quem usa)

1. **Modelo ainda não treinado:** o site abre normalmente; a subpágina mostra um aviso e o
   `/predict` responde 503 com mensagem clara. Teste na Parte 7 e na Parte 8.
2. **Foto inválida:** arquivo grande, que não é imagem ou em HEIC (iPhone) recebe mensagem que
   diz o que fazer ("envie em JPG ou PNG, até 5 MB"). Teste na Parte 7 (servidor) e na Parte 8
   (navegador, antes de enviar).
3. **Câmera negada ou site sem HTTPS:** aparece uma mensagem e o envio de arquivo continua
   funcionando. Teste na Parte 8.
4. **Localização negada ou fora de Brasília:** o mapa abre no centro de Brasília e ainda mostra
   o mercado mais próximo desse ponto. Teste na Parte 10.
5. **Animações desativadas no sistema:** a montagem mostra a máquina pronta (ilustração SVG) com
   a lista das 9 peças, sem rolagem presa; Lenis e Vanta ficam desligados. Teste na Parte 6.
6. **Foto que não é de resíduo (pessoa, ambiente):** a classe `nao_residuo`, ou confiança abaixo de
   70%, mostra "Não reconheci uma embalagem nesta foto" com dicas, nunca material, valor ou
   lixeira; a máquina rejeita. Testes na Parte 7 e na Parte 9.

---

## Parte 1 · Ambiente reproduzível e testes no pipeline
**Issues:** #21, #22, #23 (já existem) · **Estimativa:** 2 h

**Arquivos:** `requirements.txt` (versões fixas, mais `pytest` e `pytest-cov`) ·
`tests/test_rvm.py` · `tests/conftest.py` (banco temporário por teste) ·
`.github/workflows/testes.yml` · `README.md` (passo a passo do ambiente e selo do pipeline)

**Interfaces que as próximas partes usam:** fixture `db_temporario` que aponta `rvm.DB_PATH` para
um arquivo temporário e chama `rvm.init_db()`.

**Testes:**
- `test_decide_aceita_plastico_com_confianca` → `decide("plastic", 90, False)` aceito, valor 0.10
- `test_decide_recusa_abaixo_de_70` → `decide("plastic", 69.9, False)` recusado
- `test_decide_recusa_papel_com_orientacao` → recusado, motivo menciona "azul"
- `test_decide_recusa_compartimento_cheio`
- `test_insert_soma_saldo` → dois itens aceitos (plástico e vidro) dão saldo 0.35
- `test_finish_gera_voucher_so_com_saldo` → sessão sem item aceito devolve `voucher` nulo
- `test_voucher_so_resgata_uma_vez`
- `test_sessao_finalizada_recusa_insercao` → levanta `SessionError`

**Pronto quando:** `pytest --cov` passa localmente e no GitHub Actions; o README tem o passo a
passo testado numa instalação limpa (Python 3.12).

## Parte 2 · Esqueleto React servido pelo Flask (com ADR)
**Issue:** #38 · **Estimativa:** 1,5 h

**Arquivos:** `frontend/` (Vite + React, `vitest`) · `app.py` (rotas `/` e `/lixeira` servem
`frontend/dist/index.html`; a tela atual da máquina vai para `/maquina`) ·
`templates/index.html` renomeado para `templates/maquina.html` · `tests/test_rotas.py` ·
`docs/adr/ADR-001-react-servido-pelo-flask.md` · `.github/workflows/testes.yml` (passa a compilar
e testar o front)

**Interfaces:** componente `App` com as rotas `/` (`PaginaInicial`) e `/lixeira` (`LixeiraPessoal`),
ambas com conteúdo provisório; comando `npm run build` gera `frontend/dist/`.

**Testes:** `test_raiz_serve_o_react` (GET `/` contém `<div id="root">`) ·
`test_maquina_continua_funcionando` (GET `/maquina` 200) · Vitest: `App renderiza a página inicial`.

**Pronto quando:** `flask run` abre o React em `/`, a máquina em `/maquina` e o painel em `/admin`.

## Parte 3 · Identidade visual e layout base
**Issue:** #39 · **Estimativa:** 1 h

**Arquivos:** `frontend/src/estilo/tokens.css` (estilo neo-brutalista inspirado no Material Design 3,
cor semente verde-limão `#C6F432`, cores de material acima, bordas pretas grossas, sombras duras,
tipografia Bricolage Grotesque nos títulos e Atkinson Hyperlegible Next nos textos) ·
`frontend/src/componentes/Topo.jsx`, `Rodape.jsx`, `Botao.jsx`, `Icone.jsx` ·
`frontend/src/hooks/useMenosAnimacao.js` · `frontend/src/hooks/useRolagemSuave.js` (Lenis) ·
`frontend/src/dados/materiais.js`

**Interfaces:** `useRolagemSuave()` liga o Lenis e não faz nada quando `useMenosAnimacao()` é
verdadeiro · `useMenosAnimacao(): boolean` (lê `prefers-reduced-motion`) ·
`MATERIAIS: Record<classe, {rotulo, lixeira, cor, icone, dica}>` com as 7 classes de material, incluindo
`biological` como apelido de `organic`. `nao_residuo` não é material: não entra em `MATERIAIS` e
não tem cor de lixeira.

**Testes (Vitest):** `useMenosAnimacao respeita a preferência do sistema` · `todo material tem
cor e lixeira` · `Topo tem link para a lixeira pessoal`.

**Pronto quando:** página inicial com topo, rodapé e tipografia definitiva, no estilo
neo-brutalista, com rolagem suave (Lenis) desligada com menos animação.

## Parte 4 · Abertura com o problema e contraste Brasil × Alemanha
**Issue:** #40 · **Estimativa:** 1,5 h (inclui escolher as fotos)

**Arquivos:** `frontend/src/secoes/Problema.jsx`, `Contraste.jsx` · `frontend/public/fotos/`
(3 a 5 fotos) · `frontend/src/dados/creditos.js` (foto, autor, link, licença) ·
`frontend/src/componentes/FundoVanta.jsx` (fundo animado do topo)

**Testes (Vitest):** `toda foto tem texto alternativo e crédito` · `os números do contraste
mostram a fonte` (97,3% e +96% com link).

**Pronto quando:** as seções 6.1 e 6.2 da visão aparecem com texto revelado ao rolar (React Bits)
e créditos no rodapé; fundo animado com Vanta no topo, desligado com menos animação.

## Parte 5 · Máquina: sequência de quadros e ilustração em camadas
**Issue:** #41 · **Estimativa:** 1 h

**Arquivos:** `frontend/public/maquina/frames/` (cerca de 120 quadros WebP do vídeo da máquina
gerado por IA: `frame_0001.webp`, `frame_0002.webp` …) · `frontend/src/maquina/quadros.js` ·
`frontend/src/maquina/MaquinaSVG.jsx` (alternativa 2D em camadas) · `frontend/src/maquina/pecas.js`

**Interfaces:** `PECAS: Array<{id, nome, porque}>` com as 9 peças da tabela 6.3, na ordem de
montagem (compartimentos primeiro, tela por último) · `<MaquinaSVG pecasVisiveis={n} telaLigada={bool} />`,
em que cada peça é um `<g data-peca={id}>` · `nomeDoQuadro(i): string` (`nomeDoQuadro(1) ===
"frame_0001.webp"`) e `TOTAL_QUADROS`. A sequência de quadros é a vista principal, num palco escuro;
o SVG é a alternativa quando os quadros faltam e a base para menos animação.

**Testes:** `PECAS tem 9 itens na ordem da visão` · `MaquinaSVG desenha só as primeiras n peças` ·
`tela ligada mostra "Insira uma embalagem"` · `nomeDoQuadro numera com quatro dígitos`.

**Pronto quando:** os quadros estão na pasta e a ilustração SVG aparece completa e pode ser
desenhada peça por peça.

## Parte 6 · Montagem animada ao rolar e fechamento
**Issue:** #42 · **Estimativa:** 1,5 h

**Arquivos:** `frontend/src/secoes/Montagem.jsx` · `frontend/src/maquina/PlayerQuadros.jsx` ·
`frontend/src/secoes/Fechamento.jsx`

**Interfaces:** consome `PECAS`, `MaquinaSVG`, `nomeDoQuadro` e `useMenosAnimacao` ·
`<PlayerQuadros progresso={0..1} />` desenha no `<canvas>` o quadro correspondente ao progresso da
rolagem (GSAP ScrollTrigger), em palco escuro; sem quadros, cai no `MaquinaSVG` · função
`rotuloProgresso(atual, total): string` · tocar os quadros ao contrário dá a versão de montagem.

**Testes:** `rotuloProgresso(3, 9) === "3 de 9 peças"` · `com menos animação mostra a máquina
pronta (SVG) e a lista das 9 peças` · `o player escolhe o quadro pelo progresso` · `sem quadros
usa o SVG` · `fechamento leva para /lixeira`.

**Pronto quando:** seção presa na tela, em palco escuro, com a máquina em vista explodida
conduzida pela rolagem (GSAP ScrollTrigger), uma peça destacada por trecho, barra de progresso, nome e "por que existe" de cada peça, tela que liga no fim; versão mais curta
no celular.

## Parte 7 · Servidor da subpágina
**Issue:** #20 (já existe) · **Estimativa:** 1 h

**Arquivos:** `app.py` · `rvm.py` · `tests/test_api.py` (modelo simulado por uma função falsa)

**Interfaces:**
- `POST /predict` (campo `image`) → `{prediction: {class, label, bin, color, confidence},
  ranking: [3 itens], machine: {accepted, value, reason}, low_confidence: bool, nao_reconhecido: bool}` (não gera crédito). `nao_reconhecido` é
  `true` quando a classe mais provável é `nao_residuo` ou a confiança é menor que 70
- `GET /api/status` → `{model_ready: bool}`
- erros sempre em JSON `{error: "<o que houve e como resolver>"}`: 400 imagem inválida, 413 acima
  de 5 MB, 503 modelo não treinado
- `rvm.REJECT_REASONS` com `organic` e `biological` (lixeira marrom) e `nao_residuo` ("Item não
  reconhecido"; sem lixeira)

**Testes:** `test_predict_diz_valor_na_maquina` · `test_predict_nao_gera_credito` (nenhuma linha
nova em `items`) · `test_upload_acima_de_5mb_da_413` · `test_arquivo_que_nao_e_imagem_da_400` ·
`test_sem_modelo_da_503_com_mensagem` · `test_organico_vai_para_lixeira_marrom` · `test_nao_residuo_nao_vira_material` (`nao_reconhecido`
true, sem material, valor nem lixeira; a máquina rejeita).

## Parte 8 · Subpágina: foto e análise
**Issue:** #43 · **Estimativa:** 1,5 h

**Arquivos:** `frontend/src/lixeira/Captura.jsx` · `frontend/src/lixeira/validarArquivo.js` ·
`frontend/src/lixeira/api.js`

**Interfaces:** `validarArquivo(file): {ok: true} | {ok: false, mensagem}` ·
`analisarFoto(blob, sinal: AbortSignal): Promise<RespostaPredict>`.

**Testes:** `recusa arquivo que não é imagem` · `recusa acima de 5 MB com o tamanho na mensagem` ·
`câmera negada mostra aviso e mantém o envio de arquivo` · `modelo não pronto mostra aviso` ·
`cancelar interrompe a análise`.

**Pronto quando:** câmera, arrastar, colar (Ctrl+V) e escolher arquivo; trocar ou remover a foto;
animação de leitura com "Analisando…" e botão cancelar.

## Parte 9 · Subpágina: retorno e sacola
**Issue:** #44 · **Estimativa:** 1,5 h

**Arquivos:** `frontend/src/lixeira/Resultado.jsx` · `frontend/src/lixeira/Sacola.jsx` ·
`frontend/src/lixeira/sacola.js`

**Interfaces:** `sacolaReducer(estado, acao)` com as ações `adicionar`, `remover`, `desfazer` ·
`totalSacola(itens): number`.

**Testes:** `só material aceito pode ir para a sacola` · `total soma os valores` ·
`desfazer devolve o item removido` · `confiança baixa mostra dicas de foto` · `nao_reconhecido mostra "Não reconheci uma embalagem" sem material, valor nem lixeira`.

**Pronto quando:** resultado com material, lixeira, confiança, valor ou motivo da recusa e dica;
sacola com miniaturas e total; legenda das lixeiras sempre visível.

## Parte 10 · Subpágina: mapa do mercado mais próximo
**Issue:** #45 · **Estimativa:** 2 h (1,5 h do mapa mais 0,5 h da busca real, absorvida do antigo
#49 pela mudança M05)

**Arquivos:** `frontend/src/lixeira/Mapa.jsx` · `frontend/src/lixeira/geo.js` ·
`frontend/src/dados/mercados-brasilia.json` (extraído do OpenStreetMap, com atribuição)

**Interfaces:** `distanciaKm(a, b): number` (haversine) · `maisProximo(origem, mercados)` ·
`minutosAPe(km): number` (5 km/h, arredondado para cima) · busca real de mercados no OpenStreetMap
(Overpass), com a lista salva como reserva se a busca falhar (HU-12).

**Testes:** `distância entre dois pontos conhecidos de Brasília` · `maisProximo escolhe o menor` ·
`minutosAPe(1.2) === 15` · `sem localização usa o centro de Brasília` · `aviso de demonstração
sempre visível` · `se a busca falhar, usa a lista salva sem erro na tela`.

**Pronto quando:** mapa MapLibre (estilo OpenFreeMap; o Leaflet com tiles do OSM foi trocado no protótipo, ver DEF-03) com o mercado mais próximo, distância e tempo a pé, aviso de que
os mercados não são parceiros e crédito ao OpenStreetMap.

## Parte 11 · Documento das heurísticas de Nielsen
**Issue:** #46 · **Estimativa:** 1 h

**Arquivos:** `docs/heuristicas-nielsen.md` · `docs/prints/`

**Pronto quando:** cada uma das 10 heurísticas tem onde aparece, um print e o arquivo do código.

## Parte 12 · Banco PostgreSQL (Neon) com SQLite local
**Issue:** #52 · **Estimativa:** 2,5 h · Fazer antes da issue #28 (deploy)

**Arquivos:** `rvm.py` (acesso ao banco por uma única camada de conexão que funciona com SQLite e
PostgreSQL) · `requirements.txt` (acrescenta o driver PostgreSQL com versão fixa) ·
`tests/test_rvm.py` (continua rodando no SQLite) · `docs/adr/ADR-003-postgresql-neon.md`

**Interfaces:** `DATABASE_URL` ausente → SQLite (`rvm.db`); presente → PostgreSQL. As funções de
`rvm.py` são as mesmas nos dois casos.

**Testes:** os 8 testes existentes continuam passando no SQLite · `a URL do banco escolhe o backend`.

**Pronto quando:** o site no Hugging Face usa o Neon com o secret `DATABASE_URL` e os dados
sobrevivem a reinícios.

---

## Extras (só se sobrar tempo, nesta ordem)

| Extra | O que é | Horas |
|---|---|---|
| E1 (#47) | Depósito simulado com voucher na subpágina (visão 7.5) | 1 |
| E2 (#48) | Seções de impacto com simulador, para quem, painel e dúvidas (6.4 a 6.7), com números aprovados antes | 1,5 |
| ~~E3 (#49)~~ | Busca real de mercados próximos: absorvida pela Parte 10 (#45) na mudança M05 | 0,5 (já contadas no #45) |
