import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';

const CATEGORIAS_FIXAS = ['Aluguel', 'Salários', 'Internet', 'Contabilidade', 'Marketing'];
const TERMOS_FIXOS = ['aluguel', 'salario', 'salários', 'internet', 'contabilidade', 'marketing'];

function hasTag(descricao, tag) {
  return String(descricao || '').toLowerCase().includes(tag.toLowerCase());
}

function getTagValue(descricao, tag) {
  const match = String(descricao || '').match(new RegExp(`\\[${tag}:([^\\]]+)\\]`, 'i'));
  return match ? String(match[1]).trim().toLowerCase() : '';
}

function cleanDescricao(descricao) {
  return String(descricao || '')
    .replace(/\s*\[status:[^\]]+\]/i, '')
    .replace(/\s*\[rec:[^\]]+\]/i, '')
    .replace(/\s*\[dtpg:[^\]]+\]/i, '')
    .trim();
}

function getDataPagamento(descricao) {
  const tag = getTagValue(descricao, 'dtpg');
  return /^\d{4}-\d{2}-\d{2}$/.test(tag) ? tag : '';
}

function isRecorrente(descricao) {
  const tag = getTagValue(descricao, 'rec');
  // Compatibilidade: lançamentos antigos sem tag continuam recorrentes.
  if (!tag) return true;
  return tag === '1' || tag === 'sim' || tag === 'true';
}

function buildDescricao(base, status, recorrente, dataPagamento = '') {
  const texto = String(base || '').trim();
  const statusTag = `[status:${String(status || 'a pagar').toLowerCase()}]`;
  const recTag = `[rec:${recorrente ? '1' : '0'}]`;
  const dtpgTag = String(status || '').toLowerCase() === 'pago' && dataPagamento
    ? ` [dtpg:${dataPagamento}]`
    : '';
  return `${texto} ${statusTag} ${recTag}${dtpgTag}`.trim();
}

function toDateOnlyString(data) {
  return String(data || '').slice(0, 10);
}

function keyFixa(item) {
  const categoria = String(item.categoria || '').trim().toLowerCase();
  const descBase = String(cleanDescricao(item.descricao) || item.categoria || '').trim().toLowerCase();
  return `${categoria}|${descBase}`;
}

function isFixa(item) {
  if (item.tipo !== 'despesa') return false;
  const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
  return TERMOS_FIXOS.some((term) => texto.includes(term));
}

