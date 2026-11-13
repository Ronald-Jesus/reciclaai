# Modelo de desenvolvimento (issue #11)

## Escolha: modelo híbrido

O Projeto Integrador adota um **modelo híbrido: marcos e governança planejados, com entrega
iterativa**. Os marcos (I1, I2, I3 e a defesa) e os documentos de gestão (TAP, EAP, cronograma,
RACI, riscos) são planejados antes; a construção acontece em incrementos pequenos, puxados num
quadro **Kanban**, com releases. Isso segue a ideia de que, na prática, é sensato **misturar plano
e agilidade** ("uma mistura sensata", SOMMERVILLE, 2018, seção 23.2, p. 635-636).

## Marcos planejados

| Marco | Período | Foco |
|---|---|---|
| **I1 · Jornada e planejamento** | 08 a 13/11 | Gestão (TAP, EAP, cronograma, RACI, riscos), requisitos e MoSCoW, BPMN, arquitetura e UML |
| **I2 · Construção e qualidade** | 09 a 20/11 | Dataset e modelo de IA, servidor, site React, subpágina Lixeira Pessoal, testes no pipeline |
| **I3 · Entrega e sustentação** | 23 a 27/11 | Banco PostgreSQL (Neon), publicação no Hugging Face, release, ADRs e indicadores finais |
| **Preparo e contingência** | 28/11 a 13/12 | Slides, estudo, entrega no AVA (07/12), ensaio e folga de calendário |
| **Defesa** | 14/12 (ou antes, se o professor marcar) | Apresentação e arguição |

## Execução com Kanban

| Elemento | Prática |
|---|---|
| Quadro | GitHub Projects, com colunas A fazer, Fazendo, Em revisão e Concluído |
| Limite de WIP | No máximo **2 itens em "Fazendo" e 2 em "Em revisão"**, como na disciplina (ANDERSON, 2010) |
| Incremento | Cada incremento é pequeno e fecha uma issue, com testes passando |
| Prioridade | Backlog ordenado por MoSCoW ([histórias de usuário](../requisitos/historias-de-usuario.md)); os Must entram primeiro |
| Fluxo git | Todo o trabalho na branch `develop`; ao fim de cada issue, um pull request `develop` → `main` com `Closes #N`, revisado antes do merge |
| Integração contínua | GitHub Actions roda os testes (pytest e Vitest) a cada push; o merge na `main` dispara o deploy no Hugging Face Spaces |
| Releases | Só a v1.0 ao fim de I3; I2 termina com um incremento integrado na `main` e pronto para publicar, sem release |
| Ciclo de cada item | Teste que falha, código mínimo, teste passando, revisão e pull request |

## Por que não cascata pura

A cascata exige fechar todos os requisitos antes de codificar e só entrega no fim. O prazo é curto
(cerca de 4 semanas) e há incertezas reais, como se o modelo de IA atinge a confiança esperada e
como o site se comporta no celular. Só um incremento funcionando mostra isso cedo; a cascata
deixaria o risco para o final (SOMMERVILLE, 2018, seção 23.4, p. 644-646). Mesmo assim, o
projeto precisa de marcos e documentos planejados, que a avaliação cobra.

## Por que não Scrum puro

O Scrum prevê um time, papéis (Product Owner, Scrum Master) e eventos (planejamento, reunião
diária, revisão, retrospectiva) que não fazem sentido num projeto **individual**, com cerca de
10 h por semana e horizonte de 4 semanas (SCHWABER; SUTHERLAND, 2020). Os ganhos que importam
aqui, como backlog priorizado, incrementos pequenos e revisão a cada entrega, estão no modelo
híbrido, sem o custo das cerimônias; e o Kanban acrescenta o limite de trabalho em andamento, que
evita abrir várias frentes ao mesmo tempo (ANDERSON, 2010; SOMMERVILLE, 2018, seção 24.4, p. 678;
PRESSMAN; MAXIM, 2021).

## Riscos e como o modelo ajuda

- **Modelo de IA não treinado a tempo:** o site funciona e avisa que a IA não está pronta; o
  incremento do site não fica bloqueado.
- **Prazo curto:** os Could viram folga e o escopo é cortado por MoSCoW, não a qualidade.

## Referências

ANDERSON, David J. **Kanban:** successful evolutionary change for your technology business.
Sequim: Blue Hole Press, 2010.

PRESSMAN, Roger S.; MAXIM, Bruce R. **Engenharia de software:** uma abordagem profissional.
9. ed. Porto Alegre: AMGH, 2021.

SCHWABER, Ken; SUTHERLAND, Jeff. **The Scrum Guide**. 2020.

SOMMERVILLE, Ian. **Engenharia de software**. 10. ed. São Paulo: Pearson, 2018.
