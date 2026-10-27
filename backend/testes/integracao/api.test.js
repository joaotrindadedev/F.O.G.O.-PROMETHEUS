import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { io as conectarSocket } from "socket.io-client";
import { criarAplicacao } from "../../src/app.js";
import { lerAmbiente } from "../../src/config/ambiente.js";
import { configurarSocket } from "../../src/sockets/tempo-real.js";
import { verificarComunicacao } from "../../src/jobs/verificacoes.js";

test(
  "integração completa com PostgreSQL isolado e Socket.IO",
  { timeout: 120000 },
  async (contexto) => {
    assert.ok(
      process.env.DATABASE_URL,
      "Configure DATABASE_URL antes dos testes de integração.",
    );
    const esquema = `teste_${randomUUID().replaceAll("-", "")}`;
    const url = new URL(process.env.DATABASE_URL);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(url.hostname),
      "Testes automáticos exigem um PostgreSQL local.",
    );
    url.searchParams.set("schema", esquema);
    const banco = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: url.toString() },
        { schema: esquema },
      ),
    });
    let servidor;
    let tempoReal;
    contexto.after(async () => {
      if (tempoReal)
        await new Promise((resolver) => tempoReal.io.close(resolver));
      else if (servidor)
        await new Promise((resolver) => servidor.close(resolver));
      // Somente o schema aleatório criado por este teste é removido, nunca public.
      if (!/^teste_[a-f0-9]{32}$/.test(esquema))
        throw new Error("Schema de teste inválido.");
      await banco.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${esquema}" CASCADE`,
      );
      await banco.$disconnect();
    });
    const migracao = spawnSync(
      process.execPath,
      ["node_modules/prisma/build/index.js", "migrate", "deploy"],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(migracao.status, 0, migracao.stderr);
    const ambiente = lerAmbiente();
    const senha = "SenhaDeTesteSegura123";
    const hash = await bcrypt.hash(senha, 4);
    const administrador = await banco.usuario.create({
      data: {
        nome: "Admin teste",
        email: "admin@teste.local",
        senhaHash: hash,
        perfil: "ADMINISTRADOR",
      },
    });
    await banco.usuario.create({
      data: {
        nome: "Leitor teste",
        email: "leitor@teste.local",
        senhaHash: hash,
        perfil: "VISUALIZADOR",
      },
    });
    const aplicacao = criarAplicacao({
      banco,
      ambiente,
      publicar: (...argumentos) => tempoReal?.publicar(...argumentos),
    });
    servidor = createServer(aplicacao.app);
    tempoReal = configurarSocket(servidor, ambiente, aplicacao.autenticacao);
    servidor.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const endereco = `http://127.0.0.1:${servidor.address().port}`;
    async function requisitar(
      caminho,
      { metodo = "GET", dados, token, integracao = false, origem } = {},
    ) {
      const resposta = await fetch(`${endereco}/api/v1${caminho}`, {
        method: metodo,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(integracao ? { "x-chave-integracao": ambiente.IOT_CHAVE } : {}),
          ...(origem ? { Origin: origem } : {}),
        },
        ...(dados ? { body: JSON.stringify(dados) } : {}),
      });
      return {
        status: resposta.status,
        dados: resposta.status === 204 ? null : await resposta.json(),
      };
    }
    let token;
    let leitor;
    let regiao;
    let equipamento;
    let agente;
    let manutencao;
    await contexto.test(
      "autenticação e acesso igual para todos os perfis",
      async () => {
        assert.equal((await requisitar("/equipamentos")).status, 401);
        assert.equal(
          (
            await requisitar("/autenticacao/entrar", {
              metodo: "POST",
              dados: { email: administrador.email, senha: "errada" },
            })
          ).status,
          401,
        );
        const entrada = await requisitar("/autenticacao/entrar", {
          metodo: "POST",
          dados: { email: administrador.email, senha },
        });
        token = entrada.dados.token;
        assert.equal(entrada.status, 200);
        assert.equal(entrada.dados.usuario.senhaHash, undefined);
        leitor = (
          await requisitar("/autenticacao/entrar", {
            metodo: "POST",
            dados: { email: "leitor@teste.local", senha },
          })
        ).dados.token;
        assert.equal(
          (await requisitar("/agentes", { token: leitor })).status,
          200,
        );
        assert.equal(
          (
            await requisitar("/mapa/recursos?recurso=agentes", {
              token: leitor,
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await requisitar("/equipamentos", {
              token,
              origem: "https://origem-invalida.local",
            })
          ).status,
          403,
        );
        assert.equal(
          (await requisitar("/equipamentos?limite=101", { token })).status,
          422,
        );
      },
    );
    await contexto.test(
      "catálogos, equipamentos, propriedades e histórico transacional",
      async () => {
        regiao = (
          await requisitar("/regioes", {
            metodo: "POST",
            token,
            dados: {
              nome: "Centro teste",
              cidade: "Cidade teste",
              estado: "SP",
              bairros: ["Centro"],
            },
          })
        ).dados;
        const orgao = (
          await requisitar("/orgaos", {
            metodo: "POST",
            token,
            dados: { nome: "Órgão teste", sigla: "OT" },
          })
        ).dados;
        const tipo = (
          await requisitar("/tipos-equipamentos", {
            metodo: "POST",
            token,
            dados: { nome: "Câmera teste", familia: "CAMERA" },
          })
        ).dados;
        const dados = {
          tipoId: tipo.id,
          orgaoId: orgao.id,
          regiaoId: regiao.id,
          marca: "Teste",
          modelo: "Teste",
          descricao: "Teste",
          cidade: "Cidade teste",
          estado: "SP",
          bairro: "Centro",
          latitude: -23,
          longitude: -46,
          situacao: "OPERACIONAL",
          propriedades: {
            visaoNoturna: true,
            resolucao: "HD",
            capturaColorida: true,
          },
        };

        const criacao = await requisitar("/equipamentos", {
          metodo: "POST",
          token: leitor,
          dados: {
            ...dados,
            latitude: null,
            longitude: null,
            propriedades: {},
          },
        });
        assert.equal(criacao.status, 201);
        equipamento = criacao.dados;
        assert.equal(
          (
            await requisitar(`/equipamentos/${equipamento.id}`, {
              metodo: "PATCH",
              token,
              dados: { situacao: "MAU_FUNCIONAMENTO" },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await requisitar(`/equipamentos/${equipamento.id}`, {
              metodo: "PATCH",
              token,
              dados: {
                situacao: "MAU_FUNCIONAMENTO",
                motivo: "Falha identificada.",
              },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await requisitar(`/equipamentos/${equipamento.id}/historico`, {
              token,
            })
          ).dados.paginacao.total,
          2,
        );
        assert.equal(
          (
            await requisitar(`/equipamentos/${equipamento.id}`, {
              metodo: "PATCH",
              token: leitor,
              dados: { latitude: -23, longitude: -46 },
            })
          ).status,
          200,
        );
        agente = (
          await requisitar("/agentes", {
            metodo: "POST",
            token,
            dados: {
              nome: "Agente teste",
              matricula: "TESTE-1",
              funcao: "Agente",
              orgaoId: orgao.id,
              regiaoId: regiao.id,
              baseOperacional: "Base",
              cidade: "Cidade teste",
              latitude: -23,
              longitude: -46,
            },
          })
        ).dados;
        assert.ok(agente.id);
      },
    );
    await contexto.test(
      "manutenção atrasada, encerramento e histórico",
      async () => {
        manutencao = (
          await requisitar("/manutencoes", {
            metodo: "POST",
            token,
            dados: {
              equipamentoId: equipamento.id,
              tipo: "IMEDIATA",
              descricao: "Reparo",
              prioridade: "CRITICA",
              dataPrevista: new Date(Date.now() - 86400000).toISOString(),
            },
          })
        ).dados;
        assert.ok(manutencao.id);
        assert.equal(
          (await requisitar("/manutencoes?prazo=ATRASADA", { token })).dados
            .paginacao.total,
          1,
        );
        assert.equal(
          (
            await requisitar(`/manutencoes/${manutencao.id}`, {
              metodo: "PATCH",
              token,
              dados: { situacao: "CONCLUIDA" },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await requisitar(`/manutencoes/${manutencao.id}/historico`, {
              token,
            })
          ).dados.paginacao.total,
          2,
        );
        assert.equal(
          (
            await requisitar(`/manutencoes/${manutencao.id}`, {
              metodo: "PATCH",
              token,
              dados: { situacao: "PENDENTE" },
            })
          ).status,
          200,
        );
        assert.equal(
          (await banco.manutencao.findUnique({ where: { id: manutencao.id } }))
            .dataConclusao,
          null,
        );
      },
    );
    await contexto.test(
      "dashboard e mapa consultam dados persistidos",
      async () => {
        const resumo = (await requisitar("/painel/resumo", { token })).dados;
        assert.equal(resumo.totalEquipamentos, 1);
        assert.equal(resumo.equipamentosIndisponiveis, 1);
        assert.equal(resumo.percentualDisponibilidade, 0);
        assert.equal(
          (
            await requisitar(
              "/mapa/recursos?sul=-24&norte=-22&oeste=-47&leste=-45",
              { token },
            )
          ).dados.paginacao.total,
          1,
        );
        assert.equal(
          (
            await requisitar("/mapa/recursos?sul=0&norte=1&oeste=0&leste=1", {
              token,
            })
          ).dados.paginacao.total,
          0,
        );
      },
    );
    await contexto.test(
      "telemetria idempotente, alertas sem duplicação e reconexão",
      async () => {
        await banco.equipamento.update({
          where: { id: equipamento.id },
          data: { criadoEm: new Date(0) },
        });
        await verificarComunicacao(banco, () => {}, ambiente);
        await verificarComunicacao(banco, () => {}, ambiente);
        assert.equal(
          await banco.alerta.count({ where: { situacao: "ABERTO" } }),
          1,
        );
        const dados = {
          equipamentoId: equipamento.id,
          identificadorMensagem: "teste-mensagem",
          ocorridoEm: new Date().toISOString(),
          dados: { temperatura: 30 },
        };
        assert.equal(
          (await requisitar("/telemetria", { metodo: "POST", token, dados }))
            .status,
          401,
        );
        assert.equal(
          (
            await requisitar("/telemetria", {
              metodo: "POST",
              integracao: true,
              dados,
            })
          ).status,
          201,
        );
        assert.equal(
          (
            await requisitar("/telemetria", {
              metodo: "POST",
              integracao: true,
              dados,
            })
          ).dados.duplicada,
          true,
        );
        assert.equal(await banco.telemetria.count(), 1);
        assert.equal(
          await banco.alerta.count({ where: { situacao: "RESOLVIDO" } }),
          1,
        );
        assert.equal(
          (
            await banco.equipamento.findUnique({
              where: { id: equipamento.id },
            })
          ).situacao,
          "MAU_FUNCIONAMENTO",
        );
        await banco.equipamento.update({
          where: { id: equipamento.id },
          data: { ultimaComunicacao: new Date(0) },
        });
        await verificarComunicacao(banco, () => {}, ambiente);
        const novoAlerta = await banco.alerta.findFirst({
          where: { situacao: "ABERTO" },
        });
        assert.equal(
          (
            await requisitar(`/alertas/${novoAlerta.id}`, {
              metodo: "PATCH",
              token,
              dados: { situacao: "RECONHECIDO" },
            })
          ).status,
          200,
        );
        assert.equal(
          (
            await requisitar(`/alertas/${novoAlerta.id}`, {
              metodo: "PATCH",
              token,
              dados: { situacao: "RESOLVIDO" },
            })
          ).status,
          200,
        );
        await verificarComunicacao(banco, () => {}, ambiente);
        assert.equal(
          await banco.alerta.count(),
          2,
          "Resolver sem recuperar conexão não deve gerar alerta repetido.",
        );
      },
    );
    await contexto.test(
      "posições antigas não sobrescrevem a localização atual",
      async () => {
        const dados = {
          agenteId: agente.id,
          latitude: -20,
          longitude: -40,
          ocorridoEm: new Date(Date.now() + 1000).toISOString(),
        };
        assert.equal(
          (
            await requisitar("/posicoes", {
              metodo: "POST",
              integracao: true,
              dados,
            })
          ).dados.atualizouPosicao,
          true,
        );
        const antiga = await requisitar("/posicoes", {
          metodo: "POST",
          integracao: true,
          dados: {
            ...dados,
            latitude: -10,
            ocorridoEm: new Date(0).toISOString(),
          },
        });
        assert.equal(antiga.dados.atualizouPosicao, false);
        assert.equal(
          (await banco.agente.findUnique({ where: { id: agente.id } }))
            .latitude,
          -20,
        );
      },
    );
    await contexto.test(
      "alertas de agentes ficam visíveis para todos os usuários",
      async () => {
        const dados = {
          tipo: "APOIO_OPERACIONAL",
          titulo: "Apoio",
          descricao: "Solicitação de teste",
          origem: "TESTE",
          gravidade: "ALTA",
          agenteId: agente.id,
        };
        const criacao = await requisitar("/alertas", {
          metodo: "POST",
          token,
          dados,
        });
        assert.equal(criacao.status, 201);
        assert.equal(
          (await requisitar("/alertas", { metodo: "POST", token, dados }))
            .status,
          409,
        );
        assert.equal(
          (await requisitar(`/alertas/${criacao.dados.id}`, { token: leitor }))
            .status,
          200,
        );
        assert.equal(
          (await requisitar("/alertas", { token: leitor })).dados.dados.some(
            (alerta) => alerta.agenteId,
          ),
          true,
        );
      },
    );
    await contexto.test(
      "ocorrências, risco, recomendações e histórico de análises",
      async () => {
        for (let indice = 0; indice < 12; indice++)
          assert.equal(
            (
              await requisitar("/ocorrencias", {
                metodo: "POST",
                token,
                dados: {
                  categoria: "Teste",
                  descricao: "Ocorrência teste",
                  gravidade: "CRITICA",
                  regiaoId: regiao.id,
                  ocorridoEm: new Date(
                    Date.now() - (indice + 1) * 3600000,
                  ).toISOString(),
                  origem: "TESTE",
                },
              })
            ).status,
            201,
          );
        const risco = (
          await requisitar(`/previsoes/riscos/${regiao.id}`, { token })
        ).dados;
        assert.equal(risco.fatores.ocorrencias, 12);
        assert.ok(risco.pontuacao > 0 && risco.pontuacao <= 100);
        assert.equal(
          (await requisitar("/previsoes/horarios-criticos", { token })).dados
            .amostras,
          12,
        );
        assert.equal(
          (await requisitar("/previsoes/tendencias", { token })).dados.dados[0]
            .atual,
          12,
        );
        assert.equal(
          (await requisitar("/previsoes/anomalias", { token })).dados.dados[0]
            .defeitos.dadosSuficientes,
          false,
        );
        await aplicacao.previsoes.registrarAnalises();
        await aplicacao.previsoes.registrarAnalises();
        assert.equal(await banco.previsao.count(), 1);
        assert.ok(
          (await requisitar("/recomendacoes", { token })).dados.paginacao
            .total > 0,
        );
      },
    );
    await contexto.test(
      "Socket.IO autentica e entrega eventos de agentes para todos os perfis",
      async () => {
        const administradorSocket = conectarSocket(endereco, {
          auth: { token },
          transports: ["websocket"],
          reconnection: false,
        });
        const leitorSocket = conectarSocket(endereco, {
          auth: { token: leitor },
          transports: ["websocket"],
          reconnection: false,
        });
        try {
          await Promise.all([
            once(administradorSocket, "connect"),
            once(leitorSocket, "connect"),
          ]);
          let recebeuPrivado = false;
          leitorSocket.on("agente:atualizado", () => {
            recebeuPrivado = true;
          });
          const recebido = once(administradorSocket, "agente:atualizado");
          assert.equal(
            (
              await requisitar(`/agentes/${agente.id}`, {
                metodo: "PATCH",
                token,
                dados: { situacao: "EM_ATIVIDADE" },
              })
            ).status,
            200,
          );
          assert.equal((await recebido)[0].id, agente.id);
          // Um evento público posterior confirma que os eventos anteriores foram processados.
          const barreira = once(leitorSocket, "teste:barreira");
          await tempoReal.publicar("teste:barreira", {});
          await barreira;
          assert.equal(recebeuPrivado, true);
        } finally {
          administradorSocket.disconnect();
          leitorSocket.disconnect();
        }
      },
    );
    await contexto.test(
      "exclusão lógica preserva históricos e desativação revoga token",
      async () => {
        assert.equal(
          (
            await requisitar(`/equipamentos/${equipamento.id}`, {
              metodo: "DELETE",
              token: leitor,
            })
          ).status,
          204,
        );
        assert.equal(
          (await requisitar(`/equipamentos/${equipamento.id}`, { token }))
            .status,
          404,
        );
        assert.equal(
          await banco.historicoSituacao.count({
            where: { equipamentoId: equipamento.id },
          }),
          2,
        );
        await banco.usuario.update({
          where: { id: administrador.id },
          data: { ativo: false },
        });
        assert.equal(
          (await requisitar("/autenticacao/meu-perfil", { token })).status,
          401,
        );
      },
    );
  },
);
