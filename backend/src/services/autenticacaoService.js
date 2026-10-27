import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { ErroAplicacao } from "../utils/erro.js";

// Um hash substituto mantém o custo de comparação mesmo para e-mails inexistentes.
const hashSubstituto = bcrypt.hashSync(randomBytes(32).toString("hex"), 12);
export function criarAutenticacaoServico(banco, ambiente) {
  return async function entrar({ email, senha }) {
    const usuario = await banco.usuario.findUnique({ where: { email } });
    const confere = await bcrypt.compare(
      senha,
      usuario?.senhaHash ?? hashSubstituto,
    );
    if (!usuario?.ativo || !confere)
      throw new ErroAplicacao("E-mail ou senha inválidos.", 401);
    const token = jwt.sign({}, ambiente.JWT_SEGREDO, {
      algorithm: "HS256",
      subject: usuario.id,
      issuer: "fogo-prometheus",
      audience: "frontend-fogo",
      expiresIn: ambiente.JWT_DURACAO,
    });
    return {
      token,
      tipo: "Bearer",
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    };
  };
}
