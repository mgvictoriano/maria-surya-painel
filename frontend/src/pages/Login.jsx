import { useState } from 'react';

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
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Painel Financeiro</h1>
        <p className="auth-subtitle">Maria Surya Restaurante Arabe</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {modo === 'registrar' && (
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required={modo === 'registrar'}
              className="input"
              disabled={carregando}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            disabled={carregando}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            className="input"
            disabled={carregando}
          />

          <button
            type="submit"
            className="btn btn-brand"
            disabled={carregando}
          >
            {carregando ? 'Aguarde...' : modo === 'login' ? 'Entrar' : 'Registrar'}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === 'login' ? 'registrar' : 'login')}
          className="btn btn-ghost"
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
