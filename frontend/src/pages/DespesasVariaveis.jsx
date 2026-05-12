import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

const FIXAS = ['aluguel', 'salario', 'salários', 'energia', 'agua', 'água', 'internet', 'telefone', 'contabilidade', 'marketing'];

function isVariavel(transacao) {
  const categoria = String(transacao.categoria || '').toLowerCase();
  const descricao = String(transacao.descricao || '').toLowerCase();
  const texto = `${categoria} ${descricao}`;

  if (FIXAS.some((item) => texto.includes(item))) return false;
  if (texto.includes('retirada') || texto.includes('pro-labore') || texto.includes('adiantamento')) return false;
  if (texto.includes('divida') || texto.includes('dívida') || texto.includes('parcela') || texto.includes('emprest')) return false;

  return transacao.tipo === 'despesa';
}

export default function DespesasVariaveis({ usuario }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [itens, setItens] = useState([]);

  const [form, setForm] = useState({
    categoria: 'Insumos',
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
      const lista = (resp.transacoes || []).filter(isVariavel);
      setItens(lista);
    } catch (erro) {
      alert(`Erro ao carregar: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    try {
      await transacaoService.criar('despesa', form.categoria, form.descricao, Number(form.valor), form.dataTrasacao);
      setForm({ categoria: 'Insumos', descricao: '', valor: '', dataTrasacao: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      carregar();
    } catch (erro) {
      alert(`Erro ao salvar: ${erro.message}`);
    }
  }

  async function excluir(id) {
    if (!window.confirm('Excluir lançamento?')) return;
    await transacaoService.deletar(id);
    carregar();
  }

  const totalMes = itens.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const porCategoria = Object.entries(
    itens.reduce((acc, item) => {
      const cat = item.categoria || 'Outros';
      acc[cat] = (acc[cat] || 0) + Number(item.valor || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">🛒 Despesas Variáveis</h2>
          <p className="page-note">Compras operacionais</p>
        </div>
        <div className="page-actions">
          <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}/{String(anoAtual).slice(-2)}</option>
            ))}
          </select>
          <button className="btn btn-brand" type="button" onClick={() => setShowForm((s) => !s)}>
            + Adicionar
          </button>
        </div>
      </section>

      <section className="kpi-grid kpi-grid-2">
        <article className="kpi-card">
          <p className="kpi-label">Total do Mês</p>
          <p className="kpi-value kpi-negative">{formatCurrency(totalMes)}</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Lançamentos</p>
          <p className="kpi-value">{itens.length}</p>
        </article>
      </section>

      {showForm && (
        <section className="panel" style={{ marginBottom: 12 }}>
          <h3>Novo Lançamento Variável</h3>
          <form className="txn-form" onSubmit={salvar}>
            <input className="input" placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} required />
            <input className="input" placeholder="Fornecedor" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            <input className="input" type="number" step="0.01" min="0" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} required />
            <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
            <button className="btn btn-brand" type="submit">Salvar</button>
          </form>
        </section>
      )}

      <section className="split-grid">
        <article className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Valor</th>
                <th>Registrado por</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr><td colSpan="6">Carregando...</td></tr>
              )}
              {!carregando && itens.length === 0 && (
                <tr><td colSpan="6">Sem despesas variáveis no período.</td></tr>
              )}
              {!carregando && itens.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.data_transacao)}</td>
                  <td><span className="pill pill-warn">{item.categoria}</span></td>
                  <td>{item.descricao}</td>
                  <td className="kpi-negative" style={{ fontWeight: 700 }}>{formatCurrency(Number(item.valor || 0))}</td>
                  <td><span className="pill">{usuario?.nome || 'Sócio'}</span></td>
                  <td>
                    <button className="btn btn-danger-soft" type="button" onClick={() => excluir(item.id)}>×</button>
                  </td>
                </tr>
              ))}
              {!carregando && itens.length > 0 && (
                <tr>
                  <td colSpan="3" style={{ fontWeight: 800 }}>TOTAL</td>
                  <td className="kpi-negative" style={{ fontWeight: 800 }}>{formatCurrency(totalMes)}</td>
                  <td colSpan="2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <h3>Por Categoria</h3>
          {porCategoria.length === 0 && <p className="page-note">Sem dados no período.</p>}
          {porCategoria.map(([categoria, total]) => (
            <div key={categoria} className="category-row">
              <div className="category-line">
                <span>{categoria}</span>
                <strong className="kpi-negative">{formatCurrency(total)}</strong>
              </div>
              <div className="category-bar">
                <div style={{ width: `${Math.max(8, (total / (totalMes || 1)) * 100)}%` }}></div>
              </div>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
