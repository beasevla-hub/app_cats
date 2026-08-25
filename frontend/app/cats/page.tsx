"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, CalendarRange, CheckCircle2, FileStack, Filter, MapPin, Search, ShieldCheck, X } from "lucide-react";
import { Cat, fetchCats } from "@/lib/api";
import DocumentViewerModal from "@/components/document-viewer-modal";
import { formatCurrency, formatDate, formatNumber } from "@/components/cat-viewer/formatters";
import SelectionBasketShell from "@/components/selection/selection-basket-shell";

type Filters = {
  busca: string; objeto: string; contratante: string; cidade: string; numero_art: string;
  data_inicio_de: string; data_inicio_ate: string; data_fim_de: string; data_fim_ate: string;
  area_min: string; area_max: string; valor_min: string; valor_max: string;
  desmaterializado: string; autenticado: string;
};

const EMPTY: Filters = {
  busca: "", objeto: "", contratante: "", cidade: "", numero_art: "", data_inicio_de: "", data_inicio_ate: "", data_fim_de: "", data_fim_ate: "",
  area_min: "", area_max: "", valor_min: "", valor_max: "", desmaterializado: "", autenticado: "",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="filter-field"><span>{label}</span>{children}</label>;
}

function CatCard({ cat, onOpen }: { cat: Cat; onOpen: (cat: Cat) => void }) {
  return (
    <button type="button" onClick={() => onOpen(cat)} className="cat-card">
      <div className="cat-card__top">
        <div className="min-w-0"><p className="cat-card__kicker">CAT · {cat.numero_art || "ART não informada"}</p><h2>{cat.apelido || "Documento sem apelido"}</h2></div>
        <span className="cat-card__number">{cat.numero_cat || "—"}</span>
      </div>
      <div className="cat-card__details">
        <span className="cat-card__detail"><Building2 size={14} />{cat.contratante || "Contratante não informado"}</span>
        <span className="cat-card__detail"><MapPin size={14} />{[cat.cidade, cat.estado].filter(Boolean).join(" / ") || "Local não informado"}</span>
        <span className="cat-card__detail"><CalendarRange size={14} />{formatDate(cat.data_inicio)} — {formatDate(cat.data_fim)}</span>
      </div>
      {cat.objeto && <p className="cat-card__object">{cat.objeto}</p>}
      <div className="cat-card__stats">
        <div className="cat-card__stat"><span>Serviços</span><strong>{formatNumber(cat.total_servicos)}</strong></div>
        <div className="cat-card__stat"><span>Área</span><strong>{cat.area_m2 != null ? `${formatNumber(cat.area_m2)} m²` : "—"}</strong></div>
        <div className="cat-card__stat"><span>Valor</span><strong>{formatCurrency(cat.valor_contrato)}</strong></div>
      </div>
      <div className="badges"><span className={`status-badge ${cat.desmaterializado ? "is-on" : "is-off"}`}><CheckCircle2 size={12} />Desmaterializado</span><span className={`status-badge ${cat.autenticado ? "is-on" : "is-off"}`}><ShieldCheck size={12} />Autenticado</span></div>
    </button>
  );
}

