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
const TERMOS_FIXOS = ['aluguel', 'salario', 'salários', 'internet', 'contabilidade', 'marketing'];

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

function toDateOnlyString(data) {
  return String(data || '').slice(0, 10);
}

function containsStatusPago(descricao) {
  return String(descricao || '').toLowerCase().includes('[status:pago]');
}

function isDespesaFixaByText(item) {
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return TERMOS_FIXOS.some((term) => texto.includes(term));
}

function isTransacaoEfetiva(item) {
  if (item.tipo === 'receita') return true;
  if (item.tipo !== 'despesa') return false;
  if (!isDespesaFixaByText(item)) return true;
  return containsStatusPago(item.descricao);
}

function parseDateOnly(data) {
  const [ano, mes, dia] = String(data || '').slice(0, 10).split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function monthKeyFromDate(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  return `${ano}-${mes}`;
}

function addDays(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d;
}

export default function Dashboard({ usuario, onLogout }) {
  const hoje = new Date();
  const [moduloAtivo, setModuloAtivo] = useState('Dashboard');
  const [tipoPeriodo, setTipoPeriodo] = useState('mes');
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [trimestreAtual, setTrimestreAtual] = useState(Math.floor(hoje.getMonth() / 3) + 1);
  const [semestreAtual, setSemestreAtual] = useState(hoje.getMonth() < 6 ? 1 : 2);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [dataInicio, setDataInicio] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`);
  const [dataFim, setDataFim] = useState(hoje.toISOString().slice(0, 10));
  const [carregando, setCarregando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [transacoesBase, setTransacoesBase] = useState([]);

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

  const intervaloSelecionado = useMemo(() => {
    const inicio = new Date(anoAtual, 0, 1);
    const fim = new Date(anoAtual, 11, 31);

    if (tipoPeriodo === 'mes') {
      return {
        inicio: new Date(anoAtual, mesAtual - 1, 1),
        fim: new Date(anoAtual, mesAtual, 0),
        titulo: `${meses.find((m) => m.valor === mesAtual)?.label || ''}/${anoAtual}`
      };
    }

    if (tipoPeriodo === 'trimestre') {
      const mesInicio = (trimestreAtual - 1) * 3;
      return {
        inicio: new Date(anoAtual, mesInicio, 1),
        fim: new Date(anoAtual, mesInicio + 3, 0),
        titulo: `${trimestreAtual}o trimestre/${anoAtual}`
      };
    }

    if (tipoPeriodo === 'semestre') {
      const mesInicio = semestreAtual === 1 ? 0 : 6;
      return {
        inicio: new Date(anoAtual, mesInicio, 1),
        fim: new Date(anoAtual, mesInicio + 6, 0),
        titulo: `${semestreAtual}o semestre/${anoAtual}`
      };
    }

    if (tipoPeriodo === 'custom') {
      const customInicio = parseDateOnly(dataInicio);
      const customFim = parseDateOnly(dataFim);
      return {
        inicio: customInicio <= customFim ? customInicio : customFim,
        fim: customFim >= customInicio ? customFim : customInicio,
        titulo: `${formatDate(customInicio)} a ${formatDate(customFim)}`
      };
    }

    return { inicio, fim, titulo: `Ano ${anoAtual}` };
  }, [tipoPeriodo, mesAtual, trimestreAtual, semestreAtual, anoAtual, dataInicio, dataFim, meses]);

  const intervaloAnterior = useMemo(() => {
    const inicio = intervaloSelecionado.inicio;
    const fim = intervaloSelecionado.fim;

    if (tipoPeriodo === 'mes') {
      const prevInicio = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
      const prevFim = new Date(inicio.getFullYear(), inicio.getMonth(), 0);
      return { inicio: prevInicio, fim: prevFim };
    }

    if (tipoPeriodo === 'trimestre') {
      return {
        inicio: new Date(inicio.getFullYear(), inicio.getMonth() - 3, 1),
        fim: new Date(inicio.getFullYear(), inicio.getMonth(), 0)
      };
    }

    if (tipoPeriodo === 'semestre') {
      return {
        inicio: new Date(inicio.getFullYear(), inicio.getMonth() - 6, 1),
        fim: new Date(inicio.getFullYear(), inicio.getMonth(), 0)
      };
    }

    if (tipoPeriodo === 'ano') {
      return {
        inicio: new Date(inicio.getFullYear() - 1, 0, 1),
        fim: new Date(inicio.getFullYear() - 1, 11, 31)
      };
    }

    const dias = Math.max(1, Math.round((fim.getTime() - inicio.getTime()) / 86400000) + 1);
    const prevFim = addDays(inicio, -1);
    const prevInicio = addDays(prevFim, -(dias - 1));
    return { inicio: prevInicio, fim: prevFim };
  }, [intervaloSelecionado, tipoPeriodo]);

  const transacoesFiltradas = useMemo(
    () => (transacoesBase || []).filter((item) => {
      const dataItem = parseDateOnly(toDateOnlyString(item.data_transacao));
      return dataItem >= intervaloSelecionado.inicio && dataItem <= intervaloSelecionado.fim;
    }),
    [transacoesBase, intervaloSelecionado]
  );

  const transacoesEfetivas = useMemo(
    () => transacoesFiltradas.filter(isTransacaoEfetiva),
    [transacoesFiltradas]
  );

  const resumo = useMemo(() => {
    const receitas = transacoesEfetivas
      .filter((item) => item.tipo === 'receita')
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const despesas = transacoesEfetivas
      .filter((item) => item.tipo === 'despesa')
      .reduce((acc, item) => acc + Number(item.valor || 0), 0);

    const resultado = receitas - despesas;

    const ateFim = (transacoesBase || []).filter((item) => {
      const dataItem = parseDateOnly(toDateOnlyString(item.data_transacao));
      return dataItem <= intervaloSelecionado.fim;
    }).filter(isTransacaoEfetiva);

    const saldoAcumulado = ateFim.reduce((acc, item) => {
      const valor = Number(item.valor || 0);
      return acc + (item.tipo === 'receita' ? valor : -valor);
    }, 0);

    const transacoesPrev = (transacoesBase || []).filter((item) => {
      const dataItem = parseDateOnly(toDateOnlyString(item.data_transacao));
      return dataItem >= intervaloAnterior.inicio && dataItem <= intervaloAnterior.fim;
    }).filter(isTransacaoEfetiva);

    const resultadoPrev = transacoesPrev.reduce((acc, item) => {
      const valor = Number(item.valor || 0);
      return acc + (item.tipo === 'receita' ? valor : -valor);
    }, 0);

    const variacaoResultado = resultadoPrev === 0
      ? (resultado === 0 ? 0 : 100)
      : ((resultado - resultadoPrev) / Math.abs(resultadoPrev)) * 100;

    return {
      receitas,
      despesas,
      resultado,
      saldoAcumulado,
      transacoes: transacoesFiltradas.length,
      variacaoResultado: Number(variacaoResultado.toFixed(2))
    };
  }, [transacoesEfetivas, transacoesBase, transacoesFiltradas, intervaloSelecionado, intervaloAnterior]);

  const serieMensal = useMemo(() => {
    const mapa = new Map();
    const cursor = new Date(intervaloSelecionado.inicio.getFullYear(), intervaloSelecionado.inicio.getMonth(), 1);
    const limite = new Date(intervaloSelecionado.fim.getFullYear(), intervaloSelecionado.fim.getMonth(), 1);

    while (cursor <= limite) {
      const key = monthKeyFromDate(cursor);
      mapa.set(key, { periodo: key, label: mesLabel(key), receitas: 0, despesas: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    transacoesEfetivas.forEach((item) => {
      const key = monthKeyFromDate(parseDateOnly(toDateOnlyString(item.data_transacao)));
      if (!mapa.has(key)) return;
      const atual = mapa.get(key);
      const valor = Number(item.valor || 0);
      if (item.tipo === 'receita') atual.receitas += valor;
      if (item.tipo === 'despesa') atual.despesas += valor;
    });

    return [...mapa.values()];
  }, [transacoesEfetivas, intervaloSelecionado]);

  const categorias = useMemo(() => {
    const mapa = new Map();

    transacoesEfetivas
      .filter((item) => item.tipo === 'despesa')
      .forEach((item) => {
        const chave = item.categoria || 'Outros';
        mapa.set(chave, (mapa.get(chave) || 0) + Number(item.valor || 0));
      });

    return [...mapa.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [transacoesEfetivas]);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);
      const lista = await transacaoService.listar();
      setTransacoesBase(lista.transacoes || []);
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
      <div className="dashboard-wrap dashboard-gerencial">

      <section className="page-head">
        <div>
          <h2 className="page-title">Dashboard Financeiro</h2>
          <p className="page-note">Visão: {intervaloSelecionado.titulo} | fixas só entram no resultado quando marcadas como pagas.</p>
        </div>

        <div className="page-actions">
          <select className="select" value={tipoPeriodo} onChange={(e) => setTipoPeriodo(e.target.value)}>
            <option value="mes">Mês</option>
            <option value="trimestre">Trimestre</option>
            <option value="semestre">Semestre</option>
            <option value="ano">Ano</option>
            <option value="custom">Personalizado</option>
          </select>

          {tipoPeriodo === 'mes' && (
            <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
              {meses.map((m) => (
                <option key={m.valor} value={m.valor}>{m.label}</option>
              ))}
            </select>
          )}

          {tipoPeriodo === 'trimestre' && (
            <select className="select" value={trimestreAtual} onChange={(e) => setTrimestreAtual(Number(e.target.value))}>
              <option value={1}>1o trimestre</option>
              <option value={2}>2o trimestre</option>
              <option value={3}>3o trimestre</option>
              <option value={4}>4o trimestre</option>
            </select>
          )}

          {tipoPeriodo === 'semestre' && (
            <select className="select" value={semestreAtual} onChange={(e) => setSemestreAtual(Number(e.target.value))}>
              <option value={1}>1o semestre</option>
              <option value={2}>2o semestre</option>
            </select>
          )}

          <select className="select" value={anoAtual} onChange={(e) => setAnoAtual(Number(e.target.value))}>
            {anos.map((ano) => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>

          {tipoPeriodo === 'custom' && (
            <>
              <input className="input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              <input className="input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </>
          )}

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
              <BarChart data={serieMensal}>
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
          <h3>Distribuicao por Categoria (despesas do período)</h3>
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

            {!carregando && transacoesFiltradas.length === 0 && (
              <tr>
                <td colSpan="6">Nenhuma transacao neste periodo.</td>
              </tr>
            )}

            {!carregando && transacoesFiltradas.map((t) => (
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
