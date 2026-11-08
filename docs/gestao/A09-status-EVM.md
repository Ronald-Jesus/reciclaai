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

Linha de base **revisada em 08/11/2026 pela mudança M07** ([A10](A10-mudancas.md)): as 41,5 h
continuam, mas o trabalho termina em 27/11. O VP de S0 conta o que já estava concluído (8,0 h).

| Semana | Fim | VP (h), linha de base revisada | VP (h), linha de base anterior |
|---|---|---|---|
| S0 | 08/11/2026 | 8,0 | 0 |
| S1 | 13/11/2026 | 17,0 | 10 |
| S2 | 20/11/2026 | 29,0 | 20 |
| S3 | 27/11/2026 | 36,5 | 31 |
| S4 | 03/12/2026 | 41,5 | 41,5 |

## Registro semanal

| Semana | Data | VP (h) | VA (h) | CR (h) | IDP | IDC | Variação de prazo (h) | Variação de custo (h) | Leitura |
|---|---|---|---|---|---|---|---|---|---|
| S0 | 08/11/2026 | 8,0 | 8,0 | n/d | 1,00 | n/d | 0 | n/d | Linha de base revisada (M07). Concluídos: #4 a #7, #9 a #12 e #38 (8,0 h). Trabalho anterior (Parte 1 e protótipo, 07/11) fora da conta |
| S1 | 13/11/2026 | 17,0 | | | | | | | A preencher |
| S2 | 20/11/2026 | 29,0 | | | | | | | A preencher |
| S3 | 27/11/2026 | 36,5 | | | | | | | A preencher |
| S4 | 03/12/2026 | 41,5 | | | | | | | A preencher |

**Primeiro status (08/11/2026).** Início do período de execução. As issues #21, #22, #23 e #13
estão concluídas, mas pertencem ao trabalho anterior à linha de base. O caminho crítico começa em
12/11 com o dataset (#15). Riscos altos em observação: R1, R2, R6 e R8 ([A07](A07-riscos.md)).

**Status de 08/11/2026 (após a M07).** Concluídos em 07/11: #2, #3, #13, #21, #22 e #23 (fora da
linha de base). Concluídos em 08/11: documentação do I1 e Parte 2, ou seja, #4, #5, #6, #7, #9,
#10, #11 e #12, mais o esqueleto React (#38): **VA = 8,0 h**. Contra a linha de base anterior, o
VP em 08/11 era zero (o período começava em 09/11), então o IDP não se define (divisão por
zero); em termos de avanço, 8,0 h equivalem a 80% do que se planejava para a primeira semana
(10 h). Contra a linha de base revisada, VP = 8,0 h e **IDP = 1,00**. O custo real (CR) não foi
cronometrado, por isso IDC e variação de custo ficam como n/d; a partir de S1 as horas
trabalhadas passam a ser anotadas. Pendentes do I1: #8 (linha do tempo) e #14 (matriz de
rastreabilidade), em 12 e 13/11. O caminho crítico começa em 09/11 com o dataset (#15) e termina
em 26/11 com o release (#29). Riscos altos em observação: R1, R2, R6 e R8 ([A07](A07-riscos.md)).
