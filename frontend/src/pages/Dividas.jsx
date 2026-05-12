import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';

function isDivida(item) {
  if (item.tipo !== 'despesa') return false;
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return texto.includes('divida') || texto.includes('dívida') || texto.includes('parcela') || texto.includes('emprest') || texto.includes('reforma') || texto.includes('equipamento') || texto.includes('fornecedor');
}

export default function Dividas() {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({
    credor: 'Fornecedor',
    descricao: '',
    valor: '',
    dataTrasacao: new Date().toISOString().split('T')[0]
  });

  const meses = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      valor: i + 1,
      label: new Date(2026, i, 1).toLocaleDateString('pt-BR', { month: 'short' })
    })),
    []
  );

  useEffect(() => {
    carregar();
  }, [mesAtual, anoAtual]);

  async function carregar() {
    try {
      setCarregando(true);
      const resp = await transacaoService.listar(mesAtual, anoAtual);
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
      await transacaoService.criar('despesa', `Dívida - ${form.credor}`, form.descricao, Number(form.valor), form.dataTrasacao);
      setShowForm(false);
      setForm({ credor: 'Fornecedor', descricao: '', valor: '', dataTrasacao: new Date().toISOString().split('T')[0] });
      carregar();
    } catch (erro) {
      alert(`Erro ao salvar: ${erro.message}`);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir dívida?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  const totalOriginal = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totalPago = 0;
  const saldoDevedor = totalOriginal - totalPago;
  const quitacao = totalOriginal > 0 ? (totalPago / totalOriginal) * 100 : 0;

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">🏢 Dívidas e Parcelamentos</h2>
          <p className="page-note">Pagamentos parciais registrados com data e usuário</p>
        </div>
        <div className="page-actions">
          <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}/{String(anoAtual).slice(-2)}</option>
            ))}
          </select>
          <button className="btn btn-brand" type="button" onClick={() => setShowForm((s) => !s)}>+ Nova Dívida</button>
        </div>
      </section>

      <section className="kpi-grid kpi-grid-4">
        <article className="kpi-card"><p className="kpi-label">Total Original</p><p className="kpi-value">{formatCurrency(totalOriginal)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Total Pago</p><p className="kpi-value kpi-positive">{formatCurrency(totalPago)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Saldo Devedor</p><p className="kpi-value kpi-negative">{formatCurrency(saldoDevedor)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Quitação Geral</p><p className="kpi-value kpi-warn">{quitacao.toFixed(1)}%</p></article>
      </section>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Dívida">
        <form className="txn-form" onSubmit={salvar}>
          <input className="input" placeholder="Credor" value={form.credor} onChange={(e) => setForm({ ...form, credor: e.target.value })} required />
          <input className="input" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
          <input className="input" type="number" step="0.01" min="0" placeholder="Valor original" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
          <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
          <button className="btn btn-brand" type="submit">Salvar</button>
        </form>
      </Modal>

      <section className="table-wrap desktop-table">
        <table className="table">
          <thead>
            <tr>
              <th>Dívida</th>
              <th>Credor</th>
              <th>Original</th>
              <th>Pago</th>
              <th>Saldo</th>
              <th>Últ. Pgto.</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan="8">Carregando...</td></tr>}
            {!carregando && itens.length === 0 && <tr><td colSpan="8">Sem dívidas no período.</td></tr>}
            {!carregando && itens.map((item) => {
              const valor = Number(item.valor || 0);
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{item.descricao}</td>
                  <td>{item.categoria.replace('Dívida - ', '')}</td>
                  <td>{formatCurrency(valor)}</td>
                  <td className="kpi-positive">{formatCurrency(0)}</td>
                  <td className="kpi-negative" style={{ fontWeight: 700 }}>{formatCurrency(valor)}</td>
                  <td>{formatDate(item.data_transacao)}</td>
                  <td><span className="pill pill-warn">Em andamento</span></td>
                  <td>
                    <button className="btn btn-secondary" type="button" onClick={() => alert('Tela de histórico será conectada na próxima etapa.')}>Histórico</button>
                    <button className="btn btn-danger-soft" type="button" onClick={() => excluir(item.id)} style={{ marginLeft: 6 }}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mobile-cards">
        {carregando && (
          <article className="mobile-card">
            <p className="mobile-card-title">Carregando...</p>
          </article>
        )}
        {!carregando && itens.length === 0 && (
          <article className="mobile-card">
            <p className="mobile-card-title">Sem dívidas no período.</p>
          </article>
        )}
        {!carregando && itens.map((item) => {
          const valor = Number(item.valor || 0);
          return (
            <article className="mobile-card" key={`mobile-${item.id}`}>
              <div className="mobile-card-head">
                <p className="mobile-card-title">{item.descricao}</p>
                <span className="pill pill-warn">Em andamento</span>
              </div>
              <div className="mobile-row"><span className="mobile-key">Credor</span><span className="mobile-value">{item.categoria.replace('Dívida - ', '')}</span></div>
              <div className="mobile-row"><span className="mobile-key">Original</span><span className="mobile-value">{formatCurrency(valor)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Pago</span><span className="mobile-value kpi-positive">{formatCurrency(0)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Saldo</span><span className="mobile-value kpi-negative">{formatCurrency(valor)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Últ. Pgto.</span><span className="mobile-value">{formatDate(item.data_transacao)}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" type="button" onClick={() => alert('Tela de histórico será conectada na próxima etapa.')}>Histórico</button>
                <button className="btn btn-danger-soft" type="button" onClick={() => excluir(item.id)}>×</button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <h3>Progresso de Quitação</h3>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, quitacao)}%` }}></div>
        </div>
        <p className="page-note" style={{ marginTop: 8 }}>{quitacao.toFixed(1)}% quitado no período.</p>
      </section>
    </div>
  );
}
