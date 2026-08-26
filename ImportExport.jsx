import { useEffect, useState } from 'react';
import {
  Upload, Download, FileSpreadsheet, ChevronRight, ChevronLeft, CheckCircle2,
  AlertTriangle, Copy, Wallet, CalendarDays, PiggyBank, ShoppingCart, Package,
  CheckSquare, Users, TentTree,
} from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { PageHeader } from '../../components/Common';
import { useToast, apiErrorMessage } from '../../context/ToastContext';
import { exportToXlsx, exportToCsv, parseSpreadsheetFile } from '../../lib/spreadsheet';
import { buildPreview, summarize } from '../../lib/importLogic';
import { IMPORT_SCHEMAS } from '../../lib/importSchemas';

const TABS = [
  { k: 'exportar', l: 'Exportar', i: Download },
  { k: 'importar', l: 'Importar', i: Upload },
];

export default function ImportExport() {
  const [tab, setTab] = useState('exportar');
  return (
    <div>
      <PageHeader title="Importar / Exportar" description="Exporte qualquer módulo para Excel/CSV, ou importe planilhas de movimentações financeiras com prévia e detecção de duplicidade." />
      <div className="flex gap-1 mb-6 border-b border-forest-100">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.k ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'}`}>
            <t.i size={15} /> {t.l}
          </button>
        ))}
      </div>
      {tab === 'exportar' && <ExportTab />}
      {tab === 'importar' && <ImportWizard />}
    </div>
  );
}

