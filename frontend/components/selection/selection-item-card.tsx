"use client";

import { memo } from "react";
import { X } from "lucide-react";
import { SelectedServicoItem } from "@/lib/selection-basket/types";
import { formatNumber } from "@/components/cat-viewer/formatters";

interface SelectionItemCardProps {
  item: SelectedServicoItem;
  onRemove: (key: string) => void;
}

function SelectionItemCardInner({ item, onRemove }: SelectionItemCardProps) {
  return (
    <article className="group relative bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-200 hover:shadow transition-colors">
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        className="absolute top-2 right-2 p-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors"
        aria-label="Remover item"
      >
        <X size={14} />
      </button>

      <p
        className="text-xs font-semibold text-blue-800 pr-6 truncate"
        title={item.apelido || ""}
      >
        {item.apelido || "—"}
      </p>

      <p
        className="text-sm text-slate-800 leading-snug mt-1.5 pr-1"
        title={item.descricao || ""}
      >
        {item.descricao || "—"}
      </p>

      {(item.grupo || item.numero_cat) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
          {item.grupo && (
            <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-full">
              {item.grupo}
            </span>
          )}
          {item.numero_cat && (
            <span className="text-[10px] font-mono text-slate-500">{item.numero_cat}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {item.unidade || "—"}
        </span>
        <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
          {formatNumber(item.quantidade)}
        </span>
      </div>
    </article>
  );
}

const SelectionItemCard = memo(SelectionItemCardInner);
export default SelectionItemCard;
