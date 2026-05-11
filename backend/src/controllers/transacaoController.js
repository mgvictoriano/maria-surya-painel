import { getAsync, runAsync, allAsync } from '../database/init.js';

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
          AND strftime('%m', data_transacao) = ? 
          AND strftime('%Y', data_transacao) = ?
        ORDER BY data_transacao DESC
      `;
      params = [socoId, String(mes).padStart(2, '0'), ano];
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
      whereClauses += ` AND strftime('%m', data_transacao) = ? AND strftime('%Y', data_transacao) = ?`;
      params.push(String(mes).padStart(2, '0'), ano);
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
