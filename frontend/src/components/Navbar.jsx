import { C } from '../constants/paleta';

export default function Navbar({ usuario, onLogout }) {
  return (
    <nav style={styles.navbar}>
      <div style={styles.content}>
        <div style={styles.brand}>
          <span style={styles.logo}>🍴</span>
          <span style={styles.title}>Maria Surya</span>
        </div>
        <div style={styles.user}>
          <span style={styles.userName}>{usuario?.nome || 'Usuário'}</span>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    backgroundColor: C.accent,
    color: 'white',
    padding: '16px 20px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '20px',
    fontWeight: '700'
  },
  logo: {
    fontSize: '28px'
  },
  title: {
    display: 'none',
    '@media (min-width: 600px)': {
      display: 'inline'
    }
  },
  user: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  userName: {
    fontSize: '14px',
    display: 'none',
    '@media (min-width: 600px)': {
      display: 'inline'
    }
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};
