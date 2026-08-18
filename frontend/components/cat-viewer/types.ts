import { Servico } from "@/lib/api";

export type DocumentViewLevel = "document" | "service";

export interface ServicoContext {
  id?: number | null;
  grupo: string | null;
  codigo: string | null;
  descricao: string | null;
  unidade: string | null;
  quantidade: number | null;
  pagina_pdf: number | null;
  ordem_na_pagina: number | null;
}

export function servicoFromRow(servico: Servico): ServicoContext {
  return {
    id: servico.id,
    grupo: servico.grupo,
    codigo: servico.codigo,
    descricao: servico.descricao,
    unidade: servico.unidade,
    quantidade: servico.quantidade,
    pagina_pdf: servico.pagina_pdf,
    ordem_na_pagina: servico.ordem_na_pagina,
  };
}
