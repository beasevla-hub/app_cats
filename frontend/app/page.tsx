"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { BarChart3, CalendarDays, ChevronDown, FileCheck2, Filter, LayoutGrid, ListFilter, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { fetchGrupos, fetchServicos, fetchUnidades, Servico } from "@/lib/api";
import DocumentViewerModal from "@/components/document-viewer-modal";
import SelectionBasketShell from "@/components/selection/selection-basket-shell";
import SelectionToggleButton from "@/components/selection/selection-toggle-button";
import { selectedItemFromServico } from "@/lib/selection-basket/types";

const PAGE_SIZE = 200;

type Filters = {
  busca: string;
  grupo: string;
  unidade: string;
  contratante: string;
  numero_cat: string;
  apelido: string;
  ano_inicio: string;
  ano_fim: string;
};

const EMPTY_FILTERS: Filters = {
  busca: "",
  grupo: "",
  unidade: "",
  contratante: "",
  numero_cat: "",
  apelido: "",
  ano_inicio: "",
  ano_fim: "",
};

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400";

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function FilterField({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{icon}{label}</span>
      {children}
    </label>
  );
}

function AppContent() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const loadServicos = useCallback(async (nextPage: number, reset = false) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        page: nextPage,
        page_size: PAGE_SIZE,
        busca: filters.busca || undefined,
        grupo: filters.grupo || undefined,
        unidade: filters.unidade || undefined,
        contratante: filters.contratante || undefined,
        numero_cat: filters.numero_cat || undefined,
        apelido: filters.apelido || undefined,
        ano_inicio: filters.ano_inicio ? Number(filters.ano_inicio) : undefined,
        ano_fim: filters.ano_fim ? Number(filters.ano_fim) : undefined,
      };
      const data = await fetchServicos(params);
      setTotal(data.total);
      setServicos((current) => (reset ? data.items : [...current, ...data.items]));
    } catch (requestError) {
      console.error(requestError);
      setError("Não foi possível carregar os serviços. Verifique se a API está rodando.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    Promise.all([fetchGrupos(), fetchUnidades()])
      .then(([groupData, unitData]) => {
        setGrupos(groupData);
        setUnidades(unitData);
      })
      .catch(() => setError("Não foi possível carregar as opções de filtro."));
  }, []);

  useEffect(() => {
    setPage(1);
    setServicos([]);
    void loadServicos(1, true);
  }, [filters, loadServicos]);

  const rowVirtualizer = useVirtualizer({
    count: servicos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 62,
    overscan: 18,
  });
  const virtualRows = rowVirtualizer.getVirtualItems();

  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([, value]) => value).map(([key, value]) => ({ key: key as keyof Filters, value })),
    [filters],
  );

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setFilters({ ...draft });
  };

  const clearFilters = () => {
    setDraft(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
  };

  const removeFilter = (key: keyof Filters) => {
    const next = { ...filters, [key]: "" };
    setFilters(next);
    setDraft(next);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    void loadServicos(nextPage);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15"><FileCheck2 size={20} /></div>
            <div className="min-w-0"><p className="truncate text-sm font-bold tracking-tight text-slate-950">Acervo Técnico</p><p className="truncate text-[11px] font-medium text-slate-500">Pesquisa inteligente de CATs e serviços</p></div>
          </div>
          <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 text-sm font-semibold">
            <Link href="/" className="rounded-xl bg-white px-3 py-2 text-slate-900 shadow-sm">Serviços</Link>
            <Link href="/cats" className="rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900">CATs</Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-slate-500 transition hover:bg-white hover:text-slate-900"><BarChart3 size={15} />Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-5 py-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 lg:px-8">
          <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" /><div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100"><Sparkles size={14} />Base de conhecimento da empresa</div><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Encontre a experiência certa para cada obra.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Pesquise serviços, selecione evidências para uma licitação e abra o espelho completo da CAT em poucos cliques.</p></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Encontrados</p><p className="mt-1 text-xl font-black">{total.toLocaleString("pt-BR")}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Exibidos</p><p className="mt-1 text-xl font-black">{servicos.length.toLocaleString("pt-BR")}</p></div><div className="col-span-2 rounded-2xl border border-blue-400/20 bg-blue-500/20 px-4 py-3 sm:col-span-1"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Ação rápida</p><p className="mt-1 text-sm font-bold">Selecione serviços →</p></div></div>
          </div>
        </section>

        <section className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><form onSubmit={applyFilters} className="flex min-w-0 flex-1 gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={draft.busca} onChange={(event) => setDraft({ ...draft, busca: event.target.value })} placeholder="Busque por descrição: concreto, drenagem, piso..." className={`${inputClass} pl-10`} /></div><button type="submit" className="shrink-0 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-[0.98]">Buscar</button></form><button type="button" onClick={() => setShowFilters((value) => !value)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"><ListFilter size={17} />Filtros avançados<ChevronDown size={15} className={showFilters ? "rotate-180 transition" : "transition"} /></button></div>
          {showFilters && <form onSubmit={applyFilters} className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"><FilterField label="Grupo" icon={<Filter size={13} />}><select value={draft.grupo} onChange={(event) => setDraft({ ...draft, grupo: event.target.value })} className={inputClass}><option value="">Todos os grupos</option>{grupos.map((item) => <option key={item} value={item}>{item}</option>)}</select></FilterField><FilterField label="Unidade"><select value={draft.unidade} onChange={(event) => setDraft({ ...draft, unidade: event.target.value })} className={inputClass}><option value="">Todas</option>{unidades.map((item) => <option key={item} value={item}>{item}</option>)}</select></FilterField><FilterField label="Contratante"><input value={draft.contratante} onChange={(event) => setDraft({ ...draft, contratante: event.target.value })} placeholder="Órgão ou empresa" className={inputClass} /></FilterField><FilterField label="Nº CAT"><input value={draft.numero_cat} onChange={(event) => setDraft({ ...draft, numero_cat: event.target.value })} placeholder="Número exato" className={inputClass} /></FilterField><FilterField label="Apelido / obra"><input value={draft.apelido} onChange={(event) => setDraft({ ...draft, apelido: event.target.value })} placeholder="Nome interno" className={inputClass} /></FilterField><FilterField label="Ano inicial" icon={<CalendarDays size={13} />}><input type="number" min={1990} max={2100} value={draft.ano_inicio} onChange={(event) => setDraft({ ...draft, ano_inicio: event.target.value })} placeholder="Ex.: 2020" className={inputClass} /></FilterField><FilterField label="Ano final" icon={<CalendarDays size={13} />}><input type="number" min={1990} max={2100} value={draft.ano_fim} onChange={(event) => setDraft({ ...draft, ano_fim: event.target.value })} placeholder="Ex.: 2026" className={inputClass} /></FilterField><div className="flex items-end gap-2"><button type="submit" className="flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800">Aplicar</button><button type="button" onClick={clearFilters} className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-500 transition hover:bg-slate-50" title="Limpar filtros"><X size={17} /></button></div></form>}
          {activeFilters.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><span className="text-xs font-bold uppercase tracking-wider text-slate-400">Filtros ativos</span>{activeFilters.map(({ key, value }) => <button key={key} type="button" onClick={() => removeFilter(key)} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">{value}<X size={13} /></button>)}</div>}
        </section>

        {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

        <section className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-5"><div><p className="text-sm font-black text-slate-900">Catálogo de serviços</p><p className="mt-0.5 text-xs text-slate-500">Clique em uma linha para abrir o espelho da CAT. Use <strong>+</strong> para montar sua seleção.</p></div><div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><LayoutGrid size={15} className="text-blue-500" />Tabela inteligente · 200 por lote</div></div><div className="overflow-x-auto"><div className="min-w-[1180px]"><div className="grid grid-cols-[58px_220px_150px_180px_minmax(340px,1fr)_75px_100px_240px_70px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500"><div className="text-center">+</div><div>Apelido / obra</div><div>Nº CAT</div><div>Grupo</div><div>Descrição do serviço</div><div>Un.</div><div>Qtd.</div><div>Contratante</div><div>Pág.</div></div><div ref={parentRef} className="h-[min(64vh,720px)] overflow-y-auto">{loading && servicos.length === 0 ? <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-500">Carregando serviços...</div> : servicos.length === 0 ? <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-slate-500"><Search size={32} className="text-slate-300" /><p className="font-bold">Nenhum serviço encontrado</p><p className="text-xs">Tente remover algum filtro ou usar outro termo.</p></div> : <div className="relative" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>{virtualRows.map((virtualRow) => { const item = servicos[virtualRow.index]; return <div key={item.id} onClick={() => setSelectedServico(item)} className="absolute left-0 right-0 grid cursor-pointer grid-cols-[58px_220px_150px_180px_minmax(340px,1fr)_75px_100px_240px_70px] items-center border-b border-slate-100 px-2 py-3 text-sm transition hover:bg-blue-50/70" style={{ transform: `translateY(${virtualRow.start}px)` }}><div className="flex justify-center" onClick={(event) => event.stopPropagation()}><SelectionToggleButton item={selectedItemFromServico(item)} /></div><div className="truncate pr-3 font-bold text-blue-700" title={item.apelido || ""}>{item.apelido || "Sem apelido"}</div><div className="font-mono text-xs text-slate-500">{item.numero_cat || "—"}</div><div><span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">{item.grupo || "—"}</span></div><div className="truncate pr-4 font-medium text-slate-800" title={item.descricao || ""}>{item.descricao || "—"}</div><div className="font-mono text-xs font-bold text-slate-500">{item.unidade || "—"}</div><div className="font-mono text-sm font-bold text-slate-700">{formatNumber(item.quantidade)}</div><div className="truncate pr-3 text-xs text-slate-500" title={item.contratante || ""}>{item.contratante || "—"}</div><div className="text-center text-xs text-slate-400">{item.pagina_pdf ?? "—"}</div></div>; })}</div>}{loading && servicos.length > 0 && <div className="sticky bottom-0 border-t border-slate-100 bg-white/90 py-3 text-center text-xs font-semibold text-slate-500 backdrop-blur">Atualizando resultados...</div>}</div></div></div>{servicos.length < total && !loading && <div className="flex justify-center border-t border-slate-100 px-5 py-4"><button type="button" onClick={loadMore} className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:bg-blue-100">Carregar mais 200 serviços</button></div>}</section>
      </main>
      {selectedServico && <DocumentViewerModal source={{ mode: "servico", servico: selectedServico }} onClose={() => setSelectedServico(null)} />}
    </div>
  );
}

export default function Home() {
  return <SelectionBasketShell><AppContent /></SelectionBasketShell>;
}
