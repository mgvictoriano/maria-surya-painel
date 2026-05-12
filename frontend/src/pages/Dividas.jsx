import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

function isDivida(item) {
  if (item.tipo !== 'despesa') return false;
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return texto.includes('divida') || texto.includes('dívida') || texto.includes('parcela') || texto.includes('emprest') || texto.includes('reforma') || texto.includes('equipamento') || texto.includes('fornecedor');
}

function getPago(descricao) {
  const m = String(descricao || '').match(/\[pago:([\d.]+)\]/i);
  return m ? Number(m[1]) : 0;
}

function getStatusTag(descricao) {
  const m = String(descricao || '').match(/\[status:([^\]]+)\]/i);
  return m ? m[1] : 'em_andamento';
}

function cleanDesc(descricao) {
  return String(descricao || '')
    .replace(/\s*\[pago:[^\]]+\]/gi, '')
    .replace(/\s*\[status:[^\]]+\]/gi, '')
    .trim();
}

function buildDesc(descricao, pago, status) {
  return `${descricao} [pago:${pago}][status:${status}]`;
}

const STATUS_CONFIG = {
  em_andamento: { label: 'Em andamento', cls: 'pill-warn' },
  parcial:      { label: 'Parcial',       cls: 'pill-purple' },
  quitado:      { label: 'Quitado',       cls: 'pill-success' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.em_andamento;
  return <span className={`pill ${cfg.cls}`}>{cfg.label}</span>;
}

export default function Dividas() {
  const [filtro, setFiltro] = useState('ativo');
  const [showForm, setShowForm] = useState(false);
  const [showPagamento, setShowPagamento] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [form, setForm] = useState({
    credor: '',
    descricao: '',
    valor: '',
    dataTrasacao: new Date().toISOString().split('T')[0],
  });

  const [formPagamento, setFormPagamento] = useState({ valorPago: '' });

  const [formEditar, setFormEditar] = useState({
    credor: '',
    descricao: '',
    valor: '',
    dataTrasacao: '',
  });

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      setCarregando(true);
      const resp = await transacaoService.listar();
      setItens((resp.transacoes || []).filter(isDivida));
    } catch (erro) {
      alert(`Erro ao carregar dívidas: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      const descricao = buildDesc(form.descricao, 0, 'em_andamento');
      await transacaoService.criar('despesa', `Dívida - ${form.credor}`, descricao, Number(form.valor), form.dataTrasacao);
      setShowForm(false);
      setForm({ credor: '', descricao: '', valor: '', dataTrasacao: new Date().toISOString().split('T')[0] });
      carregar();
    } catch (erro) {
      alert(`Erro ao salvar: ${erro.message}`);
    }
  }

  function abrirPagamento(item) {
    setItemSelecionado(item);
    setFormPagamento({ valorPago: '' });
    setShowPagamento(true);
  }

  async function registrarPagamento(e) {
    e.preventDefault();
    try {
      const item = itemSelecionado;
      const valorOriginal = Number(item.valor || 0);
      const pagoAtual = getPago(item.descricao);
      const novoPagamento = Number(formPagamento.valorPago || 0);
      const novoTotal = Math.min(pagoAtual + novoPagamento, valorOriginal);
      const novoStatus = novoTotal >= valorOriginal ? 'quitado' : novoTotal > 0 ? 'parcial' : 'em_andamento';
      const novaDesc = buildDesc(cleanDesc(item.descricao), novoTotal, novoStatus);
      await transacaoService.atualizar(item.id, { descricao: novaDesc });
      setShowPagamento(false);
      carregar();
    } catch (erro) {
      alert(`Erro ao registrar pagamento: ${erro.message}`);
    }
  }

  function abrirEditar(item) {
    setItemSelecionado(item);
    setFormEditar({
      credor: (item.categoria || '').replace('Dívida - ', ''),
      descricao: cleanDesc(item.descricao),
      valor: String(item.valor || ''),
      dataTrasacao: item.data_transacao ? item.data_transacao.split('T')[0] : '',
    });
    setShowEditar(true);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    try {
      const item = itemSelecionado;
      const pagoAtual = getPago(item.descricao);
      const statusAtual = getStatusTag(item.descricao);
      const novaDesc = buildDesc(formEditar.descricao, pagoAtual, statusAtual);
      await transacaoService.atualizar(item.id, {
        categoria: `Dívida - ${formEditar.credor}`,
        descricao: novaDesc,
        valor: Number(formEditar.valor),
      });
      setShowEditar(false);
      carregar();
    } catch (erro) {
      alert(`Erro ao editar: ${erro.message}`);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir dívida?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  const itensMapeados = useMemo(() => itens.map((item) => ({
    ...item,
    _pago: getPago(item.descricao),
    _status: getStatusTag(item.descricao),
    _descClean: cleanDesc(item.descricao),
    _credor: (item.categoria || '').replace('Dívida - ', ''),
  })), [itens]);

  const itensFiltrados = useMemo(() => {
    if (filtro === 'ativo') return itensMapeados.filter((i) => i._status !== 'quitado');
    if (filtro === 'quitado') return itensMapeados.filter((i) => i._status === 'quitado');
    return itensMapeados;
  }, [itensMapeados, filtro]);

  const totalOriginal = itensMapeados.filter((i) => i._status !== 'quitado').reduce((acc, i) => acc + Number(i.valor || 0), 0);
  const totalPago = itensMapeados.reduce((acc, i) => acc + i._pago, 0);
  const saldoDevedor = itensMapeados.filter((i) => i._status !== 'quitado').reduce((acc, i) => acc + (Number(i.valor || 0) - i._pago), 0);
  const totalDividas = itensMapeados.length;
  const quitadas = itensMapeados.filter((i) => i._status === 'quitado').length;
  const quitacaoPct = totalDividas > 0 ? (quitadas / totalDividas) * 100 : 0;

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">🏢 Dívidas e Parcelamentos</h2>
          <p className="page-note">Controle pagamentos parciais e quitação de dívidas</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-brand" type="button" onClick={() => setShowForm(true)}>+ Nova Dívida</button>
        </div>
      </section>

      <section className="kpi-grid kpi-grid-4">
        <article className="kpi-card"><p className="kpi-label">Total Original</p><p className="kpi-value">{formatCurrency(totalOriginal)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Total Pago</p><p className="kpi-value kpi-positive">{formatCurrency(totalPago)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Saldo Devedor</p><p className="kpi-value kpi-negative">{formatCurrency(saldoDevedor)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Quitação Geral</p><p className="kpi-value kpi-warn">{quitacaoPct.toFixed(1)}%</p></article>
      </section>

      <div className="segmented" style={{ marginBottom: 12 }}>
        <button className={`segmented-btn${filtro === 'ativo' ? ' active' : ''}`} onClick={() => setFiltro('ativo')}>Em aberto</button>
        <button className={`segmented-btn${filtro === 'todos' ? ' active' : ''}`} onClick={() => setFiltro('todos')}>Todas</button>
        <button className={`segmented-btn${filtro === 'quitado' ? ' active' : ''}`} onClick={() => setFiltro('quitado')}>Quitadas</button>
      </div>

      {/* Modal Nova Dívida */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Dívida">
        <form className="txn-form" onSubmit={salvar}>
          <input className="input" placeholder="Credor (ex: Fornecedor, Banco)" value={form.credor} onChange={(e) => setForm({ ...form, credor: e.target.value })} required />
          <input className="input" placeholder="Descrição (ex: Reforma da cozinha)" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
          <CurrencyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} placeholder="R$ 0,00 (total da dívida)" required />
          <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
          <button className="btn btn-brand" type="submit">Salvar</button>
        </form>
      </Modal>

      {/* Modal Registrar Pagamento */}
      <Modal open={showPagamento} onClose={() => setShowPagamento(false)} title="Registrar Pagamento">
        {itemSelecionado && (
          <form className="txn-form" onSubmit={registrarPagamento}>
            <div style={{ padding: '10px 0 6px', borderBottom: '1px solid rgba(0,0,0,0.07)', marginBottom: 12 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{itemSelecionado._descClean}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>Credor: {itemSelecionado._credor}</p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 14 }}>
                <span>Total: <strong>{formatCurrency(itemSelecionado.valor)}</strong></span>
                <span>Pago: <strong style={{ color: '#2a9d5c' }}>{formatCurrency(itemSelecionado._pago)}</strong></span>
                <span>Falta: <strong style={{ color: '#c0392b' }}>{formatCurrency(Number(itemSelecionado.valor) - itemSelecionado._pago)}</strong></span>
              </div>
            </div>
            <CurrencyInput value={formPagamento.valorPago} onChange={(v) => setFormPagamento({ valorPago: v })} placeholder="R$ 0,00 (valor pago agora)" required />
            <button className="btn btn-brand" type="submit">Confirmar Pagamento</button>
          </form>
        )}
      </Modal>

      {/* Modal Editar Dívida */}
      <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar Dívida">
        <form className="txn-form" onSubmit={salvarEdicao}>
          <input className="input" placeholder="Credor" value={formEditar.credor} onChange={(e) => setFormEditar({ ...formEditar, credor: e.target.value })} required />
          <input className="input" placeholder="Descrição" value={formEditar.descricao} onChange={(e) => setFormEditar({ ...formEditar, descricao: e.target.value })} required />
          <CurrencyInput value={formEditar.valor} onChange={(v) => setFormEditar({ ...formEditar, valor: v })} required />
          <button className="btn btn-brand" type="submit">Salvar Alterações</button>
        </form>
      </Modal>

      {/* Tabela Desktop */}
      <section className="table-wrap desktop-table">
        <table className="table">
          <thead>
            <tr>
              <th>Dívida</th>
              <th>Credor</th>
              <th>Original</th>
              <th>Pago</th>
              <th>Saldo</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan="8">Carregando...</td></tr>}
            {!carregando && itensFiltrados.length === 0 && <tr><td colSpan="8">Nenhuma dívida neste filtro.</td></tr>}
            {!carregando && itensFiltrados.map((item) => {
              const original = Number(item.valor || 0);
              const saldo = original - item._pago;
              return (
                <tr key={item.id} style={{ opacity: item._status === 'quitado' ? 0.6 : 1 }}>
                  <td style={{ fontWeight: 700 }}>{item._descClean}</td>
                  <td>{item._credor}</td>
                  <td>{formatCurrency(original)}</td>
                  <td className="kpi-positive">{formatCurrency(item._pago)}</td>
                  <td className={saldo > 0 ? 'kpi-negative' : ''} style={{ fontWeight: 700 }}>{formatCurrency(saldo)}</td>
                  <td><StatusPill status={item._status} /></td>
                  <td>{formatDate(item.data_transacao)}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {item._status !== 'quitado' && (
                      <button className="btn btn-secondary" type="button" onClick={() => abrirPagamento(item)}>💰 Pagar</button>
                    )}
                    <button className="btn btn-secondary" type="button" onClick={() => abrirEditar(item)}>✏️ Editar</button>
                    <button className="btn btn-danger-soft" type="button" onClick={() => excluir(item.id)}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Cards Mobile */}
      <section className="mobile-cards">
        {carregando && <article className="mobile-card"><p className="mobile-card-title">Carregando...</p></article>}
        {!carregando && itensFiltrados.length === 0 && <article className="mobile-card"><p className="mobile-card-title">Nenhuma dívida neste filtro.</p></article>}
        {!carregando && itensFiltrados.map((item) => {
          const original = Number(item.valor || 0);
          const saldo = original - item._pago;
          return (
            <article className="mobile-card" key={`m-${item.id}`} style={{ opacity: item._status === 'quitado' ? 0.65 : 1 }}>
              <div className="mobile-card-head">
                <p className="mobile-card-title">{item._descClean}</p>
                <StatusPill status={item._status} />
              </div>
              <div className="mobile-row"><span className="mobile-key">Credor</span><span className="mobile-value">{item._credor}</span></div>
              <div className="mobile-row"><span className="mobile-key">Total</span><span className="mobile-value">{formatCurrency(original)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Pago</span><span className="mobile-value kpi-positive">{formatCurrency(item._pago)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Saldo</span><span className={`mobile-value${saldo > 0 ? ' kpi-negative' : ''}`}>{formatCurrency(saldo)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Data</span><span className="mobile-value">{formatDate(item.data_transacao)}</span></div>
              {saldo > 0 && (
                <div className="progress-track" style={{ margin: '8px 0 4px' }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, (item._pago / original) * 100)}%` }}></div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {item._status !== 'quitado' && (
                  <button className="btn btn-secondary" style={{ flex: 1 }} type="button" onClick={() => abrirPagamento(item)}>💰 Pagar</button>
                )}
                <button className="btn btn-secondary" type="button" onClick={() => abrirEditar(item)}>✏️</button>
                <button className="btn btn-danger-soft" type="button" onClick={() => excluir(item.id)}>×</button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <h3>Progresso de Quitação</h3>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, quitacaoPct)}%` }}></div>
        </div>
        <p className="page-note" style={{ marginTop: 8 }}>{quitadas} de {totalDividas} dívida{totalDividas !== 1 ? 's' : ''} quitada{quitadas !== 1 ? 's' : ''} ({quitacaoPct.toFixed(1)}%)</p>
      </section>
    </div>
  );
}
