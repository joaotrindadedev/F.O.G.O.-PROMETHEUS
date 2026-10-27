import { z } from "zod";
import {
  id,
  texto,
  gravidade,
  data,
  coordenadas,
  conferirCoordenadas,
  alterar,
} from "./comumValidation.js";

const manutencaoBase = z.object({
  equipamentoId: id,
  tipo: z.enum(["IMEDIATA", "AGENDADA", "PERIODICA"]),
  descricao: texto,
  prioridade: gravidade,
  situacao: z
    .enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"])
    .optional(),
  dataPrevista: data,
  observacoes: texto.nullable().optional(),
});
export const manutencao = manutencaoBase;
export const alterarManutencao = alterar(
  manutencaoBase.omit({ equipamentoId: true }),
);
export const alerta = z.object({
  situacao: z.enum(["RECONHECIDO", "RESOLVIDO"]),
});
export const novoAlerta = z
  .object({
    tipo: z.string().regex(/^[A-Z_]{2,60}$/),
    titulo: texto,
    descricao: texto,
    origem: texto,
    gravidade,
    equipamentoId: id.optional(),
    agenteId: id.optional(),
    regiaoId: id.optional(),
  })

  .refine(
    (dados) =>
      !(dados.equipamentoId && dados.agenteId) &&
      Boolean(dados.equipamentoId || dados.agenteId || dados.regiaoId),
    "Relacione o alerta a uma região, equipamento ou agente; não informe equipamento e agente juntos.",
  );
export const ocorrencia = z
  .object({
    categoria: texto,
    descricao: texto,
    gravidade,
    ocorridoEm: data,
    bairro: texto.optional(),
    regiaoId: id,
    ...coordenadas,
    origem: texto,
  })

  .superRefine(conferirCoordenadas)
  .refine(
    (dados) => dados.ocorridoEm <= new Date(),
    "Ocorrência não pode estar no futuro.",
  );
const dataDispositivo = data.refine(
  (valor) => valor.getTime() <= Date.now() + 60_000,
  "Horário do dispositivo está no futuro.",
);
export const telemetria = z.object({
  equipamentoId: id,
  identificadorMensagem: z.string().min(1).max(150),
  ocorridoEm: dataDispositivo,
  dados: z.record(
    z.string().min(1).max(80),
    z.union([z.string().max(500), z.number().finite(), z.boolean(), z.null()]),
  ),
});
export const posicao = z
  .object({
    equipamentoId: id.optional(),
    agenteId: id.optional(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    ocorridoEm: dataDispositivo,
  })

  .refine(
    (dados) => Boolean(dados.equipamentoId) !== Boolean(dados.agenteId),
    "Informe exatamente um equipamento ou um agente.",
  );
