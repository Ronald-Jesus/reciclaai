#!/usr/bin/env bash
# Cria no GitHub: rótulos, marcos (iterações com data), 33 issues e o quadro
# Kanban (GitHub Projects) do Projeto Integrador ReciclaAI.
#
# Pré-requisitos (uma vez só):
#   winget install GitHub.cli          # instala o gh
#   gh auth login                      # login na sua conta
#   gh auth refresh -s project         # permissão para criar o quadro
#
# Uso (no Git Bash, dentro da pasta do repositório já publicado no GitHub):
#   bash scripts/github_setup.sh
#
# Rode UMA vez: o script para se o repositório já tiver issues.

set -euo pipefail

REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
echo "Repositório: $REPO"

if [ "$(gh issue list --repo "$REPO" --state all --limit 1 --json number --jq length)" != "0" ]; then
  echo "O repositório já tem issues. Abortando para não duplicar." >&2
  exit 1
fi

# ------------------------------------------------------------------ rótulos
label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }

label "gestão"        "5319e7" "Artefatos de gerenciamento (TAP, EAP, RACI, riscos...)"
label "requisitos"    "0e8a16" "Processo, histórias de usuário, backlog"
label "projeto"       "1d76db" "Arquitetura, UML, modelo de dados, protótipo"
label "ia"            "fbca04" "Dataset, treino e avaliação do modelo"
label "backend"       "0052cc" "Flask, API, regras da RVM"
label "frontend"      "e99695" "Site promocional e subpágina da IA"
label "qualidade"     "c2e0c6" "Testes, cobertura, pipeline"
label "devops"        "bfdadc" "Ambiente, deploy, release"
label "documentação"  "d4c5f9" "README, ADRs, fichas, handover"
label "defesa"        "b60205" "Apresentação e arguição"
label "bug"           "d73a4a" "Defeito encontrado"
for c in 1 2 3 4 5 6 7 8; do
  label "critério-$c" "ededed" "Critério $c da rubrica de avaliação"
done

# ------------------------------------------------------------------- marcos
# Datas no horário de Brasília (23:59 BRT = 02:59 UTC do dia seguinte).
milestone() {
  gh api "repos/$REPO/milestones" -f title="$1" -f due_on="$2" -f description="$3" >/dev/null
}
milestone "I1 · Jornada e planejamento" "2026-11-14T02:59:00Z" "09/11 a 13/11 · critérios 1, 2, 3 e 6"
milestone "I2 · Construção e qualidade" "2026-11-28T02:59:00Z" "16/11 a 27/11 · critérios 4, 5 e 6"
milestone "I3 · Entrega e sustentação"  "2026-12-03T02:59:00Z" "30/11 a 02/12 · critérios 6 e 7"
milestone "Defesa final"                "2026-12-04T02:59:00Z" "03/12 · todos os critérios, ênfase no 8"

