import { useState } from 'react';
import { C } from '../constants/paleta';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [modo, setModo] = useState('login'); // 'login' ou 'registrar'

  const [nome, setNome] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setCarregando(true);

    try {
      if (modo === 'login') {
        await onLogin(email, senha);
      } else {
        // Registrar primeiro, depois fazer login
        const { api } = await import('../services/api');
        await api.post('/auth/registrar', { nome, email, senha });
        await onLogin(email, senha);
      }
    } catch (erro) {
      console.error(erro);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🍴 Maria Surya</h1>
        <p style={styles.subtitle}>Painel Financeiro</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {modo === 'registrar' && (
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required={modo === 'registrar'}
              style={styles.input}
              disabled={carregando}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            disabled={carregando}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={styles.input}
            disabled={carregando}
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: carregando ? 0.6 : 1
            }}
            disabled={carregando}
          >
            {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Registrar'}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === 'login' ? 'registrar' : 'login')}
          style={styles.toggleBtn}
          disabled={carregando}
        >
          {modo === 'login'
            ? 'Não tem conta? Registre-se'
            : 'Já tem conta? Faça login'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: C.surface,
    padding: '20px'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    fontSize: '36px',
    marginBottom: '8px',
    color: C.text,
    textAlign: 'center'
  },
  subtitle: {
    color: C.muted,
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '14px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '20px'
  },
  input: {
    padding: '12px 16px',
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
    outline: 'none'
  },
  button: {
    padding: '12px 16px',
    backgroundColor: C.accent,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  toggleBtn: {
    backgroundColor: 'transparent',
    color: C.accent,
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'center',
    padding: '8px',
    fontWeight: '500'
  }
};
