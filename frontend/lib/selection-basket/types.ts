import { Servico } from "@/lib/api";
import { ServicoContext } from "@/components/cat-viewer/types";

export interface SelectedServicoItem {
  key: string;
  id?: number;
  cat_id: number;
  descricao: string | null;
  unidade: string | null;
  quantidade: number | null;
  apelido: string | null;
  grupo: string | null;
  numero_cat: string | null;
}

export interface UnitTotal {
  unidade: string;
  total: number;
}

export function selectionKeyFromServico(s: Servico): string {
  return `id:${s.id}`;
}

export function selectionKeyFromContext(ctx: ServicoContext, catId: number): string {
  if (ctx.id != null) return `id:${ctx.id}`;
  return `ctx:${catId}-${ctx.pagina_pdf ?? ""}-${ctx.ordem_na_pagina ?? ""}-${ctx.codigo ?? ""}-${ctx.descricao ?? ""}`;
}

export function selectedItemFromServico(s: Servico): SelectedServicoItem {
  return {
    key: selectionKeyFromServico(s),
    id: s.id,
    cat_id: s.cat_id,
    descricao: s.descricao,
    unidade: s.unidade,
    quantidade: s.quantidade,
    apelido: s.apelido,
    grupo: s.grupo,
    numero_cat: s.numero_cat,
  };
}

export function selectedItemFromContext(
  ctx: ServicoContext,
  meta: { cat_id: number; apelido: string | null; numero_cat: string | null }
): SelectedServicoItem {
  return {
    key: selectionKeyFromContext(ctx, meta.cat_id),
    id: ctx.id,
    cat_id: meta.cat_id,
    descricao: ctx.descricao,
    unidade: ctx.unidade,
    quantidade: ctx.quantidade,
    apelido: meta.apelido,
    grupo: ctx.grupo,
    numero_cat: meta.numero_cat,
  };
}

export function computeTotalsByUnit(items: SelectedServicoItem[]): UnitTotal[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const unidade = (item.unidade?.trim() || "—").toUpperCase();
    const qtd = item.quantidade ?? 0;
    map.set(unidade, (map.get(unidade) ?? 0) + qtd);
  }
  return Array.from(map.entries())
    .map(([unidade, total]) => ({ unidade, total }))
    .sort((a, b) => a.unidade.localeCompare(b.unidade));
}
