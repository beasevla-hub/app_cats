"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FileText, Filter, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchGrupos, fetchServicos, fetchUnidades, openCatPdf, Servico } from "@/lib/api";
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
  numero_art: string;
  apelido: string;
  objeto: string;
  cidade: string;
  data_inicio_de: string;
  data_inicio_ate: string;
  data_fim_de: string;
  data_fim_ate: string;
  area_min: string;
  area_max: string;
  valor_min: string;
  valor_max: string;
  desmaterializado: string;
  autenticado: string;
  cao: string;
};

const EMPTY_FILTERS: Filters = {
  busca: "", grupo: "", unidade: "", contratante: "", numero_cat: "", numero_art: "", apelido: "", objeto: "", cidade: "",
  data_inicio_de: "", data_inicio_ate: "", data_fim_de: "", data_fim_ate: "", area_min: "", area_max: "", valor_min: "", valor_max: "",
  desmaterializado: "", autenticado: "", cao: "",
};

function number(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="filter-field"><span>{label}</span>{children}</label>;
}

function SelectField({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select className="control" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>;
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
        numero_art: filters.numero_art || undefined,
        apelido: filters.apelido || undefined,
        objeto: filters.objeto || undefined,
        cidade: filters.cidade || undefined,
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
        cao: filters.cao === "" ? undefined : filters.cao === "true",
      };
      const data = await fetchServicos(params);
      setTotal(data.total);
      setServicos((current) => (reset ? data.items : [...current, ...data.items]));
    } catch (requestError) {
      console.error(requestError);
      setError("Não foi possível carregar os serviços. Verifique a API e a extensão de busca do PostgreSQL.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    Promise.all([fetchGrupos(), fetchUnidades()])
      .then(([groups, units]) => { setGrupos(groups); setUnidades(units); })
      .catch(() => setError("Não foi possível carregar as opções de filtro."));
  }, []);

  useEffect(() => {
    setPage(1);
    setServicos([]);
    void loadServicos(1, true);
  }, [filters, loadServicos]);

  // TanStack Virtual expõe funções mutáveis por design; a virtualização continua necessária para acervos extensos.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({ count: servicos.length, getScrollElement: () => parentRef.current, estimateSize: () => 60, overscan: 18 });
  const activeFilters = useMemo(() => Object.entries(filters).filter(([, value]) => value).map(([key, value]) => ({ key: key as keyof Filters, value })), [filters]);
  const setDraftField = (field: keyof Filters, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const apply = (event?: FormEvent) => { event?.preventDefault(); setLoading(true); setFilters({ ...draft }); };
  const clear = () => { setLoading(true); setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); };
  const remove = (key: keyof Filters) => { const next = { ...filters, [key]: "" }; setLoading(true); setFilters(next); setDraft(next); };
  const openPdf = (item: Servico) => { void openCatPdf(item.cat_id).catch(() => setError("Não foi possível abrir o PDF. Confirme a raiz do OneDrive e se o arquivo existe.")); };

  return (
    <main className="page page--wide">
      <section className="page-hero">
        <div className="page-hero__copy">
          <span className="page-hero__eyebrow"><Search size={14} /> Consulta inteligente</span>
          <h1>Encontre a experiência certa para cada obra.</h1>
          <p>Pesquise por serviço, CAT, contratante ou obra. Refine os resultados com filtros completos e monte uma seleção técnica em poucos cliques.</p>
        </div>
        <div className="page-hero__metric"><span>Serviços encontrados</span><strong>{total.toLocaleString("pt-BR")}</strong></div>
      </section>

      <section className="surface filters" aria-label="Filtros de serviços">
        <div className="filters__top">
          <div><div className="filters__title"><SlidersHorizontal size={16} /> Refinar consulta</div><p className="surface__hint">A busca aceita variações de acento e pequenas diferenças de escrita.</p></div>
          <button type="button" className="button button--secondary" onClick={() => setShowFilters((current) => !current)}><Filter size={15} />{showFilters ? "Ocultar filtros" : "Mostrar filtros"}</button>
        </div>
        {showFilters && (
          <form onSubmit={apply} className="filters__grid">
            <FilterField label="Busca livre"><div className="search-control"><Search size={15} /><input className="control control--search" value={draft.busca} onChange={(event) => setDraftField("busca", event.target.value)} placeholder="Ex.: armadure, drenagem, pavimento" /></div></FilterField>
            <FilterField label="Grupo"><SelectField value={draft.grupo} onChange={(value) => setDraftField("grupo", value)}><option value="">Todos os grupos</option>{grupos.map((group) => <option key={group} value={group}>{group}</option>)}</SelectField></FilterField>
            <FilterField label="Unidade"><SelectField value={draft.unidade} onChange={(value) => setDraftField("unidade", value)}><option value="">Todas as unidades</option>{unidades.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</SelectField></FilterField>
            <FilterField label="Nº CAT"><input className="control" value={draft.numero_cat} onChange={(event) => setDraftField("numero_cat", event.target.value)} placeholder="Número da CAT" /></FilterField>
            <FilterField label="ART"><input className="control" value={draft.numero_art} onChange={(event) => setDraftField("numero_art", event.target.value)} placeholder="Número da ART" /></FilterField>
            <FilterField label="Obra / apelido"><input className="control" value={draft.apelido} onChange={(event) => setDraftField("apelido", event.target.value)} placeholder="Nome interno da obra" /></FilterField>
            <FilterField label="Contratante"><input className="control" value={draft.contratante} onChange={(event) => setDraftField("contratante", event.target.value)} placeholder="Órgão ou empresa" /></FilterField>
            <FilterField label="Objeto"><input className="control" value={draft.objeto} onChange={(event) => setDraftField("objeto", event.target.value)} placeholder="Objeto da obra" /></FilterField>
            <FilterField label="Cidade"><input className="control" value={draft.cidade} onChange={(event) => setDraftField("cidade", event.target.value)} placeholder="Cidade" /></FilterField>
            <FilterField label="Início · de"><input type="date" className="control" value={draft.data_inicio_de} onChange={(event) => setDraftField("data_inicio_de", event.target.value)} /></FilterField>
            <FilterField label="Início · até"><input type="date" className="control" value={draft.data_inicio_ate} onChange={(event) => setDraftField("data_inicio_ate", event.target.value)} /></FilterField>
            <FilterField label="Fim · de"><input type="date" className="control" value={draft.data_fim_de} onChange={(event) => setDraftField("data_fim_de", event.target.value)} /></FilterField>
            <FilterField label="Fim · até"><input type="date" className="control" value={draft.data_fim_ate} onChange={(event) => setDraftField("data_fim_ate", event.target.value)} /></FilterField>
            <FilterField label="Área mínima (m²)"><input type="number" className="control" value={draft.area_min} onChange={(event) => setDraftField("area_min", event.target.value)} placeholder="0" /></FilterField>
            <FilterField label="Área máxima (m²)"><input type="number" className="control" value={draft.area_max} onChange={(event) => setDraftField("area_max", event.target.value)} placeholder="Sem limite" /></FilterField>
            <FilterField label="Valor mínimo"><input type="number" className="control" value={draft.valor_min} onChange={(event) => setDraftField("valor_min", event.target.value)} placeholder="R$" /></FilterField>
            <FilterField label="Valor máximo"><input type="number" className="control" value={draft.valor_max} onChange={(event) => setDraftField("valor_max", event.target.value)} placeholder="Sem limite" /></FilterField>
            <FilterField label="Desmaterializado"><SelectField value={draft.desmaterializado} onChange={(value) => setDraftField("desmaterializado", value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></SelectField></FilterField>
            <FilterField label="Autenticado"><SelectField value={draft.autenticado} onChange={(value) => setDraftField("autenticado", value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></SelectField></FilterField>
            <FilterField label="CAO"><SelectField value={draft.cao} onChange={(value) => setDraftField("cao", value)}><option value="">Todos</option><option value="true">Sim</option><option value="false">Não</option></SelectField></FilterField>
            <div className="filters__actions"><button className="button button--primary" type="submit">Aplicar filtros</button><button className="button button--secondary icon-button--small" type="button" onClick={clear} aria-label="Limpar filtros" title="Limpar filtros"><X size={16} /></button></div>
          </form>
        )}
        {activeFilters.length > 0 && <div className="active-filters"><span className="active-filters__label">Ativos</span>{activeFilters.map(({ key, value }) => <button type="button" className="filter-chip" key={key} onClick={() => remove(key)}><span>{value}</span><X size={12} /></button>)}</div>}
      </section>

      {error && <div className="alert alert--error" style={{ marginTop: 16 }}>{error}</div>}

      <div className="catalog-toolbar">
        <div><p className="catalog-toolbar__eyebrow">Catálogo técnico</p><h2 className="catalog-toolbar__title">Serviços disponíveis</h2></div>
        <div className="catalog-toolbar__count"><span>{servicos.length.toLocaleString("pt-BR")} carregados</span><span aria-hidden="true">·</span><span>{total.toLocaleString("pt-BR")} no total</span></div>
      </div>

      <section className="surface service-table-wrap" aria-label="Tabela de serviços">
        <div className="service-table-scroll">
          <div className="service-table">
            <div className="service-table__head"><div>+</div><div>PDF</div><div>Nº CAT</div><div>Descrição / serviço</div><div>Un.</div><div>Quantidade</div><div>Obra / apelido</div><div>ART</div></div>
            <div ref={parentRef} className="service-table__body">
              {loading && servicos.length === 0 ? <div className="service-table__loading"><Loader2 size={17} className="animate-spin" style={{ marginRight: 8 }} />Carregando serviços...</div> : servicos.length === 0 ? <div className="service-table__loading">Nenhum serviço encontrado. Tente remover algum filtro.</div> : <div className="relative" style={{ height: `${virtualizer.getTotalSize()}px` }}>{virtualizer.getVirtualItems().map((virtualRow) => { const item = servicos[virtualRow.index]; return <div key={item.id} onClick={() => setSelectedServico(item)} className="service-row" style={{ transform: `translateY(${virtualRow.start}px)` }}><div onClick={(event) => event.stopPropagation()}><SelectionToggleButton item={selectedItemFromServico(item)} /></div><div><button type="button" className="service-row__pdf" onClick={(event) => { event.stopPropagation(); openPdf(item); }} title="Abrir PDF" aria-label="Abrir PDF"><FileText size={16} /></button></div><div className="service-row__cat">{item.numero_cat || "—"}</div><div className="service-row__text" title={item.descricao || ""}>{item.descricao || "—"}</div><div className="service-row__meta">{item.unidade || "—"}</div><div className="service-row__quantity">{number(item.quantidade)}</div><div className="service-row__work" title={item.apelido || ""}>{item.apelido || "Sem apelido"}</div><div className="service-row__art" title={item.numero_art || ""}>{item.numero_art || "—"}</div></div>; })}</div>}{loading && servicos.length > 0 && <div className="service-table__loading service-table__loading--bottom">Atualizando resultados...</div>}
            </div>
          </div>
        </div>
        {servicos.length < total && !loading && <div className="load-more"><button type="button" className="button button--secondary" onClick={() => { const next = page + 1; setPage(next); void loadServicos(next); }}>Carregar mais 200 serviços</button></div>}
      </section>

      {selectedServico && <DocumentViewerModal source={{ mode: "servico", servico: selectedServico }} onClose={() => setSelectedServico(null)} />}
    </main>
  );
}

export default function Home() {
  return <SelectionBasketShell><AppContent /></SelectionBasketShell>;
}
