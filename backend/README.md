# Backend F.O.G.O.

API Express com Prisma e PostgreSQL. Veja o [guia principal](../README.md) para iniciar.

## Comandos

| Comando | Para que serve |
| --- | --- |
| npm start | Inicia a API. |
| npm run dev | Reinicia a API ao editar arquivos. |
| npm run prisma:gerar | Gera o cliente usado para consultar o banco. |
| npm run migrar | Aplica as migrações existentes. |
| npm run migrar:desenvolvimento | Cria uma migração ao mudar o schema. |
| npm run prisma:validar | Confere o schema. |
| npm run seed | Carrega dados demonstrativos. |
| npm run usuario:criar | Cria um usuário. |
| npm test | Testa validações básicas e cálculos. |
| npm run test:integracao | Testa API e sockets em um schema temporário isolado. |

O gerador de cópia completa do código foi removido; consulte src/ diretamente.
O PostgreSQL é administrado diretamente pelo serviço instalado ou pelo Docker.

## Configuração

O .env contém DATABASE_URL, JWT_SEGREDO, IOT_CHAVE e CORS_ORIGENS.
Use .env.exemplo como referência em uma instalação nova. Configure DATABASE_URL
para um banco PostgreSQL existente e mantenha o serviço em execução.

Se preferir o Docker, execute na pasta backend:

```powershell
docker compose up -d banco
```

O compose usa a porta 5432, banco e usuário `fogo`. A senha é o valor de
POSTGRES_PASSWORD ou, quando não configurado, `fogo_local`. Configure DATABASE_URL
com esses mesmos dados. Para parar, execute `docker compose stop banco`.
Os dados ficam no volume Docker entre reinicializações.

A aplicação não cria o servidor PostgreSQL nem gera o .env automaticamente.
Com o banco disponível, execute `npm run migrar` e `npm start`.

Para criar um usuário, configure USUARIO_NOME, USUARIO_EMAIL, USUARIO_SENHA
e, opcionalmente, USUARIO_PERFIL antes de executar `npm run usuario:criar`.
Todos os perfis têm o mesmo acesso. O campo permanece para preservar os cadastros.

## Fluxo do código

server.js inicia o servidor; app.js registra as rotas. Cada rota valida a
entrada e chama um serviço, que consulta ou grava com Prisma. O middleware de
erros transforma falhas em mensagens para o frontend.

As rotas /api/v1 exigem login, exceto o próprio login e as integrações
/telemetria e /posicoes, que usam x-chave-integracao. Não há autorização por perfil.

Coordenadas são opcionais, mas latitude e longitude devem formar um par válido.
Características de equipamento são opcionais e livres. Alterações de situação
dispensam motivo. Manutenções podem ser reabertas; a data de conclusão é limpa
ao sair de CONCLUIDA. Exclusões preservam o histórico.

Os utilitários de paginação, filtros e cálculos são compartilhados pelas telas.
jobs/verificacoes.js gera alertas de falta de comunicação e análises periódicas.
sockets/tempo-real.js avisa todos os usuários conectados sobre alterações.

Os testes de integração criam e removem apenas um schema aleatório teste_* no
PostgreSQL local. Não executam seed nem apagam os dados da aplicação.
