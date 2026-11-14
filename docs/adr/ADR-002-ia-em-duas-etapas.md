# ADR-002 · IA em duas etapas: filtro CLIP antes do classificador

- **Status:** aceita
- **Data:** 2026-11-13

## Contexto

O classificador do ReciclaAI é uma ResNet18 com *transfer learning* e 8 classes, sendo uma delas `nao_residuo` (pessoas, animais, ambientes). A versão em produção (v1, `model/reciclaai.pth`) acerta embalagens reais (garrafa PET, lata, vidro, caixa), mas chama uma selfie de "papel" com 97% de confiança. A classe `nao_residuo` só conhece as fotos do treino; qualquer coisa fora delas acaba em algum material, e com confiança alta.

Foram treinadas duas versões com mais fotos de "não resíduo" (cômodos, comida, Open Images). Os números no teste do mundo real foram:

| Versão | Fotos do autor (16) | Externo inédito (Kaggle, deduplicado) | Observação |
|---|---|---|---|
| v1 | 8/16 | 46% | selfie vira "papel" com 97% |
| v2 | 6/16 | 56% | começa a recusar garrafas |
| v3 | 5/16 | 64% | 16/16 caem em "não reconhecido", inclusive as embalagens |

A acurácia no externo subiu, mas o comportamento nas fotos reais piorou. O modelo aprendeu um atalho: "foto real" ou "fundo de cozinha" passou a significar "não resíduo". Isso recusa justamente as embalagens que a máquina deveria aceitar.

## Decisão

A classificação passa a ter duas etapas:

1. **Filtro "é resíduo?"** com CLIP zero-shot (OpenCLIP ViT-B-32, pesos `laion2b_s34b_b79k`). A foto é comparada com 12 frases de resíduo ("a photo of a plastic bottle", "a photo of food scraps"...) e 10 de não resíduo ("a selfie of a person", "a photo of a room interior"...). A soma das probabilidades das frases de resíduo é o `p_residuo`. Abaixo de 0,5 a resposta é "não reconhecido" e a máquina recusa.
2. **Material** com o classificador v1, que continua o mesmo arquivo. Como o filtro já disse que é resíduo, a classe `nao_residuo` sai e as probabilidades são renormalizadas entre os materiais. A regra dos 70% (`rvm.nao_reconhecido`) continua valendo para confiança baixa.

A regra fica em uma função só (`filtro.combinar`), usada pelo `app.py` e pelo `scripts/teste_externo.py --filtro`. Se o `open_clip` ou os pesos não estiverem disponíveis, o servidor sobe sem o filtro, avisa no console e funciona como antes.

No experimento de 13/11/2026, o `p_residuo` foi 0,000 nas 4 selfies do autor e ficou entre 0,98 e 1,0 nas outras 12 fotos. Na validação, com limiar 0,5, passaram de 96% a 100% das fotos de vidro, metal, plástico, papelão e orgânico, 85% de papel, 88% de rejeito e 26% de `nao_residuo` (a maioria ovo e fruta do Food-11, que por desenho são resíduo orgânico).

## Alternativas consideradas

1. **Retreinar com mais dados de "não resíduo".** Foi tentado duas vezes (v2 e v3). Cada rodada ensinou um atalho novo em vez do conceito. Descartada.
2. **Tirar mais fotos próprias e treinar com elas.** Ajudaria no domínio do autor, mas exige centenas de fotos por classe e acaba com o único teste do mundo real que o projeto tem, já que as fotos próprias nunca entram no treino. Descartada.
3. **Filtro CLIP zero-shot antes do classificador (escolhida).** O CLIP foi treinado com centenas de milhões de pares imagem-texto e já separa "pessoa" de "garrafa" sem treino extra. O classificador v1, que é bom em material, fica responsável só por isso.

## Consequências

- Nova dependência: `open_clip_torch` (versão fixada no `requirements.txt`).
- Os pesos do CLIP têm cerca de 600 MB e são baixados na primeira execução (cache do Hugging Face). O deploy precisa de espaço e de rede para isso, ou de um cache pronto na imagem.
- Cada foto leva cerca de 0,3 s a mais na CPU.
- A resposta do `/predict` e do `/api/session/<id>/insert` ganha o campo `filtro` (`{"p_residuo", "aprovado"}`, ou `null` sem filtro), e o `/api/status` ganha `filtro_ready`. Os campos que o front usa não mudam.
- As frases e o limiar são parte do modelo: mudar qualquer um exige medir de novo com `scripts/teste_externo.py --filtro`.

## Referências

- RADFORD, A. et al. *Learning Transferable Visual Models From Natural Language Supervision*. ICML, 2021. arXiv:2103.00020.
- ILHARCO, G. et al. *OpenCLIP*. Zenodo, 2021. <https://github.com/mlfoundations/open_clip>
- SCHUHMANN, C. et al. *LAION-5B: An open large-scale dataset for training next generation image-text models*. NeurIPS, 2022 (pesos `laion2b_s34b_b79k`).
