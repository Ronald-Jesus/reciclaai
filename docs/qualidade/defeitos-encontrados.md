# Defeitos encontrados

Defeitos reais já corrigidos durante o desenvolvimento. Cada item vai virar uma issue com o label
`bug`, já fechada, apontando o commit da correção. Os casos de teste citados estão em
[casos-de-teste.md](casos-de-teste.md).

As datas e os commits vêm do `git log` da branch `develop`. Quando o defeito foi corrigido antes
de o arquivo entrar no Git, isso está dito no item.

## Resumo

| ID | Título | Commit | Data | Teste que evita a volta |
|---|---|---|---|---|
| DEF-01 | Fotos do site davam 404 no Flask | `d855048` | 09/11/2026 | Sim |
| DEF-02 | Selfie classificada como "plástico" | `a7686bb`, `b24ece7` | 08/11/2026 e 09/11/2026 | Sim |
| DEF-03 | Mapa do protótipo sem tiles (OSM bloqueado, CARTO pede chave) | `8377aa6` (já corrigido) | data não registrada | Não |
| DEF-04 | Overpass instável deixava o mapa sem mercados | `8377aa6` (já corrigido) | data não registrada | Não |
| DEF-05 | Scripts `.sh` com CRLF quebravam no bash | `3d01ec5` | 06/11/2026 | Não |

## DEF-01 · Fotos do site davam 404 no Flask

- **Como foi percebido.** Ao abrir o site servido pelo Flask, as fotos da seção do problema não
  apareciam. O navegador mostrava 404 para os arquivos em `/fotos/...`.
- **Causa.** O `app.py` servia apenas a pasta `/assets` do build. Arquivos públicos copiados pelo
  Vite para a raiz do `dist` (fotos, `favicon.svg`) não tinham rota.
- **Correção.** Nova rota que serve qualquer arquivo existente dentro do `dist` com
  `send_from_directory`, sem permitir acesso fora da pasta. Caminhos desconhecidos, inclusive em
  `/api`, continuam em 404 e não viram a página do React.
- **Commit e data.** `d855048`, 09/11/2026 ("fix: servir os arquivos públicos do build (fotos)
  pelo Flask").
- **Teste que evita a volta.** `tests/test_rotas.py::test_arquivo_publico_do_dist_e_servido`,
  `tests/test_rotas.py::test_path_traversal_nao_vaza_arquivos` e
  `tests/test_rotas.py::test_desconhecidos_e_api_nao_viram_spa` (CT-32, CT-33, CT-34).

## DEF-02 · Selfie classificada como "plástico"

- **Como foi percebido.** Uma foto de rosto enviada ao modelo de 6 classes saía como plástico com
  confiança alta (o exemplo registrado na visão do produto é "plástico 94%").
- **Causa.** O modelo sempre escolhe uma das classes que conhece. Sem uma classe para "não é
  resíduo", qualquer foto vira algum material. A confiança alta fazia a resposta errada parecer
  certa.
- **Correção.** Criação da classe `nao_residuo` (pessoas, animais e veículos, conforme `docs/modelo/resultados.md`) no
  dataset e no treino, que passou a ter 8 classes com orgânico. No servidor, quando a classe mais
  provável é `nao_residuo` ou a confiança fica abaixo de 70%, a resposta traz
  `nao_reconhecido: true`, sem material, valor nem lixeira, e a máquina recusa o item.
- **Commit e data.** O problema e a decisão foram registrados em `79f4255`, 07/11/2026 ("docs:
  classe não é resíduo na IA"). Dataset e treino com 8 classes em `a7686bb`, 08/11/2026. Servidor
  com `nao_reconhecido` em `b24ece7`, 09/11/2026. Mudança registrada como M03 em
  [A10](../gestao/A10-mudancas.md).
- **Teste que evita a volta.** `tests/test_api.py::test_nao_residuo_nao_vira_material`,
  `tests/test_api.py::test_insert_nao_residuo_nao_credita`,
  `tests/test_api.py::test_confianca_baixa_vira_nao_reconhecido`,
  `tests/test_dataset.py::test_mapeamento` (confere as imagens de `nao_residuo` no dataset) e
  `frontend/src/dados/materiais.test.js` › "não residuo não é material e não tem lixeira"
  (CT-09, CT-11, CT-17, CT-46). A checagem com uma selfie real no modelo treinado é manual (CT-10).

## DEF-03 · Mapa do protótipo quebrado

- **Como foi percebido.** O mapa do protótipo do app abria sem o fundo: os tiles não carregavam.
- **Causa.** Os tiles do servidor padrão do OpenStreetMap foram bloqueados para o uso feito pelo
  protótipo, e a alternativa testada, o CARTO, passou a exigir chave de acesso.
- **Correção.** Troca para o estilo vetorial do OpenFreeMap (`positron`), desenhado com MapLibre
  GL, com o crédito "© OpenFreeMap © colaboradores do OpenStreetMap".
- **Commit e data.** O protótipo entrou no Git já corrigido, em `8377aa6`, 07/11/2026 ("docs:
  protótipo de interface do site e do app (issue #13)"). A data do defeito não foi registrada.
- **Teste que evita a volta.** Nenhum automático. O mapa do site ainda será feito na issue #45.

## DEF-04 · Overpass instável deixava o mapa sem mercados

- **Como foi percebido.** Mesmo com a requisição correta, o Overpass às vezes demorava ou falhava,
  e a lista de mercados próximos vinha vazia.
- **Causa.** O Overpass é um serviço gratuito, sem garantia de disponibilidade (risco R5 em
  [A07](../gestao/A07-riscos.md)).
- **Correção.** Busca em cascata: Overpass com raio de 3 km e depois 6 km; se falhar, o Photon
  (komoot) com os mesmos raios; se tudo falhar, a lista salva de supermercados de Brasília.
- **Commit e data.** O protótipo entrou no Git já com essa cascata, em `8377aa6`, 07/11/2026. A
  data do defeito não foi registrada.
- **Teste que evita a volta.** Nenhum automático. O critério da HU-12 ("se a busca falhar, o mapa
  usa a lista salva, sem erro na tela") deve ganhar teste na issue #45.

## DEF-05 · Scripts `.sh` com CRLF quebravam no bash

- **Como foi percebido.** O script de gestão do GitHub falhava ao rodar no Git Bash, com erros
  causados pelo caractere `\r` no fim das linhas.
- **Causa.** No Windows, o Git convertia as quebras de linha dos arquivos `.sh` para CRLF no
  checkout, e o bash não aceita CRLF.
- **Correção.** Arquivo `.gitattributes` com a regra `*.sh text eol=lf`, que força LF nos scripts
  em qualquer sistema.
- **Commit e data.** `3d01ec5`, 06/11/2026 ("fix: forçar LF nos scripts .sh para rodarem no Git
  Bash").
- **Teste que evita a volta.** Nenhum automático. A regra fica no `.gitattributes`.
