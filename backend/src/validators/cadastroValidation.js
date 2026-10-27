import { z } from "zod";
import {
  id,
  texto,
  coordenadas,
  conferirCoordenadas,
  situacaoAgente,
  alterar,
} from "./comumValidation.js";

export const orgao = z.object({
  nome: texto,
  sigla: z.string().trim().min(1).max(20),
});
export const regiao = z.object({
  nome: texto,
  cidade: texto,
  estado: z.string().regex(/^[A-Z]{2}$/),
  bairros: z.array(texto).min(1).max(100),
});
export const tipoEquipamento = z.object({
  nome: texto,
  familia: z.enum(["CAMERA", "RADAR", "VEICULO", "OUTRO"]),
});
const agenteBase = z.object({
  nome: texto,
  matricula: texto,
  funcao: texto,
  orgaoId: id,
  regiaoId: id.nullable().optional(),
  baseOperacional: texto,
  bairro: texto.nullable().optional(),
  cidade: texto,
  situacao: situacaoAgente.optional(),
  ...coordenadas,
});
export const agente = agenteBase.superRefine(conferirCoordenadas);
export const alterarAgente =
  alterar(agenteBase).superRefine(conferirCoordenadas);
