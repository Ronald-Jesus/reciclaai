# A01 · Termo de Abertura do Projeto (TAP)

> Issue #4 · Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson,
> 2018. Seção 23.2.1, p. 636 (introdução e organização do projeto). Critérios de sucesso: p. 607.
> Versão 1.2 · 08/11/2026 (cronograma antecipado pela mudança M07, [A10](A10-mudancas.md)).

| Campo | Conteúdo |
|---|---|
| Nome do projeto | **ReciclaAI** · máquina de retorno de embalagens (RVM) com IA, site de vendas e subpágina "Lixeira Pessoal" |
| Patrocinador | Professor da disciplina (cliente e avaliador) |
| Gerente do projeto | Autor do projeto (projeto individual) |
| Abordagem | **Híbrida**: marcos e plano (I1, I2, I3, Defesa) com quadro Kanban e entregas em releases, a "mistura sensata" de Sommerville 23.2, p. 635–636 |

## Justificativa

Pouca embalagem volta para a reciclagem no Brasil porque, para quem joga fora, ela não vale nada.
A lata de alumínio é a exceção: tem valor de revenda. Onde a embalagem tem depósito devolvido na
hora, como no sistema alemão de depósito (**Pfand**), o retorno é altíssimo.

| Dado | Fonte |
|---|---|
| 97,3% das latas de alumínio foram recicladas no Brasil em 2024 | Recicla Latas, divulgado por [Mercado&Consumo](https://mercadoeconsumo.com.br/14/08/2025/economia/brasil-reciclou-973-das-latinhas-de-aluminio-em-2024/) (2025) |
| Mais de 96% das embalagens com depósito (Pfand) voltam na Alemanha | [DPG Deutsche Pfandsystem](https://dpg-pfandsystem.de/en/the-one-way-deposit-system/useful-information/press-releases/twenty-years-of-the-german-one-way-deposit-system-a-success-story.html) (2026) |

A ReciclaAI aplica a ideia do Pfand: a câmera reconhece o material e a máquina paga cada
embalagem reciclável com um voucher (PET R$ 0,10, lata R$ 0,15, vidro R$ 0,25). A máquina não
será fabricada: o projeto vende a ideia com um site que explica o sistema e uma demonstração em
que a IA treinada funciona de verdade.

## Objetivo (SMART)

Até **27/11/2026**, concluir e entregar o site de vendas e a subpágina Lixeira Pessoal publicados em endereço
HTTPS público, com modelo de IA que acerte pelo menos **80%** em fotos reais de teste, testes
automatizados no pipeline, artefatos de gestão A01 a A12 e release v1.0, em cerca de **40 h**
de trabalho (linha de base de 41,5 h; ver [A05](A05-estimativas.md)).

| Letra | Como o objetivo atende |
|---|---|
| Específico | Site React servido pelo Flask; IA de 8 classes; foto, retorno, sacola e mapa |
| Mensurável | Acurácia de pelo menos 80% em fotos reais; testes verdes; release v1.0 |
| Atingível | Reaproveita Flask, `rvm.py` e a simulação existentes; extras só se sobrar tempo |
| Relevante | Entrega o MVP e os artefatos que a rubrica avalia |
| Temporal | Trabalho concluído em 27/11/2026, com marcos I1 (13/11), I2 (20/11) e I3 (27/11); defesa em 03/12/2026 |

## Entregas (entregáveis)

Artefatos de gestão (A01 a A12) · requisitos e processo (jornada, BPMN, histórias com MoSCoW) ·
projeto do sistema (arquitetura, UML, protótipo) · modelo de IA treinado e avaliado · site de
vendas e subpágina Lixeira Pessoal (com mapa) · testes, pipeline e heurísticas de Nielsen · banco,
publicação online e release v1.0 · slides, roteiro e estudo para a arguição.

## Escopo

**Inclui:** site em React com problema, contraste Brasil × Alemanha, montagem animada da máquina
(9 peças) e fechamento; subpágina com foto, análise, retorno, sacola e mapa do mercado mais
próximo (incluindo a busca real, #45); IA com 8 classes e confiança mínima de 70%; servidor Flask
com `/predict`, `/maquina` e `/admin`; PostgreSQL (Neon) em produção e SQLite local; publicação
no Hugging Face Spaces, pipeline e release.

**Fora do escopo:** máquina física ou hardware; app nativo de loja; pagamento real, login ou
cadastro; formulário de contato; marca ou logotipo de fabricantes; extras #47 (depósito simulado)
e #48 (seções de impacto), só se sobrar tempo.

## Marcos

| Marco | Data | O que fecha |
|---|---|---|
| Parte 1 e protótipo | 07/11/2026 (concluído) | Ambiente reproduzível, testes no pipeline e protótipo |
| I1 · Jornada e planejamento | 08 a 13/11/2026 (marco em 13/11) | Gestão, requisitos, BPMN, arquitetura e UML |
| I2 · Construção e qualidade | 09 a 20/11/2026 (marco em 20/11) | Dataset, treino, servidor, site e subpágina |
| I3 · Entrega e sustentação | 23 a 27/11/2026 (marco "Projeto concluído" em 27/11) | Banco, publicação, release, ADRs e indicadores finais |
| Preparo da defesa e contingência | 28/11 a 02/12/2026 | Slides, estudo, ensaio e folga de calendário |
| Defesa final | 03/12/2026 | Apresentação e arguição |

## Premissas

Cerca de 10 h de trabalho por semana até 27/11 (28,5 h restantes em 08/11, cerca de 9,5 h por semana); fotos de bancos gratuitos e dados do
OpenStreetMap continuam acessíveis; planos gratuitos do Hugging Face Spaces e do Neon bastam para a
demonstração; o professor valida as entregas em cada marco.

## Restrições

- Prazo fixo: defesa em 03/12/2026; o trabalho do projeto termina em 27/11/2026 por decisão do Autor (M07).
- Equipe: projeto individual, com apoio de um assistente de IA no desenvolvimento.
- Esforço: 41,5 h estimadas para cerca de 40 h disponíveis; contingência tratada em [A05](A05-estimativas.md).
- Processo: tudo na branch `develop`, com um pull request para a `main` ao fim de cada issue.
- Custo: somente serviços gratuitos. Licenças: fotos com crédito; mapa com "© colaboradores do OpenStreetMap".
- Acessibilidade: `prefers-reduced-motion`, teclado, textos alternativos e contraste.

## Riscos iniciais

Cronograma apertado (R1), acurácia baixa em fotos reais (R2) e código difícil de explicar na
arguição (R8). Lista completa em [A07](A07-riscos.md).

## Critério de sucesso

Prazo, custo (esforço), expectativas do cliente e equipe coesa (Sommerville, p. 607), traduzidos em:

- site e subpágina em HTTPS público, funcionando no celular com a câmera liberada;
- acurácia de pelo menos 80% em fotos reais; abaixo de 70% de confiança, o item é devolvido;
- foto que não é de resíduo mostra "Não reconheci uma embalagem nesta foto", sem material, valor ou lixeira;
- testes passando no pipeline; 10 heurísticas de Nielsen documentadas; nenhum número sem fonte;
- artefatos A01 a A12, release v1.0 e material da defesa entregues até 02/12/2026, com o trabalho concluído em 27/11/2026.

## Aprovação

| Papel | Nome | Assinatura | Data |
|---|---|---|---|
| Autor do projeto (gerente) | | | ___/___/2026 |
| Professor da disciplina (patrocinador) | | | ___/___/2026 |
