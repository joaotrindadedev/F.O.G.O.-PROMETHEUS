import { z } from "zod";
import {
  id,
  texto,
  situacaoEquipamento,
  coordenadas,
  conferirCoordenadas,
  alterar,
} from "./comumValidation.js";

const base = z.object({
  tipoId: id,
  orgaoId: id,
  regiaoId: id.nullable().optional(),
  numeroSerie: texto.nullable().optional(),
  marca: texto,
  modelo: texto,
  descricao: texto,
  mobilidade: z.enum(["FIXO", "MOVEL"]).optional(),
  situacao: situacaoEquipamento.optional(),
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/)
    .nullable()
    .optional(),
  bairro: texto.nullable().optional(),
  cidade: texto,
  estado: z.string().regex(/^[A-Z]{2}$/),
  rua: texto.nullable().optional(),
  referencia: texto.nullable().optional(),
  ...coordenadas,
  baseOperacional: texto.nullable().optional(),
  baseLatitude: z.number().min(-90).max(90).nullable().optional(),
  baseLongitude: z.number().min(-180).max(180).nullable().optional(),
  propriedades: z.record(z.string().max(80), z.json()).optional(),
  motivo: texto.optional(),
});

function conferirBase(dados, contexto) {
  conferirCoordenadas(dados, contexto);
  if (
    (dados.baseLatitude != null) !== (dados.baseLongitude != null) ||
    "baseLatitude" in dados !== "baseLongitude" in dados
  ) {
    contexto.addIssue({
      code: "custom",
      message: "Informe as duas coordenadas da base.",
    });
  }
}
export const equipamento = base.superRefine(conferirBase);
export const alterarEquipamento = alterar(base).superRefine(conferirBase);
