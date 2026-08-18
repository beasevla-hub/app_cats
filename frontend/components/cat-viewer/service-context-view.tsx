"use client";

import { ArrowLeft, FileSearch, Hash, Layers3, Ruler, ScanLine } from "lucide-react";
import { ServicoContext } from "./types";
import { formatNumber } from "./formatters";

interface Props {
  servico: ServicoContext;
  numeroDocumento: string;
  tipoDocumento: string;
  catId: number;
  apelido: string | null;
  onBack: () => void;
}

export default function ServiceContextView({ servico, numeroDocumento, tipoDocumento, apelido, onBack }: Props) {
  return <div className="flex-1 overflow-y-auto bg-[#f5f7fb] p-5 sm:p-8"><button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-300 hover:text-blue-700"><ArrowLeft size={15} />Voltar para a ficha</button><div className="mx-auto max-w-3xl"><div className="mb-5 flex items-start gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><FileSearch size={22} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Contexto do serviço</p><h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{servico.descricao || "Serviço sem descrição"}</h3><p className="mt-1 text-sm text-slate-500">{apelido || "Obra sem apelido"} · {tipoDocumento} {numeroDocumento}</p></div></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Layers3 size={15} />Grupo</div><p className="mt-3 text-lg font-black text-slate-900">{servico.grupo || "—"}</p><div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Hash size={15} />Código</div><p className="mt-2 font-mono text-sm font-bold text-slate-700">{servico.codigo || "—"}</p></div><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><Ruler size={15} />Quantitativo</div><p className="mt-3 text-3xl font-black text-blue-700">{formatNumber(servico.quantidade)} <span className="text-sm text-slate-500">{servico.unidade || ""}</span></p><div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ScanLine size={15} />Origem no documento</div><p className="mt-2 text-sm font-bold text-slate-700">{servico.pagina_pdf ? `Página ${servico.pagina_pdf}` : "Página não informada"}{servico.ordem_na_pagina ? ` · item ${servico.ordem_na_pagina}` : ""}</p></div></div><div className="mt-4 rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900"><strong>Como usar:</strong> este é o item que motivou a abertura da CAT. Confira o quantitativo, a unidade e a página de origem para validar a evidência antes de adicioná-la ao acervo da licitação.</div></div></div>;
}
