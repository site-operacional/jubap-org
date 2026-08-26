import { useEffect, useState } from 'react';
import {
  Users, ArrowDownCircle, ArrowUpCircle, Scale, Receipt, PiggyBank, BedDouble,
  AlertTriangle, Pencil,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import api, { money } from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { Spinner, PageHeader } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const COLORS = ['#2f6a3d', '#68a374', '#c08a2e', '#b23a3a', '#96c29e', '#265432', '#e0ede2'];

function Card({ icon: Icon, label, value }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-forest-100 flex items-center justify-center shrink-0">
        <Icon size={17} className="text-forest-700" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-forest-500 font-medium truncate">{label}</p>
        <p className="font-display text-lg text-forest-950 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { current, currentId, refresh } = useEdition();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const { data } = await api.get(`/dashboard/${currentId}`);
    setData(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentId]);

  if (loading || !data) return <Spinner />;

  const { edicao, indicadores: ind, graficos: g, alertas } = data;

  return (
    <div>
      <PageHeader
        title={edicao.nome}
        action={
          <button className="btn-secondary" onClick={() => setEditOpen(true)}>
            <Pencil size={15} /> Editar informações
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoTag label="Tema" value={edicao.tema} />
        <InfoTag label="Versículo" value={edicao.versiculo} />
        <InfoTag label="Data" value={edicao.data_inicio ? `${new Date(edicao.data_inicio).toLocaleDateString('pt-BR')} — ${edicao.data_fim ? new Date(edicao.data_fim).toLocaleDateString('pt-BR') : ''}` : 'A definir'} />
        <InfoTag label="Local" value={edicao.local} />
      </div>

      {alertas?.length > 0 && (
        <div className="card p-4 mb-6 border-clay-500/30 bg-amber-50/60">
          <p className="flex items-center gap-2 text-sm font-semibold text-clay-600 mb-2">
            <AlertTriangle size={16} /> Alertas
          </p>
          <ul className="space-y-1">
            {alertas.map((a, i) => (
              <li key={i} className="text-sm text-forest-700 pl-1">• {a.texto}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Card icon={Users} label="Participantes" value={ind.participantes} />
        <Card icon={ArrowDownCircle} label="Entradas" value={money(ind.entradas)} />
        <Card icon={ArrowUpCircle} label="Saídas" value={money(ind.saidas)} />
        <Card icon={Scale} label="Saldo atual" value={money(ind.saldo)} />
        <Card icon={Receipt} label="A receber" value={money(ind.aReceber)} />
        <Card icon={PiggyBank} label="Arrecadações" value={money(ind.arrecadacoes)} />
        <Card icon={BedDouble} label="Acomodações" value={`${ind.ocupacaoAtual}/${ind.capacidadeTotal} ocupadas`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Entradas × Saídas × Saldo">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={g.entradasVsSaidas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dce5d9" />
              <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                {g.entradasVsSaidas.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Entradas por categoria">
          <DonutOrEmpty data={g.entradasPorCategoria} />
        </ChartCard>

        <ChartCard title="Saídas por categoria">
          <DonutOrEmpty data={g.saidasPorCategoria} />
        </ChartCard>

        <ChartCard title="Participantes">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-forest-500 mb-1 text-center">Classificação</p>
              <DonutOrEmpty data={g.participantesPorClassificacao} height={200} small />
            </div>
            <div>
              <p className="text-xs text-forest-500 mb-1 text-center">Acomodação</p>
              <DonutOrEmpty data={g.participantesPorAcomodacao} height={200} small />
            </div>
          </div>
        </ChartCard>
      </div>

      {editOpen && (
        <EditEditionModal
          edicao={edicao}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); load(); refresh(); }}
        />
      )}
    </div>
  );
}

function InfoTag({ label, value }) {
  return (
    <div className="card px-3.5 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-forest-500 font-semibold">{label}</p>
      <p className="text-sm text-forest-900 font-medium truncate">{value || 'A definir'}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="card p-5">
      <p className="font-display text-forest-900 mb-3">{title}</p>
      {children}
    </div>
  );
}

function DonutOrEmpty({ data, height = 260, small }) {
  const total = data.reduce((s, d) => s + (d.total || 0), 0);
  if (!total) {
    return <div className="flex items-center justify-center text-sm text-forest-400" style={{ height }}>Sem dados ainda</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="nome" innerRadius={small ? 40 : 60} outerRadius={small ? 65 : 95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => money(v)} />
        {!small && <Legend wrapperStyle={{ fontSize: 12 }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

function EditEditionModal({ edicao, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    tema: edicao.tema, versiculo: edicao.versiculo, data_inicio: edicao.data_inicio || '',
    data_fim: edicao.data_fim || '', local: edicao.local, endereco: edicao.endereco || '', observacoes: edicao.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.put(`/editions/${edicao.id}`, { ...edicao, ...form });
      toast.success('Informações da edição atualizadas.');
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Editar informações do retiro"
      onClose={onClose}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={save} disabled={saving}>Salvar</button>
      </>}
    >
      <div className="space-y-3">
        <div><label className="label">Tema</label><input className="input" value={form.tema} onChange={(e) => setForm({ ...form, tema: e.target.value })} /></div>
        <div><label className="label">Versículo</label><input className="input" value={form.versiculo} onChange={(e) => setForm({ ...form, versiculo: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Data de início</label><input type="date" className="input" value={form.data_inicio || ''} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
          <div><label className="label">Data de término</label><input type="date" className="input" value={form.data_fim || ''} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
        </div>
        <div><label className="label">Local</label><input className="input" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
        <div><label className="label">Endereço</label><input className="input" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
        <div><label className="label">Observações</label><textarea className="input" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
