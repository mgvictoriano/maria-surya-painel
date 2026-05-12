import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { transacaoService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import Entradas from './Entradas';
import DespesasFixas from './DespesasFixas';
import DespesasVariaveis from './DespesasVariaveis';
import Dividas from './Dividas';
import Retiradas from './Retiradas';
import FluxoCaixa from './FluxoCaixa';
import Relatorio from './Relatorio';

const MODULOS = [
  { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'Entradas', label: 'Entradas', icon: '💰' },
  { id: 'Desp. Fixas', label: 'Desp. Fixas', icon: '🏠' },
  { id: 'Desp. Variaveis', label: 'Desp. Variáveis', icon: '🛒' },
  { id: 'Dividas', label: 'Dívidas', icon: '🏢' },
  { id: 'Retiradas', label: 'Retiradas', icon: '👤' },
  { id: 'Fluxo de Caixa', label: 'Fluxo de Caixa', icon: '📋' },
  { id: 'Relatorio', label: 'Relatório', icon: '📄' }
];

const CORES_GRAFICO = ['#1f5d43', '#cc8c21', '#b83c2e', '#3e7a65', '#6f4f2b', '#8a7160'];

function valorClasse(valor) {
  if (valor > 0) return 'kpi-positive';
  if (valor < 0) return 'kpi-negative';
  return '';
}

function mesLabel(periodo) {
  const [ano, mes] = periodo.split('-').map(Number);
  return new Date(ano, mes - 1).toLocaleDateString('pt-BR', {
    month: 'short',
    year: '2-digit'
  });
}

export default function Dashboard({ usuario, onLogout }) {
  const hoje = new Date();
  const [moduloAtivo, setModuloAtivo] = useState('Dashboard');
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [carregando, setCarregando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [serieMensal, setSerieMensal] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [resumo, setResumo] = useState({
    receitas: 0,
    despesas: 0,
    resultado: 0,
    saldoAcumulado: 0,
    transacoes: 0,
    variacaoResultado: 0
  });

  const [form, setForm] = useState({
    tipo: 'despesa',
    categoria: 'Operacional',
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
      const [lista, dashboard] = await Promise.all([
        transacaoService.listar(mesAtual, anoAtual),
        transacaoService.dashboard(mesAtual, anoAtual)
      ]);

      setTransacoes(lista.transacoes || []);
      setResumo(dashboard.kpis || {});
      setSerieMensal(dashboard.series?.mensal || []);
      setCategorias(dashboard.categorias || []);
    } catch (erro) {
      alert('Erro ao carregar dashboard: ' + erro.message);
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
        Number(form.valor),
        form.dataTrasacao
      );
      setForm({
        tipo: 'despesa',
        categoria: 'Operacional',
        descricao: '',
        valor: '',
        dataTrasacao: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      carregarDados();
    } catch (erro) {
      alert('Erro ao criar transacao: ' + erro.message);
    }
  }

  async function deletarTransacao(id) {
    if (!window.confirm('Deseja excluir esta transacao?')) return;
    try {
      await transacaoService.deletar(id);
      carregarDados();
    } catch (erro) {
      alert('Erro ao deletar: ' + erro.message);
    }
  }

  function renderModulo() {
    if (moduloAtivo === 'Entradas') return <Entradas usuario={usuario} />;
    if (moduloAtivo === 'Desp. Fixas') return <DespesasFixas usuario={usuario} />;
    if (moduloAtivo === 'Desp. Variaveis') return <DespesasVariaveis usuario={usuario} />;
    if (moduloAtivo === 'Dividas') return <Dividas usuario={usuario} />;
    if (moduloAtivo === 'Retiradas') return <Retiradas usuario={usuario} />;
    if (moduloAtivo === 'Fluxo de Caixa') return <FluxoCaixa usuario={usuario} />;
    if (moduloAtivo === 'Relatorio') return <Relatorio usuario={usuario} />;

    return (
      <div className="dashboard-wrap">

      <section className="page-head">
        <div>
          <h2 className="page-title">Dashboard Financeiro</h2>
          <p className="page-note">Calculado automaticamente com base nas transacoes registradas.</p>
        </div>

        <div className="page-actions">
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
          <button className="btn btn-brand" onClick={() => setShowForm(true)} type="button">
            + Nova Transação
          </button>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <p className="kpi-label">Receita Total</p>
          <p className="kpi-value kpi-positive">{formatCurrency(resumo.receitas || 0)}</p>
          <p className="kpi-foot">Entradas no periodo selecionado</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Total de Saidas</p>
          <p className="kpi-value kpi-negative">{formatCurrency(resumo.despesas || 0)}</p>
          <p className="kpi-foot">Despesas no periodo selecionado</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Resultado do Mes</p>
          <p className={`kpi-value ${valorClasse(resumo.resultado || 0)}`}>{formatCurrency(resumo.resultado || 0)}</p>
          <p className="kpi-foot">Receitas - despesas</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Saldo Acumulado</p>
          <p className={`kpi-value ${valorClasse(resumo.saldoAcumulado || 0)}`}>{formatCurrency(resumo.saldoAcumulado || 0)}</p>
          <p className="kpi-foot">Saldo geral da operacao</p>
        </article>
        <article className="kpi-card">
          <p className="kpi-label">Variacao do Resultado</p>
          <p className={`kpi-value ${valorClasse(resumo.variacaoResultado || 0)}`}>{Number(resumo.variacaoResultado || 0).toFixed(1)}%</p>
          <p className="kpi-foot">Comparado ao mes anterior</p>
        </article>
      </section>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} className="txn-form">
          <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="receita">Receita</option>
            <option value="despesa">Despesa</option>
          </select>
          <input className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Categoria" required />
          <input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição" required />
          <input className="input" type="number" min="0" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor" required />
                    <CurrencyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} required />
          <input className="input" type="date" value={form.dataTrasacao} onChange={(e) => setForm({ ...form, dataTrasacao: e.target.value })} required />
          <button className="btn btn-brand" type="submit">Salvar</button>
        </form>
      </Modal>

      <section className="panel-grid">
        <article className="panel">
          <h3>Entradas x Saidas por Mes</h3>
          <div style={{ width: '100%', height: 310 }}>
            <ResponsiveContainer>
              <BarChart data={serieMensal.map((item) => ({ ...item, label: mesLabel(item.periodo) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe4d9" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="receitas" fill="#1f5d43" name="Receitas" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="#b83c2e" name="Despesas" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <h3>Distribuicao por Categoria (mes atual)</h3>
          <div style={{ width: '100%', height: 310 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="total"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  label={(item) => `${item.categoria}: ${formatCurrency(item.total)}`}
                >
                  {categorias.map((item, idx) => (
                    <Cell key={`${item.categoria}-${idx}`} fill={CORES_GRAFICO[idx % CORES_GRAFICO.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Descricao</th>
              <th>Valor</th>
              <th>Acao</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan="6">Carregando transacoes...</td>
              </tr>
            )}

            {!carregando && transacoes.length === 0 && (
              <tr>
                <td colSpan="6">Nenhuma transacao neste periodo.</td>
              </tr>
            )}

            {!carregando && transacoes.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.data_transacao)}</td>
                <td>{t.tipo}</td>
                <td>{t.categoria}</td>
                <td>{t.descricao}</td>
                <td className={t.tipo === 'receita' ? 'kpi-positive' : 'kpi-negative'}>
                  {t.tipo === 'receita' ? '+' : '-'} {formatCurrency(Number(t.valor || 0))}
                </td>
                <td>
                  <button className="btn" style={{ background: '#f5d7d4', color: '#8f281f' }} onClick={() => deletarTransacao(t.id)} type="button">
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-icon">🌙</span>
          <div>
            <h1 className="brand-title">Painel Financeiro</h1>
            <p className="brand-subtitle">Maria Surya Restaurante Árabe</p>
          </div>
        </div>
        <div>
          <strong>{usuario?.nome || 'Sócio'}</strong>
          <button className="btn" style={{ marginLeft: 12, background: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <nav className="nav-strip">
        {MODULOS.map((modulo) => (
          <button
            key={modulo.id}
            className={`nav-pill ${modulo.id === moduloAtivo ? 'active' : ''}`}
            onClick={() => setModuloAtivo(modulo.id)}
            type="button"
          >
            <span>{modulo.icon}</span> {modulo.label}
          </button>
        ))}
      </nav>

      {renderModulo()}
    </div>
  );
}