function Content() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [selected, setSelected] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const setField = (key: keyof Filters, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    const params = {
      busca: filters.busca || undefined,
      objeto: filters.objeto || undefined,
      contratante: filters.contratante || undefined,
      cidade: filters.cidade || undefined,
      numero_art: filters.numero_art || undefined,
      data_inicio_de: filters.data_inicio_de || undefined,
      data_inicio_ate: filters.data_inicio_ate || undefined,
      data_fim_de: filters.data_fim_de || undefined,
      data_fim_ate: filters.data_fim_ate || undefined,
      area_min: filters.area_min ? Number(filters.area_min) : undefined,
      area_max: filters.area_max ? Number(filters.area_max) : undefined,
      valor_min: filters.valor_min ? Number(filters.valor_min) : undefined,
      valor_max: filters.valor_max ? Number(filters.valor_max) : undefined,
      desmaterializado: filters.desmaterializado === "" ? undefined : filters.desmaterializado === "true",
      autenticado: filters.autenticado === "" ? undefined : filters.autenticado === "true",
      limit: 500,
    };
    fetchCats(params).then((data) => { if (active) { setCats(data); setError(""); } }).catch(() => active && setError("Não foi possível carregar as CATs.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters]);

  const active = useMemo(() => Object.entries(filters).filter(([, value]) => value).map(([key, value]) => ({ key: key as keyof Filters, value })), [filters]);
  const apply = (event?: FormEvent) => { event?.preventDefault(); setLoading(true); setFilters({ ...draft }); };
  const clear = () => { setLoading(true); setDraft(EMPTY); setFilters(EMPTY); };
  const remove = (key: keyof Filters) => { const next = { ...filters, [key]: "" }; setLoading(true); setFilters(next); setDraft(next); };

  return (
    <main className="page">
      <section className="page-hero">
        <div className="page-hero__copy"><span className="page-hero__eyebrow"><FileStack size={14} /> Biblioteca documental</span><h1>CATs prontas para consulta.</h1><p>Encontre obras, contratantes e experiências técnicas com filtros claros, contexto completo e acesso ao documento original.</p></div>
        <div className="page-hero__metric"><span>CATs carregadas</span><strong>{cats.length.toLocaleString("pt-BR")}</strong></div>
      </section>

      <section className="surface filters" aria-label="Filtros de CATs">
        <div className="filters__top"><div><div className="filters__title"><Filter size={16} /> Filtrar documentos</div><p className="surface__hint">Combine campos para encontrar exatamente a obra desejada.</p></div><button type="button" className="button button--secondary" onClick={() => setShowFilters((current) => !current)}>{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</button></div>
        {showFilters && <form onSubmit={apply} className="filters__grid">
          <Field label="Busca geral"><div className="search-control"><Search size={15} /><input className="control control--search" value={draft.busca} onChange={(event) => setField("busca", event.target.value)} placeholder="Obra, contratante, número..." /></div></Field>
          <Field label="ART"><input className="control" value={draft.numero_art} onChange={(event) => setField("numero_art", event.target.value)} placeholder="Número da ART" /></Field>
          <Field label="Objeto"><input className="control" value={draft.objeto} onChange={(event) => setField("objeto", event.target.value)} placeholder="Objeto da obra" /></Field>
          <Field label="Contratante"><input className="control" value={draft.contratante} onChange={(event) => setField("contratante", event.target.value)} placeholder="Órgão / empresa" /></Field>
          <Field label="Cidade"><input className="control" value={draft.cidade} onChange={(event) => setField("cidade", event.target.value)} placeholder="Cidade" /></Field>
          <Field label="Início · de"><input type="date" className="control" value={draft.data_inicio_de} onChange={(event) => setField("data_inicio_de", event.target.value)} /></Field>
          <Field label="Início · até"><input type="date" className="control" value={draft.data_inicio_ate} onChange={(event) => setField("data_inicio_ate", event.target.value)} /></Field>
          <Field label="Fim · de"><input type="date" className="control" value={draft.data_fim_de} onChange={(event) => setField("data_fim_de", event.target.value)} /></Field>
          <Field label="Fim · até"><input type="date" className="control" value={draft.data_fim_ate} onChange={(event) => setField("data_fim_ate", event.target.value)} /></Field>
          <Field label="Área mínima"><input type="number" className="control" value={draft.area_min} onChange={(event) => setField("area_min", event.target.value)} placeholder="0" /></Field>
          <Field label="Área máxima"><input type="number" className="control" value={draft.area_max} onChange={(event) => setField("area_max", event.target.value)} placeholder="Sem limite" /></Field>
          <Field label="Valor mínimo"><input type="number" className="control" value={draft.valor_min} onChange={(event) => setField("valor_min", event.target.value)} placeholder="R$" /></Field>
          <Field label="Valor máximo"><input type="number" className="control" value={draft.valor_max} onChange={(event) => setField("valor_max", event.target.value)} placeholder="Sem limite" /></Field>
          <Field label="Desmaterializado"><select className="control" value={draft.desmaterializado} onChange={(event) => setField("desmaterializado", event.target.value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></Field>
          <Field label="Autenticado"><select className="control" value={draft.autenticado} onChange={(event) => setField("autenticado", event.target.value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></select></Field>
          <div className="filters__actions"><button type="submit" className="button button--primary">Aplicar filtros</button><button type="button" onClick={clear} className="button button--secondary icon-button--small" aria-label="Limpar filtros" title="Limpar filtros"><X size={16} /></button></div>
        </form>}
        {active.length > 0 && <div className="active-filters"><span className="active-filters__label">Ativos</span>{active.map(({ key, value }) => <button key={key} type="button" onClick={() => remove(key)} className="filter-chip"><span>{value}</span><X size={12} /></button>)}</div>}
      </section>

      {error && <div className="alert alert--error" style={{ marginTop: 16 }}>{error}</div>}
      <div className="cat-results-meta"><div><h2>{loading ? "Carregando CATs..." : `${cats.length.toLocaleString("pt-BR")} CATs encontradas`}</h2><p>Clique em um card para abrir o resumo completo e os serviços do documento.</p></div><span className="cat-results-meta__badge"><FileStack size={14} /> Cards documentais</span></div>
      {loading ? <div className="skeleton-grid">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="skeleton" />)}</div> : cats.length ? <div className="cat-grid">{cats.map((cat) => <CatCard key={cat.id} cat={cat} onOpen={setSelected} />)}</div> : <div className="surface empty-state"><Search size={28} /><p>Nenhuma CAT encontrada.</p><span>Tente remover algum filtro ou usar uma busca mais ampla.</span></div>}
      {selected && <DocumentViewerModal source={{ mode: "cat", cat: selected }} onClose={() => setSelected(null)} />}
    </main>
  );
}

export default function CatsPage() {
  return <SelectionBasketShell><Content /></SelectionBasketShell>;
}
