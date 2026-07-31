"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SelectedServicoItem,
  UnitTotal,
  computeTotalsByUnit,
} from "./types";

interface SelectionBasketContextValue {
  items: SelectedServicoItem[];
  itemCount: number;
  totalsByUnit: UnitTotal[];
  panelOpen: boolean;
  minimized: boolean;
  isSelected: (key: string) => boolean;
  toggle: (item: SelectedServicoItem) => void;
  remove: (key: string) => void;
  clear: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setMinimized: (value: boolean) => void;
}

const SelectionBasketContext = createContext<SelectionBasketContextValue | null>(null);

export function SelectionBasketProvider({ children }: { children: ReactNode }) {
  const [itemsMap, setItemsMap] = useState<Record<string, SelectedServicoItem>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const items = useMemo(() => Object.values(itemsMap), [itemsMap]);
  const itemCount = items.length;
  const totalsByUnit = useMemo(() => computeTotalsByUnit(items), [items]);

  const isSelected = useCallback((key: string) => key in itemsMap, [itemsMap]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    setMinimized(false);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setMinimized(false);
  }, []);

  const toggle = useCallback((item: SelectedServicoItem) => {
    setItemsMap((prev) => {
      if (item.key in prev) {
        const next = { ...prev };
        delete next[item.key];
        return next;
      }
      return { ...prev, [item.key]: item };
    });
    setPanelOpen(true);
    setMinimized(false);
  }, []);

  const remove = useCallback((key: string) => {
    setItemsMap((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItemsMap({});
  }, []);

  const value = useMemo<SelectionBasketContextValue>(
    () => ({
      items,
      itemCount,
      totalsByUnit,
      panelOpen,
      minimized,
      isSelected,
      toggle,
      remove,
      clear,
      openPanel,
      closePanel,
      setMinimized,
    }),
    [
      items,
      itemCount,
      totalsByUnit,
      panelOpen,
      minimized,
      isSelected,
      toggle,
      remove,
      clear,
      openPanel,
      closePanel,
    ]
  );

  return (
    <SelectionBasketContext.Provider value={value}>
      {children}
    </SelectionBasketContext.Provider>
  );
}

export function useSelectionBasket(): SelectionBasketContextValue {
  const ctx = useContext(SelectionBasketContext);
  if (!ctx) {
    throw new Error("useSelectionBasket deve ser usado dentro de SelectionBasketProvider");
  }
  return ctx;
}
