import { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import api, { formatDateTime } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';

const MODULES = ['Edições', 'Participantes', 'Acomodações', 'Financeiro', 'Categorias', 'Arrecadações', 'Lista de Compras', 'Programação', 'Gincana', 'Eventos', 'Equipe', 'Usuários', 'Permissões'];

export default function GlobalHistory() {
  const [logs, setLogs] = useState([]);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ edition_id: '', usuario: '', modulo: '' });

  useEffect(() => { api.get('/editions').then(({ data }) => setEditions(data)); }, []);

  async function load() {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    const { data } = await api.get('/history', { params });
    setLogs(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filters]);

  return (
    <div>
      <PageHeader title="Histórico" description="Auditoria completa de tudo o que acontece na plataforma — nada é apagado." />

      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input w-auto" value={filters.edition_id} onChange={(e) => setFilters({ ...filters, edition_id: e.target.value })}>
          <option value="">Todos os módulos/edições</option>
          {editions.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
        <select className="input w-auto" value={filters.modulo} onChange={(e) => setFilters({ ...filters, modulo: e.target.value })}>
          <option value="">Todos os tipos de ação</option>
          {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input className="input w-auto" placeholder="Filtrar por usuário..." value={filters.usuario} onChange={(e) => setFilters({ ...filters, usuario: e.target.value })} />
      </div>

      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum registro encontrado" description="As alterações realizadas no sistema aparecerão aqui." />
      ) : (
        <div className="card divide-y divide-forest-100">
          {logs.map((l) => (
            <div key={l.id} className="px-4 py-3 flex gap-3">
              <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 text-xs font-semibold shrink-0">
                {l.user_nome?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-forest-900">
                  <span className="font-semibold">{l.user_nome}</span> · <span className="text-forest-500">{formatDateTime(l.criado_em)}</span>
                </p>
                <p className="text-sm text-forest-700">{l.descricao}</p>
                <span className="badge-gray mt-1">{l.modulo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
