# Histórias de usuário (issue #10)

Formato: **Como** `<papel>`, **quero** `<ação>`, **para** `<benefício>`. Critérios de aceitação em
Dado/Quando/Então. Estimativa em horas de trabalho. Prioridade pelo método MoSCoW.
Os números das issues são os do [plano de construção](../plano-de-construcao.md).

## HU-01 · Fotografar e saber o que fazer com a embalagem
Como **pessoa que devolve embalagens**, quero fotografar uma embalagem no app, para saber o
material, a lixeira certa e quanto ela valeria na máquina.
- **Dado** que o modelo está pronto, **quando** envio uma foto de uma garrafa plástica, **então**
  vejo o material, a cor da lixeira, a confiança em % e o valor na máquina (R$ 0,10).
- **Dado** uma foto de papel, **quando** a IA responde com 70% ou mais, **então** vejo a lixeira
  azul e o motivo de a máquina não aceitar, sem valor em reais.
- **Dado** que a câmera foi negada, **quando** abro a página, **então** vejo um aviso e posso
  arrastar, colar (Ctrl+V) ou escolher um arquivo.
- **Prioridade:** Must · **Estimativa:** 5 h · **Issues:** #20, #43, #44

## HU-02 · Aviso quando a foto não é de embalagem
Como **pessoa que devolve embalagens**, quero ser avisada quando a IA não reconhecer uma
embalagem, para não receber uma resposta errada (por exemplo, uma selfie como "plástico 94%").
- **Dado** uma foto de pessoa, ambiente ou animal (classe `nao_residuo`), **quando** a análise
  termina, **então** vejo "Não reconheci uma embalagem nesta foto" e dicas de foto melhor, sem
  material, valor nem lixeira.
- **Dado** uma confiança abaixo de 70%, **quando** a análise termina, **então** vejo a mesma
  mensagem e o item não pode ir para a sacola.
- **Prioridade:** Must · **Estimativa:** 3 h · **Issues:** #15, #16, #20, #44

## HU-03 · Mensagens claras para foto inválida
Como **pessoa que devolve embalagens**, quero mensagens que digam o que houve e como resolver,
para corrigir o envio sem desistir.
- **Dado** um arquivo de mais de 5 MB, **quando** tento enviar, **então** vejo "A foto passa de
  5 MB. Envie uma menor", sem chamar o servidor.
- **Dado** um arquivo que não é imagem, **quando** tento enviar, **então** vejo uma mensagem
  pedindo JPG ou PNG, e o botão de analisar fica inativo.
- **Dado** que o modelo ainda não foi treinado, **quando** envio uma foto, **então** o servidor
  responde 503 e a página mostra que a IA ainda não está pronta.
- **Prioridade:** Must · **Estimativa:** 2 h · **Issues:** #20, #43

## HU-04 · Sacola com o total estimado
Como **pessoa que devolve embalagens**, quero juntar as embalagens numa sacola com o total, para
saber quanto levo para a máquina.
- **Dado** um resultado aceito (plástico, metal ou vidro), **quando** toco em adicionar, **então**
  o item aparece com miniatura e o total soma R$ 0,10, R$ 0,15 ou R$ 0,25 conforme o material.
- **Dado** um item recusado ou "não reconhecido", **quando** olho o resultado, **então** não há
  botão de adicionar à sacola.
- **Dado** que removi um item, **quando** toco em desfazer, **então** ele volta à sacola.
- **Prioridade:** Must · **Estimativa:** 3 h · **Issues:** #44

## HU-05 · Mapa do mercado mais próximo
Como **pessoa que devolve embalagens**, quero ver no mapa o mercado mais próximo, para saber aonde
levar as embalagens.
- **Dado** que permiti a localização, **quando** abro o mapa, **então** vejo o mercado mais
  próximo, a distância e o tempo a pé (5 km/h).
- **Dado** que neguei a localização, **quando** abro o mapa, **então** ele abre no centro de
  Brasília com a lista salva de mercados.
- **Dado** qualquer estado do mapa, **então** o aviso "os mercados aparecem só para demonstrar o
  mapa e não são parceiros" e o crédito "© colaboradores do OpenStreetMap" estão sempre visíveis.
- **Prioridade:** Must · **Estimativa:** 3 h · **Issues:** #45

## HU-06 · Depósito simulado e voucher no app
Como **pessoa que devolve embalagens**, quero tocar em "Cheguei na máquina" e ver a máquina
simulada conferir minha sacola, para viver a história completa até o voucher.
- **Dado** uma sacola com itens aceitos, **quando** toco em "Cheguei na máquina", **então** a
  máquina simulada confere cada item com as mesmas regras (70%, valores por material) e emite um
  voucher com o total.
