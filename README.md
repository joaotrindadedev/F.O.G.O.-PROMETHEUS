# F.O.G.O. — PROMETHEUS

O F.O.G.O. é um sistema web para organizar equipamentos, agentes, manutenções e ocorrências de uma cidade. A ideia é reunir essas informações em um só lugar, com painel, mapa e alertas para facilitar o acompanhamento.

Este guia explica como configurar e usar a aplicação no computador local.

## Tecnologias utilizadas

O projeto tem um frontend, que é a interface no navegador, e um backend, que recebe as requisições e acessa o banco de dados. Os dois foram feitos em JavaScript.

| Tecnologia | Para que foi usada |
| --- | --- |
| React 19 e Vite 7 | Construção das telas e execução do frontend em desenvolvimento. |
| Tailwind CSS 4 e Radix UI | Estilos e componentes da interface. |
| React Router e Axios | Navegação entre páginas e comunicação com a API. |
| Leaflet e React Leaflet | Mapa e marcadores de localização. |
| Recharts | Gráficos do painel e das análises. |
| Node.js e Express 5 | Servidor e rotas da API. |
| PostgreSQL e Prisma 7 | Banco de dados, consultas e migrações. |
| JWT e bcrypt | Autenticação e armazenamento das senhas como hash. |
| Zod | Validação dos dados recebidos. |
| Socket.IO | Atualizações em tempo real. |

O Docker é uma opção para executar o PostgreSQL sem instalar o banco diretamente no computador.

## O que precisa estar instalado

- **Node.js 24 ou superior**, com npm.
- **PostgreSQL**, instalado localmente ou executado pelo Docker. O Compose do projeto usa PostgreSQL 17.
- Um terminal e um editor de código, como o VS Code.

Confira o Node.js e o npm:

```powershell
node --version
npm --version
```

Os comandos abaixo podem ser usados no PowerShell. Comece na pasta principal `FOGO`. O frontend e o backend serão executados em terminais separados.

## 1. Configurar o backend

Instale as dependências:

```powershell
cd backend
npm install
```

Se ainda não existir um `.env`, copie o exemplo:

```powershell
Copy-Item .env.exemplo .env
```

Se já existir, edite o arquivo atual. O `.env` guarda as configurações locais. Exemplo:

```dotenv
DATABASE_URL=postgresql://fogo:fogo_local@localhost:5432/fogo?schema=public
POSTGRES_PASSWORD=fogo_local
PORTA=3000

JWT_SEGREDO=substitua_por_um_segredo_aleatorio_para_jwt
IOT_CHAVE=substitua_por_outro_segredo_aleatorio_para_iot
JWT_DURACAO=1h
CORS_ORIGENS=http://localhost:5173,http://127.0.0.1:5173

SEED_EMAIL=aluno@example.com
SEED_SENHA=SenhaDeEstudo123!

INTERVALO_TAREFAS_SEGUNDOS=60
SEM_COMUNICACAO_SEGUNDOS=300
MANUTENCAO_PROXIMA_HORAS=48
FUSO_ANALISE=America/Sao_Paulo
```

**Troque `JWT_SEGREDO` e `IOT_CHAVE` antes de continuar.** Cada valor precisa ter pelo menos 32 caracteres e ser diferente do outro. A aplicação rejeita os exemplos que começam com `substitua_`.

Execute este comando duas vezes e coloque um resultado em cada variável:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

| Variável | O que configurar |
| --- | --- |
| `DATABASE_URL` | Usuário, senha, endereço, porta e nome do banco PostgreSQL. |
| `POSTGRES_PASSWORD` | Senha usada pelo Docker ao criar o banco. Deve ser a mesma da URL. |
| `PORTA` | Porta da API. O frontend está configurado para acessar a porta 3000. |
| `JWT_SEGREDO` | Segredo usado para assinar os tokens de login. |
| `IOT_CHAVE` | Chave das integrações de telemetria e posições. É obrigatória mesmo no uso local. |
| `JWT_DURACAO` | Duração do token: `15m`, `30m`, `1h` ou `2h`. |
| `CORS_ORIGENS` | Endereços permitidos para acessar a API pelo navegador, separados por vírgula. |
| `SEED_EMAIL` e `SEED_SENHA` | Credenciais do usuário criado pelo seed. |

