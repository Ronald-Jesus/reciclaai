# Casos de teste da ReciclaAI

Liga cada caso de teste aos [requisitos](../requisitos/requisitos.md) e às
[histórias de usuário](../requisitos/historias-de-usuario.md). Os defeitos já corrigidos estão em
[defeitos-encontrados.md](defeitos-encontrados.md).

## Plano de testes

**Objetivo.** Mostrar que as regras da máquina, a API da IA e as rotas do site fazem o que os
requisitos pedem, e que os defeitos já corrigidos não voltam.

**Escopo.**

- Regras da máquina (`rvm.py`): aceite, recusa, valores, compartimento cheio, sessão e voucher.
- API do classificador (`app.py`): `/predict`, `/api/status` e `/api/session/<id>/insert`.
- Rotas de telas (`app.py`): `/`, `/lixeira`, `/assets`, arquivos públicos do build e 404.
- Front-end (`frontend/src`): rotas do React, menu, acessibilidade e dados de materiais e fotos.

**Fora do escopo agora.** Mapa e busca de mercados (#45), sacola (#44), depósito simulado (#47),
montagem em 9 peças (#41, #42) e simulador (#48). Esses casos entram quando as issues forem feitas.

**Níveis.**

| Tipo | O que testa | Ferramenta |
|---|---|---|
| Unitário | Uma função isolada (`rvm.decide`, hooks do React, dados) | pytest, Vitest |
| Integração | Rota Flask com banco SQLite temporário e modelo falso; componente React renderizado | pytest com `test_client`, Vitest com Testing Library |
| Manual | O que ainda não tem teste automático ou depende do navegador real | Roteiro deste documento |

**Ambiente.** Python 3.12 com o `venv` do projeto; banco SQLite temporário criado pela fixture
`db_temporario`; modelo falso (`ModeloFalso` em `tests/test_api.py`), para não depender do
arquivo treinado. Front com Node e Vitest (jsdom).

**Como rodar.**

```bash
venv/Scripts/python -m pytest
venv/Scripts/python -m pytest --cov=rvm --cov=app --cov-report=term
cd frontend && npx vitest run
```

**Integração contínua.** O arquivo `.github/workflows/testes.yml` roda os dois conjuntos a cada
push: o job `testes` (pytest) e o job `frontend` (Vitest) (RNF-12).

**Critério de aprovação.** Todos os testes automáticos passam e os casos manuais da lista abaixo
foram executados antes da entrega, com o resultado anotado.

## Casos de teste

Nas referências do Vitest, o texto entre aspas é o nome do teste (`it`) dentro do arquivo.

### Análise da foto (`/predict`)

| ID | Requisito / HU | Cenário | Passos | Dados de entrada | Resultado esperado | Tipo | Como é verificado |
|---|---|---|---|---|---|---|---|
| CT-01 | RF-02, RF-09 / HU-01 | Garrafa PET reconhecida | Enviar a foto para `/predict` com o modelo apontando plástico | Imagem PNG 32×32; classe `plastic` com confiança alta | 200; material plástico, lixeira vermelha, cor `#c8453a`, ranking com 3 itens, máquina aceita, valor R$ 0,10, `nao_reconhecido` falso | Integração | `tests/test_api.py::test_predict_diz_valor_na_maquina` |
| CT-02 | RF-12 / HU-04, HU-07 | Análise no app não gera crédito | Contar itens no banco, enviar a foto, contar de novo | Imagem PNG válida | 200; número de itens no banco não muda | Integração | `tests/test_api.py::test_predict_nao_gera_credito` |
| CT-03 | RF-04, RNF-08 / HU-03 | Imagem acima de 5 MB | Enviar arquivo grande para `/predict` | 5 MB + 1 KB de bytes | 413; JSON com erro citando "5 MB" | Integração | `tests/test_api.py::test_upload_acima_de_5mb_da_413` |
| CT-04 | RF-04, RNF-08 / HU-03 | Arquivo que não é imagem | Enviar um `.txt` para `/predict` | `texto.txt` com texto simples | 400; mensagem pedindo JPG, PNG ou WEBP | Integração | `tests/test_api.py::test_arquivo_que_nao_e_imagem_da_400` |
| CT-05 | RF-04, RNF-02 / HU-03 | Foto HEIC do iPhone | Enviar uma foto `.heic` real para `/predict` | Arquivo HEIC | 400; mensagem dizendo que HEIC não é suportado e que deve ser convertido para JPG | Manual | Manual (o caminho de código é o mesmo do CT-04, mas nenhum teste usa um HEIC nem confere o texto sobre HEIC) |
| CT-06 | RF-04 / HU-03 | Envio sem arquivo | Fazer POST em `/predict` sem o campo `image` | Formulário vazio | 400; JSON com `error` | Integração | `tests/test_api.py::test_sem_arquivo_da_400` |
| CT-07 | RF-04, RNF-02 / HU-03 | Servidor sem modelo | Subir o app sem modelo e enviar foto | `_model = None`; imagem válida | 503; mensagem dizendo para rodar `treino.py` | Integração | `tests/test_api.py::test_sem_modelo_da_503_com_mensagem` |
| CT-08 | RF-04 / HU-03 | Status informa se a IA está pronta | Chamar `/api/status` com e sem modelo | Modelo falso; depois `_model = None` | `model_ready` verdadeiro com a lista de classes; depois falso | Integração | `tests/test_api.py::test_status_informa_modelo` |
| CT-09 | RF-03 / HU-02 | Selfie ou foto que não é resíduo | Enviar foto com o modelo apontando `nao_residuo` | Classe `nao_residuo` com confiança alta | `nao_reconhecido` verdadeiro; sem lixeira; máquina recusa; valor 0; motivo "Não reconheci uma embalagem nesta foto." | Integração | `tests/test_api.py::test_nao_residuo_nao_vira_material` |
| CT-10 | RF-03 / HU-02 | Selfie real com o modelo treinado | Abrir `/lixeira`, enviar uma selfie | Foto de rosto tirada no celular | Tela mostra "Não reconheci uma embalagem nesta foto" com dicas, sem material, valor nem lixeira | Manual | Manual (depende do modelo treinado e da tela da lixeira) |
| CT-11 | RF-03 / HU-02 | Confiança abaixo de 70% | Enviar foto com o modelo quase indeciso | Classe `plastic` com logits baixos (softmax quase uniforme) | Confiança < 70; `low_confidence` e `nao_reconhecido` verdadeiros; máquina recusa com a mesma mensagem | Integração | `tests/test_api.py::test_confianca_baixa_vira_nao_reconhecido` |
| CT-12 | RF-02, RF-09 / HU-01 | Orgânico recusado | Enviar foto com o modelo apontando orgânico | Classe `organic` | Lixeira marrom; `nao_reconhecido` falso; máquina recusa; motivo cita "lixeira marrom" | Integração | `tests/test_api.py::test_organico_vai_para_lixeira_marrom` |

### Regras da máquina

| ID | Requisito / HU | Cenário | Passos | Dados de entrada | Resultado esperado | Tipo | Como é verificado |
|---|---|---|---|---|---|---|---|
| CT-13 | RF-09 / HU-07 | PET aceito com valor | Chamar `rvm.decide` | `plastic`, 90%, compartimento livre | Aceito; valor R$ 0,10 | Unitário | `tests/test_rvm.py::test_decide_aceita_plastico_com_confianca` |
| CT-14 | RF-09, RF-11 / HU-07 | Lata e vidro aceitos com valor | Abrir sessão, inserir itens, finalizar | `plastic` 90% + `glass` 90%; em outra sessão `metal` 90% | Saldo R$ 0,10 e depois R$ 0,35; sessão com metal gera voucher de R$ 0,15 | Unitário | `tests/test_rvm.py::test_insert_soma_saldo` e `tests/test_rvm.py::test_finish_gera_voucher_so_com_saldo` |
| CT-15 | RF-09 / HU-07 | Item aceito pela rota da máquina | Abrir sessão por `/api/session` e inserir por `/api/session/<id>/insert` | Imagem válida; classe `plastic` | `accepted` verdadeiro; `nao_reconhecido` falso | Integração | `tests/test_api.py::test_insert_aceito_tem_nao_reconhecido_falso` |
| CT-16 | RF-09 / HU-07 | Confiança de 69,9% na máquina | Chamar `rvm.decide` | `plastic`, 69,9% | Recusado; valor 0 | Unitário | `tests/test_rvm.py::test_decide_recusa_abaixo_de_70` |
| CT-17 | RF-03, RF-12 / HU-02, HU-07 | Selfie inserida na máquina | Abrir sessão e inserir foto | Classe `nao_residuo` | Recusado; `nao_reconhecido` verdadeiro; saldo 0 | Integração | `tests/test_api.py::test_insert_nao_residuo_nao_credita` |
| CT-18 | RF-09 / HU-01 | Papel recusado com orientação | Chamar `rvm.decide` | `paper`, 95% | Recusado; motivo cita o coletor azul | Unitário | `tests/test_rvm.py::test_decide_recusa_papel_com_orientacao` |
| CT-19 | RF-09 / HU-01 | Papelão recusado com orientação | Chamar `rvm.decide` (ou enviar foto de caixa) | `cardboard`, 95% | Recusado; motivo "Papelão não é aceito pela máquina. Descarte no coletor azul." | Manual | Manual (a regra existe em `rvm.REJECT_REASONS`, mas não há teste para `cardboard`) |
| CT-20 | RF-10 / HU-09 | Compartimento cheio | Chamar `rvm.decide` com compartimento cheio | `glass`, 95%, `bin_full` verdadeiro | Recusado; motivo cita "cheio" | Unitário | `tests/test_rvm.py::test_decide_recusa_compartimento_cheio` |
| CT-21 | RF-04 / HU-03 | Imagem acima de 5 MB na máquina | Inserir arquivo grande na sessão | 5 MB + 1 KB | 413 | Integração | `tests/test_api.py::test_insert_acima_de_5mb_da_413` |
| CT-22 | RF-04 / HU-03 | Máquina sem modelo | Inserir foto com o servidor sem modelo | `_model = None` | 503; mensagem cita `treino.py` | Integração | `tests/test_api.py::test_insert_sem_modelo_da_503` |

### Sessão e voucher

| ID | Requisito / HU | Cenário | Passos | Dados de entrada | Resultado esperado | Tipo | Como é verificado |
|---|---|---|---|---|---|---|---|
| CT-23 | RF-11 / HU-07 | Voucher só com saldo maior que zero | Sessão só com papel: finalizar; sessão com metal: finalizar | `paper` 95% (recusado); `metal` 90% | Sem saldo: sem voucher e valor 0; com saldo: código `RVM-...` de R$ 0,15 | Unitário | `tests/test_rvm.py::test_finish_gera_voucher_so_com_saldo` |
| CT-24 | RF-13, RNF-08 / HU-08 | Voucher resgatado duas vezes | Gerar voucher de vidro, resgatar, resgatar de novo | Código gerado na sessão | 1º resgate: ok, R$ 0,25; 2º resgate: recusado, erro "já resgatado" | Unitário | `tests/test_rvm.py::test_voucher_so_resgata_uma_vez` |
| CT-25 | RF-13 / HU-08 | Voucher inexistente | POST em `/api/vouchers/RVM-XXXX/redeem` | Código que não existe | 400; erro "Voucher não encontrado." | Manual | Manual (sem teste automático; linha 218 de `rvm.py` aparece como não coberta) |
| CT-26 | RF-11 / HU-07 | Sessão finalizada recusa inserção | Abrir sessão, finalizar, tentar inserir | `plastic` 90% | Erro `SessionError` ("Sessão já finalizada.") | Unitário | `tests/test_rvm.py::test_sessao_finalizada_recusa_insercao` |
| CT-27 | RF-11 / HU-07 | Sessão finalizada pela rota HTTP | Abrir sessão, chamar `/finish`, depois `/insert` | Imagem válida | 409; JSON com "Sessão já finalizada." | Manual | Manual (a regra é testada só em `rvm.py`; o tratador 409 do `app.py` não é coberto) |
| CT-28 | RF-11 / HU-07 | Sessão inexistente | POST em `/api/session/nao-existe/insert` | Imagem válida; id inventado | 409; JSON com "Sessão inexistente." | Manual | Manual (sem teste automático) |

### Rotas do site

| ID | Requisito / HU | Cenário | Passos | Dados de entrada | Resultado esperado | Tipo | Como é verificado |
|---|---|---|---|---|---|---|---|
| CT-29 | RF-16 / HU-13 | Página inicial servida pelo Flask | GET `/` com um build falso | `dist/index.html` com `<div id="root">` | 200; HTML do React | Integração | `tests/test_rotas.py::test_raiz_serve_o_react` |
| CT-30 | RF-01 / HU-01 | Lixeira pessoal servida pelo Flask | GET `/lixeira` | Mesmo build falso | 200; HTML do React | Integração | `tests/test_rotas.py::test_lixeira_serve_o_react` |
| CT-31 | RF-16 / HU-13 | Arquivos do build em `/assets` | GET `/assets/app.js` | `dist/assets/app.js` | 200; conteúdo do arquivo | Integração | `tests/test_rotas.py::test_assets_do_react_sao_servidos` |
| CT-32 | RNF-05, RNF-14 / HU-13 | Fotos e arquivos públicos do build | GET `/fotos/x.jpg` e `/favicon.svg` | `dist/fotos/x.jpg`, `dist/favicon.svg` | 200; tipo `image/jpeg` na foto | Integração | `tests/test_rotas.py::test_arquivo_publico_do_dist_e_servido` |
| CT-33 | RNF-08 / HU-16 | Path traversal | GET em caminhos com `../` e `%2e%2e` | `/fotos/../../app.py`, `/fotos/%2e%2e/%2e%2e/app.py`, `/..%2fapp.py`, `/%2e%2e/app.py` | 404 (ou redirecionamento 301/308); nunca o código do `app.py` | Integração | `tests/test_rotas.py::test_path_traversal_nao_vaza_arquivos` |
| CT-34 | RNF-02 / HU-03 | Caminho desconhecido não vira o site | GET `/api/inexistente` e `/nao-existe.png` | Caminhos que não existem | 404; `/api/status` continua 200; `/predict` não dá 404 | Integração | `tests/test_rotas.py::test_desconhecidos_e_api_nao_viram_spa` |
| CT-35 | RNF-02, RNF-10 / HU-16 | Build do front ausente | GET `/` sem a pasta `dist` | `FRONTEND_DIST` apontando para pasta inexistente | 503; texto pede `npm run build` | Integração | `tests/test_rotas.py::test_sem_build_devolve_503_com_instrucao` |
| CT-36 | RF-14 / HU-07, HU-09 | Telas antigas da máquina e do painel | GET `/maquina` e `/admin` | Nenhum | 200; o painel tem link para `/maquina` | Integração | `tests/test_rotas.py::test_maquina_continua_funcionando` e `tests/test_rotas.py::test_admin_continua_funcionando` |
| CT-37 | RF-01, RF-16 / HU-01, HU-13 | Rotas do React no navegador | Renderizar o `App` em `/` e em `/lixeira` | Rota inicial do roteador | Cada rota mostra a sua página | Integração | `frontend/src/App.test.jsx` › "renderiza a página inicial" e "renderiza a lixeira pessoal em /lixeira" |
| CT-38 | RF-01 / HU-01 | Topo leva à lixeira e às seções | Renderizar o `Topo` | Nenhum | Link para `/lixeira` e âncoras da página inicial | Integração | `frontend/src/componentes/Topo.test.jsx` › "Topo tem link para a lixeira pessoal" e "tem as âncoras da página inicial" |

### Acessibilidade e conteúdo

| ID | Requisito / HU | Cenário | Passos | Dados de entrada | Resultado esperado | Tipo | Como é verificado |
|---|---|---|---|---|---|---|---|
| CT-39 | RNF-05 / HU-13 | Link para pular ao conteúdo | Renderizar o `Topo` | Nenhum | Link "Pular para o conteúdo" com `href="#conteudo"` | Integração | `frontend/src/componentes/Topo.test.jsx` › "tem o link para pular ao conteúdo" |
| CT-40 | RNF-05 / HU-13 | Esc fecha o menu | Abrir o menu, apertar Esc | Tecla `Escape` | Menu fecha e o foco volta ao botão | Integração | `frontend/src/componentes/Topo.test.jsx` › "Esc fecha o menu e devolve o foco ao botão" |
| CT-41 | RNF-05 / HU-13 | Estado do menu anunciado | Clicar no botão do menu; clicar num link | Nenhum | `aria-expanded` muda; clicar num link fecha o menu | Integração | `frontend/src/componentes/Topo.test.jsx` › "o botão do menu informa se está aberto" e "clicar em um link do menu o fecha" |
| CT-42 | RNF-04 / HU-13 | `prefers-reduced-motion` sem animação | Simular a preferência do sistema e montar os componentes | `matchMedia('(prefers-reduced-motion: reduce)')` verdadeiro | Hook devolve verdadeiro; Lenis não inicia; Vanta não é criado | Unitário | `frontend/src/hooks/useMenosAnimacao.test.jsx` › "useMenosAnimacao respeita a preferência do sistema"; `frontend/src/hooks/useRolagemSuave.test.jsx` › "rolagem suave não inicia com menos animação"; `frontend/src/componentes/FundoVanta.test.jsx` › "Vanta não é criado com menos animação" |
| CT-43 | RNF-04, RNF-06 / HU-13 | Sem preferência, a animação liga e é limpa | Montar e desmontar os componentes | `matchMedia` falso | Lenis e Vanta iniciam e são destruídos ao sair; Vanta não sobe em tela pequena | Unitário | `frontend/src/hooks/useRolagemSuave.test.jsx` › "inicia o Lenis e o destrói ao sair"; `frontend/src/componentes/FundoVanta.test.jsx` › "cria o efeito e destrói ao desmontar" e "Vanta não é criado em tela pequena" |
| CT-44 | RNF-04, RNF-05 / HU-13 | Acessibilidade no navegador real | Ligar "reduzir movimento" no sistema (ou emular no DevTools); navegar só pelo teclado | Navegador Chrome ou Firefox | Página sem rolagem suave nem fundo animado; Tab mostra o link de pular primeiro; Esc fecha o menu | Manual | Manual |
| CT-45 | RNF-05, RNF-14 / HU-13 | Fotos com texto alternativo e crédito | Ler a lista de fotos | `frontend/src/dados/creditos` | De 3 a 5 fotos; todas com `alt` e crédito | Unitário | `frontend/src/dados/creditos.test.js` › "há de 3 a 5 fotos" e "toda foto tem texto alternativo e crédito" |
| CT-46 | RNF-03, RF-03 / HU-01, HU-02 | Cor e lixeira por material | Ler o mapa de materiais | `frontend/src/dados/materiais` | Todo material tem cor e lixeira; `biological` vira `organic`; `nao_residuo` não é material | Unitário | `frontend/src/dados/materiais.test.js` › "todo material tem cor e lixeira", "biological é apelido de organic" e "não residuo não é material e não tem lixeira" |
| CT-47 | RF-18 / HU-11, HU-13 | Números com fonte | Renderizar a seção de contraste | Nenhum | Cada número mostra a fonte | Integração | `frontend/src/secoes/Contraste.test.jsx` › "os números do contraste mostram a fonte" |

## Resumo

| Tipo | Quantidade |
|---|---|
| Unitário | 12 |
| Integração | 28 |
| Manual | 7 |
| **Total** | **47** |

Casos manuais: CT-05 (HEIC), CT-10 (selfie com o modelo real), CT-19 (papelão), CT-25 (voucher
inexistente), CT-27 (sessão finalizada pela rota, 409), CT-28 (sessão inexistente, 409) e CT-44
(acessibilidade no navegador real). Os cinco primeiros que não dependem do navegador são bons
candidatos a virar teste automático.

## Cobertura

Medida em 12/11/2026 na branch `develop`, com:

```bash
venv/Scripts/python -m pytest --cov=rvm --cov=app --cov-report=term
```

| Arquivo | Linhas | Não cobertas | Cobertura |
|---|---|---|---|
| `app.py` | 140 | 27 | 81% |
| `rvm.py` | 114 | 20 | 82% |
| **Total** | **254** | **47** | **81%** |

Resultado: 43 testes passaram.

O que fica sem cobertura (`--cov-report=term-missing`):

- `app.py`: carga do modelo treinado (linhas 64–79), tratador do erro 409 de sessão (139), rota
  `/finish` (263–267), rotas do painel e do esvaziamento (274, 279–281), resgate de voucher pela
  rota (286–287) e o bloco de inicialização do servidor (291–296).
- `rvm.py`: sessão inexistente (152), voucher não encontrado (218), esvaziamento, nível dos
  compartimentos e estatísticas (226–270).

**Front-end.** A cobertura do Vitest ainda não é medida: o pacote `@vitest/coverage-v8` não está
instalado em `frontend/`. Os 21 testes do Vitest rodam no job `frontend` do CI.

## Divergências entre requisitos e testes

1. **HU-03, limite de 5 MB no navegador.** A história pede a mensagem "A foto passa de 5 MB. Envie
   uma menor" sem chamar o servidor. Hoje só o servidor recusa (413). A tela da lixeira ainda não
   faz essa checagem; o caso entra com a issue #43 (Parte 8 do plano, `validarArquivo`).
2. **HU-08, texto do voucher já usado.** Resolvida em 12/11/2026: a história passou a citar o
   texto do código e do teste, "Voucher já resgatado em <data>.", e "Voucher não encontrado." para
   o código inexistente.
3. **HU-08, voucher inexistente.** Está no critério de aceitação, mas não tem teste automático
   (CT-25).
4. **Sessão e erro 409 (RF-11).** Nenhum requisito cita o código 409. Sessão finalizada é testada
   só na regra (`rvm.py`); sessão inexistente não é testada; a resposta 409 da API não é testada
   (CT-27, CT-28).
5. **RF-09, papelão.** A recusa de papelão existe no código, mas só o papel tem teste (CT-19).
6. **RF-10 e HU-09, compartimento cheio.** Testado só em `rvm.decide`. Não há teste que encha o
   compartimento e depois insira pela rota da máquina.
7. **RF-14 e RF-15 (painel e esvaziamento).** As rotas existem, mas não têm teste automático;
   aparecem como não cobertas no relatório.
8. **RNF-04, montagem sem animação.** Os testes cobrem Lenis e Vanta desligados. A troca da
   montagem por SVG com a lista das 9 peças ainda não foi feita (#41, #42).
9. **CT-33, path traversal.** O teste aceita 301 ou 308 além de 404, porque o Flask normaliza
   alguns caminhos com redirecionamento. O que importa é não devolver o código do servidor.
   Nenhum requisito trata de path traversal de forma explícita; o caso foi ligado a RNF-08
   (segurança) por ser o mais próximo.
10. **HU-07, motivo da recusa por confiança baixa.** Resolvida em 12/11/2026: a história citava
    "reposicione e tente de novo" ou "Item não reconhecido"; agora cita "Não reconheci uma
    embalagem nesta foto.", o texto que `rvm.decide` e a API devolvem (o mesmo do RF-03). O texto "Item não reconhecido como embalagem." ainda existe em
    `rvm.REJECT_REASONS`, mas não é alcançado, porque `nao_residuo` é tratado antes.