# ------------------------------------------------------------------- quadro
OWNER=${REPO%%/*}
PROJECT=$(gh project create --owner "$OWNER" --title "ReciclaAI · Projeto Integrador" --format json --jq .number)
gh project link "$PROJECT" --owner "$OWNER" --repo "$REPO" >/dev/null
echo "Quadro criado: projeto #$PROJECT"

# ------------------------------------------------------------------- issues
# issue "<título>" "<marco>" "<rótulos>" "<corpo>"
issue() {
  local url
  url=$(gh issue create --repo "$REPO" --title "$1" --milestone "$2" --label "$3" --assignee "@me" --body "$4")
  gh project item-add "$PROJECT" --owner "$OWNER" --url "$url" >/dev/null
  echo "  $url"
}

I1="I1 · Jornada e planejamento"
I2="I2 · Construção e qualidade"
I3="I3 · Entrega e sustentação"
DF="Defesa final"

echo "Criando issues..."

issue "Criar repositório próprio e publicar o código" "$I1" "devops,critério-4" "**Objetivo:** ter o repositório único da equipe no GitHub, preservando o histórico de commits original.

**Pronto quando:**
- [ ] Repositório público na conta do aluno, com o código e o histórico
- [ ] Branch main protegida (mudanças só por pull request)
- [ ] README aponta para o objetivo do projeto (RVM)

**Estimativa:** 1 h · **Quem faz:** você, com o passo a passo do Claude"

issue "Criar quadro Kanban, rótulos, marcos e issues" "$I1" "gestão,critério-6" "**Objetivo:** quadro de gestão coerente com o repositório (este script).

**Pronto quando:**
- [ ] Quadro no GitHub Projects com colunas Todo / In progress / Done
- [ ] Todas as issues no quadro, com marco e rótulo
- [ ] Justificativa da ferramenta (GitHub Projects em vez de Trello: mesmo lugar do código) registrada no plano de gestão

**Estimativa:** 1 h · **Quem faz:** você roda o script"

issue "TAP: Termo de Abertura do Projeto" "$I1" "gestão,critério-6" "**Objetivo:** formalizar problema, objetivo, escopo, prazo (03/12/2026), equipe e critérios de sucesso.

**Pronto quando:**
- [ ] TAP preenchido no Kit de Artefatos (XLSX) e em docs/gestao/
- [ ] Problema descrito: baixo retorno de embalagens recicláveis; RVM como solução (exemplo do Pfand alemão)

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "EAP: Estrutura Analítica do Projeto" "$I1" "gestão,critério-6" "**Objetivo:** decompor o projeto em entregas (gestão, requisitos, projeto, IA, site, qualidade, entrega).

**Pronto quando:**
- [ ] EAP em diagrama em docs/gestao/
- [ ] Cada pacote de trabalho corresponde a uma ou mais issues

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Cronograma com caminho crítico" "$I1" "gestão,critério-6" "**Objetivo:** cronograma das 4 semanas com dependências e caminho crítico.

**Pronto quando:**
- [ ] Marcos do GitHub com datas (I1, I2, I3, Defesa)
- [ ] Caminho crítico identificado (dataset -> treino -> subpágina IA -> deploy -> release)
- [ ] Cronograma no Kit de Artefatos

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "RACI e plano de riscos com responsável e indicador" "$I1" "gestão,critério-6" "**Objetivo:** matriz RACI e riscos com probabilidade, impacto, responsável, indicador e plano B.

**Pronto quando:**
- [ ] RACI preenchida (aluno e Claude como apoio de desenvolvimento, professor como cliente/aprovador)
- [ ] Pelo menos 5 riscos, cada um com indicador (ex.: acurácia < 80% no teste real)

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Linha do tempo da jornada U1 a U7 (Ficha 1)" "$I1" "documentação,critério-1" "**Objetivo:** mostrar o caminho do problema ao sistema, com um artefato verificável por etapa.

**Pronto quando:**
- [ ] Ficha 1 preenchida
- [ ] Cada etapa aponta para o artefato no repositório (link)

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Processo de negócio em BPMN (atual e com a RVM)" "$I1" "requisitos,critério-2" "**Objetivo:** modelar o descarte de embalagens hoje e o processo com a RVM (inserir, classificar, aceitar/devolver, creditar, voucher, resgate).

**Pronto quando:**
- [ ] Diagrama BPMN feito no Bizagi ou similar (bpmn.io)
- [ ] Imagem e arquivo-fonte em docs/processo/

**Estimativa:** 1,5 h · **Quem faz:** Claude gera o .bpmn, você ajusta na ferramenta"

issue "Histórias de usuário com critérios de aceitação e MoSCoW" "$I1" "requisitos,critério-2" "**Objetivo:** backlog priorizado com MoSCoW.

**Pronto quando:**
- [ ] 10 a 15 histórias no formato Como / quero / para
- [ ] Critérios de aceitação em cada história
- [ ] Classificação Must / Should / Could / Won't
- [ ] Mapa de requisitos (Miro ou similar)

**Estimativa:** 1 h · **Quem faz:** Claude rascunha, você revisa"

issue "Justificar o modelo de desenvolvimento" "$I1" "requisitos,critério-2" "**Objetivo:** escolher e justificar o modelo (iterativo incremental com Kanban), citando autor e obra.

**Pronto quando:**
- [ ] Texto curto em docs/gestao/ com a escolha e a justificativa
- [ ] Referência (ex.: Sommerville, Engenharia de Software; Anderson, Kanban)

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Arquitetura, modelo de dados e diagramas UML" "$I1" "projeto,critério-3" "**Objetivo:** arquitetura justificada e modelos coerentes com os requisitos.

**Pronto quando:**
- [ ] Diagrama de arquitetura (navegador -> Flask -> modelo PyTorch + SQLite)
- [ ] ADR-001: monolito Flask em vez de front e back separados
- [ ] Modelo de dados (sessions, items, vouchers, bins)
- [ ] UML: casos de uso, sequência da inserção de embalagem, classes
- [ ] Tudo em docs/arquitetura/

**Estimativa:** 1,5 h · **Quem faz:** Claude gera em Mermaid/PlantUML, você revisa"

issue "Protótipo de interface do site e da subpágina da IA" "$I1" "projeto,critério-3" "**Objetivo:** protótipo das telas antes de implementar.

**Pronto quando:**
- [ ] Wireframes: Home, Como funciona, Impacto, Teste a IA, Sobre
- [ ] Versão celular e desktop
- [ ] Imagens em docs/prototipo/

**Estimativa:** 1 h · **Quem faz:** Claude rascunha, você monta no Figma/Canva"

issue "Matriz de rastreabilidade (Ficha 3)" "$I1" "documentação,critério-1" "**Objetivo:** ligar requisito -> história -> issue -> código -> teste.

**Pronto quando:**
- [ ] Ficha 3 preenchida
- [ ] Matriz em docs/gestao/ atualizada até a entrega

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Dataset com a classe orgânico e split adaptado" "$I2" "ia,critério-4" "**Objetivo:** dataset com orgânico, vidro, plástico, metal, papel, papelão e rejeito.

**Pronto quando:**
- [ ] Dataset do Kaggle escolhido e citado no README
- [ ] split_dataset.py mescla e renomeia as classes
- [ ] Pasta dataset/ com train e test

**Estimativa:** 2 h · **Quem faz:** Claude adapta o código, você baixa e roda"

issue "Treinar e avaliar o modelo" "$I2" "ia,critério-4" "**Objetivo:** modelo com qualidade medida.

**Pronto quando:**
- [ ] Acurácia de teste >= 85%
- [ ] Acurácia por classe e matriz de confusão salvas em docs/
- [ ] Melhor checkpoint salvo

**Estimativa:** 2 h · **Quem faz:** Claude ajusta o treino, você roda"

issue "Fotos reais para teste do modelo" "$I2" "ia,qualidade,critério-5" "**Objetivo:** medir o modelo fora do dataset.

**Pronto quando:**
- [ ] Cerca de 20 fotos por classe tiradas pelo aluno
- [ ] Acurácia nas fotos reais registrada no README
- [ ] Erros relevantes registrados como issues (rótulo bug)

**Estimativa:** 2 h · **Quem faz:** você"

issue "Site promocional da RVM" "$I2" "frontend,critério-4" "**Objetivo:** site que vende a ideia da máquina que troca embalagens por crédito.

**Pronto quando:**
- [ ] Layout base responsivo (menu, rodapé)
- [ ] Home com chamada e botão para testar a IA
- [ ] Seções Como funciona, Impacto (com fontes), Para quem, Sobre
- [ ] Segue o protótipo

**Estimativa:** 2 h · **Quem faz:** Claude implementa, você revisa"

issue "Subpágina Teste a IA" "$I2" "frontend,critério-4" "**Objetivo:** enviar ou fotografar um objeto e ver o material identificado.

**Pronto quando:**
- [ ] Upload, arrastar e câmera
- [ ] Resultado: material, confiança, lixeira, crédito simulado e dica
- [ ] Funciona no celular

**Estimativa:** 1 h · **Quem faz:** Claude implementa, você testa"

issue "API: destino do descarte, validação de upload e orgânico" "$I2" "backend,critério-4" "**Objetivo:** API completa para a subpágina.

**Pronto quando:**
- [ ] /predict devolve material, confiança, lixeira e dica
- [ ] Arquivo inválido ou > 5 MB recebe erro claro
- [ ] rvm.py trata orgânico (devolvido com orientação)

**Estimativa:** 1 h · **Quem faz:** Claude implementa, você revisa o PR"

issue "Testes automatizados com pytest e cobertura" "$I2" "qualidade,critério-5" "**Objetivo:** suíte de testes com cobertura medida.

**Pronto quando:**
- [ ] Testes de rvm.py (regras de aceitação, voucher, compartimentos)
- [ ] Testes das rotas Flask com modelo simulado
- [ ] Cobertura medida com pytest-cov (meta >= 70%)

**Estimativa:** 1 h · **Quem faz:** Claude escreve, você roda e entende"

issue "Pipeline no GitHub Actions" "$I2" "qualidade,devops,critério-5" "**Objetivo:** testes rodando automaticamente a cada push e pull request.

**Pronto quando:**
- [ ] Workflow .github/workflows/testes.yml
- [ ] Selo de status no README
- [ ] Pipeline verde na main

**Estimativa:** 0,5 h · **Quem faz:** Claude escreve, você confere"

issue "Ambiente reproduzível por terceiros" "$I2" "devops,critério-4" "**Objetivo:** qualquer pessoa consegue rodar o sistema seguindo o README.

**Pronto quando:**
- [ ] requirements.txt com versões fixas
- [ ] Teste de instalação do zero em outra pasta (ou outro computador)
- [ ] Passo a passo do README validado

**Estimativa:** 1 h · **Quem faz:** você testa a instalação"

issue "Fluxo de trabalho com branches e pull requests" "$I2" "devops,critério-4" "**Objetivo:** histórico que mostra o processo.

**Pronto quando:**
- [ ] Uma branch por issue (ex.: feat/14-dataset-organico)
- [ ] Todo merge na main via pull request que fecha a issue (Closes #N)
- [ ] Commits regulares durante as 4 semanas

**Estimativa:** 1 h ao longo do projeto · **Quem faz:** você"

issue "Registrar defeitos como issues" "$I2" "qualidade,critério-5" "**Objetivo:** defeitos rastreáveis.

**Pronto quando:**
- [ ] Todo defeito encontrado vira issue com rótulo bug, passos para reproduzir e PR de correção

**Estimativa:** 0,5 h ao longo do projeto · **Quem faz:** você"

issue "Burndown e atualização semanal do quadro e dos riscos" "$I2" "gestão,critério-6" "**Objetivo:** gestão viva, não um quadro estático.

**Pronto quando:**
- [ ] Quadro atualizado toda semana
- [ ] Burndown das issues por semana no Kit de Artefatos
- [ ] Indicadores dos riscos revisados

**Estimativa:** 1 h ao longo do projeto · **Quem faz:** você, com o Claude calculando"

issue "Fichas restantes do Caderno de Dinâmicas (2, 7 e 9)" "$I2" "documentação" "**Objetivo:** completar as fichas 1 a 10 exigidas no checklist.

**Pronto quando:**
- [ ] Fichas 2, 7 e 9 preenchidas e salvas em docs/fichas/

**Estimativa:** 0,5 h · **Quem faz:** Claude rascunha, você revisa"

issue "Publicar o site online" "$I3" "devops,critério-4" "**Objetivo:** MVP acessível por link.

**Pronto quando:**
- [ ] Site e subpágina da IA no ar (Hugging Face Spaces ou similar)
- [ ] Link no README

**Estimativa:** 1,5 h · **Quem faz:** Claude prepara, você publica"

issue "Release v1.0 no GitHub" "$I3" "devops,critério-7" "**Objetivo:** entrega rastreável.

**Pronto quando:**
- [ ] Tag v1.0.0 e release com notas (o que entrou, issues fechadas)

**Estimativa:** 0,5 h · **Quem faz:** você"

issue "Roteiro de retomada, ADRs, aceite e lições aprendidas (Fichas 4, 8 e 10)" "$I3" "documentação,critério-7" "**Objetivo:** outra pessoa consegue assumir o sistema.

**Pronto quando:**
- [ ] Roteiro de retomada (handover) em docs/
- [ ] ADRs revisados
- [ ] Termo de aceite e lições aprendidas
- [ ] Fichas 4, 8 e 10 preenchidas

**Estimativa:** 1 h · **Quem faz:** Claude rascunha, você revisa"

issue "Indicadores finais: burndown ou valor agregado" "$I3" "gestão,critério-6" "**Objetivo:** fechar a gestão com números.

**Pronto quando:**
- [ ] Burndown final ou valor agregado (planejado x realizado)
- [ ] Plano Simplificado A01 a A12 completo

**Estimativa:** 0,5 h · **Quem faz:** Claude calcula, você revisa"

issue "Slides e roteiro da apresentação (15 a 20 min)" "$DF" "defesa,critério-8" "**Objetivo:** apresentação da jornada, do problema ao sistema.

**Pronto quando:**
- [ ] Slides com jornada, decisões, demo e retrospectiva
- [ ] Roteiro com tempo por parte

**Estimativa:** 1,5 h · **Quem faz:** Claude rascunha, você ajusta"

issue "Estudo para a arguição (Fichas 5 e 6)" "$DF" "defesa,critério-8" "**Objetivo:** responder sobre qualquer parte e justificar decisões citando autor e obra.

**Pronto quando:**
- [ ] Lista de perguntas prováveis com respostas
- [ ] Fichas 5 e 6 preenchidas
- [ ] Simulação de arguição com o Claude

**Estimativa:** 3 h · **Quem faz:** você, com o Claude fazendo perguntas"

issue "Ensaio cronometrado da apresentação" "$DF" "defesa,critério-8" "**Objetivo:** apresentação dentro do tempo.

**Pronto quando:**
- [ ] Dois ensaios entre 15 e 20 minutos
- [ ] Demo testada no link publicado

**Estimativa:** 1 h · **Quem faz:** você"

echo
echo "Pronto. Abra o quadro em: https://github.com/users/$OWNER/projects/$PROJECT"
