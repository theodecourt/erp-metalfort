import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav('/admin');
  }

  return (
    <div className="min-h-screen bg-mf-black text-white flex items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="text-3xl font-extrabold"><span className="text-mf-yellow">metalfort</span> · Admin</h1>
        <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          className="w-full bg-mf-black-soft p-3 rounded border border-mf-border"/>
        <input required type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)}
          className="w-full bg-mf-black-soft p-3 rounded border border-mf-border"/>
        {err && <div className="text-mf-danger text-sm">{err}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-mf-yellow text-mf-black font-bold py-3 rounded hover:bg-mf-yellow-hover disabled:opacity-50">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
