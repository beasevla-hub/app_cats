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
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
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
      className={`inline-flex items-center justify-center ${dim} rounded-md border transition-colors ${
        selected
          ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-sm"
          : "text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
      }`}
    >
      {selected ? <Check size={iconSize} strokeWidth={2.5} /> : <Plus size={iconSize} strokeWidth={2.5} />}
    </button>
  );
}

const SelectionToggleButton = memo(SelectionToggleButtonInner);
export default SelectionToggleButton;
