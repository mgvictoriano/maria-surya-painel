import { useState, useEffect } from 'react';

/**
 * Input de moeda em Real Brasileiro (R$ 1.234,56).
 * Props:
 *   value    – número ou string numérica armazenada no estado
 *   onChange – chamado com o valor numérico (float) ao alterar
 *   placeholder, required, min, max, className – repassados ao <input>
 */
export default function CurrencyInput({ value, onChange, placeholder = 'R$ 0,00', required, min, max, className = 'input' }) {
  const [display, setDisplay] = useState('');

  // Formata número -> "R$ 1.234,56"
  function format(num) {
    if (num === '' || num === null || num === undefined || isNaN(Number(num))) return '';
    return Number(num).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Inicializa / sincroniza quando value muda externamente (ex: abrir modal de edição)
  useEffect(() => {
    setDisplay(value !== '' && value !== null && value !== undefined ? format(value) : '');
  }, [value]);

  function handleChange(e) {
    const raw = e.target.value;
    // Remove tudo exceto dígitos e vírgula/ponto
    const digits = raw.replace(/[^\d]/g, '');
    if (digits === '') {
      setDisplay('');
      onChange('');
      return;
    }
    // Trata como centavos: últimos 2 dígitos são decimais
    const cents = parseInt(digits, 10);
    const num = cents / 100;
    setDisplay(format(num));
    onChange(num);
  }

  function handleFocus(e) {
    // Seleciona tudo ao focar
    e.target.select();
  }

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      required={required}
      data-min={min}
      data-max={max}
    />
  );
}
