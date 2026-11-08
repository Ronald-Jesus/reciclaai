# A02 · Registro de partes interessadas

> Referência: SOMMERVILLE, Ian. *Engenharia de software*. 10. ed. São Paulo: Pearson, 2018.
> Seção 22.3.3, p. 626–627 (comunicação). Poder e interesse de 1 (baixo) a 3 (alto).

Regra da estratégia (a mesma da planilha do Kit): poder e interesse a partir de 2 = **gerenciar de
perto**; só poder alto = **manter satisfeito**; só interesse alto = **manter informado**; demais =
**monitorar**.

| Parte interessada | Papel | Poder | Interesse | Estratégia | Necessidade de informação |
|---|---|---|---|---|---|
| Professor da disciplina | Patrocinador, cliente e avaliador | 3 | 3 | Gerenciar de perto | Status semanal (A09), riscos altos (A07), mudanças (A10) e demonstração em cada marco |
| Autor do projeto | Gerente e executor | 3 | 3 | Gerenciar de perto | Quadro, burndown e riscos atualizados toda semana |
| Banca da defesa | Arguição em 03/12/2026 | 3 | 2 | Gerenciar de perto | Demonstração, documentação e domínio do código |
| Turma e usuários de teste | Usuários da subpágina | 1 | 2 | Manter informado | Endereço público, instruções de teste e canal para dar retorno |
| Provedores (Hugging Face, Neon, OpenStreetMap, bancos de fotos) | Serviços e conteúdo de terceiros | 2 | 1 | Manter satisfeito | Respeitar termos, limites dos planos gratuitos e créditos |

Os provedores têm poder porque podem limitar ou suspender o serviço (risco R7 em
[A07](A07-riscos.md)); o interesse deles no projeto é baixo.
