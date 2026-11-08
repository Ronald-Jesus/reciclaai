# A10 · Registro de mudanças (CRF)

> Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson, 2018.
> Seção 25.3, Fig. 25.14 e 25.15, p. 709–711 (gerenciamento de mudanças). Nenhuma mudança entra no
> quadro sem passar por aqui.

Como o projeto é individual, o autor registra e decide (papel do comitê de mudanças), e o professor
é informado no status semanal. As mudanças abaixo foram aprovadas antes da linha de base.

| ID | Data | Solicitante | Descrição | Válida? | Impacto e custo | Decisão | Decidido por | Implementada e testada |
|---|---|---|---|---|---|---|---|---|
| M01 | Antes de 08/11/2026 | Autor | Trocar a interface para React (Vite) servido pelo Flask, registrado no ADR-001 (#38) | Sim | Substitui o front-end anterior; 1,5 h em #38; a IA e o Flask não mudam | Aprovada | Autor | Pendente |
| M02 | Antes de 08/11/2026 | Autor | Publicar no Hugging Face Spaces e usar PostgreSQL no Neon, com SQLite local (#28, #52, ADR-002) | Sim | 2,5 h em #52; risco R7; HTTPS libera a câmera | Aprovada | Autor | Pendente |
| M03 | Antes de 08/11/2026 | Autor | Acrescentar as classes orgânico e `nao_residuo` (8 classes) no dataset, no treino e no servidor (#15, #16, #20) | Sim | Mais esforço no dataset; risco R3; evita selfie lida como material | Aprovada | Autor | Pendente |
| M04 | Antes de 08/11/2026 | Autor | Vídeo da máquina gerado por IA, em quadros sobre palco escuro, com SVG como alternativa (#41, #42) | Sim | Risco R6; SVG garante a seção sem os quadros | Aprovada | Autor | Pendente |
| M05 | Antes de 08/11/2026 | Autor | Busca real de mercados no #45, em lugar da lista salva como fonte principal (absorve o antigo #49) | Sim | +0,5 h no #45; caminho crítico passa a 12,5 h; lista salva fica como reserva (R5) | Aprovada | Autor | Pendente |
| M06 | Antes de 08/11/2026 | Autor | Substituir as issues #18, #19 e #50 por #38 a #46; Lenis e Vanta passam para #39 e #40 | Sim | Sem horas extras; EAP e RACI atualizados | Aprovada | Autor | Concluída |