As últimas quatro opções do exemplo controlam a frequência das verificações, o tempo sem comunicação, a antecedência dos avisos de manutenção e o fuso das análises. Para começar, pode manter esses valores.

As senhas apresentadas são exemplos para estudo local. Não publique o `.env` com suas credenciais.

## 2. Preparar o banco de dados

### Opção A: Docker

Com o Docker em execução, rode dentro de `backend`:

```powershell
docker compose up -d banco
docker compose ps
```

Espere o banco ficar saudável (`healthy`). O Compose cria o banco `fogo`, com usuário `fogo`, na porta `5432`. A senha vem de `POSTGRES_PASSWORD`.

Se o volume já existia, mudar `POSTGRES_PASSWORD` no arquivo não altera a senha do banco existente. Nesse caso, configure a conexão com a senha já usada pelo banco.

### Opção B: PostgreSQL instalado

Crie um banco, por exemplo `fogo`, pelo pgAdmin ou outro cliente. Ajuste a `DATABASE_URL` com seu usuário e senha. Nessa opção, não precisa executar Docker nem configurar `POSTGRES_PASSWORD`.

### Criar as tabelas e os dados de exemplo

Com o banco disponível, execute dentro de `backend`:

```powershell
npm run prisma:gerar
npm run migrar
npm run seed
```

O primeiro comando gera o cliente Prisma. O segundo aplica as migrações e cria as tabelas. O terceiro adiciona dados fictícios e um usuário para entrar no sistema.

Para conhecer a aplicação, use o seed: ele também preenche os catálogos de órgãos, regiões e tipos usados nos formulários. O seed é bloqueado em produção e não redefine a senha de um usuário já existente com o mesmo e-mail.

## 3. Iniciar o backend

Ainda na pasta `backend`:

```powershell
npm run dev
```

A API será iniciada na porta **3000**. Deixe esse terminal aberto. Também pode usar `npm start`, que inicia sem reiniciar automaticamente quando o código é editado.

## 4. Configurar e iniciar o frontend

Abra outro terminal na pasta principal `FOGO`:

```powershell
cd frontend
npm install
```

Se ainda não existir um `.env.local`, copie o exemplo:

```powershell
Copy-Item .env.example .env.local
```

Para usar os dados de estudo, configure assim:

```dotenv
VITE_API_URL=/api/v1
VITE_SOCKET_URL=
VITE_MAPA_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
VITE_MAPA_ATRIBUICAO=&copy; OpenStreetMap contributors
VITE_AMBIENTE_DEMONSTRACAO=true
```

No desenvolvimento, o Vite encaminha `/api` e `/socket.io` ao backend na porta 3000. Por isso, `VITE_SOCKET_URL` pode ficar vazio. A opção de demonstração apenas exibe um aviso na tela; quem cria os dados é o seed do backend.

As variáveis `VITE_` ficam acessíveis no navegador. Não coloque senhas nem as chaves do backend nelas.

Inicie a interface:

