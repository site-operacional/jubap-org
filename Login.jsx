import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Loader2, AlertTriangle, Mail, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { firebaseConfigured } from '../lib/firebase';
import Logo from '../components/Logo';

export default function Login() {
  const { login, user } = useAuth();
  const branding = useBranding();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'reset'
  const [email, setEmail] = useState('admin@igreja.org');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, senha);
    setLoading(false);
    if (res.ok) navigate('/');
    else setError(res.error);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-950 px-4">
      <div className="w-full max-w-sm">
        {!firebaseConfigured && (
          <div className="mb-5 flex gap-2.5 items-start rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-clay-600">
            <AlertTriangle size={17} className="shrink-0 mt-0.5" />
            <span>
              <strong>Pré-visualização sem Firebase configurado.</strong> Você está vendo a interface, mas login e dados
              só vão funcionar depois de preencher <code>client/.env</code> com as chaves do seu projeto Firebase.
            </span>
          </div>
        )}
        <div className="flex flex-col items-center mb-6">
          <Logo size={48} iconSize={24} className="mb-3" />
          <h1 className="font-display text-xl text-white">{branding?.siteName || 'Juventude'}</h1>
          <p className="text-forest-400 text-sm">Sistema administrativo interno</p>
        </div>

        {mode === 'login' ? (
          <>
            <form onSubmit={handleSubmit} className="card p-6 space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@igreja.org"
                  required
                />
              </div>
              <div>
                <label className="label">Senha</label>
                <input
                  className="input"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-sm text-berry-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading && <Loader2 size={16} className="animate-spin" />}
                Entrar
              </button>
              <button
                type="button"
                onClick={() => { setMode('reset'); setError(''); }}
                className="text-sm text-forest-500 hover:text-forest-700 w-full text-center"
              >
                Esqueci minha senha
              </button>
            </form>
            <p className="text-center text-forest-500 text-xs mt-4">
              Acesso restrito à equipe autorizada da organização.
            </p>
          </>
        ) : (
          <ResetPasswordForm defaultEmail={email} onBack={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}

function ResetPasswordForm({ defaultEmail, onBack }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState(defaultEmail || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  if (sent) {
    return (
      <div className="card p-6 text-center">
        <CheckCircle2 size={28} className="text-forest-600 mx-auto mb-3" />
        <p className="font-display text-forest-900 mb-1">Verifique seu e-mail</p>
        <p className="text-sm text-forest-500 mb-5">
          Se <strong>{email}</strong> estiver cadastrado no sistema, você vai receber um link para criar uma nova senha
          em instantes. Confira também a caixa de spam.
        </p>
        <button onClick={onBack} className="btn-secondary w-full justify-center">
          <ChevronLeft size={15} /> Voltar para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Mail size={17} className="text-forest-700" />
        <p className="font-display text-forest-900">Redefinir senha</p>
      </div>
      <p className="text-sm text-forest-500">
        Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.
      </p>
      <div>
        <label className="label">E-mail</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@igreja.org"
          required
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-berry-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
        {loading && <Loader2 size={16} className="animate-spin" />}
        Enviar link de redefinição
      </button>
      <button type="button" onClick={onBack} className="text-sm text-forest-500 hover:text-forest-700 w-full text-center flex items-center justify-center gap-1">
        <ChevronLeft size={14} /> Voltar para o login
      </button>
    </form>
  );
}
