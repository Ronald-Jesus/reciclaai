# A10 · Registro de mudanças (CRF)

> Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson, 2018.
> Seção 25.3, Fig. 25.14 e 25.15, p. 709–711 (gerenciamento de mudanças). Nenhuma mudança entra no
> quadro sem passar por aqui.

Como o projeto é individual, o autor registra e decide (papel do comitê de mudanças), e o professor
é informado no status semanal. As mudanças M01 a M06 foram aprovadas antes da linha de base; a M07 foi aprovada em 08/11/2026, já na execução.

| ID | Data | Solicitante | Descrição | Válida? | Impacto e custo | Decisão | Decidido por | Implementada e testada |
|---|---|---|---|---|---|---|---|---|
| M01 | Antes de 08/11/2026 | Autor | Trocar a interface para React (Vite) servido pelo Flask, registrado no ADR-001 (#38) | Sim | Substitui o front-end anterior; 1,5 h em #38; a IA e o Flask não mudam | Aprovada | Autor | Pendente |
| M02 | Antes de 08/11/2026 | Autor | Publicar no Hugging Face Spaces e usar PostgreSQL no Neon, com SQLite local (#28, #52, ADR-002) | Sim | 2,5 h em #52; risco R7; HTTPS libera a câmera | Aprovada | Autor | Pendente |
| M03 | Antes de 08/11/2026 | Autor | Acrescentar as classes orgânico e `nao_residuo` (8 classes) no dataset, no treino e no servidor (#15, #16, #20) | Sim | Mais esforço no dataset; risco R3; evita selfie lida como material | Aprovada | Autor | Pendente |
| M04 | Antes de 08/11/2026 | Autor | Vídeo da máquina gerado por IA, em quadros sobre palco escuro, com SVG como alternativa (#41, #42) | Sim | Risco R6; SVG garante a seção sem os quadros | Aprovada | Autor | Pendente |
| M05 | Antes de 08/11/2026 | Autor | Busca real de mercados no #45, em lugar da lista salva como fonte principal (absorve o antigo #49) | Sim | +0,5 h no #45; caminho crítico passa a 12,5 h; lista salva fica como reserva (R5) | Aprovada | Autor | Pendente |
| M06 | Antes de 08/11/2026 | Autor | Substituir as issues #18, #19 e #50 por #38 a #46; Lenis e Vanta passam para #39 e #40 | Sim | Sem horas extras; EAP e RACI atualizados | Aprovada | Autor | Concluída |
| M07 | 08/11/2026 | Autor | Antecipar o término de todo o trabalho do projeto para 27/11/2026, mantendo a defesa em 03/12/2026: I2 passa a 09 a 20/11 (marco em 20/11), I3 a 23 a 27/11 (marco "Projeto concluído" em 27/11), preparo da defesa (#32 a #34) em 30/11 a 02/12 e 28/11 a 02/12 como contingência e folga. Motivo: progresso à frente do plano (documentos do I1 e Parte 2 concluídos em 07 e 08/11) | Sim | Mesmas 41,5 h, redistribuídas (9,0 h em 09 a 13/11; 12,0 em 16 a 20/11; 7,5 em 23 a 27/11); semana de 16 a 20/11 com 12 h, acima das 10 h médias (R1); caminho crítico inalterado (12,5 h), agora terminando em 26/11; #8 e #14 passam a 12 e 13/11; baseline de VP revisada ([A09](A09-status-EVM.md)); [A01](A01-TAP.md), [A04](A04-cronograma.md), [A05](A05-estimativas.md) e [A07](A07-riscos.md) atualizados; marcos e quadro do GitHub ajustados | Aprovada | Autor (08/11/2026) | Documentos concluídos em 08/11; quadro e marcos do GitHub no mesmo dia |
