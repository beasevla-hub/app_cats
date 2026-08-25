"use client";

import { useEffect, useMemo, useState } from "react";
import { AreaChart, Building2, DollarSign, FileText, LineChart, Wrench } from "lucide-react";
import { DashboardStats, fetchDashboard } from "@/lib/api";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return <article className="stat-card"><span className="stat-card__icon">{icon}</span><div className="min-w-0"><p className="stat-card__label">{label}</p><p className="stat-card__value" title={value}>{value}</p>{sub && <p className="stat-card__sub">{sub}</p>}</div></article>;
}

function BarList({ items, labelKey, emptyLabel }: { items: Array<Record<string, string | number>>; labelKey: string; emptyLabel: string }) {
  const max = Math.max(...items.map((item) => Number(item.total)), 1);
  if (!items.length) return <div className="empty-state" style={{ padding: "35px 10px" }}><span>{emptyLabel}</span></div>;
  return <div className="bars">{items.map((item) => <div className="bar-row" key={String(item[labelKey])}><span className="bar-row__label" title={String(item[labelKey])}>{String(item[labelKey])}</span><div className="bar-row__track"><div className="bar-row__fill" style={{ width: `${(Number(item.total) / max) * 100}%` }} /></div><span className="bar-row__value">{Number(item.total).toLocaleString("pt-BR")}</span></div>)}</div>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchDashboard().then(setStats).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const fmt = (value: number) => value.toLocaleString("pt-BR");
  const fmtBRL = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const yearItems = useMemo(() => stats?.cats_por_ano.map((item) => ({ ano: item.ano, total: item.total })) ?? [], [stats]);
  const groupItems = useMemo(() => stats?.top_grupos.map((item) => ({ grupo: item.grupo, total: item.total })) ?? [], [stats]);

  return (
    <main className="page">
      <section className="page-hero">
        <div className="page-hero__copy"><span className="page-hero__eyebrow"><LineChart size={14} /> Visão gerencial</span><h1>O acervo em perspectiva.</h1><p>Uma leitura rápida do volume de documentos, serviços, área contratada e relacionamento com os principais clientes.</p></div>
        <div className="page-hero__metric"><span>Status do acervo</span><strong>{loading ? "..." : stats ? "Ativo" : "—"}</strong></div>
      </section>

      {loading && <div className="dashboard-grid">{Array.from({ length: 5 }).map((_, index) => <div className="skeleton" key={index} style={{ height: 88 }} />)}</div>}
      {!loading && error && <div className="alert alert--error" style={{ marginTop: 20 }}>Não foi possível carregar as estatísticas. Verifique se o backend está rodando.</div>}
      {!loading && stats && <>
        <section className="dashboard-grid" aria-label="Indicadores principais">
          <StatCard icon={<FileText size={17} />} label="Total de CATs" value={fmt(stats.total_cats)} sub="documentos no acervo" />
          <StatCard icon={<Wrench size={17} />} label="Serviços" value={fmt(stats.total_servicos)} sub="itens catalogados" />
          <StatCard icon={<Building2 size={17} />} label="Contratantes" value={fmt(stats.total_contratantes)} sub="entidades relacionadas" />
          <StatCard icon={<AreaChart size={17} />} label="Área total" value={`${fmt(Math.round(stats.area_total_m2))} m²`} sub="soma informada" />
          <StatCard icon={<DollarSign size={17} />} label="Valor total" value={fmtBRL(stats.valor_total_contratos)} sub="valor de contratos" />
        </section>

        <section className="analytics-grid">
          <article className="surface analytics-panel"><div className="analytics-panel__heading"><div><h2>CATs por ano</h2><p>Distribuição dos documentos por início de obra.</p></div><AreaChart size={17} color="var(--brand)" /></div><BarList items={yearItems} labelKey="ano" emptyLabel="Sem dados anuais disponíveis." /></article>
          <article className="surface analytics-panel"><div className="analytics-panel__heading"><div><h2>Grupos de serviços</h2><p>Os dez grupos com maior presença no acervo.</p></div><Wrench size={17} color="var(--brand)" /></div><BarList items={groupItems} labelKey="grupo" emptyLabel="Sem grupos disponíveis." /></article>
          <article className="surface analytics-panel analytics-panel--wide"><div className="analytics-panel__heading"><div><h2>Principais contratantes</h2><p>Organizações com mais CATs cadastradas.</p></div><Building2 size={17} color="var(--brand)" /></div><div className="contractors">{stats.top_contratantes.length ? stats.top_contratantes.map((item, index) => <div className="contractor-row" key={item.contratante}><span className="contractor-row__rank">#{index + 1}</span><span className="contractor-row__name" title={item.contratante}>{item.contratante}</span><span className="contractor-row__count">{item.total} CATs</span></div>) : <div className="empty-state" style={{ gridColumn: "1 / -1", padding: "30px 10px" }}><span>Sem contratantes disponíveis.</span></div>}</div></article>
        </section>
      </>}
    </main>
  );
}