```powershell
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) e entre com o e-mail e a senha definidos em `SEED_EMAIL` e `SEED_SENHA`.

## Como usar o sistema

Após entrar, use o menu lateral:

| Página | O que fazer |
| --- | --- |
| Visão geral | Acompanhar indicadores e o resumo dos alertas. |
| Mapa operacional | Consultar os recursos com localização cadastrada. |
| Equipamentos | Cadastrar, buscar, filtrar e editar equipamentos; consultar detalhes e histórico. |
| Agentes | Cadastrar e acompanhar agentes, funções e situações. |
| Manutenções | Registrar manutenção de um equipamento e acompanhar prazo, prioridade e situação. |
| Ocorrências | Registrar e consultar acontecimentos da operação. |
| Alertas | Consultar, reconhecer e resolver alertas. |
| Inteligência operacional | Consultar riscos, tendências e recomendações por região e período. |

### Exemplo de uso

1. Entre em **Equipamentos** e clique em **Cadastrar equipamento**.
2. Preencha os campos obrigatórios e selecione os dados dos catálogos. Para aparecer no mapa, informe latitude e longitude válidas.
3. Salve e confira o registro na listagem. Use a busca e os filtros para encontrá-lo.
4. Em **Manutenções**, cadastre uma manutenção vinculada ao equipamento e preencha os dados solicitados.
5. Conforme o serviço avançar, edite a situação da manutenção, por exemplo, de pendente para em andamento e depois concluída.
6. Consulte o painel, os alertas e as análises para acompanhar as informações registradas.

Equipamentos sem coordenadas continuam nas listas, mas não aparecem no mapa. As características extras são opcionais. Manutenções concluídas ou canceladas podem ser editadas e reabertas.

Todos os usuários conectados têm acesso às mesmas funções; o perfil é informativo nesta versão. A sessão fica em memória, então recarregar a página exige entrar novamente. Para sair, use o botão de saída no cabeçalho.

### Criar outro usuário

Não há cadastro pela tela de login. Adicione ao `.env` do backend:

```dotenv
USUARIO_NOME=Aluno ADS
USUARIO_EMAIL=outro.aluno@example.com
USUARIO_SENHA=OutraSenhaDeEstudo123!
USUARIO_PERFIL=OPERADOR
```

Execute na pasta `backend`:

```powershell
npm run usuario:criar
```

Use um e-mail ainda não cadastrado. A senha desse comando precisa ter pelo menos 12 caracteres e no máximo 72 bytes. Os perfis aceitos são `ADMINISTRADOR`, `GESTOR`, `OPERADOR` e `VISUALIZADOR`.

É possível criar um acesso dessa forma sem usar o seed. Nesse caso, os cadastros começam vazios e os catálogos de órgãos, regiões e tipos precisam ser preenchidos pelas rotas da API antes de usar os formulários que dependem deles.

## Organização do projeto

```text
FOGO/
├── backend/
│   ├── prisma/          # Modelo do banco, migrações e seed
│   ├── scripts/         # Criação de usuário
│   ├── src/             # Rotas, serviços, validações e tarefas
│   ├── testes/          # Testes do backend
│   └── .env.exemplo     # Modelo de configuração
├── frontend/
│   ├── src/
│   │   ├── pages/       # Páginas do sistema
│   │   ├── components/  # Formulários, mapa e gráficos
│   │   ├── contexts/    # Sessão e dados compartilhados
│   │   └── services/    # Comunicação com a API
│   └── .env.example     # Modelo de configuração
└── README.md
```

## Testes e build

Dentro de `backend`:

```powershell
npm test
npm run test:integracao
```

Os testes de integração precisam do PostgreSQL local e da conexão configurada. Eles usam um schema temporário isolado.

Dentro de `frontend`:

```powershell
npm test
npm run build
```

O build gera a pasta `frontend/dist`. Para publicar, o servidor precisa encaminhar `/api` e `/socket.io` ao backend e retornar `index.html` nas rotas do frontend. O passo a passo deste README é voltado ao desenvolvimento local.

## Problemas comuns

| Problema | O que conferir |
| --- | --- |
| Erro de conexão com o banco | Confira se o PostgreSQL está ligado e se a `DATABASE_URL` está correta. |
| Configuração inválida | Confira o `.env`, principalmente os dois segredos e as origens permitidas. |
| Login não funciona | Confira se executou o seed ou criou um usuário. Alterar `SEED_SENHA` depois não troca a senha já gravada. |
| Frontend não acessa a API | Confira se o backend está na porta 3000. Se trocar a porta, ajuste também o proxy em `frontend/vite.config.js`. |
| Porta 5173 ocupada | Encerre o processo que usa essa porta; o Vite não escolhe outra automaticamente neste projeto. |
| Mapa sem imagem de fundo | Confira a internet e o provedor configurado em `VITE_MAPA_URL`. |
| Alteração no `.env` não aparece | Reinicie o processo correspondente para carregar as configurações. |

Para encerrar, pressione `Ctrl+C` nos dois terminais. Se usou Docker, execute `docker compose stop banco` dentro de `backend`. Os dados permanecem no volume para o próximo uso.

Mais detalhes nos READMEs do [backend](backend/README.md) e do [frontend](frontend/README.md).