// =====================================================================
// EXPORTAR
// =====================================================================
function ExportCard({ icon: Icon, title, description, onExport, extra }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function run(format) {
    setLoading(true);
    try {
      await onExport(format);
      toast.success('Exportação concluída — o download deve começar automaticamente.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível exportar este módulo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={16} className="text-forest-700" />
        <p className="font-display text-forest-900">{title}</p>
      </div>
      <p className="text-xs text-forest-500 mb-3">{description}</p>
      {extra}
      <div className="flex gap-2">
        <button className="btn-secondary !py-1.5 !px-3 text-xs flex-1" disabled={loading} onClick={() => run('xlsx')}>
          <FileSpreadsheet size={13} /> .xlsx
        </button>
        <button className="btn-secondary !py-1.5 !px-3 text-xs flex-1" disabled={loading} onClick={() => run('csv')}>
          <FileSpreadsheet size={13} /> .csv
        </button>
      </div>
    </div>
  );
}

function ExportTab() {
  const [editions, setEditions] = useState([]);
  const [editionId, setEditionId] = useState('');

  useEffect(() => { api.get('/editions').then(({ data }) => setEditions(data)); }, []);

  async function exportFinancial(format) {
    const [{ data: inc }, { data: exp }] = await Promise.all([api.get('/financial/all/incomes'), api.get('/financial/all/expenses')]);
    const rows = [
      ...inc.map((r) => ({ ...r, tipo: 'Entrada' })),
      ...exp.map((r) => ({ ...r, tipo: 'Saída' })),
    ].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const columns = [
      { key: 'tipo', label: 'Tipo' }, { key: 'data', label: 'Data' }, { key: 'descricao', label: 'Descrição' },
      { key: 'valor', label: 'Valor' }, { key: 'categoria_nome', label: 'Categoria' },
      { key: 'origem_label', label: 'Origem' }, { key: 'responsavel', label: 'Responsável' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`financeiro_geral.${format}`, rows, columns);
  }

  async function exportEvents(format) {
    const { data } = await api.get('/events');
    const columns = [
      { key: 'nome', label: 'Nome' }, { key: 'tipo_nome', label: 'Tipo' }, { key: 'data', label: 'Data' },
      { key: 'local', label: 'Local' }, { key: 'status', label: 'Status' }, { key: 'responsavel', label: 'Responsável' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`eventos.${format}`, data, columns);
  }

  async function exportFundraisers(format) {
    const { data } = await api.get('/fundraisers/all');
    const columns = [
      { key: 'nome', label: 'Nome' }, { key: 'tipo', label: 'Tipo' }, { key: 'data', label: 'Data' },
      { key: 'valor_arrecadado', label: 'Arrecadado' }, { key: 'despesas', label: 'Despesas' },
      { key: 'resultado_liquido', label: 'Resultado líquido' }, { key: 'origem_label', label: 'Origem' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`arrecadacoes.${format}`, data, columns);
  }

  async function exportShopping(format) {
    const { data } = await api.get('/shopping/all');
    const columns = [
      { key: 'produto', label: 'Produto' }, { key: 'quantidade', label: 'Quantidade' }, { key: 'unidade', label: 'Unidade' },
      { key: 'preco_estimado', label: 'Preço estimado' }, { key: 'preco_real', label: 'Preço real' },
      { key: 'status', label: 'Status' }, { key: 'origem_label', label: 'Origem' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`compras.${format}`, data, columns);
  }

  async function exportInventory(format) {
    const { data } = await api.get('/inventory/items');
    const columns = [
      { key: 'nome', label: 'Item' }, { key: 'quantidade', label: 'Quantidade' }, { key: 'unidade', label: 'Unidade' },
      { key: 'estado', label: 'Estado' }, { key: 'local_caminho', label: 'Local' }, { key: 'responsavel', label: 'Responsável' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`estoque.${format}`, data, columns);
  }

  async function exportChecklists(format) {
    const { data: list } = await api.get('/checklists');
    const details = await Promise.all(list.map((c) => api.get(`/checklists/${c.id}`).then((r) => r.data)));
    const rows = [];
    details.forEach((c) => {
      const allItems = [...c.itemsSemSecao.map((i) => ({ ...i, secao: '—' })), ...c.sections.flatMap((s) => s.items.map((i) => ({ ...i, secao: s.nome })))];
      allItems.forEach((i) => rows.push({ checklist: c.nome, secao: i.secao, tarefa: i.descricao, responsavel: i.responsavel, prazo: i.prazo, prioridade: i.prioridade, status: i.status }));
    });
    const columns = [
      { key: 'checklist', label: 'Checklist' }, { key: 'secao', label: 'Seção' }, { key: 'tarefa', label: 'Tarefa' },
      { key: 'responsavel', label: 'Responsável' }, { key: 'prazo', label: 'Prazo' }, { key: 'prioridade', label: 'Prioridade' }, { key: 'status', label: 'Status' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`checklists.${format}`, rows, columns);
  }

  async function exportTeam(format) {
    const { data } = await api.get('/team/people');
    const columns = [
      { key: 'nome', label: 'Nome' }, { key: 'funcao', label: 'Função' }, { key: 'area_nome', label: 'Área' },
      { key: 'telefone', label: 'Telefone' }, { key: 'email', label: 'E-mail' }, { key: 'ativo', label: 'Ativo' },
    ];
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`equipe.${format}`, data, columns);
  }

  async function exportParticipants(format) {
    if (!editionId) throw new Error('Selecione uma edição do retiro primeiro.');
    const { data } = await api.get('/participants', { params: { edition_id: editionId } });
    const columns = [
      { key: 'nome', label: 'Nome' }, { key: 'telefone', label: 'Telefone' }, { key: 'tipo_acomodacao', label: 'Acomodação' },
      { key: 'classificacao', label: 'Classificação' }, { key: 'valor_inscricao', label: 'Valor inscrição' },
      { key: 'valor_pago', label: 'Valor pago' }, { key: 'valor_restante', label: 'Valor restante' }, { key: 'status_pagamento', label: 'Status' },
    ];
    const ed = editions.find((e) => e.id === editionId);
    (format === 'xlsx' ? exportToXlsx : exportToCsv)(`participantes_${ed?.nome || 'retiro'}.${format}`, data, columns);
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ExportCard icon={Wallet} title="Financeiro Geral" description="Todas as entradas e saídas, de todas as origens." onExport={exportFinancial} />
      <ExportCard icon={CalendarDays} title="Eventos" description="Lista completa de eventos cadastrados." onExport={exportEvents} />
      <ExportCard icon={PiggyBank} title="Arrecadações" description="Todas as arrecadações, com resultado líquido." onExport={exportFundraisers} />
      <ExportCard icon={ShoppingCart} title="Compras" description="Lista de compras consolidada." onExport={exportShopping} />
      <ExportCard icon={Package} title="Estoque" description="Todos os itens cadastrados, com local e estado." onExport={exportInventory} />
      <ExportCard icon={CheckSquare} title="Checklists" description="Todas as tarefas de todos os checklists." onExport={exportChecklists} />
      <ExportCard icon={Users} title="Equipe" description="Diretório de pessoas e áreas." onExport={exportTeam} />
      <ExportCard
        icon={TentTree}
        title="Participantes de um retiro"
        description="Selecione a edição antes de exportar."
        onExport={exportParticipants}
        extra={
          <select className="input !py-1.5 text-xs mb-3" value={editionId} onChange={(e) => setEditionId(e.target.value)}>
            <option value="">Selecione a edição...</option>
            {editions.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        }
      />
    </div>
  );
}

// =====================================================================
// IMPORTAR (assistente guiado)
// =====================================================================
// IMPORTAR (assistente guiado, genérico por tipo de importação)
// =====================================================================
function ImportWizard() {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [schemaKey, setSchemaKey] = useState('expense');
  const [origemTipo, setOrigemTipo] = useState('geral');
  const [origemId, setOrigemId] = useState('');
  const [editionId, setEditionId] = useState('');
  const [editions, setEditions] = useState([]);
  const [events, setEvents] = useState([]);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const schema = IMPORT_SCHEMAS[schemaKey];

  useEffect(() => {
    api.get('/editions').then(({ data }) => setEditions(data));
    api.get('/events').then(({ data }) => setEvents(data));
  }, []);

  function buildContext() {
    const ctx = { origemTipo, origemId, editionId };
    if (origemTipo === 'evento') ctx.origemLabel = events.find((e) => e.id === origemId)?.nome || 'Evento';
    return ctx;
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const parsedResult = await parseSpreadsheetFile(f);
      setParsed(parsedResult);
      const guess = {};
      parsedResult.headers.forEach((h) => {
        const l = h.toLowerCase();
        schema.fields.forEach((f) => {
          if (guess[f.key]) return;
          if (f.key === 'data' && /data/.test(l)) guess[f.key] = h;
          if ((f.key === 'descricao' || f.key === 'nome' || f.key === 'produto') && /(descri|hist[oó]rico|item|nome|produto|evento)/.test(l)) guess[f.key] = h;
          if ((f.key === 'valor' || f.key === 'valor_arrecadado' || f.key === 'valor_inscricao') && /valor/.test(l)) guess[f.key] = h;
          if (f.key === 'categoria' && /categ/.test(l)) guess[f.key] = h;
          if (f.key === 'forma' && /(pagamento|recebimento|forma)/.test(l)) guess[f.key] = h;
          if (f.key === 'responsavel' && /respons/.test(l)) guess[f.key] = h;
          if (f.key === 'telefone' && /(telefone|fone|celular)/.test(l)) guess[f.key] = h;
          if (f.key === 'email' && /(e-?mail)/.test(l)) guess[f.key] = h;
        });
      });
      setMapping(guess);
      setStep(3);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function goToPreview() {
    const missingRequired = schema.fields.filter((f) => f.required && !mapping[f.key]);
    if (missingRequired.length) {
      toast.error(`Mapeie ao menos: ${missingRequired.map((f) => f.label).join(', ')}.`);
      return;
    }
    try {
      const existing = await schema.fetchExisting(buildContext());
      const rows = buildPreview(parsed.rows, mapping, schema.fields, existing, schema.dedupeKey);
      setPreview(rows);
      setStep(4);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível carregar os registros existentes para comparar.'));
    }
  }

  async function confirmImport() {
    setImporting(true);
    const toImport = preview.filter((r) => r._status === 'novo');
    const ctx = buildContext();
    let ok = 0;
    let failed = 0;
    for (const row of toImport) {
      try {
        await schema.createRow(row, ctx);
        ok++;
      } catch {
        failed++;
      }
    }
    setImporting(false);
    setResult({ importados: ok, duplicatasIgnoradas: preview.filter((r) => r._status === 'duplicata').length, invalidosIgnorados: preview.filter((r) => r._status === 'invalido').length, falhas: failed });
    setStep(5);
  }

  function reset() {
    setStep(1); setFile(null); setParsed(null); setMapping({}); setPreview(null); setResult(null);
  }

  function changeSchema(key) {
    setSchemaKey(key); setOrigemTipo('geral'); setOrigemId(''); setEditionId('');
  }

  const summary = preview ? summarize(preview) : null;
  const previewFields = schema.fields.slice(0, 4); // mostra as 4 primeiras colunas na tabela de prévia

  return (
    <div>
      <StepIndicator step={step} />

      {step === 1 && (
        <div className="card p-5 max-w-lg">
          <p className="label mb-2">O que você está importando?</p>
          <select className="input mb-4" value={schemaKey} onChange={(e) => changeSchema(e.target.value)}>
            {Object.entries(IMPORT_SCHEMAS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>

          {schema.needsOrigin && (
            <>
              <p className="label mb-2">Origem dos lançamentos</p>
              <select className="input mb-3" value={origemTipo} onChange={(e) => { setOrigemTipo(e.target.value); setOrigemId(''); }}>
                <option value="geral">Juventude Geral</option>
                <option value="retiro">Um retiro específico</option>
                <option value="evento">Um evento específico</option>
              </select>
              {origemTipo === 'retiro' && (
                <select className="input mb-3" value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
                  <option value="">Selecione a edição...</option>
                  {editions.map((ed) => <option key={ed.id} value={ed.id}>{ed.nome}</option>)}
                </select>
              )}
              {origemTipo === 'evento' && (
                <select className="input mb-3" value={origemId} onChange={(e) => setOrigemId(e.target.value)}>
                  <option value="">Selecione o evento...</option>
                  {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              )}
            </>
          )}

          {schema.needsEdition && (
            <>
              <p className="label mb-2">Edição do retiro</p>
              <select className="input mb-3" value={editionId} onChange={(e) => setEditionId(e.target.value)}>
                <option value="">Selecione a edição...</option>
                {editions.map((ed) => <option key={ed.id} value={ed.id}>{ed.nome}</option>)}
              </select>
            </>
          )}

          <button
            className="btn-primary w-full justify-center"
            disabled={(schema.needsOrigin && origemTipo !== 'geral' && !origemId) || (schema.needsEdition && !editionId)}
            onClick={() => setStep(2)}
          >
            Continuar <ChevronRight size={15} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card p-8 max-w-lg text-center">
          <Upload size={28} className="text-forest-400 mx-auto mb-3" />
          <p className="font-display text-forest-900 mb-1">Envie sua planilha</p>
          <p className="text-sm text-forest-500 mb-4">Formatos aceitos: .xlsx, .xls ou .csv</p>
          <label className="btn-primary justify-center cursor-pointer inline-flex">
            Escolher arquivo
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </label>
          <div><button className="btn-ghost mt-4" onClick={() => setStep(1)}><ChevronLeft size={14} /> Voltar</button></div>
        </div>
      )}

      {step === 3 && parsed && (
        <div className="card p-5 max-w-xl">
          <p className="font-display text-forest-900 mb-1">Mapeamento de colunas</p>
          <p className="text-xs text-forest-500 mb-4">{parsed.rows.length} linha(s) encontrada(s) em "{file?.name}". Diga o que cada campo do sistema corresponde na sua planilha.</p>
          <div className="space-y-2.5">
            {schema.fields.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="text-sm text-forest-700 w-56 shrink-0">{f.label}{f.required && <span className="text-berry-500"> *</span>}</span>
                <select className="input" value={mapping[f.key] || ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}>
                  <option value="">Não importar</option>
                  {parsed.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <button className="btn-ghost" onClick={() => setStep(2)}><ChevronLeft size={14} /> Voltar</button>
            <button className="btn-primary flex-1 justify-center" onClick={goToPreview}>Ver prévia <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {step === 4 && preview && summary && (
        <div>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="card p-3 text-center"><p className="text-2xl font-display text-forest-950">{summary.total}</p><p className="text-xs text-forest-500">Total na planilha</p></div>
            <div className="card p-3 text-center"><p className="text-2xl font-display text-forest-700">{summary.novos}</p><p className="text-xs text-forest-500">Novos registros</p></div>
            <div className="card p-3 text-center"><p className="text-2xl font-display text-clay-600">{summary.duplicatas}</p><p className="text-xs text-forest-500">Possíveis duplicidades</p></div>
            <div className="card p-3 text-center"><p className="text-2xl font-display text-berry-600">{summary.invalidos}</p><p className="text-xs text-forest-500">Registros inválidos</p></div>
          </div>

          <div className="table-wrap mb-4 max-h-[420px] overflow-y-auto">
            <table className="data">
              <thead><tr><th>Status</th>{previewFields.map((f) => <th key={f.key}>{f.label}</th>)}</tr></thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r._index}>
                    <td>
                      {r._status === 'novo' && <span className="badge-green">Novo</span>}
                      {r._status === 'duplicata' && <span className="badge-amber flex items-center gap-1 w-fit"><Copy size={11} /> Duplicata</span>}
                      {r._status === 'invalido' && <span className="badge-red flex items-center gap-1 w-fit"><AlertTriangle size={11} /> Inválido</span>}
                    </td>
                    {previewFields.map((f) => (
                      <td key={f.key} className={f.type === 'money' ? 'money' : ''}>
                        {r[f.key] === null || r[f.key] === '' || r[f.key] === undefined
                          ? <span className="text-berry-500">faltando</span>
                          : f.type === 'money' ? money(r[f.key]) : f.type === 'date' ? formatDate(r[f.key]) : r[f.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-forest-500 mb-4">Duplicidades e registros inválidos não serão importados. Nenhum dado existente é alterado — apenas novos registros são criados.</p>

          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setStep(3)}><ChevronLeft size={14} /> Voltar ao mapeamento</button>
            <button className="btn-primary flex-1 justify-center" disabled={importing || summary.novos === 0} onClick={confirmImport}>
              {importing ? 'Importando...' : `Importar ${summary.novos} registro(s)`}
            </button>
          </div>
        </div>
      )}

      {step === 5 && result && (
        <div className="card p-8 max-w-lg text-center">
          <CheckCircle2 size={32} className="text-forest-600 mx-auto mb-3" />
          <p className="font-display text-lg text-forest-900 mb-3">Importação concluída</p>
          <div className="text-sm text-forest-700 space-y-1 mb-5">
            <p><strong>{result.importados}</strong> registro(s) importado(s)</p>
            <p><strong>{result.duplicatasIgnoradas}</strong> possível(is) duplicidade(s) ignorada(s)</p>
            <p><strong>{result.invalidosIgnorados}</strong> registro(s) inválido(s) ignorado(s)</p>
            {result.falhas > 0 && <p className="text-berry-600"><strong>{result.falhas}</strong> falharam ao salvar</p>}
          </div>
          <button className="btn-primary" onClick={reset}>Importar outra planilha</button>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }) {
  const labels = ['O que importar', 'Upload', 'Mapeamento', 'Prévia', 'Resultado'];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i + 1 <= step ? 'bg-forest-700 text-white' : 'bg-forest-100 text-forest-400'}`}>{i + 1}</div>
          <span className={`text-xs ${i + 1 <= step ? 'text-forest-800 font-medium' : 'text-forest-400'}`}>{l}</span>
          {i < labels.length - 1 && <ChevronRight size={13} className="text-forest-300" />}
        </div>
      ))}
    </div>
  );
}
