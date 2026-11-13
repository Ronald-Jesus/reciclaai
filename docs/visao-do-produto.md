# ReciclaAI · Visão do produto e design do site

> Documento da Etapa 1 do Projeto Integrador (Engenharia de Software, CEUB, 2026/2).
> Fecha a ideia antes de qualquer código.

## 1. Intenção e porquê

Pouca embalagem volta para a reciclagem no Brasil porque, para quem joga fora, ela não vale nada.
A lata é a exceção: tem valor de revenda e **97,3%** das latas de alumínio foram recicladas no
Brasil em 2024. Na Alemanha, onde toda garrafa tem um depósito devolvido por uma máquina de
retorno (RVM) no supermercado, **mais de 96%** das embalagens com depósito voltam.

A **ReciclaAI** é uma máquina de retorno de embalagens com inteligência artificial: a câmera
reconhece o material e a máquina paga cada embalagem reciclável com um voucher. Ela não será
fabricada. O projeto **vende a ideia** para quem avalia, o professor, mostrando um site que
explica o sistema e uma demonstração onde a IA do projeto funciona de verdade.

## 2. Público

- **Quem realmente avalia:** o professor e a banca da defesa (14/12/2026, ou antes se o professor
  marcar). Precisam sair convencidos de que a ideia é boa, de que entendem como a máquina foi projetada e de que a IA
  funciona.
- **Público dentro da história do site:** locais que instalariam a máquina (supermercados,
  condomínios, escolas e universidades, eventos) e as pessoas que devolvem embalagens.

## 3. Objetivos, não-objetivos e anti-objetivos

**Objetivos**
1. Motivar: mostrar o problema com fotos reais de lixo espalhado e textos curtos e fortes.
2. Explicar a máquina por dentro: o professor deve sentir que conhece o esqueleto dela, peça por peça.
3. Provar que funciona: na subpágina Lixeira Pessoal, uma foto enviada é lida pela IA real.
4. Mostrar o quanto a ideia pode fazer bem, com números de fontes citadas.
5. Seguir à risca as 10 heurísticas de Nielsen e documentar onde cada uma aparece.

**Não-objetivos**
- Máquina física, hardware ou integração com equipamento real.
- App nativo de loja: o "app" é uma página web que funciona no celular.
- Pagamento real, login de usuário, cadastro.
- Formulário de contato ou captação de clientes.

**Anti-objetivos (seria um fracasso mesmo funcionando)**
- Um site genérico com cara de modelo pronto ou "feito por IA".
- Animações que travam o celular ou impedem a leitura.
- Números sem fonte, impossíveis de defender na arguição.
- Usar marca, logotipo ou visual de fabricantes reais de máquinas ou de supermercados.
- Código sem justificativa clara, difícil de explicar na arguição.

## 4. Restrições

- **Prazo:** trabalho concluído em 27/11/2026, entrega dos artefatos no AVA até 07/12/2026 e
  defesa em 14/12/2026. Projeto individual, com cerca de 10 h de trabalho por semana, com apoio de um assistente de IA no desenvolvimento.
- **Processo:** construção em etapas pequenas. Cada etapa é revisada, aprovada e enviada
  ao GitHub pela branch develop, com um pull request para a main ao fim de cada issue, formando o histórico de construção que a rubrica avalia.
- **Rubrica:** o site faz parte do MVP. Também valem BPMN, requisitos com MoSCoW, UML, testes no
  pipeline, gestão (TAP, EAP, RACI, riscos), release e defesa.
- **Licenças:** fotos de bancos gratuitos (Unsplash, Pexels) com crédito ao fotógrafo; mapa com
  crédito "© colaboradores do OpenStreetMap".
- **Acessibilidade:** respeitar quem desativa animações no sistema (`prefers-reduced-motion`),
  navegação por teclado, textos alternativos nas imagens e contraste legível.

## 5. O sistema (a história que o site conta)

