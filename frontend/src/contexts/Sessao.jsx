import { createContext, useContext, useEffect, useState } from 'react';
import { autenticacao, definirToken } from '../services/api';
const Contexto = createContext(null);
export function ProvedorSessao({ children }) {
  const [sessao, setSessao] = useState(null);
  const [expirada, setExpirada] = useState(false);
  function sair() {
    definirToken(null);
    setSessao(null);
  }
  useEffect(() => {
    const expirar = () => {
      sair();
      setExpirada(true);
    };
    window.addEventListener('sessao-expirada', expirar);
    return () => window.removeEventListener('sessao-expirada', expirar);
  }, []);
  useEffect(() => {
    if (!sessao?.token) return;
    // O prazo do JWT serve apenas para encerrar a interface; a autorização real continua no servidor.
    try {
      const payload = JSON.parse(
        atob(sessao.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );
      const prazo = payload.exp * 1000 - Date.now();
      const temporizador = setTimeout(
        () => {
          sair();
          setExpirada(true);
        },
        Math.max(0, prazo),
      );
      return () => clearTimeout(temporizador);
    } catch {
      sair();
    }
  }, [sessao?.token]);
  async function entrar(dados) {
    const resultado = await autenticacao.entrar(dados);
    definirToken(resultado.token);
    setSessao({ token: resultado.token, usuario: resultado.usuario });
    setExpirada(false);
  }
  return (
    <Contexto.Provider value={{ ...sessao, entrar, sair, expirada }}>{children}</Contexto.Provider>
  );
}
export const useSessao = () => useContext(Contexto);
