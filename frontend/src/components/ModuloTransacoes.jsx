import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function ModuloTransacoes({ tipo, titulo, icon }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [carregando, setCarregando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [contagem, setContagem] = useState(0);

  const [form, setForm] = useState({
    categoria: 'Geral',
    descricao: '',
    valor: '',
    dataTrasacao: new Date().toISOString().split('T')[0]
  });

  const meses = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      valor: i + 1,
      label: new Date(2026, i, 1).toLocaleDateString('pt-BR', { month: 'long' })
    })),
    []
  );

  const anos = useMemo(() => {
    const anoBase = new Date().getFullYear();
    return [anoBase - 2, anoBase - 1, anoBase, anoBase + 1];
  }, []);

  useEffect(() => {
    carregarDados();
  }, [mesAtual, anoAtual]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const lista = await transacaoService.listar(mesAtual, anoAtual);
      const filtered = (lista.transacoes || []).filter((t) => t.tipo === tipo);
      setTransacoes(filtered);
      setTotal(filtered.reduce((sum, t) => sum + Number(t.valor || 0), 0));
      setContagem(filtered.length);
    } catch (erro) {
      alert('Erro ao carregar: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await transacaoService.criar(
        tipo,
        form.categoria,
        form.descricao,
        Number(form.valor),
        form.dataTrasacao
      );
      setForm({
        categoria: 'Geral',
        descricao: '',
        valor: '',
        dataTrasacao: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      carregarDados();
    } catch (erro) {
      alert('Erro ao criar: ' + erro.message);
    }
  }

  async function deletarTransacao(id) {
    if (!window.confirm('Deseja excluir este item?')) return;
    try {
      await transacaoService.deletar(id);
      carregarDados();
    } catch (erro) {
      alert('Erro ao deletar: ' + erro.message);
    }
  }

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title" style={{ fontSize: 28 }}>{icon} {titulo}</h2>
          <p className="page-note">Gestão de {titulo.toLowerCase()} do restaurante.</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}</option>
            ))}
          </select>
          <select className="select" value={anoAtual} onChange={(e) => setAnoAtual(Number(e.target.value))}>
            {anos.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
          <button className="btn btn-brand" onClick={() => setShowForm((s) => !s)} type="button">
            {showForm ? 'Fechar' : `+ Novo ${tipo === 'receita' ? 'Item' : 'Lançamento'}`}
          </button>
        </div>
      </section>

      <section className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))' }}>
        <article className="kpi-card">
          <p className="kpi-label">Total</p>
          <p className={`kpi-value ${tipo === 'receita' ? 'kpi-positive' : 'kpi-negative'}`}>
            {formatCurrency(total)}
          </p>
          <p className="kpi-foot">Valor agregado</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Contagem</p>
          <p className="kpi-value">{contagem}</p>
          <p className="kpi-foot">Itens registrados</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Ticket Médio</p>
          <p className="kpi-value">{contagem > 0 ? formatCurrency(total / contagem) : 'R$ 0,00'}</p>
          <p className="kpi-foot">Por item</p>
        </article>
      </section>

      {showForm && (
        <section className="panel" style={{ marginTop: 10 }}>
          <h3>Novo {tipo === 'receita' ? 'Item' : 'Lançamento'}</h3>
          <form onSubmit={handleSubmit} className="txn-form">
            <input
              className="input"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              placeholder="Categoria (ex: Almoço, Bebidas)"
              required
            />
            <input
              className="input"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Descrição"
              required
            />
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="Valor"
              required
            />
            <input
              className="input"
              type="date"
              value={form.dataTrasacao}
              onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })}
              required
            />
            <button className="btn btn-brand" type="submit" style={{ gridColumn: 'span 2' }}>
              Salvar
            </button>
          </form>
        </section>
      )}

      <section className="table-wrap" style={{ marginTop: 14 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 20 }}>Carregando...</td>
              </tr>
            )}

            {!carregando && transacoes.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  Nenhum registro neste período
                </td>
              </tr>
            )}

            {!carregando && transacoes.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.data_transacao)}</td>
                <td>{t.categoria}</td>
                <td>{t.descricao}</td>
                <td className={tipo === 'receita' ? 'kpi-positive' : 'kpi-negative'} style={{ fontWeight: '600' }}>
                  {tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(t.valor || 0))}
                </td>
                <td>
                  <button
                    className="btn"
                    style={{ background: '#f5d7d4', color: '#8f281f', padding: '4px 8px', fontSize: 12 }}
                    onClick={() => deletarTransacao(t.id)}
                    type="button"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