export default function DespesasFixas({ usuario }) {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [formEditar, setFormEditar] = useState({ categoria: 'Aluguel', descricao: '', valor: '', status: 'A pagar', recorrente: 'Sim', dataPagamento: '' });
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState({
    categoria: 'Aluguel',
    descricao: '',
    valor: '',
    status: 'A pagar',
    recorrente: 'Sim',
    dataPagamento: '',
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

  async function garantirRecorrenciaMensal() {
    const [respHistorico, respMes] = await Promise.all([
      transacaoService.listar(),
      transacaoService.listar(mesAtual, anoAtual)
    ]);

    const historicoFixas = (respHistorico.transacoes || [])
      .filter(isFixa)
      .filter((item) => isRecorrente(item.descricao))
      .sort((a, b) => toDateOnlyString(b.data_transacao).localeCompare(toDateOnlyString(a.data_transacao)));

    const jaLancadasNoMes = new Set((respMes.transacoes || []).filter(isFixa).map(keyFixa));
    const templatesPorChave = new Map();

    for (const item of historicoFixas) {
      const chave = keyFixa(item);
      if (!templatesPorChave.has(chave)) {
        templatesPorChave.set(chave, item);
      }
    }

    const dataPadraoMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
    const faltantes = [...templatesPorChave.entries()]
      .filter(([chave]) => !jaLancadasNoMes.has(chave))
      .map(([, item]) => ({
        categoria: item.categoria,
        descricao: buildDescricao(cleanDescricao(item.descricao) || item.categoria, 'a pagar', true),
        valor: Number(item.valor || 0),
      }))
      .filter((item) => item.valor > 0);

    if (faltantes.length > 0) {
      await Promise.all(
        faltantes.map((item) =>
          transacaoService.criar('despesa', item.categoria, item.descricao, item.valor, dataPadraoMes)
        )
      );
    }
  }

  async function carregar() {
    try {
      await garantirRecorrenciaMensal();
      const resp = await transacaoService.listar(mesAtual, anoAtual);
      setItens((resp.transacoes || []).filter(isFixa));
    } catch (erro) {
      alert(`Erro ao carregar: ${erro.message}`);
    }
  }

  async function salvar(e) {
    e.preventDefault();
    const descricao = buildDescricao(
      form.descricao || form.categoria,
      form.status,
      form.recorrente === 'Sim',
      form.status === 'Pago' ? (form.dataPagamento || form.dataTrasacao) : ''
    );
    await transacaoService.criar('despesa', form.categoria, descricao, Number(form.valor), form.dataTrasacao);
    setForm({ categoria: 'Aluguel', descricao: '', valor: '', status: 'A pagar', recorrente: 'Sim', dataPagamento: '', dataTrasacao: new Date().toISOString().split('T')[0] });
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
    const dataHoje = new Date().toISOString().split('T')[0];
    const novaDesc = buildDescricao(
      cleanDescricao(item.descricao) || item.categoria,
      novoStatus,
      isRecorrente(item.descricao),
      novoStatus === 'pago' ? dataHoje : ''
    );
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
      recorrente: isRecorrente(item.descricao) ? 'Sim' : 'Não',
      dataPagamento: getDataPagamento(item.descricao) || toDateOnlyString(item.data_transacao),
    });
    setShowEditar(true);
  }

  async function salvarEdicao(e) {
    e.preventDefault();
    const novaDesc = buildDescricao(
      formEditar.descricao || formEditar.categoria,
      formEditar.status,
      formEditar.recorrente === 'Sim',
      formEditar.status === 'Pago' ? (formEditar.dataPagamento || toDateOnlyString(itemSelecionado?.data_transacao)) : ''
    );
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
          <p className="page-note">Contas recorrentes mensais (geradas automaticamente por mês)</p>
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
          <CurrencyInput value={form.valor} onChange={(v) => setForm({ ...form, valor: v })} required />
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>Pago</option>
            <option>A pagar</option>
          </select>
          {form.status === 'Pago' && (
            <input
              className="input"
              type="date"
              value={form.dataPagamento || form.dataTrasacao}
              onChange={(e) => setForm({ ...form, dataPagamento: e.target.value })}
              required
            />
          )}
          <select
            className="input"
            value={form.recorrente}
            onChange={(e) => setForm({ ...form, recorrente: e.target.value })}
            aria-label="Recorrência mensal da conta"
            title="Recorrência mensal da conta"
          >
            <option value="Sim">Recorrente: Sim (repete todo mês)</option>
            <option value="Não">Recorrente: Não (lançamento único)</option>
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
          <CurrencyInput value={formEditar.valor} onChange={(v) => setFormEditar({ ...formEditar, valor: v })} required />
          <select className="input" value={formEditar.status} onChange={(e) => setFormEditar({ ...formEditar, status: e.target.value })}>
            <option>Pago</option>
            <option>A pagar</option>
          </select>
          {formEditar.status === 'Pago' && (
            <input
              className="input"
              type="date"
              value={formEditar.dataPagamento || toDateOnlyString(itemSelecionado?.data_transacao)}
              onChange={(e) => setFormEditar({ ...formEditar, dataPagamento: e.target.value })}
              required
            />
          )}
          <select
            className="input"
            value={formEditar.recorrente}
            onChange={(e) => setFormEditar({ ...formEditar, recorrente: e.target.value })}
            aria-label="Recorrência mensal da conta"
            title="Recorrência mensal da conta"
          >
            <option value="Sim">Recorrente: Sim (repete todo mês)</option>
            <option value="Não">Recorrente: Não (lançamento único)</option>
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
