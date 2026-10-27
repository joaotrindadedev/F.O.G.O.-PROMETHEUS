import { useEffect, useState } from 'react';
import { useOperacao } from '../contexts/Operacao';
export function useConsulta(carregar, chave = '') {
  const { revisao } = useOperacao();
  const [estado, setEstado] = useState({
    dados: null,
    carregando: true,
    erro: '',
    atualizadoEm: null,
  });
  useEffect(() => {
    const controle = new AbortController();
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    async function carregarDados() {
      try {
        const dados = await carregar(controle.signal);
        if (!controle.signal.aborted) {
          setEstado({ dados, carregando: false, erro: '', atualizadoEm: new Date().toISOString() });
        }
      } catch (erro) {
        if (!controle.signal.aborted) {
          setEstado({ dados: null, carregando: false, erro: erro.message, atualizadoEm: null });
        }
      }
    }
    carregarDados();
    return () => controle.abort();
    // A chave representa os argumentos da consulta; abort impede resultados de filtros antigos.
  }, [chave, revisao]);
  return estado;
}