- **Dado** que a máquina recusou um item, **então** ele é devolvido com o motivo e não soma.
- **Dado** o depósito, **então** as fotos ficam só na memória do navegador e o depósito aparece no
  painel do operador.
- **Prioridade:** Should · **Estimativa:** 3 h · **Issues:** #47

## HU-07 · Inserir na máquina e receber o voucher
Como **pessoa que devolve embalagens**, quero inserir a embalagem na máquina e receber um
voucher, para ser paga pelo que devolvi.
- **Dado** uma sessão aberta, **quando** insiro uma embalagem de plástico, metal ou vidro com
  confiança de 70% ou mais e balança ok, **então** a máquina aceita e soma R$ 0,10, R$ 0,15 ou
  R$ 0,25.
- **Dado** uma confiança abaixo de 70%, **quando** insiro, **então** a máquina devolve com o
  motivo ("reposicione e tente de novo" ou "Item não reconhecido").
- **Dado** a máquina projetada, **então** a balança confere o peso e devolve garrafa ainda cheia.
  **Na simulação do projeto, a balança é representada e não mede peso.**
- **Dado** uma sessão finalizada com saldo, **então** é gerado um voucher; sem saldo, não há
  voucher.
- **Dado** que o app só estima, **então** o crédito só existe quando a embalagem entra na máquina.
- **Prioridade:** Must · **Estimativa:** 4 h (código existente; testes nas issues) · **Issues:** #21, #22, #23

## HU-08 · Resgatar voucher uma única vez
Como **caixa do local**, quero resgatar o voucher apresentado pelo cliente, para dar o desconto e
garantir que ele não seja usado duas vezes.
- **Dado** um voucher válido e não usado, **quando** informo o código, **então** o sistema marca
  como resgatado e mostra o valor a descontar.
- **Dado** um voucher já resgatado, **quando** informo o código de novo, **então** é recusado com
  mensagem "voucher já utilizado".
- **Dado** um código inexistente, **então** é recusado com mensagem clara.
- **Prioridade:** Must · **Estimativa:** 2 h (código existente; testes) · **Issues:** #21, #22, #23

## HU-09 · Acompanhar compartimentos e estatísticas
Como **operador do local**, quero ver no painel o nível de cada compartimento e as estatísticas da
máquina, para planejar o esvaziamento.
- **Dado** o painel `/admin`, **quando** abro a página, **então** vejo o nível de cada
  compartimento (plástico, metal, vidro) em %.
- **Dado** que um compartimento chegou a 85% ou mais, **então** o painel mostra um aviso.
- **Dado** que um compartimento está cheio, **quando** a IA aceita aquele material, **então** a
  máquina recusa por compartimento cheio.
- **Prioridade:** Should · **Estimativa:** 2 h · **Issues:** #21, #22, #23, #52

## HU-10 · Esvaziar o compartimento
Como **operador do local**, quero registrar o esvaziamento de um compartimento, para a máquina
voltar a aceitar aquele material.
- **Dado** um aviso de 85% ou mais, **quando** registro o esvaziamento no painel, **então** o nível
  daquele compartimento volta a 0%.
- **Dado** o compartimento esvaziado, **quando** alguém insere aquele material, **então** a
  máquina volta a aceitar.
- **Prioridade:** Should · **Estimativa:** 1,5 h · **Issues:** #21, #22, #23

## HU-11 · Simular o impacto de um local
Como **gerente do local** (quem decide comprar a máquina), quero ajustar pessoas por dia, quantas trazem embalagens e embalagens
por pessoa, para ver o resultado por mês antes de decidir instalar a máquina.
- **Dado** o simulador, **quando** altero um dos três números, **então** o resultado mensal
  (embalagens e crédito que volta como venda) é recalculado na hora.
- **Dado** qualquer número de impacto exibido, **então** ele traz a fonte citada.
- **Prioridade:** Could · **Estimativa:** 1,5 h · **Issues:** #48

## HU-12 · Busca real de mercados próximos
Como **pessoa que devolve embalagens**, quero ver mercados reais próximos de onde estou, para
usar a demonstração em qualquer cidade.
- **Dado** que permiti a localização, **quando** a busca no OpenStreetMap responde, **então** vejo
  os mercados reais mais próximos.
