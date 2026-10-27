import "dotenv/config";
import { z } from "zod";

const esquema = z
  .object({
    DATABASE_URL: z.string().startsWith("postgresql://"),
    JWT_SEGREDO: z.string().min(32),
    IOT_CHAVE: z.string().min(32),
    JWT_DURACAO: z.enum(["15m", "30m", "1h", "2h"]).default("1h"),
    PORTA: z.coerce.number().int().min(1).max(65535).default(3000),
    CORS_ORIGENS: z.string().min(1),
    INTERVALO_TAREFAS_SEGUNDOS: z.coerce.number().int().min(10).default(60),
    SEM_COMUNICACAO_SEGUNDOS: z.coerce.number().int().min(30).default(300),
    MANUTENCAO_PROXIMA_HORAS: z.coerce.number().positive().default(48),
    RISCO_LIMITE_MODERADO: z.coerce.number().min(1).max(98).default(25),
    RISCO_LIMITE_ALTO: z.coerce.number().min(2).max(99).default(50),
    RISCO_LIMITE_CRITICO: z.coerce.number().min(3).max(100).default(75),
    FUSO_ANALISE: z.string().default("America/Sao_Paulo"),
  })
  .superRefine((dados, contexto) => {
    if (!(
      dados.RISCO_LIMITE_MODERADO < dados.RISCO_LIMITE_ALTO &&
      dados.RISCO_LIMITE_ALTO < dados.RISCO_LIMITE_CRITICO
    )) {
      contexto.addIssue({
        code: "custom",
        message: "Os limites de risco devem ser crescentes.",
      });
    }
  });

export function lerAmbiente(variaveis = process.env) {
  const resultado = esquema.safeParse(variaveis);
  if (!resultado.success)
    throw new Error(
      `Configuração inválida. Confira: ${resultado.error.issues.map((erro) => erro.path.join(".") || erro.message).join(", ")}`,
    );
  const ambiente = resultado.data;
  new Intl.DateTimeFormat("pt-BR", { timeZone: ambiente.FUSO_ANALISE });
  ambiente.origens = ambiente.CORS_ORIGENS.split(",").map((origem) =>
    origem.trim(),
  );
  if (ambiente.origens.includes("*"))
    throw new Error("Informe origens CORS explícitas.");
  if (
    ambiente.JWT_SEGREDO === ambiente.IOT_CHAVE ||
    [ambiente.JWT_SEGREDO, ambiente.IOT_CHAVE].some((valor) =>
      valor.startsWith("substitua_"),
    )
  ) {
    throw new Error(
      "Configure segredos diferentes e aleatórios para JWT e IoT.",
    );
  }
  return ambiente;
}
