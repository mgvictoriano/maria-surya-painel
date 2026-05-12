import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function parseRetiradas(transacoes) {
  return transacoes.filter((item) => {
    if (item.tipo !== 'despesa') return false;
    const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
    return texto.includes('retirada') || texto.includes('pro-labore') || texto.includes('adiantamento') || texto.includes('socio') || texto.includes('sócio');
  });
}

function parseDividas(transacoes) {
  return transacoes.filter((item) => {
    if (item.tipo !== 'despesa') return false;
    const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
    return texto.includes('divida') || texto.includes('dívida') || texto.includes('parcela') || texto.includes('emprest');
  });
}

export default function Relatorio() {
  const hoje = new Date();
  const [mesAtual, setMesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear());
  const [dados, setDados] = useState(null);

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
    const [lista, resumo] = await Promise.all([
      transacaoService.listar(mesAtual, anoAtual),
      transacaoService.dashboard(mesAtual, anoAtual)
    ]);

    const transacoes = lista.transacoes || [];
    const retiradas = parseRetiradas(transacoes);
    const dividas = parseDividas(transacoes);

    const totalRetiradas = retiradas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const totalDividas = dividas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
    const receitas = Number(resumo.kpis?.receitas || 0);
    const despesas = Number(resumo.kpis?.despesas || 0);
    const lucro = receitas - despesas;
    const margem = receitas > 0 ? (lucro / receitas) * 100 : 0;

    setDados({
      receitas,
      despesas,
      lucro,
      margem,
      saldo: Number(resumo.kpis?.saldoAcumulado || 0),
      retiradas: totalRetiradas,
      qtdRetiradas: retiradas.length,
      dividas: totalDividas,
      clientesEstimados: Math.max(0, Math.round(receitas / 92))
    });
  }

  if (!dados) {
    return (
      <div className="dashboard-wrap">
        <section className="panel"><p>Gerando relatório...</p></section>
      </div>
    );
  }

  const ticketMedio = dados.clientesEstimados > 0 ? dados.receitas / dados.clientesEstimados : 0;

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">📄 Relatório Mensal</h2>
          <p className="page-note">Análise gerencial gerada automaticamente</p>
        </div>
        <div className="page-actions">
          <select className="select" value={mesAtual} onChange={(e) => setMesAtual(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>{m.label}/{String(anoAtual).slice(-2)}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="report-hero">
        <h3>Relatório — {MESES[mesAtual - 1]}/{String(anoAtual).slice(-2)}</h3>
        <p>Em <strong>{MESES[mesAtual - 1]}/{String(anoAtual).slice(-2)}</strong>, o restaurante registrou receita de <strong className="kpi-positive">{formatCurrency(dados.receitas)}</strong> e despesas de <strong className="kpi-negative">{formatCurrency(dados.despesas)}</strong>, com lucro de <strong className={dados.lucro >= 0 ? 'kpi-positive' : 'kpi-negative'}>{formatCurrency(dados.lucro)}</strong> e margem de <strong>{dados.margem.toFixed(1)}%</strong>.</p>
        <p>Foram atendidos <strong>{dados.clientesEstimados} clientes/buffets</strong> com ticket médio de <strong className="kpi-warn">{formatCurrency(ticketMedio)}</strong>.</p>
        <p>Saldo acumulado: <strong className={dados.saldo >= 0 ? 'kpi-positive' : 'kpi-negative'}>{formatCurrency(dados.saldo)}</strong>. Retiradas esporádicas: <strong className="kpi-negative">{formatCurrency(dados.retiradas)}</strong> ({dados.qtdRetiradas} ocorrências). Saldo de dívidas no mês: <strong className="kpi-negative">{formatCurrency(dados.dividas)}</strong>.</p>
      </section>

      <section className="panel" style={{ marginTop: 12 }}>
        <h3>📌 Recomendações</h3>
        <div className="insight-list">
          {dados.retiradas > dados.receitas * 0.1 && <p className="insight warning">⚠️ Retiradas elevadas estão reduzindo a capacidade de pagamento das dívidas.</p>}
          {dados.margem < 10 && <p className="insight danger">🔴 Margem abaixo de 10%. Avalie redução de custos ou reajuste de preços.</p>}
          {dados.dividas > dados.receitas * 0.4 && <p className="insight warning">⚠️ Saldo devedor elevado. Priorize dívidas de alta urgência.</p>}
          <p className="insight success">✅ Com {dados.clientesEstimados} clientes e ticket de {formatCurrency(ticketMedio)}, cada R$ 10 a mais por cliente representa {formatCurrency(dados.clientesEstimados * 10)} adicionais/mês.</p>
        </div>
      </section>
    </div>
  );
}
