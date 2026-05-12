const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem('ms_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('ms_token', token);
  } else {
    localStorage.removeItem('ms_token');
  }
}

async function request(metodo, endpoint, dados = null) {
  const opcoes = {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const token = getToken();
  if (token) {
    opcoes.headers.Authorization = `Bearer ${token}`;
  }

  if (dados && (metodo === 'POST' || metodo === 'PUT')) {
    opcoes.body = JSON.stringify(dados);
  }

  const resposta = await fetch(`${BASE_URL}${endpoint}`, opcoes);

  if (resposta.status === 401) {
    setToken(null);
    window.location.href = '/';
    return;
  }

  const json = await resposta.json();

  if (!resposta.ok) {
    throw new Error(json.erro || `Erro ${resposta.status}`);
  }

  return json;
}

export const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, dados) => request('POST', endpoint, dados),
  put: (endpoint, dados) => request('PUT', endpoint, dados),
  delete: (endpoint) => request('DELETE', endpoint)
};

export const authService = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  registrar: (nome, email, senha) => api.post('/auth/registrar', { nome, email, senha }),
  perfil: () => api.get('/auth/perfil')
};

export const transacaoService = {
  listar: (mes, ano) => {
    let url = '/transacoes';
    if (mes && ano) {
      url += `?mes=${mes}&ano=${ano}`;
    }
    return api.get(url);
  },
  resumo: (mes, ano) => {
    let url = '/transacoes/resumo';
    if (mes && ano) {
      url += `?mes=${mes}&ano=${ano}`;
    }
    return api.get(url);
  },
  criar: (tipo, categoria, descricao, valor, dataTrasacao) =>
    api.post('/transacoes', { tipo, categoria, descricao, valor, dataTrasacao }),
  dashboard: (mes, ano) => {
    let url = '/transacoes/dashboard';
    if (mes && ano) {
      url += `?mes=${mes}&ano=${ano}`;
    }
    return api.get(url);
  },
  atualizar: (id, dados) => api.put(`/transacoes/${id}`, dados),
  deletar: (id) => api.delete(`/transacoes/${id}`)
};
