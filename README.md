# ReciclaAI ♻️ — Máquina de Retorno de Embalagens (RVM)

Simulação de uma **Reverse Vending Machine (RVM)**, a "máquina que troca lixo por dinheiro" usada em sistemas de depósito e retorno como o *Pfand* alemão. O usuário insere embalagens, uma câmera identifica o material com *deep learning*, a máquina aceita ou devolve o item e, no fim, emite um **voucher** com o crédito acumulado.

O modelo (ResNet18 com *transfer learning*) reconhece 6 categorias: **papelão, vidro, metal, papel, plástico e rejeito**. A camada de regras da máquina (`rvm.py`) decide o que fazer com cada uma.

## Como a máquina funciona

```
 usuário ──► [Começar] ──► insere embalagem (câmera ou foto)
                                │
                                ▼
                    ResNet18 classifica o material
                                │
                                ▼
            rvm.decide(material, confiança, compartimento cheio?)
              │                                   │
        aceito: crédito + 1 no               devolvido: motivo
        compartimento do material            mostrado na tela
                                │
                                ▼
          [Finalizar] ──► voucher RVM-XXXXXX-XXXXXX com o saldo
                                │
                                ▼
          operador resgata o voucher em /admin (uso único)
```

| Material | Decisão | Crédito (padrão) |
|---|---|---|
| Plástico | aceito | R$ 0,10 |
| Metal (latas) | aceito | R$ 0,15 |
| Vidro | aceito | R$ 0,25 |
| Papel / Papelão | devolvido, orienta descarte no coletor azul | — |
| Rejeito | devolvido, não reciclável | — |
| Qualquer classe com confiança < 70% | devolvido, "reposicione e tente de novo" | — |
| Compartimento cheio | devolvido, "chame um operador" | — |

Os valores, a confiança mínima e a capacidade de cada compartimento ficam no topo de [`rvm.py`](rvm.py) e são ilustrativos. Ajuste-os à vontade.

### Telas

- **`/`**: a máquina. Tela inicial com a tabela de valores, sessão com câmera (ou upload/arrastar foto), saldo em tempo real, lista de itens aceitos e devolvidos e voucher final.
- **`/admin`**: painel do operador. Itens aceitos e devolvidos, taxa de aceitação, créditos emitidos, nível de cada compartimento (alerta a partir de 85%), botão "Esvaziar", últimas inserções e resgate de voucher.

### API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/session` | abre uma sessão → `{session_id}` |
| POST | `/api/session/<id>/insert` | envia `image` (multipart) → classificação + aceito/devolvido + saldo |
| POST | `/api/session/<id>/finish` | encerra → `{voucher, amount, items}` |
| GET | `/api/admin/status` | compartimentos + estatísticas |
| POST | `/api/admin/bins/<material>/empty` | zera um compartimento |
| POST | `/api/vouchers/<code>/redeem` | resgata um voucher (uso único) |
| POST | `/predict` | classificador puro (sem regras da máquina), mantido do projeto original |

Tudo é persistido em `rvm.db` (SQLite, criado automaticamente e ignorado pelo Git).

### Limitações e próximos passos

RVMs reais não dependem só da câmera. Elas combinam **código de barras** (para saber se a embalagem faz parte do sistema de depósito), **peso** e **formato** para evitar fraude, como a mesma lata inserida várias vezes ou uma garrafa com líquido. Ideias para evoluir:

- ler o código de barras (ex.: `pyzbar`) e aceitar só produtos cadastrados;
- integrar uma balança/célula de carga (Arduino/ESP32 + HX711) para rejeitar embalagens cheias;
- controlar um servo/esteira para direcionar o item ao compartimento certo (Raspberry Pi);
- autenticar o `/admin`, que hoje não tem login (é uma demo local);
- treinar com imagens de **embalagens de bebida** (garrafas PET, latas, long necks) em vez de resíduos genéricos.

## Sumário

