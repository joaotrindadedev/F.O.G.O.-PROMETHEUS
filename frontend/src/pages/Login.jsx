import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useSessao } from '../contexts/Sessao';
import { Marca } from '../layouts/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
export default function Login() {
  const { usuario, entrar, expirada } = useSessao();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  if (usuario) return <Navigate to="/" replace />;
  async function logar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    const formulario = new FormData(e.currentTarget);
    try {
      await entrar({ email: formulario.get('email').trim(), senha: formulario.get('senha') });
    } catch (erro) {
      setErro(erro.message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Marca />
        <div>
          <h1>
            Uma visão integrada.
            <br />
            Uma cidade mais preparada.
          </h1>
          <p>Equipamentos, pessoas e informação conectados para apoiar cada decisão operacional.</p>
        </div>
        <footer>Plataforma de gestão de mobilidade urbana e segurança pública</footer>
      </section>
      <section className="login-form">
        <form onSubmit={logar}>
          <LockKeyhole className="mb-6 text-primary" size={26} />
          <h2>Acesse a central</h2>
          <p>Entre com suas credenciais institucionais para acessar o PROMETHEUS.</p>
          {expirada && (
            <div className="notice">Sua sessão expirou. Entre novamente para continuar.</div>
          )}
          {erro && (
            <div className="error" role="alert">
              {erro}
            </div>
          )}
          <div className="field">
            <label htmlFor="email">E-mail institucional</label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              spellCheck={false}
              required
              placeholder="nome@orgao.gov.br…"
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
            />
          </div>
          <Button type="submit" disabled={enviando} className="w-full mt-2">
            {enviando ? 'Autenticando…' : 'Entrar na central'}
            <ArrowRight size={16} />
          </Button>
          <p className="!text-xs !mt-6">
            Acesso restrito a usuários autorizados. Para solicitar acesso, contate o administrador
            da sua central.
          </p>
        </form>
      </section>
    </div>
  );
}
