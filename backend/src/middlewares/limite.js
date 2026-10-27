// Limite em memória adequado a uma única instância. A limpeza também impede crescimento ilimitado.
export function limitar({ maximo, janelaMs }) {
  const acessos = new Map();
  let ultimaLimpeza = 0;
  return (requisicao, resposta, proximo) => {
    const agora = Date.now();
    if (agora - ultimaLimpeza > janelaMs) {
      for (const [chave, valor] of acessos)
        if (valor.expira <= agora) acessos.delete(chave);
      ultimaLimpeza = agora;
    }
    const chave = requisicao.ip;
    const registro = acessos.get(chave) ?? {
      total: 0,
      expira: agora + janelaMs,
    };
    if (registro.expira <= agora) {
      registro.total = 0;
      registro.expira = agora + janelaMs;
    }
    registro.total++;
    acessos.set(chave, registro);
    if (registro.total > maximo) {
      resposta.set(
        "Retry-After",
        String(Math.ceil((registro.expira - agora) / 1000)),
      );
      return resposta
        .status(429)
        .json({
          mensagem: "Muitas requisições. Aguarde antes de tentar novamente.",
        });
    }
    proximo();
  };
}
