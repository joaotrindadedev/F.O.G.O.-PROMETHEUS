-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'GESTOR', 'OPERADOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "SituacaoEquipamento" AS ENUM ('NAO_INSTALADO', 'OPERACIONAL', 'MAU_FUNCIONAMENTO', 'EM_MANUTENCAO', 'DESATIVADO', 'FURTADO');

-- CreateEnum
CREATE TYPE "FamiliaEquipamento" AS ENUM ('CAMERA', 'RADAR', 'VEICULO', 'OUTRO');

-- CreateEnum
CREATE TYPE "Mobilidade" AS ENUM ('FIXO', 'MOVEL');

-- CreateEnum
CREATE TYPE "SituacaoAgente" AS ENUM ('EM_ATIVIDADE', 'DISPONIVEL', 'AFASTADO', 'FORA_DE_SERVICO');

-- CreateEnum
CREATE TYPE "TipoManutencao" AS ENUM ('IMEDIATA', 'AGENDADA', 'PERIODICA');

-- CreateEnum
CREATE TYPE "SituacaoManutencao" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "Gravidade" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "SituacaoAlerta" AS ENUM ('ABERTO', 'RECONHECIDO', 'RESOLVIDO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'VISUALIZADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orgao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Orgao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regiao" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "bairros" TEXT[],
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Regiao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoEquipamento" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "familia" "FamiliaEquipamento" NOT NULL DEFAULT 'OUTRO',
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TipoEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" UUID NOT NULL,
    "tipoId" UUID NOT NULL,
    "orgaoId" UUID NOT NULL,
    "regiaoId" UUID,
    "numeroSerie" TEXT,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "mobilidade" "Mobilidade" NOT NULL DEFAULT 'FIXO',
    "situacao" "SituacaoEquipamento" NOT NULL DEFAULT 'NAO_INSTALADO',
    "cep" TEXT,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "rua" TEXT,
    "referencia" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "baseOperacional" TEXT,
    "baseLatitude" DOUBLE PRECISION,
    "baseLongitude" DOUBLE PRECISION,
    "propriedades" JSONB NOT NULL DEFAULT '{}',
    "ultimaComunicacao" TIMESTAMPTZ(3),
    "ultimaPosicaoEm" TIMESTAMPTZ(3),
    "semComunicacao" BOOLEAN NOT NULL DEFAULT false,
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoSituacao" (
    "id" UUID NOT NULL,
    "equipamentoId" UUID NOT NULL,
    "situacaoAnterior" "SituacaoEquipamento",
    "situacaoNova" "SituacaoEquipamento" NOT NULL,
    "motivo" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoSituacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manutencao" (
    "id" UUID NOT NULL,
    "equipamentoId" UUID NOT NULL,
    "tipo" "TipoManutencao" NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" "Gravidade" NOT NULL,
    "situacao" "SituacaoManutencao" NOT NULL DEFAULT 'PENDENTE',
    "dataPrevista" TIMESTAMPTZ(3) NOT NULL,
    "dataConclusao" TIMESTAMPTZ(3),
    "observacoes" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Manutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoManutencao" (
    "id" UUID NOT NULL,
    "manutencaoId" UUID NOT NULL,
    "dados" JSONB NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoManutencao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agente" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "orgaoId" UUID NOT NULL,
    "regiaoId" UUID,
    "baseOperacional" TEXT NOT NULL,
    "bairro" TEXT,
    "cidade" TEXT NOT NULL,
    "situacao" "SituacaoAgente" NOT NULL DEFAULT 'FORA_DE_SERVICO',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "ultimaPosicaoEm" TIMESTAMPTZ(3),
    "excluidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPosicao" (
    "id" UUID NOT NULL,
    "equipamentoId" UUID,
    "agenteId" UUID,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "ocorridoEm" TIMESTAMPTZ(3) NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPosicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telemetria" (
    "id" UUID NOT NULL,
    "equipamentoId" UUID NOT NULL,
    "identificadorMensagem" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "ocorridoEm" TIMESTAMPTZ(3) NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Telemetria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ocorrencia" (
    "id" UUID NOT NULL,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "gravidade" "Gravidade" NOT NULL,
    "ocorridoEm" TIMESTAMPTZ(3) NOT NULL,
    "bairro" TEXT,
    "regiaoId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "origem" TEXT NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "gravidade" "Gravidade" NOT NULL,
    "situacao" "SituacaoAlerta" NOT NULL DEFAULT 'ABERTO',
    "chaveAtiva" TEXT,
    "equipamentoId" UUID,
    "agenteId" UUID,
    "regiaoId" UUID,
    "ocorridoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Previsao" (
    "id" UUID NOT NULL,
    "regiaoId" UUID NOT NULL,
    "pontuacao" DOUBLE PRECISION NOT NULL,
    "classificacao" TEXT NOT NULL,
    "fatores" JSONB NOT NULL,
    "inicioPeriodo" TIMESTAMPTZ(3) NOT NULL,
    "fimPeriodo" TIMESTAMPTZ(3) NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Previsao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recomendacao" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "prioridade" "Gravidade" NOT NULL,
    "justificativa" TEXT NOT NULL,
    "regiaoId" UUID NOT NULL,
    "equipamentoId" UUID,
    "previsaoId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recomendacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndicadorOperacional" (
    "id" UUID NOT NULL,
    "regiaoId" UUID NOT NULL,
    "total" INTEGER NOT NULL,
    "elegiveis" INTEGER NOT NULL,
    "defeituosos" INTEGER NOT NULL,
    "semComunicacao" INTEGER NOT NULL,
    "alertasAtivos" INTEGER NOT NULL,
    "disponibilidade" DOUBLE PRECISION NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "IndicadorOperacional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Orgao_nome_key" ON "Orgao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_nome_cidade_estado_key" ON "Regiao"("nome", "cidade", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "TipoEquipamento_nome_key" ON "TipoEquipamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_numeroSerie_key" ON "Equipamento"("numeroSerie");

-- CreateIndex
CREATE INDEX "Equipamento_regiaoId_situacao_excluidoEm_idx" ON "Equipamento"("regiaoId", "situacao", "excluidoEm");

-- CreateIndex
CREATE INDEX "Equipamento_tipoId_orgaoId_idx" ON "Equipamento"("tipoId", "orgaoId");

-- CreateIndex
CREATE INDEX "Equipamento_ultimaComunicacao_idx" ON "Equipamento"("ultimaComunicacao");

-- CreateIndex
CREATE INDEX "Equipamento_cidade_bairro_idx" ON "Equipamento"("cidade", "bairro");

-- CreateIndex
CREATE INDEX "HistoricoSituacao_equipamentoId_criadoEm_idx" ON "HistoricoSituacao"("equipamentoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Manutencao_situacao_dataPrevista_idx" ON "Manutencao"("situacao", "dataPrevista");

-- CreateIndex
CREATE INDEX "Manutencao_equipamentoId_idx" ON "Manutencao"("equipamentoId");

-- CreateIndex
CREATE INDEX "HistoricoManutencao_manutencaoId_criadoEm_idx" ON "HistoricoManutencao"("manutencaoId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Agente_matricula_key" ON "Agente"("matricula");

-- CreateIndex
CREATE INDEX "Agente_regiaoId_situacao_excluidoEm_idx" ON "Agente"("regiaoId", "situacao", "excluidoEm");

-- CreateIndex
CREATE INDEX "Agente_orgaoId_idx" ON "Agente"("orgaoId");

-- CreateIndex
CREATE INDEX "HistoricoPosicao_equipamentoId_ocorridoEm_idx" ON "HistoricoPosicao"("equipamentoId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "HistoricoPosicao_agenteId_ocorridoEm_idx" ON "HistoricoPosicao"("agenteId", "ocorridoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Telemetria_identificadorMensagem_key" ON "Telemetria"("identificadorMensagem");

-- CreateIndex
CREATE INDEX "Telemetria_equipamentoId_ocorridoEm_idx" ON "Telemetria"("equipamentoId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "Ocorrencia_regiaoId_ocorridoEm_idx" ON "Ocorrencia"("regiaoId", "ocorridoEm");

-- CreateIndex
CREATE INDEX "Ocorrencia_ocorridoEm_idx" ON "Ocorrencia"("ocorridoEm");

-- CreateIndex
CREATE UNIQUE INDEX "Alerta_chaveAtiva_key" ON "Alerta"("chaveAtiva");

-- CreateIndex
CREATE INDEX "Alerta_regiaoId_situacao_gravidade_idx" ON "Alerta"("regiaoId", "situacao", "gravidade");

-- CreateIndex
CREATE INDEX "Previsao_regiaoId_criadoEm_idx" ON "Previsao"("regiaoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Recomendacao_regiaoId_criadoEm_idx" ON "Recomendacao"("regiaoId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "IndicadorOperacional_regiaoId_criadoEm_key" ON "IndicadorOperacional"("regiaoId", "criadoEm");

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoEquipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoSituacao" ADD CONSTRAINT "HistoricoSituacao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoManutencao" ADD CONSTRAINT "HistoricoManutencao_manutencaoId_fkey" FOREIGN KEY ("manutencaoId") REFERENCES "Manutencao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_orgaoId_fkey" FOREIGN KEY ("orgaoId") REFERENCES "Orgao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agente" ADD CONSTRAINT "Agente_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPosicao" ADD CONSTRAINT "HistoricoPosicao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPosicao" ADD CONSTRAINT "HistoricoPosicao_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telemetria" ADD CONSTRAINT "Telemetria_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ocorrencia" ADD CONSTRAINT "Ocorrencia_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_agenteId_fkey" FOREIGN KEY ("agenteId") REFERENCES "Agente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Previsao" ADD CONSTRAINT "Previsao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacao" ADD CONSTRAINT "Recomendacao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacao" ADD CONSTRAINT "Recomendacao_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recomendacao" ADD CONSTRAINT "Recomendacao_previsaoId_fkey" FOREIGN KEY ("previsaoId") REFERENCES "Previsao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndicadorOperacional" ADD CONSTRAINT "IndicadorOperacional_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
