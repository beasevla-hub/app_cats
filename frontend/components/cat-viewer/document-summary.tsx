"use client";

import { Building2, CalendarRange, FileBadge, MapPin, Ruler, WalletCards } from "lucide-react";
import { CatDetalhe, CatUpdatePayload, getCatPdfUrl } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "./formatters";

interface Props {
  documento: CatDetalhe;
  tipoDocumento: string;
  editing: boolean;
  onFieldChange: (field: keyof CatUpdatePayload, value: string | number | null) => void;
}

function Field({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"><div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{icon}{label}</div><div className="mt-1.5 text-sm font-bold leading-5 text-slate-800">{value || "—"}</div></div>;
}

export default function DocumentSummary({ documento, tipoDocumento, editing, onFieldChange }: Props) {
  const edit = (field: keyof CatUpdatePayload, fallback: string | number | null) => <input value={(documento[field as keyof CatDetalhe] as string | number | null | undefined) ?? ""} onChange={(event) => onFieldChange(field, event.target.value)} className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-100" placeholder={fallback == null ? "—" : String(fallback)} />;
  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">01 · Identificação e escopo</p><h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">Resumo do {tipoDocumento}</h3></div><div className="flex items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{documento.numero_cat || "Documento sem número"}</span>{(documento.arquivo_pdf || documento.caminho_pdf) && <a href={getCatPdfUrl(documento.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100">Abrir PDF</a>}</div></div><div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4"><Field label="Apelido / obra" icon={<FileBadge size={13} />} value={editing ? edit("apelido", documento.apelido) : documento.apelido} /><Field label="Contratante" icon={<Building2 size={13} />} value={editing ? edit("contratante", documento.contratante) : documento.contratante} /><Field label="Local da obra" icon={<MapPin size={13} />} value={[documento.cidade, documento.estado].filter(Boolean).join(" / ")} /><Field label="Período" icon={<CalendarRange size={13} />} value={`${formatDate(documento.data_inicio)} — ${formatDate(documento.data_fim)}`} /><Field label="Objeto" value={editing ? edit("objeto", documento.objeto) : <span className="line-clamp-3 font-medium">{documento.objeto || "Não informado"}</span>} /><Field label="Contrato / processo" value={[documento.contrato, documento.processo_administrativo].filter(Boolean).join(" · ")} /><Field label="Área executada" icon={<Ruler size={13} />} value={documento.area_m2 != null ? `${formatNumber(documento.area_m2)} m²` : "—"} /><Field label="Valor do contrato" icon={<WalletCards size={13} />} value={formatCurrency(documento.valor_contrato)} /></div></section>;
}
