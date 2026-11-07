# ReciclaAI · Plano de construção do site

**Objetivo:** construir o site de vendas da ReciclaAI e a subpágina Lixeira Pessoal descritos na
visão do produto, em partes pequenas, cada uma com issue, branch, pull request e aprovação.

**Arquitetura:** o front-end vira um projeto React (Vite) na pasta `frontend/`. O Flask continua
como servidor único: serve o React compilado em `/` e `/lixeira`, mantém a IA (`/predict`), as
regras da máquina (`rvm.py`), a simulação da máquina (agora em `/maquina`) e o painel (`/admin`).

**Tecnologias:** Python 3.12, Flask, PyTorch, pytest · React 18, Vite, Vitest, GSAP (ScrollTrigger),
React Bits, Leaflet com OpenStreetMap · GitHub Actions.

**Especificação:** [docs/visao-do-produto.md](visao-do-produto.md). Toda parte segue a visão;
em caso de dúvida, a visão manda.

**Equipe:** projeto individual, com apoio de um assistente de IA no desenvolvimento.

## Regras que valem para todas as partes

- Cada parte é uma issue no GitHub, uma branch (`feat/<numero>-<nome>`) e um pull request que
  fecha a issue (`Closes #N`). Nada vai para a `main` sem revisão e aprovação.
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
5. **Animações desativadas no sistema:** a montagem mostra a máquina pronta com a lista das 9
   peças, sem rolagem presa. Teste na Parte 6.

---

## Parte 1 · Ambiente reproduzível e testes no pipeline
**Issues:** #21, #22, #23 (já existem) · **Estimativa:** 2

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
**Issue:** #38 · **Estimativa:** 1,5

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
**Issue:** #39 · **Estimativa:** 1

**Arquivos:** `frontend/src/estilo/tokens.css` (cores acima, tipografia, espaçamentos) ·
`frontend/src/componentes/Topo.jsx`, `Rodape.jsx`, `Botao.jsx`, `Icone.jsx` ·
`frontend/src/hooks/useMenosAnimacao.js` · `frontend/src/dados/materiais.js`

**Interfaces:** `useMenosAnimacao(): boolean` (lê `prefers-reduced-motion`) ·
`MATERIAIS: Record<classe, {rotulo, lixeira, cor, icone, dica}>` com as 7 classes, incluindo
`biological` como apelido de `organic`.

**Testes (Vitest):** `useMenosAnimacao respeita a preferência do sistema` · `todo material tem
cor e lixeira` · `Topo tem link para a lixeira pessoal`.

**Pronto quando:** página inicial com topo, rodapé e tipografia definitiva, sem visual genérico.

## Parte 4 · Abertura com o problema e contraste Brasil × Alemanha
**Issue:** #40 · **Estimativa:** 1,5 (inclui escolher as fotos)

**Arquivos:** `frontend/src/secoes/Problema.jsx`, `Contraste.jsx` · `frontend/public/fotos/`
(3 a 5 fotos) · `frontend/src/dados/creditos.js` (foto, autor, link, licença)

**Testes (Vitest):** `toda foto tem texto alternativo e crédito` · `os números do contraste
mostram a fonte` (97,3% e +96% com link).

**Pronto quando:** as seções 6.1 e 6.2 da visão aparecem com texto revelado ao rolar (React Bits)
e créditos no rodapé.

## Parte 5 · Ilustração da máquina em camadas
**Issue:** #41 · **Estimativa:** 1

**Arquivos:** `frontend/src/maquina/MaquinaSVG.jsx` · `frontend/src/maquina/pecas.js`

**Interfaces:** `PECAS: Array<{id, nome, porque}>` com as 9 peças da tabela 6.3, na ordem de
montagem (compartimentos primeiro, tela por último) · `<MaquinaSVG pecasVisiveis={n} telaLigada={bool} />`,
em que cada peça é um `<g data-peca={id}>`.

**Testes:** `PECAS tem 9 itens na ordem da visão` · `MaquinaSVG desenha só as primeiras n peças` ·
`tela ligada mostra "Insira uma embalagem"`.

**Pronto quando:** a máquina estática aparece completa e pode ser desenhada peça por peça.

## Parte 6 · Montagem animada ao rolar e fechamento
**Issue:** #42 · **Estimativa:** 1,5

**Arquivos:** `frontend/src/secoes/Montagem.jsx` · `frontend/src/secoes/Fechamento.jsx`

