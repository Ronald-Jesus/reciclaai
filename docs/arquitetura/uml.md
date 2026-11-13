# Diagramas UML

Todos em Mermaid (renderizam no GitHub). Elementos marcados como **[existe]** estão no código atual; **[#N]** são planejados na issue N.

## 1. Casos de uso

O Mermaid não tem sintaxe nativa de casos de uso; o diagrama usa `flowchart`: atores como nós retangulares, casos de uso como nós em formato de pílula dentro da fronteira do sistema, e `include`/`extend` como setas pontilhadas rotuladas.

```mermaid
flowchart LR
    pessoa(["Ator: Pessoa que devolve"])
    operador(["Ator: Operador do local"])
    caixa(["Ator: Caixa"])
    visitante(["Ator: Professor / visitante do site"])
    gerente(["Ator: Gerente do local (simulador)"])

    subgraph fronteira["Sistema ReciclaAI"]
        direction TB
        uc1(["UC1 Ver o site e entender a máquina"])
        uc2(["UC2 Fotografar embalagem"])
        uc3(["UC3 Analisar material com a IA"])
        uc4(["UC4 Ver lixeira certa e valor"])
        uc5(["UC5 Montar sacola"])
        uc6(["UC6 Ver mercado mais próximo"])
        uc7(["UC7 Depositar na máquina"])
        uc8(["UC8 Receber voucher"])
        uc9(["UC9 Resgatar voucher"])
        uc10(["UC10 Ver níveis dos compartimentos e estatísticas"])
        uc11(["UC11 Esvaziar compartimento"])
        uc12(["UC12 Receber dicas de foto melhor"])
        uc13(["UC13 Simular retorno no local"])
    end

    visitante --- uc1
    pessoa --- uc1
    pessoa --- uc2
    pessoa --- uc5
    pessoa --- uc6
    pessoa --- uc7
    operador --- uc10
    operador --- uc11
    caixa --- uc9
    gerente --- uc13

    uc2 -.->|"include"| uc3
    uc3 -.->|"include"| uc4
    uc12 -.->|"extend: confiança baixa ou não reconhecido"| uc4
    uc5 -.->|"extend: material aceito"| uc4
    uc7 -.->|"include"| uc3
    uc7 -.->|"include"| uc8
    uc9 -.->|"depende de"| uc8
```

Rastreio com o código e as issues: UC2 a UC6 e UC12 = subpágina Lixeira Pessoal (seção 7 da visão do produto; componentes `Captura`, `Resultado`, `Sacola` e `Mapa`, issues #43 a #45); UC7 e UC8 = depósito simulado e máquina (rotas `/api/session` **[existe]**); UC9 = `POST /api/vouchers/<code>/redeem` **[existe]**; UC10 e UC11 = painel `/admin` **[existe]**; UC1 = site em React (esqueleto **[existe]**, seções nas issues seguintes); UC13 = simulador de impacto no local (issue #48, HU-11).

### 1.1 Casos de uso x histórias de usuário

Histórias em [../requisitos/historias-de-usuario.md](../requisitos/historias-de-usuario.md).

| Caso de uso | Histórias de usuário |
|---|---|
| UC1 Ver o site e entender a máquina | HU-13 (e HU-16 como acesso ao site publicado) |
| UC2 Fotografar embalagem | HU-01, HU-03 |
| UC3 Analisar material com a IA | HU-01, HU-02, HU-03 |
| UC4 Ver lixeira certa e valor | HU-01 |
| UC5 Montar sacola | HU-04 |
| UC6 Ver mercado mais próximo | HU-05, HU-12 |
| UC7 Depositar na máquina | HU-06, HU-07 |
| UC8 Receber voucher | HU-06, HU-07 |
| UC9 Resgatar voucher | HU-08 |
| UC10 Ver níveis dos compartimentos e estatísticas | HU-09 |
| UC11 Esvaziar compartimento | HU-10 |
| UC12 Receber dicas de foto melhor | HU-02 |
| UC13 Simular retorno no local | HU-11 |

HU-15 (heurísticas de Nielsen documentadas) e HU-16 (abrir o projeto publicado no celular) são requisitos **não funcionais**: não geram caso de uso próprio. HU-16 é atendida pela implantação (ver [arquitetura.md](arquitetura.md), seção 3) e HU-15 pelo documento da issue #46.

## 2. Sequência: analisar foto no app

```mermaid
sequenceDiagram
    autonumber
    actor P as Pessoa
    participant UI as "Captura (#43)"
    participant F as Flask app.py
    participant V as "Validação do upload"
    participant M as "Modelo ResNet18"
    participant X as rvm.decide
    P->>UI: tira, cola ou escolhe a foto
    UI->>UI: validarArquivo (imagem e até 5 MB)
    alt arquivo recusado no navegador
        UI-->>P: mensagem com o motivo
    else arquivo válido
        UI->>F: POST /predict (multipart, campo image)
        F->>F: modelo carregado?
        alt modelo não treinado
            F-->>UI: 503 { error }
            UI-->>P: aviso "a IA ainda não está pronta"
        else modelo pronto
            F->>V: ler e validar a imagem
            alt acima de 5 MB
                F-->>UI: 413 { error }
            else arquivo inválido ou ausente
                F-->>UI: 400 { error }
            else imagem válida
                V-->>F: imagem RGB
                F->>M: transformar (224x224) e inferir
                M-->>F: probabilidades por classe
                F->>F: ordenar e montar prediction e ranking
                F->>X: decide(material, confiança, bin_full=False)
                X-->>F: Decision (aceita, motivo, valor)
                F->>F: calcular low_confidence e nao_reconhecido
                F-->>UI: 200 { prediction, ranking, machine, low_confidence, nao_reconhecido }
                UI-->>P: material, lixeira, confiança, valor ou motivo
            end
        end
    end
    Note over F: A foto não é gravada em disco nem no banco. /predict não cria linha em items.
```

Estado atual do código: o lado do servidor está pronto (#20, commit `b24ece7`): `/predict` valida (400), recusa acima de 5 MB (413), devolve 503 sem modelo e responde com `prediction`, `ranking`, `machine`, `low_confidence` e `nao_reconhecido`. O componente `Captura` ainda não existe (#43); o `App` do React já existe (#38).

## 3. Sequência: depósito na máquina e voucher

```mermaid
sequenceDiagram
    autonumber
    actor P as Pessoa
    participant T as "Tela (maquina.html ou depósito simulado)"
    participant F as Flask app.py
    participant M as Modelo
    participant R as rvm.py
    participant B as Banco
    actor C as Caixa
    P->>T: inicia o depósito
    T->>F: POST /api/session
    F->>R: start_session()
    R->>B: INSERT sessions
    F-->>T: { session_id }
    loop para cada embalagem
        P->>T: insere a embalagem
        T->>F: POST /api/session/id/insert (imagem)
        F->>M: classificar
        M-->>F: ranking
        F->>R: insert_item(session_id, material, confiança)
        R->>B: SELECT sessão aberta e lixeira
        R->>R: decide(material, confiança, bin_full)
        R->>B: INSERT items
        opt item aceito
            R->>B: UPDATE bins.count e sessions.total
        end
        R-->>F: { accepted, reason, value, balance }
        F-->>T: prediction, ranking e resultado
    end
    P->>T: finaliza
    T->>F: POST /api/session/id/finish
    F->>R: finish_session(session_id)
    R->>B: UPDATE sessions.finished_at
    alt saldo maior que zero
        R->>B: INSERT vouchers (código RVM-...)
        R-->>F: { voucher, amount, items }
    else saldo zero
        R-->>F: { voucher: null, amount: 0 }
    end
    F-->>T: voucher
    T-->>P: mostra o código do voucher
    P->>C: apresenta o código no caixa
    C->>F: POST /api/vouchers/code/redeem
    F->>R: redeem_voucher(code)
    R->>B: SELECT voucher
    alt existe e pendente
        R->>B: UPDATE redeemed_at
        R-->>F: { ok: true, amount }
        F-->>C: 200 crédito liberado
    else inexistente ou já resgatado
        R-->>F: { ok: false, error }
        F-->>C: 400 mensagem de erro
    end
```

Erros de sessão: sessão inexistente ou já finalizada levanta `SessionError`, traduzido em `409` pelo `app.py`.

## 4. Diagramas de classes

### 4.1 Backend [existe, com ajustes de #20 e #52]

```mermaid
classDiagram
    class AppController {
        <<rotas Flask em app.py>>
        +serve_react() HTML
        +index() React em /
        +lixeira() React em /lixeira
        +assets(nome) arquivo
        +maquina() tela
        +admin() tela
        +predict() JSON
        +start_session() JSON
        +insert(session_id) JSON
        +finish_session(session_id) JSON
        +admin_status() JSON
        +admin_empty_bin(material) JSON
        +redeem(code) JSON
        +ensure_model() before_request
        +handle_bad_image(err) 400
        +handle_session_error(err) 409
    }
    class ModelWrapper {
        <<modelo em app.py>>
        -_model : nn.Module
        -_classes : list
        -_transform : Compose
        +load_model()
        +classify_upload() list
        +display(cls) dict
    }
    class BadImage {
        <<exception>>
    }
    class RvmService {
        <<módulo rvm.py>>
        +MIN_CONFIDENCE : float
        +ACCEPTED : dict
        +REJECT_REASONS : dict
        +FULL_WARNING_PCT : float
        +db() Connection
        +init_db()
        +decide(material, confidence, bin_full) Decision
        +start_session() str
        +insert_item(session_id, material, confidence) dict
        +finish_session(session_id) dict
        +redeem_voucher(code) dict
        +empty_bin(material) bool
        +bin_status() list
        +stats() dict
    }
    class Decision {
        <<dataclass>>
        +accepted : bool
        +reason : str
        +value : float
    }
    class SessionError {
        <<exception>>
    }
    class Database {
        <<SQLite hoje e PostgreSQL em #52>>
        sessions
        items
        vouchers
        bins
    }
    AppController --> ModelWrapper : usa
    AppController --> RvmService : chama
    AppController ..> BadImage : captura
    AppController ..> SessionError : captura
    RvmService --> Decision : cria
    RvmService ..> SessionError : lança
    RvmService --> Database : lê e grava
    ModelWrapper ..> BadImage : lança
```

### 4.2 Frontend (`App`, `PaginaInicial` e `LixeiraPessoal` existem como esqueleto da #38; os demais são #43, #44 e #45)

```mermaid
classDiagram
    class App {
        +rotas : "/" e "/lixeira"
    }
    class PaginaInicial {
        +seções do site
        +animação de rolagem
    }
    class LixeiraPessoal {
        +estado da análise
        +coordena os passos
    }
    class Captura {
        +câmera, arrastar, colar, arquivo
        +cancelar análise
    }
    class Resultado {
        +material, lixeira, confiança
        +valor ou motivo da recusa
        +dicas de foto
    }
    class Sacola {
        +itens com miniatura
        +total
        +desfazer remoção
    }
    class Mapa {
        +mercado mais próximo
        +distância e minutos a pé
        +aviso de demonstração
    }
    class api_js {
        <<módulo>>
        +analisarFoto(blob, sinal) RespostaPredict
    }
    class validarArquivo_js {
        <<módulo>>
        +validarArquivo(file) ok ou mensagem
    }
    class sacola_js {
        <<módulo>>
        +sacolaReducer(estado, acao)
        +totalSacola(itens) number
    }
    class geo_js {
        <<módulo>>
        +distanciaKm(a, b) number
        +maisProximo(origem, mercados)
        +minutosAPe(km) number
    }
    App --> PaginaInicial : rota /
    App --> LixeiraPessoal : rota /lixeira
    LixeiraPessoal *-- Captura
    LixeiraPessoal *-- Resultado
    LixeiraPessoal *-- Sacola
    LixeiraPessoal *-- Mapa
    Captura ..> validarArquivo_js
    Captura ..> api_js
    Sacola ..> sacola_js
    Mapa ..> geo_js
    api_js ..> Flask : POST /predict
    class Flask {
        <<servidor>>
    }
```

## 5. Estados de uma sessão e do voucher

```mermaid
stateDiagram-v2
    [*] --> Aberta : start_session
    Aberta --> Aberta : insert_item (aceito ou recusado)
    Aberta --> Finalizada : finish_session

    state Finalizada {
        [*] --> Avaliacao
        Avaliacao --> SemVoucher : saldo igual a zero
        Avaliacao --> VoucherEmitido : saldo maior que zero
        VoucherEmitido --> VoucherResgatado : redeem_voucher
        VoucherEmitido --> VoucherEmitido : resgate repetido recusado
        SemVoucher --> [*]
        VoucherResgatado --> [*]
    }
    Finalizada --> [*]
    note right of Aberta
        insert_item em sessão finalizada
        levanta SessionError (409)
    end note
```

Correspondência com o banco: `Aberta` = `finished_at IS NULL`; `VoucherEmitido` = linha em `vouchers` com `redeemed_at IS NULL`; `VoucherResgatado` = `redeemed_at` preenchido.

Ver também: [arquitetura](arquitetura.md) · [modelo de dados](modelo-de-dados.md) · [índice](README.md).
