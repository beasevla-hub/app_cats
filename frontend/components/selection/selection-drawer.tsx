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
        className="selection-fab"
        aria-label={`Abrir seleção de acervo — ${itemCount} itens`}
      >
        <ClipboardList size={22} />
        <span className="selection-fab__count">
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
        className="minimized-selection"
        aria-label={`Expandir seleção de acervo — ${itemCount} itens`}
      >
        <PanelRightOpen size={18} />
        <span className="tabular-nums">{itemCount}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <aside
      className="selection-drawer"
      aria-label="Seleção de acervo técnico"
    >
      {/* Cabeçalho */}
      <header className="selection-drawer__header">
        <div className="selection-drawer__title">
          <div className="selection-drawer__title-icon">
            <ClipboardList size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="selection-drawer__title-heading">Seleção de acervo</h2>
            <p className="selection-drawer__title-meta">
              {itemCount === 0
                ? "Nenhum item selecionado"
                : `${itemCount} ${itemCount === 1 ? "item" : "itens"}`}
            </p>
          </div>
        </div>
        <div className="selection-drawer__actions">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="icon-button icon-button--small"
            title="Recolher painel"
            aria-label="Recolher painel"
          >
            <PanelRightClose size={17} />
          </button>
          <button
            type="button"
            onClick={closePanel}
            className="icon-button icon-button--small"
            title="Fechar painel"
            aria-label="Fechar painel"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* Lista rolável */}
      <div className="selection-drawer__body">
        {items.length === 0 ? (
          <div className="selection-drawer__empty">
            <div className="selection-drawer__empty-icon">
              <ClipboardList size={22} className="text-blue-400" />
            </div>
            <p className="selection-drawer__empty-title">Cesta vazia</p>
            <p className="selection-drawer__empty-text">
              Use o botão <span className="selection-drawer__empty-key">+</span> na tabela para adicionar serviços.
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
      <footer className="selection-drawer__footer">
        {totalsByUnit.length > 0 && (
          <div>
            <p className="selection-drawer__footer-heading">
              Totais por unidade
            </p>
            <div className="unit-totals">
              {totalsByUnit.map(({ unidade, total }) => (
                <span
                  key={unidade}
                  className="unit-total"
                >
                  <span className="unit-total__unit">{unidade}</span>
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
            className="button button--secondary button--full"
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
