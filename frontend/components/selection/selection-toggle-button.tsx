"use client";

import { memo } from "react";
import { Check, Plus } from "lucide-react";
import { useSelectionBasket } from "@/lib/selection-basket/context";
import { SelectedServicoItem } from "@/lib/selection-basket/types";

interface SelectionToggleButtonProps {
  item: SelectedServicoItem;
  size?: "sm" | "md";
}

function SelectionToggleButtonInner({ item, size = "sm" }: SelectionToggleButtonProps) {
  const { isSelected, toggle } = useSelectionBasket();
  const selected = isSelected(item.key);
  const iconSize = size === "sm" ? 15 : 16;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(item);
      }}
      title={selected ? "Remover da cesta de acervo" : "Adicionar à cesta de acervo"}
      aria-label={selected ? "Remover da cesta" : "Adicionar à cesta"}
      aria-pressed={selected}
      className={`selection-toggle${selected ? " is-selected" : ""}${size === "md" ? " selection-toggle--large" : ""}`}
    >
      {selected ? <Check size={iconSize} strokeWidth={2.5} /> : <Plus size={iconSize} strokeWidth={2.5} />}
    </button>
  );
}

const SelectionToggleButton = memo(SelectionToggleButtonInner);
export default SelectionToggleButton;
