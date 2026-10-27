import axios from 'axios';
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 20000,
});
let tokenAtual = null;
export function definirToken(token) {
  tokenAtual = token;
}
// O backend não oferece refresh. O token fica apenas em memória, nunca em armazenamento persistente.
api.interceptors.request.use((config) => {
  if (tokenAtual) config.headers.Authorization = `Bearer ${tokenAtual}`;
  return config;
});
api.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && !erro.config?.url?.includes('/entrar'))
      window.dispatchEvent(new Event('sessao-expirada'));
    erro.message =
      erro.response?.data?.mensagem ||
      (erro.code === 'ECONNABORTED'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Não foi possível acessar o servidor. Verifique a conexão.');
    return Promise.reject(erro);
  },
);
export const consultar = async (caminho, params = {}, signal) =>
  (await api.get(caminho, { params, signal })).data;
// A API não oferece busca textual. Percorremos todas as páginas antes de filtrar, sem truncar resultados.
export async function listarTodos(caminho, params = {}, signal) {
  const dados = [];
  let pagina = 1;
  let resposta;
  do {
    resposta = await consultar(caminho, { ...params, pagina, limite: 100 }, signal);
    dados.push(...resposta.dados);
    pagina++;
  } while (pagina <= resposta.paginacao.paginas);
  return dados;
}
function criarRecurso(nome) {
  const caminho = '/' + nome;
  return {
    listar: (params, signal) => listarTodos(caminho, params, signal),
    buscar: (id) => consultar(caminho + '/' + id),
    async salvar(id, dados) {
      let response;
      if (id) {
        response = await api.patch(caminho + '/' + id, dados);
      } else {
        response = await api.post(caminho, dados);
      }
      return response.data;
    },
    excluir: (id) => api.delete(caminho + '/' + id),
    historico: (id) => listarTodos(caminho + '/' + id + '/historico'),
  };
}

export const recursos = {
  equipamentos: criarRecurso('equipamentos'),
  agentes: criarRecurso('agentes'),
  manutencoes: criarRecurso('manutencoes'),
  alertas: criarRecurso('alertas'),
  ocorrencias: criarRecurso('ocorrencias'),
  recomendacoes: criarRecurso('recomendacoes'),
};
export const autenticacao = {
  entrar: async (dados) => (await api.post('/autenticacao/entrar', dados)).data,
};
export const painel = { resumo: (regiaoId) => consultar('/painel/resumo', { regiaoId }) };
export const previsoes = {
  listar: (tipo, params, signal) => listarTodos(`/previsoes/${tipo}`, params, signal),
  horarios: (params, signal) => consultar('/previsoes/horarios-criticos', params, signal),
};
