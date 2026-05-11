import { useState, useEffect } from 'react';
import { api, getToken, setToken } from './services/api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      verificarToken();
    } else {
      setCarregando(false);
    }
  }, []);

  async function verificarToken() {
    try {
      const perfil = await api.get('/auth/perfil');
      setUsuario(perfil);
      setAutenticado(true);
    } catch (erro) {
      console.error('Token inválido:', erro);
      setToken(null);
      setAutenticado(false);
    } finally {
      setCarregando(false);
    }
  }

  async function handleLogin(email, senha) {
    try {
      const resposta = await api.post('/auth/login', { email, senha });
      setToken(resposta.token);
      setUsuario({
        id: resposta.socoId,
        nome: resposta.nome,
        email: resposta.email
      });
      setAutenticado(true);
    } catch (erro) {
      alert('Erro ao fazer login: ' + (erro.message || 'Verifique suas credenciais'));
      throw erro;
    }
  }

  function handleLogout() {
    setToken(null);
    setAutenticado(false);
    setUsuario(null);
  }

  if (carregando) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {autenticado && <Navbar usuario={usuario} onLogout={handleLogout} />}
      {autenticado ? (
        <Dashboard usuario={usuario} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}