| Peça | Para quem | O que faz |
|---|---|---|
| **Máquina ReciclaAI** | Quem devolve | A câmera e a IA conferem o material. Aceita PET, lata e vidro, paga em R$ e emite voucher |
| **App Lixeira Pessoal** | Quem devolve | Foto do objeto: material, lixeira certa e valor. Sacola com o total e mapa do mercado mais próximo |
| **Painel do operador** | O local | Nível dos compartimentos, estatísticas e resgate de voucher |

**Regras do negócio**
- O crédito **só existe quando a embalagem entra na máquina**. O app mostra o valor estimado,
  mas não paga; assim ninguém ganha duas vezes fotografando a mesma garrafa.
- A máquina aceita **plástico (PET), metal (lata) e vidro**. Papel e papelão (lixeira azul),
  orgânico (marrom) e rejeito (cinza) são identificados e devolvidos com orientação. As cores
  seguem a Resolução CONAMA 275/2001.
- Se a IA identificar **"não é resíduo"** (pessoa, ambiente, animal) ou ficar abaixo de **70% de
  confiança**, o item é devolvido com a mensagem "Não reconheci uma embalagem nesta foto.": sem
  material, valor nem lixeira.
- Valores por embalagem: **PET R$ 0,10, lata R$ 0,15, vidro R$ 0,25**.
- O voucher só vale no caixa do local que tem a máquina, então o crédito volta como venda.
- Nome do produto: **ReciclaAI**.

## 6. O site: página principal, na ordem de rolagem

### 6.1 Abertura com o problema
Fotos grandes de lixo espalhado (rua, rio, praia), de bancos gratuitos, com frases curtas que
aparecem conforme a rolagem. Exemplo de tom: "Toda garrafa aqui já teve dono." Termina com a
pergunta que leva à solução.

### 6.2 O contraste: Brasil e Alemanha
Dois números lado a lado, com fonte: latas no Brasil (97,3%, porque têm valor) e embalagens com
depósito na Alemanha (mais de 96%). Mensagem: "o segredo é o valor, não a lixeira".

### 6.3 A montagem da máquina (seção principal)
- A seção fica parada na tela enquanto a pessoa rola, num **palco escuro** (fundo preto,
  cinematográfico). A máquina aparece como uma **vista explodida fotorrealista**, no estilo das
  páginas de produto da Apple: um vídeo da máquina gerado por IA é convertido em cerca de 120
  quadros WebP, desenhados num `<canvas>` conforme o progresso da rolagem (GSAP ScrollTrigger).
  Tocar os quadros ao contrário dá a versão de montagem.
- A cada passo de rolagem, uma peça é destacada e explicada. Uma barra mostra o progresso
  ("3 de 9 peças").
- Cada peça aparece com o nome e uma ou duas frases dizendo **por que ela existe**:

| # | Peça | Por que existe |
|---|---|---|
| 1 | Compartimentos (PET, lata, vidro) | Separar já na máquina deixa o material mais valioso para o reciclador |
| 2 | Separador | Desvia cada embalagem para o compartimento certo depois da decisão da IA |
| 3 | Compactador | Amassa PET e lata: cabe muito mais até o próximo esvaziamento. Vidro segue inteiro |
| 4 | Balança | Confere o peso: garrafa ainda cheia é devolvida |
| 5 | Esteira | Gira a embalagem na frente da câmera e do leitor |
| 6 | Leitor de código de barras | Nas máquinas alemãs, confirma que a embalagem faz parte do sistema; aqui reforça a decisão da IA |
| 7 | Câmera e IA | O coração da máquina: identifica o material. É a IA que você testa na lixeira pessoal |
| 8 | Abertura de entrada | Recebe um item por vez, com luz indicando quando está pronta |
| 9 | Tela e impressora de voucher | Mostra o resultado e entrega o crédito |

- Quando a última peça encaixa, a **tela da máquina liga** e mostra "Insira uma embalagem".
- A máquina é inspirada nas máquinas alemãs (referência: máquinas de retorno de supermercados
  alemães), sem copiar marca nem visual de fabricante.
