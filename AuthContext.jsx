import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import api from '../lib/api';
import { clearSession } from '../lib/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissoes, setPermissoes] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Restaura a sessão automaticamente quando a página é recarregada
  // (o Firebase Auth já persiste a sessão no navegador).
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const { data } = await api.get('/auth/me');
          setUser(data.user);
          setPermissoes(data.permissoes);
          setIsReadOnly(!!data.readOnly);
        } catch {
          setUser(null);
          setPermissoes([]);
          setIsReadOnly(false);
        }
      } else {
        setUser(null);
        setPermissoes([]);
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  async function login(email, senha) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      setUser(data.user);
      setPermissoes(data.permissoes);
      setIsReadOnly(!!data.readOnly);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.response?.data?.error || 'Erro ao entrar.' };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fbSignOut(auth);
    clearSession();
    setUser(null);
    setPermissoes([]);
    setIsReadOnly(false);
  }

  async function resetPassword(email) {
    if (!email?.trim()) return { ok: false, error: 'Informe seu e-mail.' };
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      return { ok: true };
    } catch (e) {
      // Por segurança, não revelamos se o e-mail existe ou não — apenas erros
      // de formato ou de limite de tentativas são mostrados especificamente.
      if (e?.code === 'auth/invalid-email') return { ok: false, error: 'E-mail inválido.' };
      if (e?.code === 'auth/too-many-requests') return { ok: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' };
      if (e?.code === 'auth/user-not-found') return { ok: true }; // não revela se o e-mail existe
      return { ok: false, error: 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' };
    }
  }

  // "can" controla a VISIBILIDADE do menu (perfis somente-leitura ainda navegam
  // e visualizam todos os módulos aos quais têm acesso). "isAdmin" e "canEdit"
  // são o que efetivamente controla se a pessoa pode criar/editar/excluir algo
  // — a garantia real de segurança está nas regras do Firestore, isto aqui é
  // só para a interface se comportar de forma consistente.
  function can(mod) {
    return permissoes.includes('*') || permissoes.includes(mod);
  }

  function canEdit(mod) {
    return !isReadOnly && can(mod);
  }

  const isAdmin = permissoes.includes('*') && !isReadOnly;

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-forest-950">
        <div className="w-8 h-8 border-[3px] border-forest-700 border-t-forest-200 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, permissoes, isReadOnly, isAdmin, loading, login, logout, resetPassword, can, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
