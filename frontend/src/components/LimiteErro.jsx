import { Component } from 'react';
export class LimiteErro extends Component {
  state = { falhou: false };
  static getDerivedStateFromError() {
    return { falhou: true };
  }
  render() {
    if (this.state.falhou)
      return (
        <main className="empty">
          <h1>Não foi possível exibir esta página</h1>
          <p className="my-5">
            Recarregue a aplicação para tentar novamente. Será necessário entrar de novo.
          </p>
          <button className="text-link" onClick={() => window.location.reload()}>
            Recarregar aplicação
          </button>
        </main>
      );
    return this.props.children;
  }
}
