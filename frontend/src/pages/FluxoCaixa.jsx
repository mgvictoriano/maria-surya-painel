import { useEffect, useMemo, useState } from 'react';
import { transacaoService } from '../services/api';
import { formatCurrency } from '../utils/formatters';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function splitDespesas(transacoes) {
  const saida = {
    fixas: 0,
    variaveis: 0,
    dividas: 0,
    retiradas: 0
  };

  transacoes.forEach((item) => {
    if (item.tipo !== 'despesa') return;
    const texto = `${item.categoria || ''} ${item.descricao || ''}`.toLowerCase();
    if (texto.includes('retirada') || texto.includes('pro-labore') || texto.includes('adiantamento')) {
      saida.retiradas += Number(item.valor || 0);
      return;
    }
    if (texto.includes('divida') || texto.includes('dívida') || texto.includes('parcela') || texto.includes('emprest')) {
      saida.dividas += Number(item.valor || 0);
      return;
    }
    if (texto.includes('aluguel') || texto.includes('salario') || texto.includes('energia') || texto.includes('agua') || texto.includes('internet') || texto.includes('contabilidade') || texto.includes('marketing')) {
      saida.fixas += Number(item.valor || 0);
      return;
    }
    saida.variaveis += Number(item.valor || 0);
  });

  return saida;
}

export default function FluxoCaixa() {
  const [anoAtual] = useState(new Date().getFullYear());
  const [modo, setModo] = useState('resumo');
  const [carregando, setCarregando] = useState(true);
  const [linhas, setLinhas] = useState([]);

  const mesesAlvo = useMemo(() => Array.from({ length: 6 }, (_, i) => i + 1), []);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      const respostas = await Promise.all(mesesAlvo.map((mes) => transacaoService.listar(mes, anoAtual)));

      let saldoAcumulado = 0;
      const dados = respostas.map((resp, idx) => {
        const mes = mesesAlvo[idx];
        const transacoes = resp.transacoes || [];
        const entradas = transacoes.filter((t) => t.tipo === 'receita').reduce((acc, t) => acc + Number(t.valor || 0), 0);
        const saidasSplit = splitDespesas(transacoes);
        const totalSaidas = saidasSplit.fixas + saidasSplit.variaveis + saidasSplit.dividas + saidasSplit.retiradas;
        const saldoInicial = saldoAcumulado;
        const resultado = entradas - totalSaidas;
        saldoAcumulado += resultado;

        return {
          mes,
          saldoInicial,
          entradas,
          ...saidasSplit,
          totalSaidas,
          resultado,
          saldoFinal: saldoAcumulado
        };
      });

      setLinhas(dados);
    } catch (erro) {
      alert(`Erro ao carregar fluxo: ${erro.message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="dashboard-wrap">
      <section className="page-head">
        <div>
          <h2 className="page-title">📋 Fluxo de Caixa</h2>
          <p className="page-note">Todas as operações com data, tipo e identificação do usuário</p>
        </div>
        <div className="segmented">
          <button type="button" className={`segmented-btn ${modo === 'resumo' ? 'active' : ''}`} onClick={() => setModo('resumo')}>Resumo Mensal</button>
          <button type="button" className={`segmented-btn ${modo === 'log' ? 'active' : ''}`} onClick={() => setModo('log')}>Log Detalhado</button>
        </div>
      </section>

      {carregando ? (
        <section className="panel"><p>Carregando fluxo...</p></section>
      ) : (
        <section className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Mês</th>
                <th>Saldo Inicial</th>
                <th>Entradas</th>
                <th>Fixas</th>
                <th>Variáveis</th>
                <th>Dívidas</th>
                <th>Retiradas</th>
                <th>Total Saídas</th>
                <th>Resultado</th>
                <th>Saldo Final</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.mes}>
                  <td style={{ fontWeight: 700 }}>{MESES[linha.mes - 1]}/{String(anoAtual).slice(-2)}</td>
                  <td>{formatCurrency(linha.saldoInicial)}</td>
                  <td className="kpi-positive" style={{ fontWeight: 700 }}>{formatCurrency(linha.entradas)}</td>
                  <td>{formatCurrency(linha.fixas)}</td>
                  <td>{formatCurrency(linha.variaveis)}</td>
                  <td>{formatCurrency(linha.dividas)}</td>
                  <td>{formatCurrency(linha.retiradas)}</td>
                  <td className="kpi-negative" style={{ fontWeight: 700 }}>{formatCurrency(linha.totalSaidas)}</td>
                  <td className={linha.resultado >= 0 ? 'kpi-positive' : 'kpi-negative'} style={{ fontWeight: 700 }}>{formatCurrency(linha.resultado)}</td>
                  <td className={linha.saldoFinal >= 0 ? 'kpi-positive' : 'kpi-negative'} style={{ fontWeight: 700 }}>{formatCurrency(linha.saldoFinal)}</td>
                  <td><span className={`pill ${linha.resultado >= 0 ? 'pill-success' : 'pill-danger'}`}>{linha.resultado >= 0 ? 'Lucro' : 'Prejuízo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