- [Como a máquina funciona](#como-a-máquina-funciona)
- [Sobre o projeto](#sobre-o-projeto)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Passo a passo](#passo-a-passo)
  - [1. Clonar o repositório](#1-clonar-o-repositório)
  - [2. Criar o ambiente virtual](#2-criar-o-ambiente-virtual)
  - [3. Instalar as dependências](#3-instalar-as-dependências)
  - [4. Baixar e organizar o dataset](#4-baixar-e-organizar-o-dataset)
  - [5. Treinar o modelo](#5-treinar-o-modelo)
  - [6. Rodar o front-end](#6-rodar-o-front-end)
- [Solução de problemas](#solução-de-problemas)

## Sobre o projeto

O pipeline tem três etapas:

1. **`split_dataset.py`** organiza as imagens baixadas do Kaggle na estrutura de pastas que o treino espera (`train/` e `test/`).
2. **`treino.py`** treina uma ResNet18 pré-treinada (congelando as camadas convolucionais e treinando só a camada final) e salva o modelo em `model/reciclaai.pth`.
3. **`app.py`** carrega esse modelo e expõe a interface da máquina (`templates/index.html`) e o painel do operador (`templates/admin.html`). As regras de aceitação, os créditos, os compartimentos e os vouchers ficam em **`rvm.py`**.

## Estrutura do repositório

```
ReciclaAI/
├── split_dataset.py     # organiza o dataset do Kaggle em train/test
├── treino.py             # treina o modelo
├── app.py                 # backend Flask (modelo + rotas da máquina e do operador)
├── rvm.py                 # regras da RVM: aceitação, créditos, compartimentos, vouchers (SQLite)
├── templates/
│   ├── index.html         # tela da máquina (câmera/upload, saldo, voucher)
│   └── admin.html         # painel do operador
├── requirements.txt
├── .gitignore
└── README.md
```

> As pastas `dataset/`, `model/` e `venv/` **não fazem parte do repositório** (estão no `.gitignore`) — você as gera localmente seguindo os passos abaixo.

## Pré-requisitos

- [Python 3.10+](https://www.python.org/downloads/)
- [Git](https://git-scm.com/downloads)
- Conta gratuita no [Kaggle](https://www.kaggle.com/) para baixar o dataset
- *(opcional, recomendado)* GPU NVIDIA com driver atualizado — o treino roda em CPU também, só é mais lento

## Passo a passo

### 1. Clonar o repositório

```bash
git clone https://github.com/Ronald-Jesus/reciclaai.git
cd reciclaai
```

### 2. Criar o ambiente virtual

O ambiente virtual isola as dependências deste projeto do resto da sua máquina.

**Windows (PowerShell):**
```powershell
python -m venv venv
venv\Scripts\activate
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

O prompt deve passar a mostrar `(venv)` no início da linha quando o ambiente estiver ativo. Repita a ativação a cada nova sessão do terminal.

### 3. Instalar as dependências

**Se você tem GPU NVIDIA** (recomendado — o treino fica bem mais rápido):
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
pip install flask pillow
```

**Se você não tem GPU (ou não sabe):**
```bash
pip install -r requirements.txt
```

> ⚠️ No Windows e macOS, `pip install torch` sozinho **sempre instala a versão CPU-only**, mesmo que você tenha uma GPU NVIDIA. Por isso o comando com `--index-url` acima é necessário para usar a GPU.

Confirme se a GPU foi detectada:
```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```
Deve aparecer `True` no final. Se aparecer `False` mesmo tendo GPU, veja a seção [Solução de problemas](#solução-de-problemas).

### 4. Baixar e organizar o dataset

Baixe o dataset **[Garbage Classification](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification)** no Kaggle (são ~2.500 imagens em 6 pastas: `cardboard`, `glass`, `metal`, `paper`, `plastic`, `trash`) e extraia o `.zip` em algum lugar da sua máquina.

Depois, rode o script de organização para dividir em treino/teste:
```bash
python split_dataset.py --source "C:\caminho\para\o\dataset\extraido" --dest dataset --test-size 0.2
```

Isso cria a pasta `dataset/` (ignorada pelo Git) com `train/` e `test/`, cada uma com as 6 subpastas de classe.

### 5. Treinar o modelo

```bash
python treino.py
```

O treino imprime a acurácia de treino e teste a cada época e, ao final, salva o modelo em `model/reciclaai.pth`. Em GPU costuma levar poucos minutos; em CPU pode levar bem mais tempo dependendo do tamanho do dataset.

### 6. Rodar o front-end

```bash
python app.py
```

Acesse **http://localhost:5000** no navegador e clique em **Começar**. Ative a câmera (ou envie uma foto), aponte para a embalagem e clique em **Inserir embalagem**. A máquina mostra se o item foi aceito e quanto valeu. Em **Finalizar e gerar voucher** você recebe o código com o saldo.

O painel do operador fica em **http://localhost:5000/admin**.

> A câmera só funciona em `localhost` ou HTTPS (restrição do navegador). Acessando de outro dispositivo pela rede, use "Enviar foto".

> O `app.py` só funciona depois do passo 5 — ele procura o arquivo `model/reciclaai.pth`.

## Solução de problemas

**`ModuleNotFoundError: No module named 'torch'`**
O ambiente virtual está ativo (`(venv)` aparece no prompt) mas as dependências não foram instaladas nele. Repita o passo 3 com o venv ativo.

**`torch.cuda.is_available()` retorna `False` mesmo com GPU NVIDIA**
Você instalou a build CPU-only por engano. Reinstale apontando para o índice certo:
```bash
pip uninstall torch torchvision torchaudio -y
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
```
Se `nvidia-smi` (no terminal) não reconhecer o comando, sua máquina não tem GPU NVIDIA disponível — o projeto funciona em CPU, só mais lento.

**`FileNotFoundError: Modelo não encontrado em model/reciclaai.pth`**
Você ainda não rodou o passo 5 (`python treino.py`), ou rodou em outra pasta. O `app.py` precisa ser executado na raiz do projeto.

**`FileNotFoundError` ao rodar `treino.py` (pasta `dataset/train` não existe)**
Volte ao passo 4 — o dataset baixado do Kaggle precisa passar pelo `split_dataset.py` antes, já que ele vem sem divisão treino/teste.
