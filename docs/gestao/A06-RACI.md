# A06 · Matriz RACI e vias de comunicação

> Issue #7 · Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson,
> 2018. Seção 22.3, p. 621 (grupo de 4 a 6 pessoas) e p. 627 (vias de comunicação = n × (n − 1)).

Projeto individual: o autor executa tudo; o professor é o cliente e aprova as entregas formais; a
turma testa a subpágina e dá retorno.

## Legenda

| Letra | Significado |
|---|---|
| **R** | Responsável: executa o trabalho |
| **A** | Aprovador: responde pela entrega e dá o aceite final (**um por linha**) |
| **C** | Consultado: opina antes ou durante o trabalho |
| **I** | Informado: é avisado do resultado |
| **A/R** | Executa e também responde pela entrega (entregas técnicas internas) |

## Matriz

| Entrega | Issues | Autor do projeto | Professor (cliente e avaliador) | Usuários de teste (turma) | Qtd. de A |
|---|---|---|---|---|---|
| Plano do projeto (TAP, EAP, cronograma, RACI, riscos) | #4 #5 #6 #7 | R | A | I | 1 |
| Status semanal, burndown e indicadores | #26 #31 | A/R | I | | 1 |
| Requisitos: jornada, BPMN, histórias e MoSCoW | #8 #9 #10 #14 | R | A | C | 1 |
| Modelo de desenvolvimento e fichas do caderno | #11 #27 | R | A | | 1 |
| Arquitetura, modelo de dados e UML | #12 | R | A | | 1 |
| Protótipo de interface | #13 | R | A | C | 1 |
| Dataset e treino do modelo de IA | #15 #16 | A/R | I | | 1 |
| Fotos reais para teste do modelo | #17 | A/R | I | C | 1 |
| Servidor da lixeira pessoal | #20 | A/R | I | | 1 |
| Site de vendas (base, seções e montagem da máquina) | #38 #39 #40 #41 #42 | R | A | C | 1 |
| Subpágina Lixeira Pessoal (foto, retorno, sacola e mapa) | #43 #44 #45 | R | A | C | 1 |
| Testes automatizados e pipeline | #21 #22 #23 | A/R | I | | 1 |
| Fluxo de branches e registro de defeitos | #24 #25 | A/R | I | C | 1 |
| Heurísticas de Nielsen | #46 | R | A | C | 1 |
| Banco de dados (Neon) | #52 | A/R | I | | 1 |
| Publicação online e release v1.0 | #28 #29 | R | A | I | 1 |
| Retomada, ADRs, aceite e lições aprendidas | #30 | R | A | C | 1 |
| Slides e roteiro da apresentação | #32 | R | A | | 1 |
| Estudo para a arguição e ensaio cronometrado | #33 #34 | A/R | C | | 1 |
| Extras (depósito simulado e seções de impacto) | #47 #48 | R | A | C | 1 |

Substituídas e fora da matriz: #18, #19 e #50 (por #38 a #46) e #49 (absorvida por #45).

## Vias de comunicação

| Item | Valor |
|---|---|
| Integrantes da equipe (n) | 1 |
| Vias de comunicação n × (n − 1) | 0 |
| Leitura | Tamanho adequado: não há coordenação interna a gerenciar |

Considerando também as partes que interagem com o autor (professor e turma de teste, n = 3), as
vias formais passam a ser 3 × 2 = 6, tratadas no plano de comunicação ([A08](A08-comunicacao.md)).
O grupo de 4 a 6 pessoas recomendado por Sommerville não se aplica a um projeto individual; o risco
correspondente é a dependência de uma só pessoa (R12 em [A07](A07-riscos.md)).
