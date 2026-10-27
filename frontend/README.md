# Frontend F.O.G.O.

Interface React com Vite. Com o backend ativo, execute `npm install` e
`npm run dev`. Abra http://localhost:5173.

`npm run build` gera dist/; `npm run preview` permite conferir a compilação.
`npm test` verifica filtros, coordenadas e preparação dos formulários.
`npm run formatar` formata o código.

## Organização

- pages/: painel, cadastros, alertas, análises e login.
- components/: formulário, mapa, gráficos e componentes visuais.
- routes/Routes.jsx: páginas e verificação de login.
- contexts/: sessão, catálogos e atualização das consultas.
- services/api.js: requisições ao backend.
- utils/formularios.js: campos e conversão dos valores enviados.
- utils/dados.js: rótulos, datas, filtros e coordenadas do mapa.
- utils/utils.js: combinação de classes CSS dos componentes visuais.

Todos os usuários conectados veem os mesmos menus e ações. A sessão fica em
memória; recarregar a página exige entrar novamente. O login usa diretamente
o usuário retornado pela API, sem uma consulta adicional.

Características específicas e motivo de alteração são opcionais. Equipamentos
sem coordenadas continuam nas listagens; apenas não aparecem como marcadores.
Manutenções encerradas continuam com o botão de edição disponível.

O script separado de verificação da API foi removido: a integração é testada no
backend. Mapa, gráficos e atualizações em tempo real continuam disponíveis.

Para publicar dist/, configure fallback para index.html nas rotas e encaminhe
/api e /socket.io ao backend. Endereços e opções do mapa estão em .env.example.
