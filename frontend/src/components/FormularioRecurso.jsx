import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { CaracteristicasExtras } from './CaracteristicasExtras';
import { formularios, camposPropriedades, prepararDados } from '../utils/formularios';
import { rotulo } from '../utils/dados';
import { recursos } from '../services/api';
import { useOperacao } from '../contexts/Operacao';
export function FormularioRecurso({ recurso, registro, equipamentos = [], aoSalvar, aoCancelar }) {
  const { catalogos } = useOperacao();
  const [valores, setValores] = useState(() => {
    const inicial = {
      mobilidade: 'FIXO',
      situacao:
        recurso === 'equipamentos'
          ? 'NAO_INSTALADO'
          : recurso === 'agentes'
            ? 'DISPONIVEL'
            : 'PENDENTE',
      propriedades: {},
      ...registro,
    };
    for (const nome of ['dataPrevista', 'ocorridoEm'])
      if (inicial[nome]) {
        const data = new Date(inicial[nome]);
        inicial[nome] = new Date(data.getTime() - data.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
    inicial.propriedadesTexto = JSON.stringify(inicial.propriedades, null, 2);
    return inicial;
  });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  useEffect(() => {
    const avisar = (e) => {
      if (alterado) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [alterado]);
  function mudar(nome, valor) {
    setAlterado(true);
    setValores((v) =>
      nome.startsWith('propriedades.')
        ? { ...v, propriedades: { ...v.propriedades, [nome.split('.')[1]]: valor } }
        : {
            ...v,
            [nome]: valor,
            ...(nome === 'tipoId' ? { propriedades: {}, propriedadesTexto: '{}' } : {}),
          },
    );
  }
  function renderCampo(campo, propriedade = false) {
    const nome = propriedade ? 'propriedades.' + campo.nome : campo.nome;
    const valor = propriedade ? valores.propriedades?.[campo.nome] : valores[campo.nome];
    const opcoes = campo.catalogo
      ? campo.catalogo === 'equipamentos'
        ? equipamentos
        : catalogos[campo.catalogo]
      : campo.opcoes;
    const comum = {
      id: nome,
      name: nome,
      required: campo.obrigatorio,
      'aria-invalid': Boolean(erros[nome]),
      'aria-describedby': erros[nome] ? nome + '-erro' : undefined,
      disabled: enviando || (registro?.id && recurso === 'manutencoes' && nome === 'equipamentoId'),
      autoComplete: 'off',
    };
    return (
      <div className="field" key={nome}>
        <label htmlFor={nome}>
          {campo.titulo}
          {campo.obrigatorio ? ' *' : ''}
        </label>
        {campo.tipo === 'checkbox' ? (
          <input
            {...comum}
            className="!w-5 h-5"
            type="checkbox"
            checked={Boolean(valor)}
            onChange={(e) => mudar(nome, e.target.checked)}
          />
        ) : opcoes ? (
          <select
            {...comum}
            className="select-native !max-w-none"
            value={valor ?? ''}
            onChange={(e) => mudar(nome, e.target.value)}
          >
            <option value="">Selecione…</option>
            {opcoes.map((o) => (
              <option key={o.id ?? o} value={o.id ?? o}>
                {o.nome ?? o.descricao ?? rotulo(o)}
              </option>
            ))}
          </select>
        ) : (
          <Input
            {...comum}
            type={campo.tipo || 'text'}
            min={campo.min}
            max={campo.max}
            step={campo.tipo === 'number' ? 'any' : undefined}
            maxLength={campo.maxLength || 500}
            pattern={campo.padrao}
            value={valor ?? ''}
            onChange={(e) => mudar(nome, e.target.value)}
          />
        )}{' '}
        {erros[nome] && (
          <span className="field-error" id={nome + '-erro'}>
            {erros[nome]}
          </span>
        )}
      </div>
    );
  }
  async function enviar(e) {
    e.preventDefault();
    setErro('');
    const resultado = prepararDados(recurso, valores, registro, catalogos);
    setErros(resultado.erros);
    if (Object.keys(resultado.erros).length) {
      setTimeout(() => document.getElementById(Object.keys(resultado.erros)[0])?.focus(), 0);
      return;
    }
    setEnviando(true);
    try {
      await recursos[recurso].salvar(registro?.id, resultado.dados);
      setAlterado(false);
      toast.success('Registro salvo com sucesso.');
      aoSalvar();
    } catch (erro) {
      setErro(erro.message);
      const campos = Object.fromEntries(
        (erro.response?.data?.erros || []).map((e) => [e.campo, e.mensagem]),
      );
      setErros(campos);
      setTimeout(() => document.getElementById(Object.keys(campos)[0])?.focus(), 0);
    } finally {
      setEnviando(false);
    }
  }
  const familia = catalogos.tipos.find((t) => t.id === valores.tipoId)?.familia;
  return (
    <form onSubmit={enviar} noValidate>
      {erro && (
        <div className="error" role="alert">
          {erro}
        </div>
      )}
      <p className="text-xs text-muted-foreground mb-5">
        Campos com * são obrigatórios. Coordenadas devem ser informadas em pares.
      </p>
      <div className="form-grid">
        {formularios[recurso].map((c) => renderCampo(c))}
        {recurso === 'equipamentos' && (
          <>
            <h3 className="form-section">Características específicas</h3>
            {camposPropriedades(familia).map((c) => renderCampo(c, true))}
            {familia === 'OUTRO' && (
              <div className="field wide">
                <CaracteristicasExtras
                  valor={valores.propriedadesTexto}
                  aoAlterar={(v) => mudar('propriedadesTexto', v)}
                />
                {erros.propriedadesTexto && (
                  <span className="field-error">{erros.propriedadesTexto}</span>
                )}
              </div>
            )}
            {registro?.id &&
              valores.situacao !== registro.situacao &&
              renderCampo({
                nome: 'motivo',
                titulo: 'Observação da alteração (opcional)',
              })}
          </>
        )}
      </div>
      <div className="form-actions">
        <Button
          variant="outline"
          type="button"
          disabled={enviando}
          onClick={() => {
            if (!alterado || window.confirm('Descartar as alterações não salvas?')) aoCancelar();
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar registro'}
        </Button>
      </div>
    </form>
  );
}
