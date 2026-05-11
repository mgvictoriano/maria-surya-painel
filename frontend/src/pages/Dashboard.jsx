import { useState, useEffect } from 'react';
import { transacaoService } from '../services/api';
import { C } from '../constants/paleta';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Dashboard({ usuario }) {
  const [transacoes, setTransacoes] = useState([]);
  const [resumo, setResumo] = useState({
    receitas: 0,
    despesas: 0,
    liquido: 0,
    saldoGeral: 0
  });
  const [carregando, setCarregando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const [form, setForm] = useState({
    tipo: 'despesa',
    categoria: 'Alimentação',
    descricao: '',
    valor: '',
    dataTrasacao: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    carregarDados();
  }, [mesAtual, anoAtual]);

  async function carregarDados() {
    try {
      setCarregando(true);
      const [transRes, resumoRes] = await Promise.all([
        transacaoService.listar(mesAtual, anoAtual),
        transacaoService.resumo(mesAtual, anoAtual)
      ]);
      setTransacoes(transRes.transacoes || []);
      setResumo(resumoRes);
    } catch (erro) {
      alert('Erro ao carregar dados: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await transacaoService.criar(
        form.tipo,
        form.categoria,
        form.descricao,
        parseFloat(form.valor),
        form.dataTrasacao
      );
      setForm({
        tipo: 'despesa',
        categoria: 'Alimentação',
        descricao: '',
        valor: '',
        dataTrasacao: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      carregarDados();
    } catch (erro) {
      alert('Erro ao criar transação: ' + erro.message);
    }
  }

  async function deletarTransacao(id) {
    if (!window.confirm('Deseja deletar esta transação?')) return;
    try {
      await transacaoService.deletar(id);
      carregarDados();
    } catch (erro) {
      alert('Erro ao deletar: ' + erro.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Cards de resumo */}
        <div style={styles.grid}>
          <div style={{ ...styles.card, borderTop: `4px solid ${C.accent}` }}>
            <p style={styles.cardLabel}>Receitas</p>
            <p style={{ ...styles.cardValue, color: '#22c55e' }}>
              {formatCurrency(resumo.receitas)}
            </p>
          </div>
          <div style={{ ...styles.card, borderTop: `4px solid ${C.danger}` }}>
            <p style={styles.cardLabel}>Despesas</p>
            <p style={{ ...styles.cardValue, color: '#ef4444' }}>
              {formatCurrency(resumo.despesas)}
            </p>
          </div>
          <div style={{ ...styles.card, borderTop: `4px solid #3b82f6` }}>
            <p style={styles.cardLabel}>Líquido</p>
            <p style={{ ...styles.cardValue, color: '#3b82f6' }}>
              {formatCurrency(resumo.liquido)}
            </p>
          </div>
          <div style={{ ...styles.card, borderTop: `4px solid #8b5cf6` }}>
            <p style={styles.cardLabel}>Saldo Geral</p>
            <p style={{ ...styles.cardValue, color: '#8b5cf6' }}>
              {formatCurrency(resumo.saldoGeral)}
            </p>
          </div>
        </div>

        {/* Filtros e botão de nova transação */}
        <div style={styles.toolbar}>
          <div style={styles.filters}>
            <select
              value={mesAtual}
              onChange={(e) => setMesAtual(parseInt(e.target.value))}
              style={styles.select}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={anoAtual}
              onChange={(e) => setAnoAtual(parseInt(e.target.value))}
              style={styles.select}
            >
              {[2024, 2025, 2026].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              ...styles.primaryBtn,
              backgroundColor: showForm ? C.muted : C.accent
            }}
          >
            {showForm ? '✕ Cancelar' : '+ Nova Transação'}
          </button>
        </div>

        {/* Formulário de nova transação */}
        {showForm && (
          <form onSubmit={handleSubmit} style={styles.formContainer}>
            <h3 style={styles.formTitle}>Nova Transação</h3>
            <div style={styles.formGrid}>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                style={styles.formInput}
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>

              <input
                type="text"
                placeholder="Categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                style={styles.formInput}
              />

              <input
                type="text"
                placeholder="Descrição"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                style={styles.formInput}
                required
              />

              <input
                type="number"
                placeholder="Valor"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                style={styles.formInput}
                step="0.01"
                required
              />

              <input
                type="date"
                value={form.dataTrasacao}
                onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })}
                style={styles.formInput}
              />

              <button type="submit" style={styles.primaryBtn}>
                Salvar
              </button>
            </div>
          </form>
        )}

        {/* Lista de transações */}
        <div style={styles.listContainer}>
          <h3 style={styles.listTitle}>
            Transações de {new Date(2024, mesAtual - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          {carregando ? (
            <p style={styles.loading}>Carregando...</p>
          ) : transacoes.length === 0 ? (
            <p style={styles.empty}>Nenhuma transação neste período</p>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.headerRow}>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Categoria</th>
                    <th style={styles.th}>Descrição</th>
                    <th style={styles.th}>Valor</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((t) => (
                    <tr key={t.id} style={styles.row}>
                      <td style={styles.td}>{formatDate(t.data_transacao)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          backgroundColor: t.tipo === 'receita' ? '#dcfce7' : '#fee2e2',
                          color: t.tipo === 'receita' ? '#22c55e' : '#ef4444'
                        }}>
                          {t.tipo === 'receita' ? '↓ Receita' : '↑ Despesa'}
                        </span>
                      </td>
                      <td style={styles.td}>{t.categoria}</td>
                      <td style={styles.td}>{t.descricao}</td>
                      <td style={{
                        ...styles.td,
                        color: t.tipo === 'receita' ? '#22c55e' : '#ef4444',
                        fontWeight: '600'
                      }}>
                        {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(t.valor)}
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => deletarTransacao(t.id)}
                          style={styles.deleteBtn}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '32px'
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  cardLabel: {
    fontSize: '12px',
    color: C.muted,
    marginBottom: '8px',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: '700'
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    gap: '16px'
  },
  filters: {
    display: 'flex',
    gap: '12px'
  },
  select: {
    padding: '8px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    cursor: 'pointer'
  },
  primaryBtn: {
    padding: '10px 16px',
    backgroundColor: C.accent,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  formContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  formTitle: {
    marginBottom: '16px',
    color: C.text,
    fontSize: '16px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px'
  },
  formInput: {
    padding: '10px 12px',
    border: `1px solid ${C.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none'
  },
  listContainer: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  },
  listTitle: {
    marginBottom: '16px',
    color: C.text,
    fontSize: '16px'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  headerRow: {
    borderBottom: `2px solid ${C.border}`
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase'
  },
  row: {
    borderBottom: `1px solid ${C.border}`,
    '&:hover': {
      backgroundColor: '#fafafa'
    }
  },
  td: {
    padding: '12px',
    fontSize: '13px',
    color: C.text
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px'
  },
  loading: {
    textAlign: 'center',
    color: C.muted,
    padding: '32px'
  },
  empty: {
    textAlign: 'center',
    color: C.muted,
    padding: '32px'
  }
};