- A **ilustração SVG 2D em camadas**, desenhada para o projeto, continua como alternativa: aparece
  quando os quadros não existem e é a base para quem desativa animações.
- O resto do site segue o estilo neo-brutalista; o contraste entre o palco escuro e o site
  colorido é intencional.
- **Celular:** a montagem é mais curta (menos rolagem por peça).
- **Animações desativadas no sistema:** mostra a máquina pronta (ilustração SVG) com a lista das
  9 peças.

### 6.4 O quanto pode ser bom
Números de impacto que sobem na tela quando aparecem (embalagens que deixam de ir para a rua,
crédito que volta para o comércio do local). Um simulador permite mexer nos números de um local
(pessoas por dia, quantas trazem embalagens, embalagens por pessoa) e ver o resultado por mês.

### 6.5 Para quem (curta)
Supermercados, condomínios, escolas e universidades, eventos. Um ou dois benefícios de cada,
para mostrar que a ideia tem modelo de negócio.

### 6.6 Painel do operador
Chamada curta com link para o painel de demonstração que já existe (`/admin`).

### 6.7 Dúvidas frequentes
Perguntas curtas: como a IA reconhece, e se ela errar, por que o app não paga direto, quanto
vale cada embalagem, o que acontece com orgânico e papel, se as fotos ficam guardadas (não ficam).

### 6.8 Fechamento
Chamada "Teste a IA dessa câmera", que leva à subpágina Lixeira Pessoal.

## 7. Subpágina Lixeira Pessoal (demonstração do app)

O objetivo é a pessoa **sentir que está funcionando de verdade**.

1. **Foto:** câmera do celular ou do computador, arrastar um arquivo ou colar a imagem.
2. **Análise na hora:** animação de leitura sobre a foto enquanto a IA real (o modelo do
   projeto) responde: material, cor da lixeira e confiança.
3. **Retorno:** se for PET, lata ou vidro, mostra quanto vale na máquina e permite adicionar à
   **sacola**, que soma o total. Se não for, mostra a lixeira certa e por que a máquina não aceita.
   Abaixo de 70% de confiança, ou se a IA achar que a foto não é de resíduo, mostra "Não
   reconheci uma embalagem nesta foto" e dá dicas para uma foto melhor, sem material, valor nem
   lixeira.
4. **Mapa:** com permissão de localização, mostra os **supermercados reais mais próximos**, a
   distância e o tempo a pé. Sem permissão, abre no centro de Brasília. Um aviso fixo no mapa diz
   que **os mercados aparecem só para demonstrar o mapa e não são parceiros**. Sem logotipos.
5. **Depósito simulado:** o botão "Cheguei na máquina" faz a máquina simulada conferir as
   embalagens da sacola (mesma IA, mesmas regras) e gerar o **voucher**. Fecha a história.

