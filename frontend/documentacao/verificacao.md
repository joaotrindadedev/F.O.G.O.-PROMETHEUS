> Registro da implementação anterior à simplificação. Para o comportamento atual e comandos, consulte o [README](../README.md). As restrições por perfil descritas aqui foram removidas.

# Verificação da entrega

Realizada em 22/10/2026 (horário de Brasília).

- Compilação de produção com Vite concluída.
- 12 testes unitários: filtros, coordenadas inválidas, permissões, preservação do horário da posição, motivo da mudança de situação, regras de radar, edição de manutenção, datas e formatos de CEP/UF.
- Integração somente de leitura: login, perfil, 18 endpoints REST e conexão Socket.IO autenticada, usando a conta demonstrativa do backend local. Credenciais não foram registradas.
- Navegador integrado: login real; painel com 36 equipamentos e 9 agentes; mapa OpenStreetMap com agrupamento; navegação móvel; páginas de equipamentos, agentes, manutenção, ocorrências, alertas e inteligência.
- Fluxos interativos conferidos: busca por número de série, consulta detalhada, histórico, validação de cadastro vazio com erros junto aos campos e foco no primeiro erro, cancelamento, alternância de abas de tendências/anomalias.
- Console sem novos erros/avisos na passagem final pelas páginas. Durante implementação houve falha de pré-compilação de dependências React, corrigida com deduplicação e configuração explícita de dependências. O provedor cartográfico inicial exigiu chave; foi substituído por OpenStreetMap e verificado visualmente.
- Revisão de código conforme Web Interface Guidelines: rótulos, foco, diálogos Radix, estados de erro, confirmação destrutiva, semântica, responsividade e redução de movimento.

## Limites da verificação

O Chrome DevTools MCP não estava configurado. O navegador integrado permitiu inspecionar a interface e o console, mas não foi feita auditoria Lighthouse nem captura completa de rede. A revisão visual ocorreu no painel estreito do navegador integrado; a composição desktop foi implementada com breakpoints e permanece no roteiro de homologação.

Não foram alterados registros existentes para testar exclusões, resolução de alertas ou fechamento de manutenção. As mutações estão implementadas nos endpoints reais, mas a homologação de ponta a ponta das gravações, de todos os perfis e de reconexão com eventos reais pendentes deve seguir o roteiro do README em uma base de teste. Os testes de permissão do frontend não substituem testes de autorização do servidor.

As ausências de geometria regional e de série histórica de disponibilidade no backend estão explicitadas na aplicação e no README. Não foram criadas geometrias, previsões ou séries artificiais para preencher essas lacunas.
