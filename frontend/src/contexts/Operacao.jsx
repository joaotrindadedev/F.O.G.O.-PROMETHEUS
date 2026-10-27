import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSessao } from './Sessao';
import { listarTodos } from '../services/api';
const Contexto = createContext(null);
export function ProvedorOperacao({ children }) {
  const { token } = useSessao();
  const [revisao, setRevisao] = useState(0);
  const [conectado, setConectado] = useState(false);
  const [catalogos, setCatalogos] = useState({ orgaos: [], regioes: [], tipos: [] });
  const [erroCatalogos, setErroCatalogos] = useState('');
  useEffect(() => {
    const abortar = new AbortController();
    Promise.all(
      ['orgaos', 'regioes', 'tipos-equipamentos'].map((nome) =>
        listarTodos('/' + nome, {}, abortar.signal),
      ),
    )
      .then(([orgaos, regioes, tipos]) => {
        setCatalogos({ orgaos, regioes, tipos });
        setErroCatalogos('');
      })
      .catch((erro) => {
        if (!abortar.signal.aborted) setErroCatalogos(erro.message);
      });
    return () => abortar.abort();
  }, [token, revisao]);
  useEffect(() => {
    // Eventos parciais invalidam consultas. A reconexão também recarrega REST, pois não existe replay.
    const socket = io(
      import.meta.env.VITE_SOCKET_URL ||
        (import.meta.env.VITE_API_URL?.startsWith('http')
          ? new URL(import.meta.env.VITE_API_URL).origin
          : window.location.origin),
      { auth: { token }, reconnection: true },
    );
    let temporizador;
    const atualizar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => setRevisao((v) => v + 1), 350);
    };
    const conectado = () => {
      setConectado(true);
      atualizar();
    };
    const desconectado = () => setConectado(false);
    const eventos = [
      'equipamento:atualizado',
      'equipamento:excluido',
      'equipamento:posicao',
      'equipamento:comunicacao',
      'agente:atualizado',
      'agente:excluido',
      'agente:posicao',
      'manutencao:atualizada',
      'alerta:criado',
      'alerta:atualizado',
      'ocorrencia:criada',
    ];
    socket.on('connect', conectado);
    socket.on('disconnect', desconectado);
    socket.on('connect_error', desconectado);
    eventos.forEach((evento) => socket.on(evento, atualizar));
    return () => {
      clearTimeout(temporizador);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [token]);
  return (
    <Contexto.Provider
      value={{
        catalogos,
        erroCatalogos,
        conectado,
        revisao,
        atualizar: () => setRevisao((v) => v + 1),
      }}
    >
      {children}
    </Contexto.Provider>
  );
}
export const useOperacao = () => useContext(Contexto);
