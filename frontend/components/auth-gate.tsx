"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { LockKeyhole, LogIn, LogOut, ShieldCheck } from "lucide-react";
import { AuthUser, fetchCurrentUser, login, logout } from "@/lib/api";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      setUser(await login(username, password));
      setPassword("");
    } catch {
      setError("Usuário ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-sm font-semibold text-slate-500">Verificando acesso...</main>;
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#dbeafe,_#f8fafc_45%,_#e2e8f0)] px-5 py-10">
        <section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/95 p-8 shadow-2xl shadow-slate-900/10 backdrop-blur">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg"><ShieldCheck size={27} /></div>
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Acesso protegido</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Acervo Técnico</h1></div>
          </div>
          <p className="mb-6 text-sm leading-6 text-slate-500">Entre com seu usuário para consultar CATs, serviços e documentos autorizados.</p>
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Usuário</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="ex.: lucas" required /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-500">Senha</span><div className="relative"><LockKeyhole size={17} className="absolute left-4 top-3.5 text-slate-400" /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" placeholder="Sua senha" required /></div></label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
            <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"><LogIn size={17} />{submitting ? "Entrando..." : "Entrar no sistema"}</button>
          </form>
        </section>
      </main>
    );
  }

  return <div className="min-h-screen"><div className="flex items-center justify-end gap-3 border-b border-slate-200 bg-slate-50 px-5 py-1.5 text-xs font-semibold text-slate-500"><span>Usuário: <strong className="text-slate-800">{user.display_name}</strong></span><button type="button" onClick={() => logout().finally(() => setUser(null))} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-white hover:text-slate-900"><LogOut size={13} />Sair</button></div>{children}</div>;
}
