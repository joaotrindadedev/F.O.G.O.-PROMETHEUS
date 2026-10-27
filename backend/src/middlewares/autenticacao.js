import jwt from "jsonwebtoken";
import { timingSafeEqual, createHash } from "node:crypto";
import { ErroAplicacao } from "../utils/erro.js";

export const camposPublicosUsuario = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
};
export function criarAutenticacao(banco, ambiente) {
  async function verificarToken(token) {
    let conteudo;
    try {
      conteudo = jwt.verify(token, ambiente.JWT_SEGREDO, {
        algorithms: ["HS256"],
        issuer: "fogo-prometheus",
        audience: "frontend-fogo",
      });
    } catch {
      throw new ErroAplicacao("Sessão inválida ou expirada.", 401);
    }
    // Consultar a conta impede que um token antigo mantenha acesso após desativação ou mudança de perfil.
    const usuario = await banco.usuario.findFirst({
      where: { id: conteudo.sub, ativo: true },
      select: camposPublicosUsuario,
    });
    if (!usuario) throw new ErroAplicacao("Sessão inválida ou expirada.", 401);
    return { usuario, expiraEm: conteudo.exp * 1000 };
  }
  async function autenticar(requisicao, resposta, proximo) {
    const cabecalho = requisicao.headers.authorization;
    if (!cabecalho?.startsWith("Bearer "))
      throw new ErroAplicacao("Informe o token de acesso.", 401);
    requisicao.usuario = (await verificarToken(cabecalho.slice(7))).usuario;
    proximo();
  }
  function autenticarIntegrador(requisicao, resposta, proximo) {
    const recebida = requisicao.headers["x-chave-integracao"];
    const resumo = (valor) => createHash("sha256").update(valor).digest();
    if (
      typeof recebida !== "string" ||
      !timingSafeEqual(resumo(recebida), resumo(ambiente.IOT_CHAVE))
    )
      throw new ErroAplicacao("Credencial de integração inválida.", 401);
    proximo();
  }
  return { autenticar, verificarToken, autenticarIntegrador };
}