- **Dado** que a busca falhou, **então** o mapa usa a lista salva de Brasília, sem erro na tela.
- **Prioridade:** Should (faz parte da issue #45 e da linha de base; se o tempo faltar, é o primeiro item a ser cortado, conforme `docs/gestao/A05-estimativas.md`) · **Estimativa:** 0,5 h · **Issues:** #45

## HU-13 · Entender a máquina peça por peça
Como **professor/avaliador**, quero ver a máquina montada ao rolar a página, com o porquê de cada
peça, e poder ler tudo sem animação se o meu sistema pedir, para concluir que o projeto entende
como ela funciona.
- **Dado** a seção de montagem, **quando** rolo, **então** uma peça é destacada por trecho, com
  nome, "por que existe" e a barra "3 de 9 peças".
- **Dado** a última peça, **quando** ela encaixa, **então** a tela da máquina liga e mostra
  "Insira uma embalagem".
- **Dado** que os quadros de vídeo faltam, **então** a ilustração SVG aparece no lugar.
- **Dado** `prefers-reduced-motion: reduce`, **quando** abro o site, **então** Lenis e Vanta ficam
  desligados e a montagem mostra a máquina pronta (SVG) com a lista das 9 peças, sem rolagem presa.
- **Dado** o celular, **então** a montagem é mais curta, sem travar.
- **Dado** qualquer imagem, **então** ela tem texto alternativo e crédito.
- **Prioridade:** Must · **Estimativa:** 6 h · **Issues:** #39, #40, #41, #42

## HU-14 — fundida na HU-13
A história original (site que respeita quem desativa animações, `prefers-reduced-motion`) passou a
ser critério da HU-13. O número fica reservado para que as referências continuem válidas.

## HU-15 · Heurísticas de Nielsen documentadas
Como **professor/avaliador**, quero um documento que mostre onde cada uma das 10 heurísticas de
Nielsen aparece, para verificar a usabilidade sem procurar.
- **Dado** o documento, **então** cada heurística traz onde aparece, um print e o arquivo do código.
- **Dado** a heurística 9, **então** o exemplo cita a mensagem "A foto passa de 5 MB. Envie uma
  menor".
- **Prioridade:** Should · **Estimativa:** 1 h · **Issues:** #46

## HU-16 · Abrir o projeto publicado no celular
Como **professor/avaliador**, quero abrir o site num endereço HTTPS público, para testar a câmera
no meu celular na defesa.
- **Dado** o endereço do Hugging Face Spaces, **quando** abro no celular, **então** a câmera pede
  permissão (exige HTTPS) e a análise funciona.
- **Dado** um merge na `main`, **então** o deploy é automático pelo GitHub Actions.
- **Dado** um reinício do servidor, **então** os dados no Neon (PostgreSQL) continuam.
- **Prioridade:** Must (o objetivo SMART do TAP exige o site publicado) · **Estimativa:** 4 h (#28: 1,5 h; #52: 2,5 h) · **Issues:** #28, #52

---

## Resumo MoSCoW

15 histórias ativas (HU-14 foi fundida na HU-13 e o número foi mantido).

| Prioridade | Histórias | Qtde | Horas |
|---|---|---|---|
| **Must** | HU-01, 02, 03, 04, 05, 07, 08, 13, 16 | 9 | 32 |
| **Should** | HU-06, 09, 10, 12, 15 | 5 | 8 |
| **Could** | HU-11 | 1 | 1,5 |
| **Won't (nesta versão)** | Máquina física e hardware; app nativo de loja; pagamento real; login e cadastro; formulário de contato | 0 histórias | 0 |

## Justificativa da priorização

- **Must é o que prova a ideia na defesa (03/12/2026):** a IA funcionando de verdade (HU-01 a 03),
  a regra de que o crédito só nasce na máquina e vira voucher de uso único (HU-04, 07, 08), o mapa
  (HU-05), o site que mostra a máquina por dentro e que funciona sem animação (HU-13) e o site
  publicado em HTTPS (HU-16, exigido pelo objetivo SMART do TAP). Sem qualquer uma delas, o
  professor não sai convencido de que a ideia funciona.
- **Should** melhora a defesa, mas a ideia se sustenta sem eles: depósito simulado (HU-06), painel
  e esvaziamento (HU-09, 10), busca real de mercados (HU-12, com a lista salva como alternativa;
  é o primeiro item a cortar se o tempo faltar) e documento de Nielsen (HU-15, exigido pela
  rubrica, mas fora do fluxo principal).
- **Could** só entra se sobrar tempo: o simulador de impacto (HU-11).
- **Won't:** fica fora porque o projeto vende a ideia, não fabrica a máquina (visão do produto,
  seção 3).
- **Restrição de capacidade:** com cerca de 10 h por semana e 4 semanas, cabem cerca de 40 h; os
  Must (32 h) mais os Should (8 h) somam 40 h, e o Could fica como folga.
