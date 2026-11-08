# Processo de negócio em BPMN (issue #9)

Modelagem do descarte de embalagens de bebida **hoje** (as-is) e **com a ReciclaAI** (to-be).
Os arquivos-fonte são BPMN 2.0 com diagrama de interchange (formas e arestas com coordenadas) e
abrem no bpmn.io, no Camunda Modeler e na importação do Bizagi.

| Arquivo | O que é |
|---|---|
| `processo-atual.bpmn` / `processo-atual.png` | Processo atual: uma piscina com 3 raias (Pessoa, Coleta municipal, Cooperativa) |
| `processo-com-rvm.bpmn` / `processo-com-rvm.png` | Processo com a ReciclaAI: 4 piscinas (Caixa do local, Pessoa com o app Lixeira Pessoal, Máquina ReciclaAI, Operador do local) ligadas por fluxos de mensagem |
| `processo-com-rvm-parte1-app.png` e `processo-com-rvm-parte2-maquina-e-caixa.png` | O mesmo diagrama em dois recortes, para leitura (o diagrama completo tem cerca de 3.000 px de largura) |

## Ferramenta e notação

- **Ferramenta:** bpmn.io (bpmn-js), equivalente ao Bizagi, como a disciplina permite. As imagens
  PNG foram geradas com o visualizador do bpmn-js a partir dos próprios arquivos `.bpmn`, então
  imagem e fonte sempre coincidem.
- **Notação usada:** evento de início e de fim (círculos), tarefa (retângulo), tarefa de serviço
  (engrenagem: ação da IA), tarefa de envio (envelope preenchido), evento de mensagem (envelope),
  gateway exclusivo (losango com X, com os fluxos de saída rotulados "Sim"/"Não"), fluxo de
  sequência (linha cheia, dentro de uma piscina) e fluxo de mensagem (tracejado, entre piscinas).

## Processo atual (as-is)

A pessoa compra e bebe, e fica com a embalagem vazia. Se há lixeira seletiva por perto, joga ali
(muitas vezes na cor errada); se não, joga no lixo comum. A coleta municipal recolhe tudo. Só se a
coleta for seletiva e sem mistura o material chega à cooperativa, que tria à mão; o que tem valor
é vendido à indústria, o resto vira rejeito. Todo o restante vai ao aterro.

**Problemas que o diagrama mostra:** a pessoa não tem ganho nenhum em separar; o erro de lixeira
contamina o material; a maior parte do caminho termina no aterro.

## Processo com a ReciclaAI (to-be)

1. **Pessoa, no app:** fotografa a embalagem. A IA identifica o material. Primeiro gateway: é
   resíduo e a confiança é de 70% ou mais? Se não, o app diz "Não reconheci uma embalagem nesta
   foto" e dá dicas. Segundo gateway: o material é aceito (plástico, metal ou vidro)? Se não, o app
   orienta a lixeira certa (azul, marrom ou cinza). Se sim, adiciona à sacola com o valor estimado
   (o app não paga).
2. **Pessoa, no mercado:** vai ao mercado indicado no mapa e insere a embalagem na máquina
   (fluxo de mensagem para a Máquina).
3. **Máquina:** a câmera e a IA conferem o material e a balança confere o peso (*). Gateway:
   aceita? Se não, devolve com o motivo. Se sim, compacta, separa e soma o valor (PET R$ 0,10,
   lata R$ 0,15, vidro R$ 0,25). Gateway: o compartimento chegou a 85%? Se sim, avisa o operador
   no painel (mensagem para o Operador). Mostra o resultado na tela. Gateway **"Mais
   embalagens?"**: se sim, volta a receber outra embalagem; se não, a pessoa finaliza a sessão.
   Gateway **"Saldo > 0?"**: se sim, gera e imprime o voucher de uso único; se não, encerra sem
   voucher.
4. **Pessoa e Caixa:** a pessoa leva o voucher ao caixa. O caixa valida e, se o voucher é válido e
   ainda não usado, resgata como desconto na compra (o crédito volta como venda no local); se não,
   recusa.
5. **Operador do local:** ao receber o aviso, vai à máquina, esvazia o compartimento e registra no painel.

(*) **Balança:** faz parte da máquina projetada. Na simulação do projeto, a balança é representada
e não mede peso.

## O que muda do atual para o novo

| Aspecto | Hoje | Com a ReciclaAI |
|---|---|---|
| Incentivo | Nenhum: a embalagem não vale nada para quem descarta | Cada embalagem aceita gera crédito em voucher |
| Triagem | Feita pela pessoa (erra) e depois à mão na cooperativa | IA identifica antes; a máquina separa por material já na entrada |
| Orientação | Nenhuma | App diz o material, a lixeira certa e o valor, e recusa o que não é embalagem |
| Destino | A maior parte termina no aterro | Material limpo e separado por compartimento, esvaziado pelo operador |
| Papéis novos | Não existem | Caixa do local (resgata voucher) e operador do local (esvazia) |
| Controle | Nenhum | Voucher de uso único; painel com nível dos compartimentos |

## Reprodução

Os `.bpmn` podem ser abertos em https://demo.bpmn.io (menu de abrir arquivo) ou no Camunda Modeler.
