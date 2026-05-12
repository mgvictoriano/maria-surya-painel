export function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function parseDateSafe(dataInput) {
  if (dataInput instanceof Date) return dataInput;

  const raw = String(dataInput || '');
  const onlyDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  // Evita deslocamento por fuso em datas sem hora (YYYY-MM-DD).
  if (onlyDateMatch) {
    const ano = Number(onlyDateMatch[1]);
    const mes = Number(onlyDateMatch[2]);
    const dia = Number(onlyDateMatch[3]);
    return new Date(ano, mes - 1, dia);
  }

  return new Date(raw);
}

export function formatDate(dataString) {
  const data = parseDateSafe(dataString);
  return data.toLocaleDateString('pt-BR');
}

export function formatDateWithDay(dataString) {
  const data = parseDateSafe(dataString);
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
