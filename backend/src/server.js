import { createServer } from "node:http";
import { banco } from "./config/prisma.js";
import { lerAmbiente } from "./config/ambiente.js";
import { criarAplicacao } from "./app.js";
import { configurarSocket } from "./sockets/tempo-real.js";
import { iniciarTarefas } from "./jobs/verificacoes.js";

const ambiente = lerAmbiente();
let tempoReal;
const publicar = (...argumentos) => {
  tempoReal
    ?.publicar(...argumentos)
    .catch(() => console.error("Falha ao publicar evento."));
};
const { app, autenticacao, previsoes } = criarAplicacao({
  banco,
  ambiente,
  publicar,
});
const servidor = createServer(app);
tempoReal = configurarSocket(servidor, ambiente, autenticacao);
await banco.$connect();
servidor.listen(ambiente.PORTA, () =>
  console.log(`F.O.G.O. — PROMETHEUS disponível na porta ${ambiente.PORTA}.`),
);
const pararTarefas = iniciarTarefas(banco, publicar, ambiente, previsoes);
let encerrando = false;
async function encerrar() {
  if (encerrando) return;
  encerrando = true;
  await pararTarefas();
  await new Promise((resolver) => tempoReal.io.close(resolver));
  await banco.$disconnect();
}
process.on("SIGINT", encerrar);
process.on("SIGTERM", encerrar);
