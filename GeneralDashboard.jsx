import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Wallet, TentTree, PiggyBank, Users, CheckSquare, Package, ArrowRight,
} from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { Spinner } from '../../components/Common';

export default function GeneralDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/general-dashboard').then(({ data }) => setData(data));
  }, []);

  if (!data) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl text-forest-950">💚 Dashboard da Juventude</h1>
        <p className="text-sm text-forest-500 mt-1">Panorama geral de eventos, financeiro, retiro e equipe.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* Financeiro */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Financeiro (todas as origens)</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Entradas" value={money(data.financeiro.entradas)} />
            <Stat label="Saídas" value={money(data.financeiro.saidas)} />
            <Stat label="Saldo" value={money(data.financeiro.saldo)} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-forest-100">
            <Stat label="A pagar no cartão" value={money(data.financeiro.aPagarCartao)} />
            <Stat label="Caixa em espécie" value={money(data.financeiro.caixaEmEspecie)} />
          </div>
          <button className="text-sm text-forest-700 font-medium mt-3 flex items-center gap-1 hover:underline" onClick={() => navigate('/financeiro')}>
            Ver financeiro completo <ArrowRight size={14} />
          </button>
        </div>

        {/* Retiro atual */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TentTree size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Retiro atual</p>
          </div>
          {data.retiro ? (
            <>
              <p className="text-sm text-forest-600 mb-3">{data.retiro.nome} {data.retiro.data_inicio && `· ${formatDate(data.retiro.data_inicio)}`}</p>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Participantes" value={data.retiro.participantes} />
                <Stat label="Saldo" value={money(data.retiro.saldo)} />
                <Stat label="A receber" value={money(data.retiro.aReceber)} />
              </div>
              <button className="text-sm text-forest-700 font-medium mt-3 flex items-center gap-1 hover:underline" onClick={() => navigate(`/retiros/${data.retiro.id}`)}>
                Acessar retiro <ArrowRight size={14} />
              </button>
            </>
          ) : <p className="text-sm text-forest-400 italic">Nenhum retiro cadastrado ainda.</p>}
        </div>

        {/* Eventos */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Próximos eventos</p>
          </div>
          {data.eventos.proximos.length === 0 ? (
            <p className="text-sm text-forest-400 italic">Nenhum evento futuro agendado.</p>
          ) : (
            <div className="space-y-1.5 mb-3">
              {data.eventos.proximos.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm bg-forest-50 rounded-lg px-3 py-2">
                  <span className="text-forest-800 font-medium truncate">{e.nome}</span>
                  <span className="text-forest-500 shrink-0 ml-2">{formatDate(e.data)}</span>
                </div>
              ))}
            </div>
          )}
          <button className="text-sm text-forest-700 font-medium flex items-center gap-1 hover:underline" onClick={() => navigate('/eventos')}>
            Ver todos os eventos <ArrowRight size={14} />
          </button>
        </div>

        {/* Equipe + Arrecadações */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Equipe & Arrecadações</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Pessoas na equipe" value={data.equipe.total} />
            <Stat label="Arrecadado (líquido)" value={money(data.arrecadacoes)} />
          </div>
          <div className="flex gap-4 mt-3">
            <button className="text-sm text-forest-700 font-medium flex items-center gap-1 hover:underline" onClick={() => navigate('/equipe')}>Ver equipe <ArrowRight size={14} /></button>
            <button className="text-sm text-forest-700 font-medium flex items-center gap-1 hover:underline" onClick={() => navigate('/arrecadacoes')}>Ver arrecadações <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Checklists</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Pendentes" value={data.checklist.pendentes} />
            <Stat label="Atrasadas" value={data.checklist.atrasadas} />
            <Stat label="Concluídas" value={data.checklist.concluidas} />
          </div>
          <button className="text-sm text-forest-700 font-medium mt-3 flex items-center gap-1 hover:underline" onClick={() => navigate('/checklists')}>
            Ver checklists <ArrowRight size={14} />
          </button>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package size={17} className="text-forest-700" />
            <p className="font-display text-forest-900">Estoque</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Disponíveis" value={data.estoque.disponiveis} />
            <Stat label="Reservados" value={data.estoque.reservados} />
            <Stat label="Emprestados" value={data.estoque.emprestados} />
          </div>
          <button className="text-sm text-forest-700 font-medium mt-3 flex items-center gap-1 hover:underline" onClick={() => navigate('/estoque')}>
            Ver estoque <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-forest-500 font-semibold">{label}</p>
      <p className="font-display text-lg text-forest-950">{value}</p>
    </div>
  );
}
