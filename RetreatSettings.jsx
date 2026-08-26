import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader } from '../../components/Common';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function RetreatSettings() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [acomodacao, setAcomodacao] = useState([]);
  const [classificacao, setClassificacao] = useState([]);
  const [arrecadacao, setArrecadacao] = useState([]);
  const [adding, setAdding] = useState(null);
  const [name, setName] = useState('');

  async function load() {
    if (!currentId) return;
    const [{ data: a }, { data: c }, { data: f }] = await Promise.all([
      api.get('/categories', { params: { edition_id: currentId, tipo: 'acomodacao' } }),
      api.get('/categories', { params: { edition_id: currentId, tipo: 'classificacao' } }),
      api.get('/categories', { params: { edition_id: currentId, tipo: 'arrecadacao' } }),
    ]);
    setAcomodacao(a); setClassificacao(c); setArrecadacao(f);
  }
  useEffect(() => { load(); }, [currentId]);

  async function addItem() {
    if (!name.trim()) return;
    try {
      await api.post('/categories', { edition_id: currentId, tipo: adding, nome: name.trim() });
      toast.success('Item adicionado.');
      setName(''); setAdding(null); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  function Block({ title, items, tipo }) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-forest-900">{title}</p>
          <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setAdding(tipo)}><Plus size={13} /> Adicionar</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((i) => <span key={i.id} className="badge-green">{i.nome}</span>)}
          {items.length === 0 && <p className="text-sm text-forest-400 italic">Nenhum item.</p>}
        </div>
        {adding === tipo && (
          <div className="mt-3 flex gap-2">
            <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} />
            <button className="btn-primary !px-3" onClick={addItem}>OK</button>
            <button className="btn-ghost !px-3" onClick={() => { setAdding(null); setName(''); }}>Cancelar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Configurações da edição" description="Tipos e classificações específicos desta edição do retiro." />
      <div className="grid md:grid-cols-2 gap-4">
        <Block title="Tipos de acomodação" items={acomodacao} tipo="acomodacao" />
        <Block title="Classificações de inscrição" items={classificacao} tipo="classificacao" />
        <Block title="Tipos de arrecadação" items={arrecadacao} tipo="arrecadacao" />
      </div>
    </div>
  );
}
