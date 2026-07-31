"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarRange,
  FileStack,
  Filter,
  FolderOpen,
  MapPin,
  Search,
  Building2,
  BarChart2,
  ArrowLeft,
  X,
} from "lucide-react";
import { Cat, fetchCats } from "@/lib/api";
import DocumentViewerModal from "@/components/document-viewer-modal";
import { formatCurrency, formatDate, formatNumber } from "@/components/cat-viewer/formatters";
import SelectionBasketShell from "@/components/selection/selection-basket-shell";

interface CatsFiltros {
  busca: string;
  objeto: string;
  contratante: string;
  cidade: string;
  ano_inicio: string;
  ano_fim: string;
}

const FILTROS_VAZIOS: CatsFiltros = {
  busca: "",
  objeto: "",
  contratante: "",
  cidade: "",
  ano_inicio: "",
  ano_fim: "",
};

const inputClass =
  "w-full px-3 py-2 text-sm text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function CatCard({ cat, onOpen }: { cat: Cat; onOpen: (cat: Cat) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cat)}
      className="text-left bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-blue-600 font-bold">CAT</p>
          <h2 className="text-base font-bold text-slate-900 leading-tight line-clamp-2">
            {cat.apelido || "Documento sem apelido"}
          </h2>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-mono text-slate-600">
          {cat.numero_cat || "—"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm text-slate-600">
        <div className="flex items-start gap-2 min-w-0">
          <Building2 size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span className="line-clamp-2">{cat.contratante || "Contratante não informado"}</span>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{[cat.cidade, cat.estado].filter(Boolean).join(" / ") || "Local não informado"}</span>
        </div>
        <div className="flex items-start gap-2 min-w-0">
          <CalendarRange size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <span>{`${formatDate(cat.data_inicio)} — ${formatDate(cat.data_fim)}`}</span>
        </div>
      </div>

      {cat.objeto && <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{cat.objeto}</p>}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Serviços</p>
          <p className="text-sm font-bold text-slate-900">{formatNumber(cat.total_servicos)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Área</p>
          <p className="text-sm font-bold text-slate-900">{cat.area_m2 != null ? `${formatNumber(cat.area_m2)} m²` : "—"}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Valor</p>
          <p className="text-sm font-bold text-slate-900">{formatCurrency(cat.valor_contrato)}</p>
        </div>
      </div>
    </button>
  );
}

export default function CatsPage() {
  return (
    <SelectionBasketShell>
      <CatsPageContent />
    </SelectionBasketShell>
  );
}

function CatsPageContent() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [filtros, setFiltros] = useState<CatsFiltros>(FILTROS_VAZIOS);
  const [draft, setDraft] = useState<CatsFiltros>(FILTROS_VAZIOS);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCats({
      busca: filtros.busca || undefined,
      objeto: filtros.objeto || undefined,
      contratante: filtros.contratante || undefined,
      cidade: filtros.cidade || undefined,
      ano_inicio: filtros.ano_inicio ? Number(filtros.ano_inicio) : undefined,
      ano_fim: filtros.ano_fim ? Number(filtros.ano_fim) : undefined,
      limit: 500,
    })
      .then((data) => {
        if (!active) return;
        setCats(data);
      })
      .catch(console.error)
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filtros]);

  const filtrosAtivos = useMemo(
    () => [
      filtros.busca && { key: "busca", label: `Busca: ${filtros.busca}` },
      filtros.objeto && { key: "objeto", label: `Objeto: ${filtros.objeto}` },
      filtros.contratante && { key: "contratante", label: `Órgão: ${filtros.contratante}` },
      filtros.cidade && { key: "cidade", label: `Cidade: ${filtros.cidade}` },
      filtros.ano_inicio && { key: "ano_inicio", label: `De: ${filtros.ano_inicio}` },
      filtros.ano_fim && { key: "ano_fim", label: `Até: ${filtros.ano_fim}` },
    ].filter(Boolean) as { key: keyof CatsFiltros; label: string }[],
    [filtros]
  );

  const removerFiltro = (key: keyof CatsFiltros) => {
    const next = { ...filtros, [key]: "" };
    setFiltros(next);
    setDraft(next);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <FolderOpen className="text-blue-600" size={22} />
          <div>
            <h1 className="text-base font-bold text-slate-900">Sistema de Acervos Técnicos</h1>
            <p className="text-xs text-slate-500">Galeria de CATs</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors">
            <ArrowLeft size={18} />
            Serviços
          </Link>
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors">
            <BarChart2 size={18} />
            Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 py-4">
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Filtros das CATs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <FilterField label="Busca geral">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  value={draft.busca}
                  onChange={(e) => setDraft((current) => ({ ...current, busca: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && setFiltros({ ...draft })}
                  placeholder="Apelido, número, contratante..."
                  className={`${inputClass} pl-8`}
                />
              </div>
            </FilterField>

            <FilterField label="Objeto">
              <input
                type="text"
                value={draft.objeto}
                onChange={(e) => setDraft((current) => ({ ...current, objeto: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && setFiltros({ ...draft })}
                placeholder="Ex: calçada, praça, escadaria..."
                className={inputClass}
              />
            </FilterField>

            <FilterField label="Órgão / contratante">
              <input
                type="text"
                value={draft.contratante}
                onChange={(e) => setDraft((current) => ({ ...current, contratante: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && setFiltros({ ...draft })}
                placeholder="Ex: PMSP, Subprefeitura..."
                className={inputClass}
              />
            </FilterField>

            <FilterField label="Cidade">
              <input
                type="text"
                value={draft.cidade}
                onChange={(e) => setDraft((current) => ({ ...current, cidade: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && setFiltros({ ...draft })}
                placeholder="Ex: São Paulo"
                className={inputClass}
              />
            </FilterField>

            <FilterField label="Ano início">
              <input
                type="number"
                min={1990}
                max={2035}
                value={draft.ano_inicio}
                onChange={(e) => setDraft((current) => ({ ...current, ano_inicio: e.target.value }))}
                className={inputClass}
              />
            </FilterField>

            <FilterField label="Ano fim">
              <input
                type="number"
                min={1990}
                max={2035}
                value={draft.ano_fim}
                onChange={(e) => setDraft((current) => ({ ...current, ano_fim: e.target.value }))}
                className={inputClass}
              />
            </FilterField>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFiltros({ ...draft })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              <Filter size={15} />
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(FILTROS_VAZIOS);
                setFiltros(FILTROS_VAZIOS);
              }}
              className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              Limpar filtros
            </button>
          </div>

          {filtrosAtivos.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {filtrosAtivos.map((filtro) => (
                <span key={filtro.key} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                  {filtro.label}
                  <button type="button" onClick={() => removerFiltro(filtro.key)} className="hover:text-blue-950">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">{loading ? "Carregando CATs..." : `${cats.length.toLocaleString("pt-BR")} CATs encontradas`}</p>
            <p className="text-xs text-slate-400">Clique em um card para abrir o resumo completo da CAT.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-full px-3 py-1.5">
            <FileStack size={14} className="text-blue-500" />
            Visualização em cards
          </div>
        </section>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : cats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cats.map((cat) => (
              <CatCard key={cat.id} cat={cat} onOpen={setSelectedCat} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
            Nenhuma CAT encontrada com os filtros atuais.
          </div>
        )}
      </main>

      {selectedCat && (
        <DocumentViewerModal source={{ mode: "cat", cat: selectedCat }} onClose={() => setSelectedCat(null)} />
      )}
    </div>
  );
}
