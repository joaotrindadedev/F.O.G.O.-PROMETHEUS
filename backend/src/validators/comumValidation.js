import { z } from "zod";

z.config(z.locales.pt());
export const id = z.uuid();
export const texto = z.string().trim().min(1).max(500);
export const gravidade = z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]);
export const situacaoEquipamento = z.enum([
  "NAO_INSTALADO",
  "OPERACIONAL",
  "MAU_FUNCIONAMENTO",
  "EM_MANUTENCAO",
  "DESATIVADO",
  "FURTADO",
]);
export const situacaoAgente = z.enum([
  "EM_ATIVIDADE",
  "DISPONIVEL",
  "AFASTADO",
  "FORA_DE_SERVICO",
]);
export const data = z.iso
  .datetime({ offset: true })
  .transform((valor) => new Date(valor));
export const coordenadas = {
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
};

export function conferirCoordenadas(dados, contexto) {
  if (
    (dados.latitude != null) !== (dados.longitude != null) ||
    "latitude" in dados !== "longitude" in dados
  ) {
    contexto.addIssue({
      code: "custom",
      message: "Informe latitude e longitude juntas.",
      path: ["latitude"],
    });
  }
}

export const consulta = z
  .object({
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(100).default(20),
    tipoId: id.optional(),
    orgaoId: id.optional(),
    regiaoId: id.optional(),
    bairro: texto.optional(),
    cidade: texto.optional(),
    situacao: texto.optional(),
    gravidade: gravidade.optional(),
    equipamentoId: id.optional(),
    inicio: data.optional(),
    fim: data.optional(),
    dias: z.coerce.number().int().min(1).max(90).default(30),
    necessitaManutencao: z
      .enum(["true", "false"])
      .transform((valor) => valor === "true")
      .optional(),
    prazo: z.enum(["ATRASADA", "PROXIMA"]).optional(),
    recurso: z.enum(["equipamentos", "agentes"]).default("equipamentos"),
    sul: z.coerce.number().min(-90).max(90).optional(),
    norte: z.coerce.number().min(-90).max(90).optional(),
    oeste: z.coerce.number().min(-180).max(180).optional(),
    leste: z.coerce.number().min(-180).max(180).optional(),
  })

  .superRefine((dados, contexto) => {
    const area = [dados.sul, dados.norte, dados.oeste, dados.leste];
    if (
      area.some((valor) => valor !== undefined) &&
      (area.some((valor) => valor === undefined) ||
        dados.sul > dados.norte ||
        dados.oeste > dados.leste)
    ) {
      contexto.addIssue({
        code: "custom",
        message: "Informe uma área completa com sul ≤ norte e oeste ≤ leste.",
      });
    }
    if (dados.inicio && dados.fim && dados.inicio > dados.fim)
      contexto.addIssue({
        code: "custom",
        message: "Início deve ser anterior ao fim.",
      });
  });

export function validarSituacao(consultaRecebida, valores) {
  if (consultaRecebida.situacao)
    z.enum(valores).parse(consultaRecebida.situacao);
}

export const alterar = (esquema) =>
  esquema
    .partial()
    .refine(
      (dados) => Object.keys(dados).length > 0,
      "Informe ao menos um campo para alterar.",
    );
