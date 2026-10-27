import { Server } from "socket.io";

export function configurarSocket(servidor, ambiente, autenticacao) {
  const io = new Server(servidor, {
    cors: { origin: ambiente.origens },
    maxHttpBufferSize: 65536,
    allowRequest: (requisicao, aceitar) =>
      aceitar(
        null,
        !requisicao.headers.origin ||
          ambiente.origens.includes(requisicao.headers.origin),
      ),
  });
  io.use(async (socket, proximo) => {
    try {
      const sessao = await autenticacao.verificarToken(
        socket.handshake.auth.token,
      );
      socket.data = { ...sessao, token: socket.handshake.auth.token };
      proximo();
    } catch {
      proximo(new Error("Sessão inválida ou expirada."));
    }
  });
  io.on("connection", (socket) => {
    const temporizador = setTimeout(
      () => socket.disconnect(true),
      Math.max(1, socket.data.expiraEm - Date.now()),
    );
    socket.on("disconnect", () => clearTimeout(temporizador));
  });
  async function publicar(evento, dados) {
    // Contas desativadas deixam de receber eventos.
    for (const socket of io.sockets.sockets.values()) {
      try {
        await autenticacao.verificarToken(socket.data.token);
        socket.emit(evento, dados);
      } catch {
        socket.disconnect(true);
      }
    }
  }
  return { io, publicar };
}
