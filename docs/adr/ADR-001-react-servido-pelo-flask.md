# ADR-001 · React servido pelo Flask

- **Status:** aceita
- **Data:** 2026-11-08

## Contexto

O ReciclaAI tem um servidor Flask que carrega o modelo de classificação (PyTorch) e expõe a API da máquina de reciclagem. O site passa a ter uma página inicial B2B e a "lixeira pessoal" (o aplicativo), com animações e componentes visuais mais elaborados. Os componentes da biblioteca React Bits, escolhida para o visual, só existem para React. Era preciso decidir como o front-end em React se encaixa no servidor existente e como será publicado no Hugging Face Spaces.

## Decisão

O front-end fica na pasta `frontend/`, escrito em React 18 com Vite (JavaScript, sem TypeScript, para manter o código simples de explicar) e `react-router-dom` para as rotas `/` e `/lixeira`. O comando `npm run build` gera `frontend/dist/`, e o próprio Flask serve esse resultado: as rotas `/` e `/lixeira` devolvem `dist/index.html` e os arquivos compilados saem de `/assets/`. A tela atual da máquina continua em Jinja, agora em `/maquina`, e o painel do operador segue em `/admin`. A API (`/api/...`, `/predict`) não muda. A IA continua inteiramente em Python, no mesmo processo.

Se `frontend/dist/` não existir, o Flask responde 503 com uma mensagem pedindo para rodar `npm run build`, em vez de um erro genérico.

## Alternativas consideradas

1. **Manter Jinja/HTML puro.** Não exige etapa de compilação, mas impede o uso dos componentes React Bits e deixa o código de interface mais difícil de organizar à medida que as telas crescem. Descartada.
2. **React separado, com deploy próprio.** Daria independência ao front-end, mas exigiria dois endereços, dois deploys, configuração de CORS e a publicação de dois serviços no Hugging Face. É complexidade sem benefício para um projeto deste tamanho. Descartada.
3. **React servido pelo Flask (escolhida).** Um único servidor, um único endereço e um único deploy; a API e o site compartilham a mesma origem, sem CORS.

## Consequências

- O deploy precisa rodar `npm run build` antes de subir o Flask (por exemplo, no Dockerfile do Space), e quem desenvolve precisa do Node instalado.
- Os testes de rota em Python usam uma pasta `dist` temporária, então não dependem do Node; o front-end tem testes próprios (Vitest) e um job separado na integração contínua.
- A rota `/maquina` mantém a simulação atual até que seja migrada para React.
- Rotas novas do React precisam ser registradas também no Flask (hoje `/` e `/lixeira`), para que o recarregamento da página funcione.
