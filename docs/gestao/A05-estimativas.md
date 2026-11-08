# A05 · Estimativas: PERT, cone da incerteza e contingência

> Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson, 2018.
> Seção 23.5, Fig. 23.9, p. 646–647 (técnicas de estimativa e cone da incerteza); 23.3, p. 640
> (contingência de 30% a 50%).

## PERT dos pacotes do caminho crítico

E = (O + 4M + P) / 6 · desvio-padrão = (P − O) / 6 · "com contingência" = E × 1,3. Valores em
horas de trabalho; M é a estimativa da linha de base ([A04](A04-cronograma.md)).

| Atividade | Otimista (h) | Mais provável (h) | Pessimista (h) | PERT (h) | Desvio-padrão (h) | Com 30% (h) | Observação |
|---|---|---|---|---|---|---|---|
| #15 Dataset | 1,5 | 2,5 | 5 | 2,8 | 0,58 | 3,6 | Pessimista alto: rótulos errados e classes novas (R3) |
| #16 Treino e avaliação | 1,5 | 2 | 4 | 2,3 | 0,42 | 3,0 | Retreino se a acurácia ficar abaixo de 80% (R2) |
| #20 Servidor | 0,5 | 1 | 2 | 1,1 | 0,25 | 1,4 | |
| #43 Foto e análise | 1 | 1,5 | 3 | 1,7 | 0,33 | 2,2 | Câmera e HTTPS variam entre aparelhos |
| #44 Retorno e sacola | 1 | 1,5 | 3 | 1,7 | 0,33 | 2,2 | |
| #45 Mapa com busca real | 1,5 | 2 | 4 | 2,3 | 0,42 | 3,0 | Overpass instável (R5); lista salva como reserva |
| #52 Banco Neon (fora do caminho) | 1,5 | 2,5 | 5 | 2,8 | 0,58 | 3,6 | Conta e limites do Neon (R7) |
| #28 Publicação | 1 | 1,5 | 4 | 1,8 | 0,50 | 2,3 | PyTorch pesado no plano gratuito (R4) |
| #29 Release v1.0 | 0,25 | 0,5 | 1,5 | 0,6 | 0,21 | 0,8 | |

Os valores otimista e pessimista são julgamento do autor, sem série histórica.

**Caminho crítico (sem o #52):** soma das estimativas mais prováveis = 12,5 h; soma PERT = **14,3 h**;
desvio-padrão do caminho = √(soma das variâncias) ≈ **1,1 h**. Cobrir dois desvios (cerca de 95%
de confiança) pede 14,3 + 2,2 = **16,5 h**, ou seja, **4 h acima das 12,5 h** da linha de base.

## Contingência do projeto

Sommerville (p. 640) recomenda somar 30% a 50% de contingência às estimativas. Com cerca de 40 h
disponíveis e 41,5 h estimadas, o projeto **não tem folga em horas**. A contingência é, por isso,
**de escopo**, e o valor declarado é **4 h, 32% das 12,5 h do caminho crítico**, dentro da faixa
recomendada e igual aos 2 desvios-padrão do PERT acima.

| Ordem de corte | O que se corta | Horas liberadas |
|---|---|---|
| 0 | Extras #47 e #48 (nunca entram na linha de base) | não contadas |
| 1 | Busca real no #45 (HU-12, Should), voltando à lista salva de mercados de Brasília | 0,5 |
| 2 | #26: manter só a atualização do quadro e dos riscos | 0,5 |
| 3 | #27: preencher só as fichas obrigatórias | 0,5 |
| 4 | #31: indicadores finais só com o burndown | 0,5 |
| 5 | #46: documentar com prints as heurísticas essenciais e completar depois | 0,5 |
| 6 | #40: seção do problema com menos fotos | 0,5 |
| 7 | #41: só a ilustração SVG, sem os quadros do vídeo (R6) | 0,5 |
| 8 | #34: ensaio uma única vez | 0,5 |
| | **Reserva total** | **4,0** |

Com todos os cortes, a linha de base cai de 41,5 h para 37,5 h, o que deixa 2,5 h de capacidade
livre dentro das 40 h. O gatilho para começar a cortar está em [A07](A07-riscos.md) (R1): índice
de desempenho de prazo (IDP) abaixo de 0,9 em duas semanas seguidas ([A09](A09-status-EVM.md)).
Qualquer corte passa pelo registro de mudanças ([A10](A10-mudancas.md)).

**Contingência de calendário (M07).** Com o cronograma antecipado, o trabalho termina em 27/11 e
há ainda 28/11 a 02/12 antes da defesa: um fim de semana livre (28 e 29/11) e três dias úteis em
que só #32, #33 e #34 (5 h) estão planejados. Esse colchão soma-se à reserva de 4 h por corte de
escopo: um atraso de até cerca de dois dias úteis no I3 pode escorregar para essa janela sem
mover a defesa, ao custo de comprimir o preparo (#32 a #34). Assim, a contingência passa a ser de
escopo **e** de calendário ([A04](A04-cronograma.md), [A10](A10-mudancas.md), M07).

## Cone da incerteza

Estimativa pontual: **41,5 h**. Fase atual: **Projeto** (requisitos, arquitetura e documentação do I1
prontos em 08/11; construção começa em 09/11). Multiplicadores adaptados da Fig. 23.9; extremos 4× e 0,25×, os intermediários
são ilustrativos.

| Fase | Multiplicador inferior | Multiplicador superior | Faixa mínima (h) | Faixa máxima (h) |
|---|---|---|---|---|
| Viabilidade | 0,25 | 4 | 10,4 | 166,0 |
| Requisitos | 0,5 | 2 | 20,8 | 83,0 |
| **Projeto (atual)** | 0,67 | 1,5 | 27,8 | 62,3 |
| Código | 0,8 | 1,25 | 33,2 | 51,9 |
| Entrega | 1 | 1 | 41,5 | 41,5 |

Leitura: na fase atual, o esforço real pode ficar entre 27,8 h e 62,3 h. As 40 h disponíveis estão
dentro da faixa, mas a parte alta dela não cabe, o que reforça a necessidade da reserva de escopo.
A faixa será recalculada ao entrar na fase de código (início do I2) e na entrega.
