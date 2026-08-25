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
    <header className="document-header">
      <div className="document-header__inner">
        <div className="document-header__identity">
          <span className="document-header__icon"><FileText size={19} /></span>
          <div className="document-header__copy">
            <div className="document-header__labels"><span className="document-header__type">{tipoDocumento}</span><span className="document-header__number">{numeroDocumento}</span>{level === "service" && <span className="document-header__service">{serviceLabel}</span>}</div>
            <h2>{tituloObra}</h2>
            <div className="document-header__meta"><span>{contratante}</span><span><MapPin size={12} />{localidade}</span><span>{periodo}</span></div>
          </div>
        </div>
        <div className="document-header__actions"><button type="button" onClick={onToggleEdit} disabled={!canEdit || saving} className="button button--header">{editing ? <X size={15} /> : <Edit3 size={15} />}{editing ? "Cancelar" : "Editar"}</button>{editing && <button type="button" onClick={onSave} disabled={saving} className="button button--header button--header-save"><Save size={15} />{saving ? "Salvando" : "Salvar"}</button>}<button type="button" onClick={onClose} className="button button--header-close" aria-label="Fechar"><X size={18} /></button></div>
      </div>
    </header>
  );
}
