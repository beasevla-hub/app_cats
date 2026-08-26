"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileCheck2, FileInput, FolderKanban, LogOut, Menu, Moon, Search, Sun, X } from "lucide-react";
import type { AuthUser } from "@/lib/api";
import { useTheme } from "@/lib/theme-context";

const navItems = [
  { href: "/", label: "Serviços", icon: Search },
  { href: "/cats", label: "CATs", icon: FolderKanban },
  { href: "/dashboard", label: "Visão geral", icon: BarChart3 },
  { href: "/ingestion", label: "Ingestão", icon: FileInput },
];

export default function AppHeader({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link href="/" className="brand" aria-label="Ir para o catálogo de serviços">
          <span className="brand__mark"><FileCheck2 size={19} strokeWidth={2.4} /></span>
          <span className="brand__copy">
            <span className="brand__title">Acervo Técnico</span>
            <span className="brand__subtitle">Biblioteca de engenharia</span>
          </span>
        </Link>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen((current) => !current)}
          aria-expanded={mobileOpen}
          aria-controls="primary-navigation"
          aria-label={mobileOpen ? "Fechar menu principal" : "Abrir menu principal"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav id="primary-navigation" className={`main-nav${mobileOpen ? " is-open" : ""}`} aria-label="Navegação principal">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`main-nav__item${active ? " is-active" : ""}`}>
                <Icon size={17} strokeWidth={2.2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="app-header__actions">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? "Ativar black mode" : "Ativar white mode"} title={theme === "light" ? "Black mode" : "White mode"}>
            <span className="theme-toggle__icon">{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</span>
            <span className="theme-toggle__label">{theme === "light" ? "Black" : "White"}</span>
          </button>
          <div className="user-chip">
            <span className="user-chip__avatar">{user.display_name.slice(0, 1).toUpperCase()}</span>
            <span className="user-chip__name">{user.display_name}</span>
          </div>
          <button type="button" onClick={onLogout} className="icon-button" aria-label="Sair" title="Sair">
            <LogOut size={17} />
          </button>
        </div>
      </div>
      {mobileOpen && <button type="button" className="mobile-menu-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fechar menu principal" />}
    </header>
  );
}
