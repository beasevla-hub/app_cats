"use client";

import { type ReactNode } from "react";
import { SelectionBasketProvider } from "@/lib/selection-basket/context";
import SelectionDrawer from "./selection-drawer";

export default function SelectionBasketShell({ children }: { children: ReactNode }) {
  return (
    <SelectionBasketProvider>
      {children}
      <SelectionDrawer />
    </SelectionBasketProvider>
  );
}
