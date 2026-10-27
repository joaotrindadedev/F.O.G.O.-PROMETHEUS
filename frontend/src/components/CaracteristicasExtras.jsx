import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
export function CaracteristicasExtras({ valor, aoAlterar }) {
  const [linhas, setLinhas] = useState(() =>
    Object.entries(JSON.parse(valor || '{}')).map(([nome, valor]) => ({
      nome,
      valor: valor == null ? '' : String(valor),
      tipo: valor === null ? 'null' : typeof valor,
    })),
  );
  function atualizar(proximas) {
    setLinhas(proximas);
    const nomes = proximas.map((l) => l.nome.trim());
    if (nomes.some((n) => !n) || new Set(nomes).size !== nomes.length) {
      aoAlterar('');
      return;
    }
    aoAlterar(
      JSON.stringify(
        Object.fromEntries(
          proximas.map((l) => [
            l.nome.trim(),
            l.tipo === 'number'
              ? Number(l.valor)
              : l.tipo === 'boolean'
                ? l.valor === 'true'
                : l.tipo === 'null'
                  ? null
                  : l.valor,
          ]),
        ),
      ),
    );
  }
  function mudar(indice, campo, valor) {
    atualizar(linhas.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)));
  }
  return (
    <div className="field wide">
      <h3>Características adicionais</h3>
      <p className="text-xs text-muted-foreground">
        Informe nomes únicos e valores das características deste equipamento.
      </p>
      {linhas.map((linha, i) => (
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 mt-2" key={i}>
          <Input
            aria-label={`Nome da característica ${i + 1}`}
            value={linha.nome}
            maxLength={80}
            onChange={(e) => mudar(i, 'nome', e.target.value)}
          />
          <Input
            aria-label={`Valor da característica ${i + 1}`}
            type={linha.tipo === 'number' ? 'number' : 'text'}
            value={linha.valor}
            maxLength={500}
            onChange={(e) => mudar(i, 'valor', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remover característica ${i + 1}`}
            onClick={() => atualizar(linhas.filter((_, n) => n !== i))}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start mt-2"
        onClick={() => atualizar([...linhas, { nome: '', valor: '', tipo: 'string' }])}
      >
        <Plus size={15} />
        Adicionar característica
      </Button>
    </div>
  );
}
