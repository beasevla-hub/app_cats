"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, Filter, X, FileText, BarChart2 } from "lucide-react";
import { fetchServicos, fetchGrupos, Servico } from "@/lib/api";
import Link from "next/link";

const columnHelper = createColumnHelper<Servico>();

const columns = [
  columnHelper.accessor("apelido", {
    header: "Apelido / Obra",
    size: 220,
    cell: (info) => (
      <span className="font-medium text-blue-700">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("numero_cat", {
    header: "Nº CAT",
    size: 160,
    cell: (info) => (
      <span className="font-mono text-xs text-gray-600">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("grupo", {
    header: "Grupo",
    size: 180,
    cell: (info) => (
      <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("descricao", {
    header: "Descrição do Serviço",
    size: 400,
    cell: (info) => (
      <span className="text-sm text-gray-800">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("unidade", {
    header: "Un.",
    size: 70,
    cell: (info) => (
      <span className="text-center block font-mono text-xs">{info.getValue() || "—"}</span>
    ),
  }),
  columnHelper.accessor("quantidade", {
    header: "Qtd.",
    size: 100,
    cell: (info) => {
      const val = info.getValue();
      return (
        <span className="text-right block font-mono text-sm">
          {val != null ? val.toLocaleString("pt-BR") : "—"}
        </span>
      );
    },
  }),
  columnHelper.accessor("contratante", {
    header: "Contratante",
    size: 200,
    cell: (info) => (
      <span className="text-xs text-gray-600 truncate block max-w-[200px]" title={info.getValue() || ""}>
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("pagina_pdf", {
    header: "Pág.",
    size: 60,
    cell: (info) => (
      <span className="text-center block text-xs text-gray-500">{info.getValue() ?? "—"}</span>
    ),
  }),
];

export default function ConsultaServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [grupo, setGrupo] = useState("");
  const [unidade, setUnidade] = useState("");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [showFiltros, setShowFiltros] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 200;

  const loadServicos = useCallback(async (pg: number, reset = false) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: pg, page_size: PAGE_SIZE };
      if (busca) params.busca = busca;
      if (grupo) params.grupo = grupo;
      if (unidade) params.unidade = unidade;

      const data = await fetchServicos(params);
      setTotal(data.total);
      setServicos((prev) => (reset ? data.items : [...prev, ...data.items]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [busca, grupo, unidade]);

  useEffect(() => {
    fetchGrupos().then(setGrupos).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
    setServicos([]);
    loadServicos(1, true);
  }, [busca, grupo, unidade, loadServicos]);

  const table = useReactTable({
    data: servicos,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault();
    setBusca(buscaInput);
  };

  const limparFiltros = () => {
    setBuscaInput("");
    setBusca("");
    setGrupo("");
    setUnidade("");
  };

  const carregarMais = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadServicos(nextPage);
  };

  const temFiltrosAtivos = busca || grupo || unidade;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="text-blue-600" size={24} />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Sistema de Acervos Técnicos</h1>
            <p className="text-xs text-gray-500">Consulta de Serviços</p>
          </div>
        </div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
          <BarChart2 size={18} />
          Dashboard
        </Link>
      </header>

      {/* Barra de busca e filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <form onSubmit={handleBusca} className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              placeholder="Buscar por descrição do serviço..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => setShowFiltros(!showFiltros)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors ${showFiltros ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            <Filter size={16} />
            Filtros
            {temFiltrosAtivos && <span className="w-2 h-2 rounded-full bg-blue-600" />}
          </button>
          {temFiltrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={16} />
              Limpar
            </button>
          )}
        </form>

        {showFiltros && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Grupo:</label>
              <select
                value={grupo}
                onChange={(e) => setGrupo(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os grupos</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">Unidade:</label>
              <input
                type="text"
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Ex: M2, KG, M3"
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Contador de resultados */}
      <div className="px-6 py-2 flex items-center justify-between bg-gray-50 border-b border-gray-200">
        <span className="text-sm text-gray-600">
          {loading && servicos.length === 0
            ? "Carregando..."
            : `${total.toLocaleString("pt-BR")} serviços encontrados — exibindo ${servicos.length.toLocaleString("pt-BR")}`}
        </span>
        {servicos.length < total && !loading && (
          <button
            onClick={carregarMais}
            className="text-sm text-blue-600 hover:underline"
          >
            Carregar mais 200
          </button>
        )}
      </div>

      {/* Tabela virtualizada */}
      <div className="flex-1 overflow-hidden">
        <div className="overflow-x-auto h-full">
          <table className="min-w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <thead className="bg-gray-100 sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide border-b border-gray-200 whitespace-nowrap"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
          </table>

          <div ref={parentRef} className="overflow-y-auto" style={{ height: "calc(100vh - 220px)" }}>
            <table className="min-w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <tbody>
                {paddingTop > 0 && (
                  <tr><td style={{ height: `${paddingTop}px` }} colSpan={columns.length} /></tr>
                )}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-blue-50 border-b border-gray-100 cursor-pointer transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="px-3 py-2 truncate"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr><td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} /></tr>
                )}
              </tbody>
            </table>

            {loading && (
              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                Carregando serviços...
              </div>
            )}

            {!loading && servicos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Search size={40} className="mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum serviço encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros ou a busca</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
