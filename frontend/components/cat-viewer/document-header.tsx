"use client";

import { Edit3, FileText, MapPin, Save, X } from "lucide-react";
import { DocumentViewLevel } from "./types";

interface Props {
  tipoDocumento: string;
  numeroDocumento: string;
  tituloObra: string;
  contratante: string;
  localidade: string;
  periodo: string;
  level: DocumentViewLevel;
  serviceLabel: string;
  onClose: () => void;
  editing: boolean;
  saving: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  canEdit: boolean;
}

export default function DocumentHeader({ tipoDocumento, numeroDocumento, tituloObra, contratante, localidade, periodo, level, serviceLabel, onClose, editing, saving, onToggleEdit, onSave, canEdit }: Props) {
  return (
    <header className="shrink-0 bg-slate-950 px-5 py-4 text-white sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-200"><FileText size={20} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">{tipoDocumento}</span><span className="font-mono text-xs text-slate-300">{numeroDocumento}</span>{level === "service" && <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold text-slate-300">{serviceLabel}</span>}</div><h2 className="mt-2 truncate text-lg font-black tracking-tight sm:text-xl">{tituloObra}</h2><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300"><span>{contratante}</span><span className="inline-flex items-center gap-1"><MapPin size={12} />{localidade}</span><span>{periodo}</span></div></div></div>
        <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={onToggleEdit} disabled={!canEdit || saving} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{editing ? <X size={15} /> : <Edit3 size={15} />}{editing ? "Cancelar" : "Editar"}</button>{editing && <button type="button" onClick={onSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-400 disabled:opacity-50"><Save size={15} />{saving ? "Salvando" : "Salvar"}</button>}<button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={19} /></button></div>
      </div>

    </header>
  );
}