## 8. Como é feito

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Interface | **React** (projeto Vite) | Permite usar os componentes animados do React Bits; o Vite compila rápido e gera arquivos simples de servir |
| Estilo visual | **Neo-brutalismo** (bordas pretas grossas, sombras duras deslocadas, cores chapadas fortes, tipografia pesada), inspirado no Material Design 3 / Material You, com cor semente **verde-limão `#C6F432`** | Evita o visual genérico; o limão contrasta com as linhas pretas e se distingue do verde do vidro (`#2e8b57`) e do ocre do metal (`#c99700`) |
| Tipografia | **Bricolage Grotesque** (títulos) e **Atkinson Hyperlegible Next** (textos) | Títulos com personalidade e texto de alta legibilidade |
| Animação de rolagem | **GSAP com ScrollTrigger** e rolagem suave com **Lenis** (obrigatórios) | O ScrollTrigger prende a seção e liga a máquina ao progresso da rolagem; o Lenis é desligado quando o sistema pede menos animação |
| Efeitos de texto e interface | **React Bits** (obrigatório) | Componentes animados prontos, gratuitos, que evitam o visual genérico |
| Fundo animado (Vanta) | Fundo animado da seção de abertura (topo), obrigatório | Dá vida ao primeiro contato; desligado com `prefers-reduced-motion` |
| IA e regras da máquina | O **Flask atual** continua como servidor (modelo PyTorch, `rvm.py`, voucher, painel) | Reaproveita o que já funciona e mantém a IA em Python, onde ela foi treinada |
| Entrega | O React é compilado e servido pelo próprio Flask | Um único endereço e um único deploy: menos coisa para quebrar na defesa |
| Mapa | **Leaflet com OpenStreetMap**, com lista salva de Brasília se a busca falhar | Gratuito, sem cadastro nem chave de API; os dados de mercados são públicos |
| Fotos | Unsplash e Pexels, com crédito do fotógrafo | Licença gratuita para uso, com qualidade profissional |
| Vista da máquina | Vídeo gerado por IA convertido em cerca de 120 quadros WebP (`frontend/public/maquina/frames/`), desenhados num `<canvas>` pelo progresso da rolagem, sobre palco escuro | Vista explodida fotorrealista, como nas páginas de produto da Apple; o progresso do GSAP escolhe o quadro |
| Alternativa da máquina | SVG 2D desenhado para o projeto, uma camada por peça | Entra quando os quadros faltam e é a base para menos animação; leve e nítido em qualquer tela |
| Hospedagem | **Hugging Face Spaces** (Docker), com URL HTTPS pública; deploy automático pelo GitHub Actions a cada merge na `main` | A turma testa pelo celular, e a câmera exige HTTPS |
| Banco de dados | **PostgreSQL no Neon** (plano gratuito) em produção; **SQLite** localmente e nos testes; a variável `DATABASE_URL` escolhe | Dados persistentes e compartilhados no ar, sem complicar o desenvolvimento local |

A troca para React é uma mudança de arquitetura e será registrada num ADR.

### 8.1 Onde roda e estado atual da IA

