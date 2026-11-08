# A09 · Relatório de status e valor agregado (EVM)

> Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson, 2018.
> Seção 23.2.2, p. 638 (rever o progresso e anotar discrepâncias).

## Definições (em horas de trabalho)

| Sigla | Nome | Como se calcula neste projeto |
|---|---|---|
| **VP** | Valor planejado | Horas da linha de base que deveriam estar concluídas até a data (acumulado da [A04](A04-cronograma.md)) |
| **VA** | Valor agregado | Horas estimadas das issues realmente concluídas (fechadas) até a data |
| **CR** | Custo real | Horas efetivamente trabalhadas até a data |
| **IDP** | Índice de desempenho de prazo | IDP = VA / VP |
| **IDC** | Índice de desempenho de custo | IDC = VA / CR |
| Variação de prazo | | VA − VP |
| Variação de custo | | VA − CR |

Índices menores que 1,0 indicam desvio desfavorável. Gatilho do projeto: IDP abaixo de 0,9 em duas
semanas seguidas inicia os cortes de [A05](A05-estimativas.md).

## Linha de base de VP (acumulado)

| Semana | Fim | VP (h) |
|---|---|---|
| S1 | 13/11/2026 | 10 |
| S2 | 20/11/2026 | 20 |
| S3 | 27/11/2026 | 31 |
| S4 | 03/12/2026 | 41,5 |

## Registro semanal

| Semana | Data | VP (h) | VA (h) | CR (h) | IDP | IDC | Variação de prazo (h) | Variação de custo (h) | Leitura |
|---|---|---|---|---|---|---|---|---|---|
| S0 | 08/11/2026 | 0 | 0 | 0 | n/a | n/a | 0 | 0 | Linha de base fixada em 41,5 h; trabalho anterior (Parte 1 e protótipo, 07/11) fora da conta |
| S1 | 13/11/2026 | 10 | | | | | | | A preencher |
| S2 | 20/11/2026 | 20 | | | | | | | A preencher |
| S3 | 27/11/2026 | 31 | | | | | | | A preencher |
| S4 | 03/12/2026 | 41,5 | | | | | | | A preencher |

**Primeiro status (08/11/2026).** Início do período de execução. As issues #21, #22, #23 e #13
estão concluídas, mas pertencem ao trabalho anterior à linha de base. O caminho crítico começa em
12/11 com o dataset (#15). Riscos altos em observação: R1, R2, R6 e R8 ([A07](A07-riscos.md)).
