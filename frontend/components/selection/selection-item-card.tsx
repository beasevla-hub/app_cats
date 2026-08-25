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
    <article className="selection-item">
      <button
        type="button"
        onClick={() => onRemove(item.key)}
        className="selection-item__remove"
        aria-label="Remover item"
      >
        <X size={14} />
      </button>

      <p
        className="selection-item__title"
        title={item.apelido || ""}
      >
        {item.apelido || "—"}
      </p>

      <p
        className="selection-item__description"
        title={item.descricao || ""}
      >
        {item.descricao || "—"}
      </p>

      {(item.grupo || item.numero_cat) && (
        <div className="selection-item__tags">
          {item.grupo && (
            <span className="selection-item__tag">
              {item.grupo}
            </span>
          )}
          {item.numero_cat && (
            <span className="selection-item__cat">{item.numero_cat}</span>
          )}
        </div>
      )}

      <div className="selection-item__meta">
        <span className="selection-item__unit">
          {item.unidade || "—"}
        </span>
        <span className="selection-item__quantity">
          {formatNumber(item.quantidade)}
        </span>
      </div>
    </article>
  );
}

const SelectionItemCard = memo(SelectionItemCardInner);
export default SelectionItemCard;
