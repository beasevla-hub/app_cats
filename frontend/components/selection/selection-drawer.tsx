"use client";
import { createPortal } from "react-dom";
import {
  ClipboardList,
  X,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
} from "lucide-react";
import { useSelectionBasket } from "@/lib/selection-basket/context";
import { formatNumber } from "@/components/cat-viewer/formatters";
import SelectionItemCard from "./selection-item-card";

export default function SelectionDrawer() {
  const {
    items,
    itemCount,
    totalsByUnit,
    panelOpen,
    minimized,
    remove,
    clear,
    openPanel,
    closePanel,
    setMinimized,
  } = useSelectionBasket();

  if (typeof document === "undefined") return null;

  if (!panelOpen && itemCount === 0) return null;

  if (!panelOpen && itemCount > 0) {
    return createPortal(
      <button
        type="button"
        onClick={openPanel}
        className="fixed bottom-5 right-5 z-[60] flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-700 hover:bg-blue-700 hover:scale-105 transition-all"
        aria-label={`Abrir seleção de acervo — ${itemCount} itens`}
      >
        <ClipboardList size={22} />
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-slate-800 text-white text-[11px] font-bold flex items-center justify-center border-2 border-white">
          {itemCount}
        </span>
      </button>,
      document.body
    );
  }

  if (minimized) {
    return createPortal(
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="fixed top-1/2 right-0 -translate-y-1/2 z-[60] flex flex-col items-center gap-1.5 py-3 px-2 bg-white border border-slate-200 border-r-0 rounded-l-lg shadow-md text-blue-600 hover:bg-blue-50 transition-colors"
        aria-label={`Expandir seleção de acervo — ${itemCount} itens`}
      >
        <PanelRightOpen size={18} />
        <span className="text-[11px] font-bold text-blue-700 tabular-nums">{itemCount}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <aside
      className="fixed top-3 right-3 bottom-3 z-[60] w-[min(calc(100vw-1.5rem),22rem)] flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl shadow-slate-300/40 overflow-hidden"
      aria-label="Seleção de acervo técnico"
    >
      {/* Cabeçalho */}
      <header className="shrink-0 flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <ClipboardList size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Seleção de acervo</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {itemCount === 0
                ? "Nenhum item selecionado"
                : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Recolher painel"
            aria-label="Recolher painel"
          >
            <PanelRightClose size={17} />
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Fechar painel"
            aria-label="Fechar painel"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* Lista rolável */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 bg-slate-50/50 selection-drawer-scroll">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
              <ClipboardList size={22} className="text-blue-400" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Cesta vazia</p>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
              Use o botão <span className="inline-flex w-5 h-5 align-middle items-center justify-center rounded border border-blue-200 bg-blue-50 text-blue-600 text-xs font-bold">+</span> na tabela para adicionar serviços.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.key}>
                <SelectionItemCard item={item} onRemove={remove} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Rodapé */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 space-y-3">
        {totalsByUnit.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">
              Totais por unidade
            </p>
            <div className="flex flex-wrap gap-1.5">
              {totalsByUnit.map(({ unidade, total }) => (
                <span
                  key={unidade}
                  className="inline-flex items-center gap-1 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-md tabular-nums"
                >
                  <span className="font-mono text-[10px] text-blue-600">{unidade}</span>
                  <span>{formatNumber(total)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {itemCount > 0 && (
          <button
            type="button"
            onClick={clear}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Limpar seleção
          </button>
        )}
      </footer>
    </aside>,
    document.body
  );
}
