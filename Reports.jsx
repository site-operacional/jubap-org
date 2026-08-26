import { useEffect, useState } from 'react';
import { BarChart3, GitCompare, ScrollText } from 'lucide-react';
import api, { money } from '../../lib/api';
import { PageHeader, Spinner } from '../../components/Common';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const SUBTABS = [
  { key: 'anual', label: 'Relatório Anual', icon: BarChart3 },
  { key: 'comparativo', label: 'Comparativo entre anos', icon: GitCompare },
];

export default function Reports() {
  const [tab, setTab] = useState('anual');
  return (
    <div>
      <PageHeader title="Relatórios" description="Panorama anual e comparação de desempenho entre edições do retiro." />
      <div className="flex gap-1 mb-6 border-b border-forest-100">
        {SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'anual' && <AnnualTab />}
      {tab === 'comparativo' && <CompareTab />}
    </div>
  );
}

function AnnualTab() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/reports/annual', { params: { year } });
    setData(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [year]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <label className="label !mb-0">Ano</label>
        <input type="number" className="input w-32" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>
      {loading || !data ? <Spinner /> : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Eventos</p>
            <Row label="Total de eventos" value={data.eventos.total} />
            <Row label="Realizados" value={data.eventos.realizados} />
            <Row label="Cancelados" value={data.eventos.cancelados} />
            {data.eventos.porTipo.length > 0 && (
              <div className="mt-3 pt-3 border-t border-forest-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 mb-2">Por tipo</p>
                {data.eventos.porTipo.map((t) => <Row key={t.nome} label={t.nome} value={t.total} />)}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Financeiro (todas as origens)</p>
            <Row label="Entradas" value={money(data.financeiro.entradas)} />
            <Row label="Saídas" value={money(data.financeiro.saidas)} />
            <Row label="Saldo" value={money(data.financeiro.saldo)} />
            <Row label="Valores a receber (retiros do ano)" value={money(data.financeiro.aReceber)} />
            <Row label="Valores a pagar (parcelas do ano)" value={money(data.financeiro.aPagar)} />
            <Row label="Arrecadações (líquido)" value={money(data.financeiro.arrecadacoes)} />
          </div>

          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Retiros de {year}</p>
            {data.retiros.length === 0 ? <p className="text-sm text-forest-400 italic">Nenhum retiro nesse ano.</p> : (
              <div className="space-y-3">
                {data.retiros.map((r) => (
                  <div key={r.id} className="border-b border-forest-50 last:border-0 pb-2 last:pb-0">
                    <p className="text-sm font-medium text-forest-800 mb-1">{r.nome}</p>
                    <Row label="Participantes" value={r.participantes} />
                    <Row label="Entradas" value={money(r.entradas)} />
                    <Row label="Saídas" value={money(r.saidas)} />
                    <Row label="Saldo" value={money(r.saldo)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Compras</p>
            <Row label="Total gasto (itens comprados no ano)" value={money(data.compras.totalGasto)} />
            {data.compras.topCategorias.length > 0 && (
              <div className="mt-3 pt-3 border-t border-forest-100">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 mb-2">Maiores categorias de gasto</p>
                {data.compras.topCategorias.map((c) => <Row key={c.nome} label={c.nome} value={money(c.total)} />)}
              </div>
            )}
          </div>

          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Estoque</p>
            <Row label="Itens cadastrados (total atual)" value={data.estoque.totalCadastrados} />
            <Row label="Adquiridos neste ano" value={data.estoque.adquiridosNoAno} />
            <Row label="Emprestados atualmente" value={data.estoque.emprestadosAtualmente} />
            <Row label="Em manutenção atualmente" value={data.estoque.manutencaoAtualmente} />
            <p className="text-xs text-forest-400 mt-2">O estoque não guarda histórico por ano — "emprestados" e "em manutenção" refletem a situação de hoje.</p>
          </div>

          <div className="card p-4">
            <p className="font-display text-forest-900 mb-3">Checklists</p>
            <Row label="Checklists com prazo neste ano" value={data.checklists.checklistsComPrazoNoAno} />
            <Row label="Checklists concluídos" value={data.checklists.checklistsConcluidos} />
            <Row label="Tarefas concluídas" value={data.checklists.tarefasConcluidas} />
            <Row label="Tarefas pendentes" value={data.checklists.tarefasPendentes} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-forest-50 last:border-0">
      <span className="text-forest-500">{label}</span>
      <span className="font-mono font-semibold text-forest-900">{value}</span>
    </div>
  );
}

function CompareTab() {
  const toast = useToast();
  const [editions, setEditions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/editions').then(({ data }) => setEditions(data)); }, []);

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function compare() {
    if (selected.length < 2) return toast.error('Selecione ao menos duas edições.');
    setLoading(true);
    try {
      const { data } = await api.post('/editions/compare', { ids: selected });
      setResult(data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div className="card p-4 mb-5">
        <p className="label mb-2">Selecione as edições de retiro para comparar</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {editions.map((e) => (
            <button key={e.id} onClick={() => toggle(e.id)} className={selected.includes(e.id) ? 'badge-green !text-sm !px-3 !py-1.5' : 'badge-gray !text-sm !px-3 !py-1.5'}>
              {e.nome}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={compare} disabled={loading}><GitCompare size={15} /> Comparar</button>
      </div>

      {result && (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Indicador</th>{result.map((r) => <th key={r.id}>{r.nome}</th>)}</tr></thead>
            <tbody>
              <CompareRow label="Participantes" rows={result} field="participantes" fmt={(v) => v} />
              <CompareRow label="Entradas" rows={result} field="entradas" fmt={money} />
              <CompareRow label="Saídas" rows={result} field="saidas" fmt={money} />
              <CompareRow label="Saldo" rows={result} field="saldo" fmt={money} />
              <CompareRow label="Arrecadado (líquido)" rows={result} field="arrecadado" fmt={money} />
              <CompareRow label="Gasto médio / participante" rows={result} field="valorMedioPorParticipante" fmt={money} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, rows, field, fmt }) {
  return (
    <tr>
      <td className="font-medium text-forest-800">{label}</td>
      {rows.map((r, i) => (
        <td key={r.id} className="money">
          {fmt(r[field])}
          {i > 0 && rows[0][field] !== 0 && (
            <span className="text-xs text-forest-400 ml-2">({(((r[field] - rows[0][field]) / (rows[0][field] || 1)) * 100).toFixed(1)}%)</span>
          )}
        </td>
      ))}
    </tr>
  );
}
