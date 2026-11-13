# ReciclaAI ♻️ — Máquina de Retorno de Embalagens (RVM)

![Testes](https://github.com/Ronald-Jesus/reciclaai/actions/workflows/testes.yml/badge.svg?branch=develop)

Simulação de uma **Reverse Vending Machine (RVM)**, a "máquina que troca lixo por dinheiro" usada em sistemas de depósito e retorno como o *Pfand* alemão. O usuário insere embalagens, uma câmera identifica o material com *deep learning*, a máquina aceita ou devolve o item e, no fim, emite um **voucher** com o crédito acumulado.

O modelo (ResNet18 com *transfer learning*) reconhece 8 classes: **papelão, vidro, metal, papel, plástico, orgânico, rejeito e "não é resíduo"** (fotos de pessoas, animais e ambientes). A camada de regras da máquina (`rvm.py`) decide o que fazer com cada uma. Os resultados do treino estão em [`docs/modelo/resultados.md`](docs/modelo/resultados.md).

O projeto é o Projeto Integrador de Engenharia de Software (CEUB, 2026/2), individual, feito com apoio de um assistente de IA no desenvolvimento. O trabalho termina em 27/11/2026 e a defesa está marcada para 14/12/2026; os documentos de gestão estão em [`docs/gestao/`](docs/gestao/README.md).

**Protótipo de interface online:** [ronald-jesus.github.io/reciclaai/prototipo](https://ronald-jesus.github.io/reciclaai/prototipo/) · detalhes em [`docs/prototipo/`](docs/prototipo/README.md). A ideia completa está em [`docs/visao-do-produto.md`](docs/visao-do-produto.md) e as etapas em [`docs/plano-de-construcao.md`](docs/plano-de-construcao.md).

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
| Orgânico | devolvido, orienta a lixeira marrom ou a composteira | — |
| Rejeito | devolvido, não reciclável | — |
| Não é resíduo, ou qualquer classe com confiança < 70% | devolvido, "Não reconheci uma embalagem nesta foto." | — |
| Compartimento cheio | devolvido, "Compartimento cheio. Chame um operador." | — |

Os valores, a confiança mínima e a capacidade de cada compartimento ficam no topo de [`rvm.py`](rvm.py) e são ilustrativos. Ajuste-os à vontade.

### Telas

- **`/`** e **`/lixeira`**: o site em React e o app Lixeira Pessoal (veja o passo 6).
- **`/maquina`**: a máquina. Tela inicial com a tabela de valores, sessão com câmera (ou upload/arrastar foto), saldo em tempo real, lista de itens aceitos e devolvidos e voucher final.
- **`/admin`**: painel do operador. Itens aceitos e devolvidos, taxa de aceitação, créditos emitidos, nível de cada compartimento (alerta a partir de 85%), botão "Esvaziar", últimas inserções e resgate de voucher.

### API

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/session` | abre uma sessão → `{session_id}` |
| POST | `/api/session/<id>/insert` | envia `image` (multipart) → classificação + aceito/devolvido + saldo |
| POST | `/api/session/<id>/finish` | encerra → `{voucher, amount, items}` |
| GET | `/api/admin/status` | compartimentos + estatísticas |
| POST | `/api/admin/bins/<material>/empty` | zera um compartimento |
| POST | `/api/vouchers/<code>/redeem` | resgata um voucher (uso único); recusa com "Voucher já resgatado em <data>." ou "Voucher não encontrado." |
| POST | `/predict` | classifica a foto e diz o que a máquina faria (`machine`, `low_confidence`, `nao_reconhecido`), sem gerar crédito |
| GET | `/api/status` | diz se o modelo está carregado (`model_ready`) e quais classes ele conhece |

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
  - [Rodar os testes](#rodar-os-testes)
  - [4. Baixar e organizar o dataset](#4-baixar-e-organizar-o-dataset)
  - [5. Treinar o modelo](#5-treinar-o-modelo)
  - [6. Rodar o front-end](#6-rodar-o-front-end)
- [Solução de problemas](#solução-de-problemas)

## Sobre o projeto

O pipeline tem três etapas:

1. **`split_dataset.py`** organiza as imagens baixadas do Kaggle na estrutura de pastas que o treino espera (`train/` e `test/`).
2. **`treino.py`** treina uma ResNet18 pré-treinada (congelando as camadas convolucionais e treinando só a camada final) e salva o modelo em `model/reciclaai.pth`.
3. **`app.py`** carrega esse modelo, serve o site em React (`frontend/`, compilado em `frontend/dist/`) nas rotas `/` e `/lixeira`, a simulação da máquina em `/maquina` (`templates/maquina.html`) e o painel do operador em `/admin` (`templates/admin.html`). As regras de aceitação, os créditos, os compartimentos e os vouchers ficam em **`rvm.py`**. A escolha do React servido pelo Flask está registrada em [`docs/adr/ADR-001-react-servido-pelo-flask.md`](docs/adr/ADR-001-react-servido-pelo-flask.md).

## Estrutura do repositório

```
ReciclaAI/
├── split_dataset.py     # organiza o dataset do Kaggle em train/test
├── treino.py             # treina o modelo
├── app.py                 # backend Flask (modelo + rotas da máquina e do operador)
├── rvm.py                 # regras da RVM: aceitação, créditos, compartimentos, vouchers (SQLite)
├── frontend/              # site em React (Vite): npm run build gera frontend/dist/
├── templates/
│   ├── maquina.html       # simulação da máquina em /maquina (câmera/upload, saldo, voucher)
│   └── admin.html         # painel do operador
├── tests/                 # testes (pytest)
├── docs/                  # visão, plano, protótipo, ADRs e documentos do projeto
├── .github/workflows/     # pipeline de testes (Python e front-end)
├── requirements.txt
├── .gitignore
└── README.md
```

> As pastas `dataset/`, `model/` e `venv/` **não fazem parte do repositório** (estão no `.gitignore`) — você as gera localmente seguindo os passos abaixo.

## Pré-requisitos

- [Python 3.12](https://www.python.org/downloads/) (versão usada nos testes e no pipeline)
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

As versões de todas as dependências estão fixadas no `requirements.txt`, para que a instalação seja a mesma em qualquer máquina. O PyTorch é instalado primeiro, direto do índice oficial, para escolher entre a versão CPU e a versão com GPU.

**Se você tem GPU NVIDIA** (recomendado — o treino fica bem mais rápido):
```bash
pip install torch==2.14.1 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cu130
pip install -r requirements.txt
```

**Se você não tem GPU (ou não sabe):**
```bash
pip install torch==2.14.1 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
```

> ⚠️ No Windows e macOS, `pip install torch` sozinho **sempre instala a versão CPU-only**, mesmo que você tenha uma GPU NVIDIA. Por isso o comando com `--index-url` acima é necessário para usar a GPU. No Linux acontece o contrário: o `pip install torch` sozinho baixa a versão CUDA, com vários GB.

Confirme se a GPU foi detectada:
```bash
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```
Deve aparecer `True` no final. Se aparecer `False` mesmo tendo GPU, veja a seção [Solução de problemas](#solução-de-problemas).

### Rodar os testes

Com o ambiente ativo, a partir da raiz do projeto:
```bash
pytest --cov=rvm --cov-report=term-missing
```

Os testes das regras da máquina (`rvm.py`) usam um banco SQLite temporário e não mexem no `rvm.db`. O mesmo comando roda no GitHub Actions a cada push e pull request, e o pipeline exige pelo menos 70% de cobertura de `rvm.py`.

### 4. Baixar e organizar o dataset

O modelo reconhece 8 classes: `cardboard`, `glass`, `metal`, `organic`, `paper`, `plastic`, `trash` e `nao_residuo` (foto que não é de resíduo, como pessoas e ambientes).

1. Baixe no Kaggle (conta gratuita) e extraia em pastas separadas:
   - [Garbage Classification (12 classes)](https://www.kaggle.com/datasets/mostafaabla/garbage-classification), de Mostafa Abla;
   - [Natural Images](https://www.kaggle.com/datasets/prasunroy/natural-images), de Prasun Roy;
   - opcional: [Garbage Classification (6 classes)](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification), o dataset original do projeto.
2. Monte o dataset bruto com as 8 classes:
   ```bash
   python scripts/preparar_dataset.py --garbage12 "C:\caminho\garbage12" --natural "C:\caminho
atural-images" --dest dataset_raw
   ```
   - Vidros marrom, verde e branco viram `glass`; `biological` vira `organic`; pessoas, animais, carros, motos e aviões formam `nao_residuo`; pilhas, frutas e flores ficam de fora.
   - Até 1000 imagens por classe (`--max-por-classe`), com cotas iguais por pasta de origem e sorteio reprodutível (`--seed 42`). Em `trash`, todo o lixo real entra primeiro e roupas e sapatos completam o restante.
   - Imagens repetidas (mesmo conteúdo) são descartadas. Usar `--garbage6` junto com `--garbage12` gera um aviso, porque os dois datasets se sobrepõem.
   - Fontes extras opcionais de `nao_residuo` (cômodos da casa, ovo e hortifrúti, Open Images) entram se a pasta existir em `~/datasets/`. Veja "Como reproduzir" em [`docs/modelo/resultados.md`](docs/modelo/resultados.md). Fotos próprias nunca entram no treino: são o teste do mundo real (`scripts/teste_externo.py --fotos-proprias`).
3. Divida em treino, validação e teste:
   ```bash
   python split_dataset.py --source dataset_raw --dest dataset --val-size 0.15 --test-size 0.15
   ```

As pastas `dataset_raw/` e `dataset/` ficam fora do Git. As imagens não são redistribuídas no repositório; a licença de cada dataset está na página dele no Kaggle.

### 5. Treinar o modelo

```bash
python treino.py --dataset dataset --epochs 15
```

- Usa a GPU (CUDA) se houver; senão, a CPU.
- Ajusta as camadas finais da ResNet18 (`layer4` e `fc`), escolhe a melhor época pela validação e para cedo depois de 3 épocas sem melhora.
- Saídas em `model/`: `reciclaai.pth` (usado pelo app), `metricas.json` (acurácia no teste e precisão, recall e acurácia por classe) e `confusion_matrix.png`.
- Calibra a confiança com uma temperatura medida na validação. Ela vai no `reciclaai.pth` e no `metricas.json` (com a ECE antes e depois); o app a aplica antes do softmax.
- Sem a pasta `val/`, a validação usa o teste e o `metricas.json` marca `"validacao_igual_teste": true`, porque a acurácia fica otimista nesse caso.

### 6. Rodar o front-end

Primeiro compile o site em React (precisa do [Node.js](https://nodejs.org/) 24):

```bash
cd frontend
npm ci
npm run build
cd ..
```

Depois suba o servidor:

```bash
python app.py
```

- **http://localhost:5000** — site (React); **http://localhost:5000/lixeira** — app Lixeira Pessoal.
- **http://localhost:5000/maquina** — simulação da máquina: clique em **Começar**, ative a câmera (ou envie uma foto) e clique em **Inserir embalagem**. Em **Finalizar e gerar voucher** você recebe o código com o saldo.
- **http://localhost:5000/admin** — painel do operador.

Se a pasta `frontend/dist/` não existir, as rotas do site mostram uma mensagem pedindo para rodar `npm run build`. Para os testes do front-end: `cd frontend && npm test -- --run`.

> A câmera só funciona em `localhost` ou HTTPS (restrição do navegador). Acessando de outro dispositivo pela rede, use "Enviar foto".

> O `app.py` só funciona depois do passo 5 — ele procura o arquivo `model/reciclaai.pth`.

## Solução de problemas

**`ModuleNotFoundError: No module named 'torch'`**
O ambiente virtual está ativo (`(venv)` aparece no prompt) mas as dependências não foram instaladas nele. Repita o passo 3 com o venv ativo.

**`torch.cuda.is_available()` retorna `False` mesmo com GPU NVIDIA**
Você instalou a build CPU-only por engano. Reinstale apontando para o índice certo:
```bash
pip uninstall torch torchvision -y
pip install torch==2.14.1 torchvision==0.29.1 --index-url https://download.pytorch.org/whl/cu130
```
Se `nvidia-smi` (no terminal) não reconhecer o comando, sua máquina não tem GPU NVIDIA disponível — o projeto funciona em CPU, só mais lento.

**`FileNotFoundError: Modelo não encontrado em model/reciclaai.pth`**
Você ainda não rodou o passo 5 (`python treino.py`), ou rodou em outra pasta. O `app.py` precisa ser executado na raiz do projeto.

**`FileNotFoundError` ao rodar `treino.py` (pasta `dataset/train` não existe)**
Volte ao passo 4 — o dataset baixado do Kaggle precisa passar pelo `split_dataset.py` antes, já que ele vem sem divisão treino/teste.
