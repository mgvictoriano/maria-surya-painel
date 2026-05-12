import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

function parseClientes(descricao, valor) {
  const match = String(descricao || '').match(/\[cli:(\d+)\]/i);
  if (match) return Number(match[1]);
  return Math.max(1, Math.round(Number(valor || 0) / 92));
}

function cleanDescricao(descricao) {
  return String(descricao || '').replace(/\s*\[cli:\d+\]/i, '').trim();
}

export default function Entradas({ usuario }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [formEditar, setFormEditar] = useState({ categoria: 'Salão', descricao: '', clientes: '', valor: '' });
  const [itens, setItens] = useState([]);

  const [form, setForm] = useState({
    categoria: 'Salão',
    descricao: '',
    clientes: '',
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
    const resp = await transacaoService.listar(mesAtual, anoAtual);
    setItens((resp.transacoes || []).filter((item) => item.tipo === 'receita'));
  }

  async function salvar(e) {
    e.preventDefault();
    const descricao = `${form.descricao} [cli:${Number(form.clientes || 0)}]`;
    await transacaoService.criar('receita', form.categoria, descricao, Number(form.valor), form.dataTrasacao);
    setForm({ categoria: 'Salão', descricao: '', clientes: '', valor: '', dataTrasacao: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    carregar();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir entrada?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  function abrirEditar(item) {
    setItemSelecionado(item);
    setFormEditar({
      categoria: item.categoria || 'Salão',
      descricao: cleanDescricao(item.descricao),
      clientes: String(parseClientes(item.descricao, item.valor)),
      valor: String(item.valor || ''),
    });
    setShowEditar(true);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const novaDesc = `${formEditar.descricao} [cli:${Number(formEditar.clientes || 0)}]`;
    await transacaoService.atualizar(itemSelecionado.id, {
      categoria: formEditar.categoria,
      descricao: novaDesc,
      valor: Number(formEditar.valor),
    });
    setShowEditar(false);
    carregar();
  }

  const totalLiquido = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totalClientes = itens.reduce((acc, item) => acc + parseClientes(item.descricao, item.valor), 0);
  const ticketMedio = totalClientes > 0 ? totalLiquido / totalClientes : 0;

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">💰 Entradas de Caixa</h2>
          <p className="page-note">Lance receitas diárias e quantidade de clientes/buffets</p>
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
        <article className="kpi-card"><p className="kpi-label">Valor Líquido</p><p className="kpi-value kpi-positive">{formatCurrency(totalLiquido)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Total Clientes</p><p className="kpi-value" style={{ color: '#1f4db6' }}>{totalClientes}</p></article>
        <article className="kpi-card"><p className="kpi-label">Ticket Médio</p><p className="kpi-value kpi-warn">{formatCurrency(ticketMedio)}</p></article>
        <article className="kpi-card"><p className="kpi-label">Lançamentos</p><p className="kpi-value">{itens.length}</p></article>
      </section>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Entrada">
        <form className="txn-form" onSubmit={salvar}>
          <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            <option>Salão</option>
            <option>Rodízio</option>
            <option>Buffet</option>
            <option>Delivery</option>
          </select>
          <input className="input" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
          <input className="input" type="number" min="0" placeholder="Cli./Qtd." value={form.clientes} onChange={(e) => setForm({ ...form, clientes: e.target.value })} />
          <CurrencyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} placeholder="R$ 0,00" required />
          <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
          <button className="btn btn-brand" type="submit">Salvar</button>
        </form>
      </Modal>

      <Modal open={showEditar} onClose={() => setShowEditar(false)} title="Editar Entrada">
        <form className="txn-form" onSubmit={salvarEdicao}>
          <select className="input" value={formEditar.categoria} onChange={(e) => setFormEditar({ ...formEditar, categoria: e.target.value })}>
            <option>Salão</option>
            <option>Rodízio</option>
            <option>Buffet</option>
            <option>Delivery</option>
          </select>
          <input className="input" placeholder="Descrição" value={formEditar.descricao} onChange={(e) => setFormEditar({ ...formEditar, descricao: e.target.value })} required />
          <input className="input" type="number" min="0" placeholder="Cli./Qtd." value={formEditar.clientes} onChange={(e) => setFormEditar({ ...formEditar, clientes: e.target.value })} />
          <CurrencyInput value={formEditar.valor} onChange={(v) => setFormEditar({ ...formEditar, valor: v })} placeholder="R$ 0,00" required />
          <button className="btn btn-brand" type="submit">Salvar Alterações</button>
        </form>
      </Modal>

      <section className="table-wrap desktop-table">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Descrição</th>
              <th>Cli./Qtd.</th>
              <th>Líquido</th>
              <th>Ticket</th>
              <th>Registrado por</th>
              <th>Data/Hora</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td colSpan="9">Sem entradas neste período.</td></tr>}
            {itens.map((item) => {
              const clientes = parseClientes(item.descricao, item.valor);
              const ticket = clientes > 0 ? Number(item.valor || 0) / clientes : 0;
              return (
                <tr key={item.id}>
                  <td>{formatDate(item.data_transacao)}</td>
                  <td><span className="pill">{item.categoria}</span></td>
                  <td>{cleanDescricao(item.descricao)}</td>
                  <td style={{ fontWeight: 700, color: '#1f4db6' }}>{clientes}</td>
                  <td className="kpi-positive" style={{ fontWeight: 700 }}>{formatCurrency(Number(item.valor || 0))}</td>
                  <td className="kpi-warn">{formatCurrency(ticket)}</td>
                  <td><span className="pill">{usuario?.nome || 'Sócio'}</span></td>
                  <td>{formatDate(item.data_transacao)} 23:00</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" onClick={() => abrirEditar(item)} type="button">✏️</button>
                    <button className="btn btn-danger-soft" onClick={() => excluir(item.id)} type="button">×</button>
                  </td>
                </tr>
              );
            })}
            {itens.length > 0 && (
              <tr>
                <td colSpan="3" style={{ fontWeight: 800 }}>TOTAL</td>
                <td style={{ fontWeight: 800, color: '#1f4db6' }}>{totalClientes}</td>
                <td className="kpi-positive" style={{ fontWeight: 800 }}>{formatCurrency(totalLiquido)}</td>
                <td className="kpi-warn" style={{ fontWeight: 800 }}>{formatCurrency(ticketMedio)}</td>
                <td colSpan="3"></td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mobile-cards">
        {itens.length === 0 && (
          <article className="mobile-card">
            <p className="mobile-card-title">Sem entradas neste período.</p>
          </article>
        )}

        {itens.map((item) => {
          const clientes = parseClientes(item.descricao, item.valor);
          const ticket = clientes > 0 ? Number(item.valor || 0) / clientes : 0;
          return (
            <article className="mobile-card" key={`mobile-${item.id}`}>
              <div className="mobile-card-head">
                <p className="mobile-card-title">{cleanDescricao(item.descricao)}</p>
                <span className="pill">{item.categoria}</span>
              </div>
              <div className="mobile-row"><span className="mobile-key">Data</span><span className="mobile-value">{formatDate(item.data_transacao)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Clientes</span><span className="mobile-value" style={{ color: '#1f4db6' }}>{clientes}</span></div>
              <div className="mobile-row"><span className="mobile-key">Líquido</span><span className="mobile-value kpi-positive">{formatCurrency(Number(item.valor || 0))}</span></div>
              <div className="mobile-row"><span className="mobile-key">Ticket</span><span className="mobile-value kpi-warn">{formatCurrency(ticket)}</span></div>
              <div className="mobile-row"><span className="mobile-key">Registrado por</span><span className="mobile-value">{usuario?.nome || 'Sócio'}</span></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => abrirEditar(item)} type="button">✏️ Editar</button>
                <button className="btn btn-danger-soft" onClick={() => excluir(item.id)} type="button">×</button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