- **Na defesa:** o site fica publicado num endereço **HTTPS público** (Hugging Face Spaces com
  Docker, issue #28), com deploy automático pelo GitHub Actions a cada merge na `main`, para o
  professor e a turma abrirem no próprio celular e a câmera funcionar, porque navegadores só
  liberam a câmera em HTTPS. **Plano B:** rodar no notebook (localhost), com a câmera do notebook.
- **Banco de dados:** em produção é o **PostgreSQL do Neon** (plano gratuito), persistente e
  compartilhado, com a URL guardada no secret `DATABASE_URL`. Localmente e nos testes continua o
  **SQLite** (`rvm.db`). Sem `DATABASE_URL`, o servidor usa SQLite (issue #52).
- **O modelo ainda não está treinado nesta cópia** (`model/` e `dataset/` ficam fora do Git). O
  treino com a classe **orgânico** faz parte do trabalho (issues #15 e #16). Enquanto o modelo não
  existir, o site funciona e a subpágina avisa que a IA ainda não está pronta.
- **Classes da IA:** papelão, vidro, metal, papel, plástico, orgânico, rejeito e **não é resíduo**
  (`nao_residuo`: pessoas, rostos, ambientes, animais e paisagens; comida em prato continua sendo
  orgânico). Sem essa classe, uma selfie poderia sair como "plástico 94%", porque o modelo sempre
  escolhe uma das classes. Se a classe mais provável for `nao_residuo`, ou a confiança ficar
  abaixo de 70%, o app diz "Não reconheci uma embalagem nesta foto" e a máquina rejeita o item.
  As imagens dessa classe vêm de bancos públicos com licença compatível com uso acadêmico, com
  crédito no README, em quantidade parecida com a das outras classes. O modelo foi
  treinado com resíduos em geral, não só embalagens de bebida, então os textos dizem "garrafa
  plástica", "lata" e "vidro" como exemplos, sem prometer que a IA reconhece marcas ou o tipo PET
  especificamente.
- **Tela atual da máquina (`/`):** muda para `/maquina` e continua como simulação da máquina. A
  página principal (`/`) passa a ser o site em React.
- **Depósito simulado (passo 7.5):** usa as mesmas rotas da máquina (`/api/session/...`), então os
  depósitos feitos pelo app aparecem no painel do operador, o que é bom para a demonstração. As
  fotos da sacola ficam **só na memória do navegador** até o depósito e nunca são gravadas no
  servidor.
- **Números da seção 6.4:** as fontes são pesquisadas e aprovadas antes de construir
  a seção; nenhum número entra sem fonte.

## 9. Heurísticas de Nielsen (onde cada uma aparece)

| # | Heurística | Onde aparece |
|---|---|---|
| 1 | Visibilidade do estado do sistema | Barra "3 de 9 peças"; animação de leitura e texto "Analisando…"; total da sacola sempre visível |
| 2 | Correspondência com o mundo real | Português simples, R$, cores reais das lixeiras (CONAMA), ícones de garrafa, lata e vidro |
| 3 | Controle e liberdade do usuário | Trocar ou remover a foto; cancelar a análise; tirar item da sacola com "desfazer" |
| 4 | Consistência e padrões | Mesma cor por material em todo o site e no app; mesmos botões e ícones em todas as telas |
| 5 | Prevenção de erros | Só aceita imagem; limite de tamanho checado antes de enviar; botão de analisar só ativa com foto |
| 6 | Reconhecer em vez de lembrar | Legenda das lixeiras sempre visível; foto ao lado do resultado; sacola com miniaturas |
| 7 | Flexibilidade e eficiência | Câmera, arrastar ou colar (Ctrl+V); atalhos de teclado; rolagem suave opcional |
| 8 | Estética e design minimalista | Uma mensagem por seção; animação a serviço da explicação, nunca enfeite |
| 9 | Ajudar a reconhecer e corrigir erros | Mensagens que dizem o que houve e como resolver ("A foto passa de 5 MB. Envie uma menor") |
| 10 | Ajuda e documentação | Dúvidas frequentes; dicas para uma boa foto; aviso explicando o mapa |

Um documento à parte (`docs/heuristicas-nielsen.md`) vai mostrar, com prints, cada heurística aplicada.

## 10. Essencial e extra

**Essencial (entra na defesa de qualquer jeito)**
- Site em React servido pelo Flask, no estilo neo-brutalista definido na seção 8.
- Rolagem suave (Lenis) e fundo animado no topo (Vanta), ambos desligados com menos animação.
- Seções 6.1, 6.2, 6.3 (montagem completa) e 6.8.
- Subpágina: passos 1 a 3 e o mapa com a **lista salva de mercados de Brasília**.
- Documento das heurísticas de Nielsen.

**Extra (nesta ordem, se der tempo)**
1. Depósito simulado com voucher na subpágina (passo 5).
2. Seções 6.4 a 6.7.

A busca real de mercados próximos no OpenStreetMap saiu dos extras: entrou na issue #45 pela
mudança M05 ([A10](gestao/A10-mudancas.md)), com a lista salva como reserva. Se o tempo faltar, é
o primeiro corte ([A05](gestao/A05-estimativas.md)).

## 11. Deixado para quem constrói

Os valores exatos dos tokens de estilo (tamanhos, espaçamentos, espessura das bordas e
sombras), dentro do estilo e da paleta já definidos; textos finais de cada seção; escolha das fotos; quais componentes do React Bits usar; desenho de
cada peça da máquina; organização das pastas do projeto React.

## 12. Fontes

- Latas no Brasil, 97,3% em 2024: Recicla Latas, divulgado por
  [Mercado&Consumo](https://mercadoeconsumo.com.br/14/08/2025/economia/brasil-reciclou-973-das-latinhas-de-aluminio-em-2024/) (2025).
- Alemanha, mais de 96% de retorno: [DPG Deutsche Pfandsystem](https://dpg-pfandsystem.de/en/the-one-way-deposit-system/useful-information/press-releases/twenty-years-of-the-german-one-way-deposit-system-a-success-story.html) (2026).
- Cores da coleta seletiva: Resolução CONAMA nº 275/2001.
