import "dotenv/config";
import { z } from "zod";
import bcrypt from "bcrypt";
import { banco } from "../src/config/prisma.js";

// Administração local, sem endpoint público de registro que permita escolher privilégios.
const esquema = z.object({
  USUARIO_NOME: z.string().min(2),
  USUARIO_EMAIL: z.email().toLowerCase(),
  USUARIO_SENHA: z
    .string()
    .min(12)
    .refine(
      (senha) => Buffer.byteLength(senha) <= 72,
      "Senha deve ter até 72 bytes.",
    ),
  USUARIO_PERFIL: z
    .enum(["ADMINISTRADOR", "GESTOR", "OPERADOR", "VISUALIZADOR"])
    .default("OPERADOR"),
});
try {
  const dados = esquema.parse(process.env);
  await banco.usuario.create({
    data: {
      nome: dados.USUARIO_NOME,
      email: dados.USUARIO_EMAIL,
      senhaHash: await bcrypt.hash(dados.USUARIO_SENHA, 12),
      perfil: dados.USUARIO_PERFIL,
    },
  });
  console.log("Usuário criado.");
} finally {
  await banco.$disconnect();
}
