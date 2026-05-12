import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

function isRetirada(item) {
  if (item.tipo !== 'despesa') return false;
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return texto.includes('retirada') || texto.includes('pro-labore') || texto.includes('adiantamento') || texto.includes('socio') || texto.includes('sócio');
}

export default function Retiradas({ usuario }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [itens, setItens] = useState([]);

  const [form, setForm] = useState({
    categoria: 'Retirada de sócio',
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
    const resp = await transacaoService.listar(mesAtual, anoAtual);
    setItens((resp.transacoes || []).filter(isRetirada));
  }

  async function salvar(e) {
    e.preventDefault();
    await transacaoService.criar('despesa', form.categoria, form.descricao, Number(form.valor), form.dataTrasacao);
    setForm({ categoria: 'Retirada de sócio', descricao: '', valor: '', dataTrasacao: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    carregar();
  }

  async function excluir(id) {
    if (!window.confirm('Excluir retirada?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  const totalMes = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">👤 Retiradas Esporádicas</h2>
          <p className="page-note">Saídas em benefício dos sócios</p>
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

      <section className="kpi-grid kpi-grid-2">
        <article className="kpi-card">
          <p className="kpi-label">Total do Mês</p>
          <p className="kpi-value kpi-negative">{formatCurrency(totalMes)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Retiradas</p>
          <p className="kpi-value">{itens.length}</p>
        </article>
      </section>

      {showForm && (
        <section className="panel" style={{ marginBottom: 12 }}>
          <h3>Nova Retirada</h3>
          <form className="txn-form" onSubmit={salvar}>
            <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              <option>Retirada de sócio</option>
              <option>Adiantamento</option>
              <option>Pro-labore</option>
            </select>
            <input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Motivo" required />
            <input className="input" type="number" step="0.01" min="0" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor" required />
            <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
            <button className="btn btn-brand" type="submit">Salvar</button>
          </form>
        </section>
      )}

      <section className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Responsável</th>
              <th>Motivo</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Autorizado por</th>
              <th>Registrado por</th>
              <th>Data/Hora</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && <tr><td colSpan="9">Sem retiradas neste período.</td></tr>}
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{formatDate(item.data_transacao)}</td>
                <td style={{ fontWeight: 700 }}>{usuario?.nome || 'Sócio'}</td>
                <td>{item.descricao}</td>
                <td><span className="pill pill-purple">{item.categoria}</span></td>
                <td className="kpi-negative" style={{ fontWeight: 700 }}>{formatCurrency(Number(item.valor || 0))}</td>
                <td>{usuario?.nome || 'Sócio'}</td>
                <td><span className="pill">{usuario?.nome || 'Sócio'}</span></td>
                <td>{formatDate(item.data_transacao)} 18:00</td>
                <td><button className="btn btn-danger-soft" onClick={() => excluir(item.id)} type="button">×</button></td>
              </tr>
            ))}
            {itens.length > 0 && (
              <tr>
                <td colSpan="4" style={{ fontWeight: 800 }}>TOTAL</td>
                <td className="kpi-negative" style={{ fontWeight: 800 }}>{formatCurrency(totalMes)}</td>
                <td colSpan="4"></td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
