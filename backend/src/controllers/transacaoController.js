import { getAsync, runAsync, allAsync } from '../database/init.js';

function monthYearCondition(coluna = 'data_transacao') {
  return `MONTH(${coluna}) = ? AND YEAR(${coluna}) = ?`;
}

function monthYearParams(mes, ano) {
  return [Number(mes), Number(ano)];
}

export async function criarTransacao(req, res) {
  try {
    const { tipo, categoria, descricao, valor, dataTrasacao } = req.body;
    const socoId = req.socoId;

    if (!tipo || !categoria || !descricao || !valor || !dataTrasacao) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios' });
    }

    if (!['receita', 'despesa'].includes(tipo)) {
      return res.status(400).json({ erro: 'Tipo deve ser "receita" ou "despesa"' });
    }

    const result = await runAsync(
      `INSERT INTO transacoes (tipo, categoria, descricao, valor, data_transacao, soco_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tipo, categoria, descricao, valor, dataTrasacao, socoId]
    );

    // Atualizar saldo
    const operacao = tipo === 'receita' ? '+' : '-';
    await runAsync(
      `UPDATE saldos SET saldo_atual = saldo_atual ${operacao} ? WHERE id = 1`,
      [valor]
    );

    res.status(201).json({
      sucesso: true,
      mensagem: 'Transação criada com sucesso',
      transacaoId: result.lastID
    });
  } catch (erro) {
    console.error('Erro ao criar transação:', erro);
    res.status(500).json({ erro: 'Erro ao criar transação' });
  }
}

export async function listarTransacoes(req, res) {
  try {
    const socoId = req.socoId;
    const { mes, ano } = req.query;

    let sql = `
      SELECT id, tipo, categoria, descricao, valor, data_transacao, criado_em
      FROM transacoes
      WHERE soco_id = ?
      ORDER BY data_transacao DESC
    `;
    let params = [socoId];

    if (mes && ano) {
      sql = `
        SELECT id, tipo, categoria, descricao, valor, data_transacao, criado_em
        FROM transacoes
        WHERE soco_id = ? 
          AND ${monthYearCondition('data_transacao')}
        ORDER BY data_transacao DESC
      `;
      params = [socoId, ...monthYearParams(mes, ano)];
    }

    const transacoes = await allAsync(sql, params);
    res.json({ transacoes });
  } catch (erro) {
    console.error('Erro ao listar transações:', erro);
    res.status(500).json({ erro: 'Erro ao listar transações' });
  }
}

export async function obterResumoFinanceiro(req, res) {
  try {
    const socoId = req.socoId;
    const { mes, ano } = req.query;

    let whereClauses = 'WHERE soco_id = ?';
    let params = [socoId];

    if (mes && ano) {
      whereClauses += ` AND ${monthYearCondition('data_transacao')}`;
      params.push(...monthYearParams(mes, ano));
    }

    const totalReceitas = await getAsync(
      `SELECT SUM(valor) as total FROM transacoes ${whereClauses} AND tipo = 'receita'`,
      params
    );

    const totalDespesas = await getAsync(
      `SELECT SUM(valor) as total FROM transacoes ${whereClauses} AND tipo = 'despesa'`,
      params
    );

    const saldo = await getAsync('SELECT saldo_atual FROM saldos WHERE id = 1');

    const receitas = totalReceitas?.total || 0;
    const despesas = totalDespesas?.total || 0;
    const liquido = receitas - despesas;

    res.json({
      receitas: parseFloat(receitas),
      despesas: parseFloat(despesas),
      liquido: parseFloat(liquido),
      saldoGeral: parseFloat(saldo?.saldo_atual || 0)
    });
  } catch (erro) {
    console.error('Erro ao obter resumo:', erro);
    res.status(500).json({ erro: 'Erro ao obter resumo financeiro' });
  }
}

export async function obterDashboard(req, res) {
  try {
    const socoId = req.socoId;
    const mes = Number(req.query.mes) || new Date().getMonth() + 1;
    const ano = Number(req.query.ano) || new Date().getFullYear();
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoMesAnterior = mes === 1 ? ano - 1 : ano;

    const paramsAtual = [socoId, ...monthYearParams(mes, ano)];
    const paramsAnterior = [socoId, ...monthYearParams(mesAnterior, anoMesAnterior)];

    const atual = await getAsync(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas,
         COALESCE(COUNT(*), 0) AS transacoes
       FROM transacoes
       WHERE soco_id = ?
         AND ${monthYearCondition('data_transacao')}`,
      paramsAtual
    );

    const anterior = await getAsync(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas
       FROM transacoes
       WHERE soco_id = ?
         AND ${monthYearCondition('data_transacao')}`,
      paramsAnterior
    );

    const saldo = await getAsync('SELECT saldo_atual FROM saldos WHERE id = 1');

    const periodoExpr = "DATE_FORMAT(data_transacao, '%Y-%m')";
    const recorteUltimos12Meses = "AND data_transacao >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)";

    const serieMensal = await allAsync(
      `SELECT
         ${periodoExpr} AS periodo,
         COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0) AS receitas,
         COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0) AS despesas
       FROM transacoes
       WHERE soco_id = ?
         ${recorteUltimos12Meses}
       GROUP BY ${periodoExpr}
       ORDER BY periodo ASC`,
      [socoId]
    );

    const categorias = await allAsync(
      `SELECT
         categoria,
         tipo,
         COALESCE(SUM(valor), 0) AS total
       FROM transacoes
       WHERE soco_id = ?
         AND ${monthYearCondition('data_transacao')}
       GROUP BY categoria, tipo
       ORDER BY total DESC
       LIMIT 6`,
      paramsAtual
    );

    const receitas = Number(atual?.receitas || 0);
    const despesas = Number(atual?.despesas || 0);
    const resultado = receitas - despesas;

    const receitasAnterior = Number(anterior?.receitas || 0);
    const despesasAnterior = Number(anterior?.despesas || 0);
    const resultadoAnterior = receitasAnterior - despesasAnterior;

    const variacaoResultado = resultadoAnterior === 0
      ? (resultado === 0 ? 0 : 100)
      : ((resultado - resultadoAnterior) / Math.abs(resultadoAnterior)) * 100;

    res.json({
      periodo: { mes, ano },
      kpis: {
        receitas,
        despesas,
        resultado,
        saldoAcumulado: Number(saldo?.saldo_atual || 0),
        transacoes: Number(atual?.transacoes || 0),
        variacaoResultado: Number(variacaoResultado.toFixed(2))
      },
      series: {
        mensal: serieMensal.map((item) => ({
          periodo: item.periodo,
          receitas: Number(item.receitas || 0),
          despesas: Number(item.despesas || 0),
          resultado: Number(item.receitas || 0) - Number(item.despesas || 0)
        }))
      },
      categorias: categorias.map((item) => ({
        categoria: item.categoria,
        tipo: item.tipo,
        total: Number(item.total || 0)
      }))
    });
  } catch (erro) {
    console.error('Erro ao obter dashboard:', erro);
    res.status(500).json({ erro: 'Erro ao carregar dados do dashboard' });
  }
}

export async function atualizarTransacao(req, res) {
  try {
    const { id } = req.params;
    const socoId = req.socoId;
    const { categoria, descricao, valor } = req.body;

    const transacao = await getAsync(
      'SELECT valor, tipo FROM transacoes WHERE id = ? AND soco_id = ?',
      [id, socoId]
    );

    if (!transacao) {
      return res.status(404).json({ erro: 'Transação não encontrada' });
    }

    const campos = [];
    const params = [];

    if (categoria !== undefined) { campos.push('categoria = ?'); params.push(categoria); }
    if (descricao !== undefined) { campos.push('descricao = ?'); params.push(descricao); }
    if (valor !== undefined)    { campos.push('valor = ?');    params.push(Number(valor)); }

    if (campos.length === 0) {
      return res.status(400).json({ erro: 'Nada para atualizar' });
    }

    params.push(id);
    await runAsync(`UPDATE transacoes SET ${campos.join(', ')} WHERE id = ?`, params);

    // Ajustar saldo apenas se o valor mudou
    if (valor !== undefined && Number(valor) !== Number(transacao.valor)) {
      const diff = Math.abs(Number(valor) - Number(transacao.valor));
      const cresceu = Number(valor) > Number(transacao.valor);
      // Para despesa: cresceu = mais gasto = saldo diminui; encolheu = saldo cresce
      const op = transacao.tipo === 'receita'
        ? (cresceu ? '+' : '-')
        : (cresceu ? '-' : '+');
      await runAsync(
        `UPDATE saldos SET saldo_atual = saldo_atual ${op} ? WHERE id = 1`,
        [diff]
      );
    }

    res.json({ sucesso: true, mensagem: 'Transação atualizada' });
  } catch (erro) {
    console.error('Erro ao atualizar transação:', erro);
    res.status(500).json({ erro: 'Erro ao atualizar transação' });
  }
}

export async function deletarTransacao(req, res) {
  try {
    const { id } = req.params;
    const socoId = req.socoId;

    // Verificar se transação pertence ao sócio
    const transacao = await getAsync(
      'SELECT valor, tipo FROM transacoes WHERE id = ? AND soco_id = ?',
      [id, socoId]
    );

    if (!transacao) {
      return res.status(404).json({ erro: 'Transação não encontrada' });
    }

    // Deletar transação
    await runAsync('DELETE FROM transacoes WHERE id = ?', [id]);

    // Reverter saldo
    const operacao = transacao.tipo === 'receita' ? '-' : '+';
    await runAsync(
      `UPDATE saldos SET saldo_atual = saldo_atual ${operacao} ? WHERE id = 1`,
      [transacao.valor]
    );

    res.json({ sucesso: true, mensagem: 'Transação deletada com sucesso' });
  } catch (erro) {
    console.error('Erro ao deletar transação:', erro);
    res.status(500).json({ erro: 'Erro ao deletar transação' });
  }
}