**Interfaces:** consome `PECAS`, `MaquinaSVG` e `useMenosAnimacao` · função
`rotuloProgresso(atual, total): string`.

**Testes:** `rotuloProgresso(3, 9) === "3 de 9 peças"` · `com menos animação mostra a máquina
pronta e a lista das 9 peças` · `fechamento leva para /lixeira`.

**Pronto quando:** seção presa na tela, uma peça por trecho de rolagem (GSAP ScrollTrigger),
barra de progresso, nome e "por que existe" de cada peça, tela que liga no fim; versão mais curta
no celular.

## Parte 7 · Servidor da subpágina
**Issue:** #20 (já existe) · **Estimativa:** 1

**Arquivos:** `app.py` · `rvm.py` · `tests/test_api.py` (modelo simulado por uma função falsa)

**Interfaces:**
- `POST /predict` (campo `image`) → `{prediction: {class, label, bin, color, confidence},
  ranking: [3 itens], machine: {accepted, value, reason}, low_confidence: bool}` (não gera crédito)
- `GET /api/status` → `{model_ready: bool}`
- erros sempre em JSON `{error: "<o que houve e como resolver>"}`: 400 imagem inválida, 413 acima
  de 5 MB, 503 modelo não treinado
- `rvm.REJECT_REASONS` com `organic` e `biological` (lixeira marrom)

**Testes:** `test_predict_diz_valor_na_maquina` · `test_predict_nao_gera_credito` (nenhuma linha
nova em `items`) · `test_upload_acima_de_5mb_da_413` · `test_arquivo_que_nao_e_imagem_da_400` ·
`test_sem_modelo_da_503_com_mensagem` · `test_organico_vai_para_lixeira_marrom`.

## Parte 8 · Subpágina: foto e análise
**Issue:** #43 · **Estimativa:** 1,5

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
**Issue:** #44 · **Estimativa:** 1,5

**Arquivos:** `frontend/src/lixeira/Resultado.jsx` · `frontend/src/lixeira/Sacola.jsx` ·
`frontend/src/lixeira/sacola.js`

**Interfaces:** `sacolaReducer(estado, acao)` com as ações `adicionar`, `remover`, `desfazer` ·
`totalSacola(itens): number`.

**Testes:** `só material aceito pode ir para a sacola` · `total soma os valores` ·
`desfazer devolve o item removido` · `confiança baixa mostra dicas de foto`.

**Pronto quando:** resultado com material, lixeira, confiança, valor ou motivo da recusa e dica;
sacola com miniaturas e total; legenda das lixeiras sempre visível.

## Parte 10 · Subpágina: mapa do mercado mais próximo
**Issue:** #45 · **Estimativa:** 1,5

**Arquivos:** `frontend/src/lixeira/Mapa.jsx` · `frontend/src/lixeira/geo.js` ·
`frontend/src/dados/mercados-brasilia.json` (extraído do OpenStreetMap, com atribuição)

**Interfaces:** `distanciaKm(a, b): number` (haversine) · `maisProximo(origem, mercados)` ·
`minutosAPe(km): number` (5 km/h, arredondado para cima).

**Testes:** `distância entre dois pontos conhecidos de Brasília` · `maisProximo escolhe o menor` ·
`minutosAPe(1.2) === 15` · `sem localização usa o centro de Brasília` · `aviso de demonstração
sempre visível`.

**Pronto quando:** mapa Leaflet com o mercado mais próximo, distância e tempo a pé, aviso de que
os mercados não são parceiros e crédito ao OpenStreetMap.

## Parte 11 · Documento das heurísticas de Nielsen
**Issue:** #46 · **Estimativa:** 1

**Arquivos:** `docs/heuristicas-nielsen.md` · `docs/prints/`

**Pronto quando:** cada uma das 10 heurísticas tem onde aparece, um print e o arquivo do código.

---

## Extras (só se sobrar tempo, nesta ordem)

| Extra | O que é | Horas |
|---|---|---|
| E1 (#47) | Depósito simulado com voucher na subpágina (visão 7.5) | 1 |
| E2 (#48) | Seções de impacto com simulador, para quem, painel e dúvidas (6.4 a 6.7), com números aprovados antes | 1,5 |
| E3 (#49) | Busca real de mercados próximos no OpenStreetMap | 0,5 |
| E4 (#50) | Rolagem suave (Lenis) e fundo 3D no topo (Vanta) | 0,5 |
