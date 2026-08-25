"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Moon, ShieldCheck, Sun } from "lucide-react";
import { AuthUser, fetchCurrentUser, login, logout } from "@/lib/api";
import AppHeader from "@/components/app-header";
import { useTheme } from "@/lib/theme-context";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { theme, toggleTheme } = useTheme();

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
    return (
      <main className="auth-loading">
        <div className="auth-loading__mark"><ShieldCheck size={24} /></div>
        <span>Verificando acesso seguro</span>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-page__glow login-page__glow--one" />
        <div className="login-page__glow login-page__glow--two" />
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card__topline"><span className="eyebrow">Área restrita</span><div className="login-card__tools"><span className="secure-pill"><ShieldCheck size={13} /> Ambiente protegido</span><button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? "Ativar black mode" : "Ativar white mode"} title={theme === "light" ? "Black mode" : "White mode"}>{theme === "light" ? <Moon size={14} /> : <Sun size={14} />}<span>{theme === "light" ? "Black" : "White"}</span></button></div></div>
          <div className="login-card__brand">
            <span className="brand__mark brand__mark--large"><KeyRound size={23} strokeWidth={2.2} /></span>
            <div><p className="login-card__kicker">Acervo Técnico</p><h1 id="login-title">Seu acervo, em um só lugar.</h1></div>
          </div>
          <p className="login-card__description">Consulte CATs, serviços e documentos autorizados com rapidez e segurança.</p>
          <form onSubmit={submit} className="login-form">
            <label className="field-label"><span>Usuário</span><div className="input-with-icon"><LockKeyhole size={16} /><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="ex.: lucas" required /></div></label>
            <label className="field-label"><span>Senha</span><div className="input-with-icon"><KeyRound size={16} /><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required /></div></label>
            {error && <p role="alert" className="alert alert--error">{error}</p>}
            <button type="submit" disabled={submitting} className="button button--primary button--full">{submitting ? "Entrando..." : "Entrar no acervo"}<ArrowRight size={17} /></button>
          </form>
          <p className="login-card__footer"><ShieldCheck size={14} /> Acesso individual com sessão protegida.</p>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader user={user} onLogout={() => logout().finally(() => setUser(null))} />
      <div className="app-shell__content">{children}</div>
    </div>
  );
}
