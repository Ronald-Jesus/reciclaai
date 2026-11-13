# Resultados do treino do modelo

Treino realizado em 08/11/2026 com `treino.py` (ResNet18 pré-treinada no ImageNet, ajuste fino de `layer4` e `fc`), em uma GPU NVIDIA GeForce RTX 5070.

## Dados

Dataset montado com `scripts/preparar_dataset.py` a partir de dois datasets públicos do Kaggle: Garbage Classification (12 classes), de Mostafa Abla, e Natural Images, de Prasun Roy. As imagens não são redistribuídas no repositório.

| Classe | Imagens | Origem |
|---|---|---|
| cardboard (papelão) | 891 | cardboard |
| glass (vidro) | 1000 | brown-glass, green-glass, white-glass (cotas iguais) |
| metal | 769 | metal |
| organic (orgânico) | 985 | biological |
| paper (papel) | 1000 | paper |
| plastic (plástico) | 865 | plastic |
| trash (rejeito) | 1000 | trash (697, todos) + clothes e shoes (restante) |
| nao_residuo (não é resíduo) | 1000 | airplane, car, cat, dog, motorbike, person (cotas iguais) |
| **Total** | **7510** | 20 imagens duplicadas removidas por hash |

Divisão (`split_dataset.py`, seed 42): 5262 treino, 1124 validação e 1124 teste. O teste só é usado na medição final.

## Resultado

- Melhor época: 3 de 6 (parada antecipada após 3 épocas sem melhora na validação).
- Acurácia na validação: 94,40%.
- **Acurácia no teste: 93,51%** (meta da issue #16: ≥ 85%).

| Classe | Precisão | Recall | F1 |
|---|---|---|---|
| cardboard | 96,1% | 92,5% | 94,3% |
| glass | 93,0% | 80,0% | 86,0% |
| metal | 88,3% | 92,2% | 90,2% |
| nao_residuo | 98,7% | 100,0% | 99,3% |
| organic | 99,3% | 98,6% | 99,0% |
| paper | 92,9% | 96,0% | 94,4% |
| plastic | 83,0% | 90,7% | 86,7% |
| trash | 95,4% | 97,3% | 96,4% |

![Matriz de confusão](confusion_matrix.png)

## Leitura

- A classe **não é resíduo** acertou as 150 imagens de teste: fotos de pessoas, animais e veículos não são confundidas com materiais.
- A principal confusão é **vidro lido como plástico** (19 de 150 garrafas de vidro), seguida de papelão lido como papel (7 de 133). Garrafas transparentes de vidro e de PET são visualmente parecidas; na máquina projetada, a balança e o leitor de código de barras complementam a câmera nessa decisão, e no app a confiança abaixo de 70% pede uma nova foto.
- Próximo passo de validação: fotos reais tiradas para o projeto (issue #17), fora dos datasets do Kaggle.

Arquivos: [`metricas.json`](metricas.json) e [`confusion_matrix.png`](confusion_matrix.png).

## Como reproduzir

1. Baixe as fontes em `C:\Users\<voce>\datasets\`. As obrigatórias são `garbage12` e `natural`. As fontes extras de `nao_residuo` são opcionais e só entram se a pasta existir: `house-rooms-image-dataset` (Kaggle robinreni, cômodos da casa), `food11-image-dataset` (Kaggle trolukovich, só ovo e hortifrúti) e `openimages_nao_residuo` (Open Images, créditos em `CREDITOS.json`).
2. Monte o dataset bruto. A classe `nao_residuo` fica com no máximo 1,5x a média das outras classes. As fontes extras entram primeiro; o Natural Images completa o resto. Cópias exatas (SHA-1) e quase iguais entre fontes (dHash) saem.
   ```bash
   python scripts/preparar_dataset.py --garbage12 "C:\Users\<voce>\datasets\garbage12" --natural "C:\Users\<voce>\datasets\natural" --dest dataset_raw
   python split_dataset.py --source dataset_raw --dest dataset --val-size 0.15 --test-size 0.15
   python treino.py --dataset dataset --epochs 15
   ```
3. O treino usa aumento de dados forte, *label smoothing* de 0,1 e calibração por temperatura na validação. A temperatura vai para o checkpoint e o `metricas.json`, com a ECE antes e depois. O app e o teste externo dividem os logits por ela antes do softmax. A temperatura nunca fica abaixo de 1,0: a calibração só baixa a confiança. Sem pasta `val/`, não há calibração (T = 1,0 e `"temperatura_calibrada": false`).

**Fotos próprias nunca entram no treino.** A pasta `C:\Users\<voce>\datasets\fotos-proprias\<classe>\` é o teste do mundo real. Ela só é usada por `python scripts/teste_externo.py --externo ... --fotos-proprias C:\Users\<voce>\datasets\fotos-proprias`.
