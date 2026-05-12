import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

const CATEGORIAS_FIXAS = ['Aluguel', 'Salários', 'Energia', 'Água', 'Internet', 'Contabilidade', 'Marketing'];

function hasTag(descricao, tag) {
  return String(descricao || '').toLowerCase().includes(tag.toLowerCase());
}

function cleanDescricao(descricao) {
  return String(descricao || '').replace(/\s*\[status:[^\]]+\]/i, '').trim();
}

function isFixa(item) {
  if (item.tipo !== 'despesa') return false;
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return ['aluguel', 'salario', 'salários', 'energia', 'agua', 'água', 'internet', 'contabilidade', 'marketing'].some((term) => texto.includes(term));
}

export default function DespesasFixas({ usuario }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [formEditar, setFormEditar] = useState({ categoria: 'Aluguel', descricao: '', valor: '', status: 'Pago' });
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState({
    categoria: 'Aluguel',
    descricao: '',
    valor: '',
    status: 'Pago',
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
    const resp = await transacaoService.listar(mesAtual, anoAtual);
    setItens((resp.transacoes || []).filter(isFixa));
  }

  async function salvar(e) {
    e.preventDefault();
    const descricao = `${form.descricao || form.categoria} [status:${form.status.toLowerCase()}]`;
    await transacaoService.criar('despesa', form.categoria, descricao, Number(form.valor), form.dataTrasacao);
    setForm({ categoria: 'Aluguel', descricao: '', valor: '', status: 'Pago', dataTrasacao: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    carregar();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir despesa fixa?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  async function toggleStatus(item) {
    const isPago = hasTag(item.descricao, '[status:pago]');
    const novoStatus = isPago ? 'a pagar' : 'pago';
    const novaDesc = `${cleanDescricao(item.descricao) || item.categoria} [status:${novoStatus}]`;
    await transacaoService.atualizar(item.id, { descricao: novaDesc });
    carregar();
  }

  function abrirEditar(item) {
    const isPago = hasTag(item.descricao, '[status:pago]');
    setItemSelecionado(item);
    setFormEditar({
      categoria: item.categoria || 'Aluguel',
      descricao: cleanDescricao(item.descricao),
      valor: String(item.valor || ''),
      status: isPago ? 'Pago' : 'A pagar',
    });
    setShowEditar(true);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const novaDesc = `${formEditar.descricao || formEditar.categoria} [status:${formEditar.status.toLowerCase()}]`;
    await transacaoService.atualizar(itemSelecionado.id, {
      categoria: formEditar.categoria,
      descricao: novaDesc,
      valor: Number(formEditar.valor),
    });
    setShowEditar(false);
    carregar();
  }

  const totalPrevisto = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totalPago = itens.reduce((acc, item) => acc + (hasTag(item.descricao, '[status:pago]') ? Number(item.valor || 0) : 0), 0);
  const aberto = totalPrevisto - totalPago;

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">🏠 Despesas Fixas</h2>
          <p className="page-note">Contas recorrentes mensais</p>
        </div>
        <div className="page-actions">
          <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}/{String(anoAtual).slice(-2)}</option>
            ))}
          </select>
          <button className="btn btn-brand" type="button" onClick={() => setShowForm((s) => !s)}>+ Adicionar</button>
        </div>
      </section>

      <section className="kpi-grid kpi-grid-4">
        <article className="kpi-card"><p className="kpi-label">Total Previsto</p><p className="kpi-value">{formatCurrency(totalPrevisto)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Total Pago</p><p className="kpi-value kpi-positive">{formatCurrency(totalPago)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Em Aberto</p><p className="kpi-value kpi-warn">{formatCurrency(aberto)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Atrasado</p><p className="kpi-value kpi-negative">{formatCurrency(0)}</p></article>
      </section>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Conta Fixa">
        <form className="txn-form" onSubmit={salvar}>
          <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS_FIXAS.map((categoria) => <option key={categoria}>{categoria}</option>)}
          </select>
          <input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição" />
          <input className="input" type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor" required />
                    <CurrencyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} required />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Pago</option>
            <option>A pagar</option>
          </select>
          <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
          <button className="btn btn-brand" type="submit">Salvar</button>
        </form>
      </Modal>

      <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar Despesa Fixa">
        <form className="txn-form" onSubmit={salvarEdicao}>
          <select className="input" value={formEditar.categoria} onChange={(e) => setFormEditar({ ...formEditar, categoria: e.target.value })}>
            {CATEGORIAS_FIXAS.map((categoria) => <option key={categoria}>{categoria}</option>)}
          </select>
          <input className="input" value={formEditar.descricao} onChange={(e) => setFormEditar({ ...formEditar, descricao: e.target.value })} placeholder="Descrição" />
          <input className="input" type="number" min="0" step="0.01" value={formEditar.valor} onChange={(e) => setFormEditar({ ...formEditar, valor: e.target.value })} placeholder="Valor" required />
                    <CurrencyInput value={formEditar.valor} onChange={(v) => setFormEditar({ ...formEditar, valor: v })} required />
          <select className="input" value={formEditar.status} onChange={(e) => setFormEditar({ ...formEditar, status: e.target.value })}>
            <option>Pago</option>
            <option>A pagar</option>
          </select>
          <button className="btn btn-brand" type="submit">Salvar Alterações</button>
        </form>
      </Modal>

      <section className="table-wrap desktop-table">
        <table className="table">
          <thead>
            <tr>
              <th>Despesa</th>
              <th>Categoria</th>
              <th>Previsto</th>
              <th>Pago</th>
              <th>Status</th>
              <th>Registrado por</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td colSpan="7">Sem despesas fixas no período.</td></tr>}
            {itens.map((item) => {
              const valor = Number(item.valor || 0);
              const pago = hasTag(item.descricao, '[status:pago]') ? valor : 0;
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>{cleanDescricao(item.descricao) || item.categoria}</td>
                  <td>{item.categoria}</td>
                  <td>{formatCurrency(valor)}</td>
                  <td className="kpi-positive" style={{ fontWeight: 700 }}>{pago > 0 ? formatCurrency(pago) : '—'}</td>
                  <td><span className={`pill ${pago > 0 ? 'pill-success' : 'pill-warn'}`}>{pago > 0 ? 'Pago' : 'A pagar'}</span></td>
                  <td><span className="pill">{usuario?.nome || 'Sócio'}</span></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" onClick={() => toggleStatus(item)} type="button" title="Alternar status">{pago > 0 ? '✔️ Pago' : '⏳ A pagar'}</button>
                    <button className="btn btn-secondary" onClick={() => abrirEditar(item)} type="button">✏️</button>
                    <button className="btn btn-danger-soft" onClick={() => excluir(item.id)} type="button">×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mobile-cards">
        {itens.length === 0 && (
          <article className="mobile-card">
            <p className="mobile-card-title">Sem despesas fixas no período.</p>
          </article>
        )}

        {itens.map((item) => {
          const valor = Number(item.valor || 0);
          const pago = hasTag(item.descricao, '[status:pago]') ? valor : 0;
          return (
            <article className="mobile-card" key={`mobile-${item.id}`}>
              <div className="mobile-card-head">
                <p className="mobile-card-title">{cleanDescricao(item.descricao) || item.categoria}</p>
                <span className={`pill ${pago > 0 ? 'pill-success' : 'pill-warn'}`}>{pago > 0 ? 'Pago' : 'A pagar'}</span>
              </div>
              <div className="mobile-row"><span className="mobile-key">Categoria</span><span className="mobile-value">{item.categoria}</span></div>
              <div className="mobile-row"><span className="mobile-key">Previsto</span><span className="mobile-value">{formatCurrency(valor)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Pago</span><span className="mobile-value kpi-positive">{pago > 0 ? formatCurrency(pago) : '—'}</span></div>
              <div className="mobile-row"><span className="mobile-key">Registrado por</span><span className="mobile-value">{usuario?.nome || 'Sócio'}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => toggleStatus(item)} type="button">{pago > 0 ? '✔️ Pago' : '⏳ A pagar'}</button>
                <button className="btn btn-secondary" onClick={() => abrirEditar(item)} type="button">✏️</button>
                <button className="btn btn-danger-soft" onClick={() => excluir(item.id)} type="button">×</button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
