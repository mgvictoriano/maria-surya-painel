export function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

export function formatDate(dataString) {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR');
}

export function formatDateWithDay(dataString) {
  const data = new Date(dataString);
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
