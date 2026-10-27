import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';
import { EstadoVazio } from '../Comuns';
export function GraficoIndicadores({
  titulo,
  descricao,
  dados,
  chave = 'hora',
  valor = 'quantidade',
  linha = false,
  unidade = 'ocorrências',
}) {
  const Grafico = linha ? LineChart : BarChart;
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{titulo}</h2>
          <p>{descricao}</p>
        </div>
      </div>
      <div className="panel-body">
        {dados.length ? (
          <>
            <div
              className="chart"
              role="img"
              aria-label={`${titulo}. Valores em ${unidade}. A tabela de dados está disponível abaixo.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <Grafico data={dados} margin={{ top: 10, right: 15, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5edf2" />
                  <XAxis
                    dataKey={chave}
                    tick={{ fontSize: 11, fill: '#617889' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#617889' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip formatter={(v) => [v, unidade]} />
                  {linha ? (
                    <Line
                      type="monotone"
                      dataKey={valor}
                      stroke="#277b91"
                      strokeWidth={2}
                      dot={false}
                    />
                  ) : (
                    <Bar dataKey={valor} fill="#397997" radius={[3, 3, 0, 0]} />
                  )}
                </Grafico>
              </ResponsiveContainer>
            </div>
            <details className="text-xs mt-4">
              <summary className="cursor-pointer text-primary">Consultar dados em tabela</summary>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Período</th>
                      <th scope="col">{unidade}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((d, i) => (
                      <tr key={i}>
                        <td>{d[chave]}</td>
                        <td>{d[valor] ?? 'Sem dados'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <EstadoVazio
            titulo="Sem dados no período"
            descricao="A visualização será exibida quando houver registros."
          />
        )}
      </div>
    </section>
  );
}
