# Arquitetura, dados e UML (issue #12)

| Arquivo | Conteúdo |
|---|---|
| [arquitetura.md](arquitetura.md) | Contexto, contêineres, implantação, estilo arquitetural, atributos de qualidade e links dos ADRs |
| [modelo-de-dados.md](modelo-de-dados.md) | Modelo conceitual e físico (sessions, items, vouchers, bins), ER, dicionário, SQLite x PostgreSQL, privacidade |
| [uml.md](uml.md) | Casos de uso, sequências (analisar foto; depósito e voucher), classes (backend e frontend) e estados da sessão |

Decisões relacionadas: [ADR-001 React servido pelo Flask](../adr/ADR-001-react-servido-pelo-flask.md) · [ADR-002 IA em duas etapas](../adr/ADR-002-ia-em-duas-etapas.md) · ADR-003 PostgreSQL no Neon (`docs/adr/ADR-003-postgresql-neon.md`, issue #52).

## Rastreio com os requisitos

As histórias de usuário estão em [../requisitos/historias-de-usuario.md](../requisitos/historias-de-usuario.md). A tabela liga cada diagrama ao que ele cobre; a tabela completa de casos de uso (UC) x histórias (HU) está em [uml.md, seção 1.1](uml.md#11-casos-de-uso-x-histórias-de-usuário).

| Diagrama | Cobre | Origem |
|---|---|---|
| Casos de uso UC1 | Entender a máquina pelo site | visão do produto, seção 6 |
| Casos de uso UC2 a UC6 e UC12 | Foto, análise, lixeira e valor, sacola, mapa, dicas | visão do produto, seção 7 |
| Casos de uso UC7 e UC8 | Depósito e voucher | seção 5 (regras do negócio) |
| Casos de uso UC9 | Resgate no caixa | seção 5 |
| Casos de uso UC10 e UC11 | Painel do operador | seção 6.6 |
| Casos de uso UC13 | Simular retorno no local (HU-11) | issue #48 |
| Sequência "Analisar foto" | Resposta da IA, 70% de confiança, não reconhecido, erros 400/413/503 | plano, Parte 7 (#20) |
| Sequência "Depósito e voucher" | Crédito só na máquina, voucher resgatável no caixa | seção 5 |
| Classes do backend | Regras em `rvm.py`, rotas em `app.py` | código atual |
| Classes do frontend | Componentes do app | plano, Partes 2, 8, 9, 10 |
| Estados da sessão | Ciclo sessão e voucher | `rvm.py` |
| Modelo de dados | Persistência e privacidade (foto não é guardada) | `rvm.py`, plano Parte 12 (#52) |

Convenção: **[existe]** = já no código; **[#N]** = planejado na issue N.
