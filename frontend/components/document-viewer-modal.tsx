"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  Cat,
  CatDetalhe,
  CatUpdatePayload,
  fetchCatById,
  Servico,
  ServicoDetalhe,
  updateCatById,
} from "@/lib/api";
import { formatDate } from "./cat-viewer/formatters";
import DocumentHeader from "./cat-viewer/document-header";
import DocumentSummary from "./cat-viewer/document-summary";
import DocumentServicesTable from "./cat-viewer/document-services-table";
import ServiceContextView from "./cat-viewer/service-context-view";
import { DocumentViewLevel, ServicoContext, servicoFromRow } from "./cat-viewer/types";

export type DocumentViewerSource =
  | { mode: "servico"; servico: Servico }
  | {
      mode: "cat";
      cat: Pick<Cat, "id" | "numero_cat" | "apelido" | "contratante" | "data_inicio" | "data_fim">;
    };

interface DocumentViewerModalProps {
  source: DocumentViewerSource;
  onClose: () => void;
}

function toEditablePayload(documento: CatDetalhe): CatUpdatePayload {
  return {
    tipo_documento: documento.tipo_documento,
    numero_cat: documento.numero_cat,
    numero_art: documento.numero_art,
    profissional: documento.profissional,
    registro_crea: documento.registro_crea,
    empresa_contratada: documento.empresa_contratada,
    contratante: documento.contratante,
    cnpj_contratante: documento.cnpj_contratante,
    objeto: documento.objeto,
    processo_administrativo: documento.processo_administrativo,
    contrato: documento.contrato,
    endereco_obra: documento.endereco_obra,
    cidade: documento.cidade,
    estado: documento.estado,
    data_inicio: documento.data_inicio,
    data_fim: documento.data_fim,
    area_m2: documento.area_m2,
    valor_contrato: documento.valor_contrato,
    apelido: documento.apelido,
    arquivo_pdf: documento.arquivo_pdf ?? null,
    caminho_pdf: documento.caminho_pdf ?? null,
    desmaterializado: documento.desmaterializado ?? true,
    autenticado: documento.autenticado ?? true,
    servicos: documento.servicos.map((servico) => ({ ...servico })),
  };
}

export default function DocumentViewerModal({ source, onClose }: DocumentViewerModalProps) {
  const [documento, setDocumento] = useState<CatDetalhe | null>(null);
  const [editable, setEditable] = useState<CatUpdatePayload | null>(null);
  const [loading, setLoading] = useState(Boolean(source));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<DocumentViewLevel>("document");
  const [selectedServico, setSelectedServico] = useState<ServicoContext | null>(null);

  const originServico = source.mode === "servico" ? source.servico : null;
  const originCat = source.mode === "cat" ? source.cat : null;
  const originContext = originServico ? servicoFromRow(originServico) : undefined;
  const catId = originServico?.cat_id ?? originCat?.id ?? null;

  useEffect(() => {
    let active = true;
    if (!catId) return () => {
      active = false;
    };

    fetchCatById(catId)
      .then((data) => {
        if (!active) return;
        setDocumento(data);
        setEditable(toEditablePayload(data));
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setDocumento(null);
        setEditable(null);
        setError("Não foi possível carregar o documento. Verifique se o backend está rodando.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [catId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) {
        setEditing(false);
        if (documento) setEditable(toEditablePayload(documento));
        return;
      }
      if (level === "service") {
        setLevel("document");
        setSelectedServico(null);
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [documento, editing, level, onClose]);

  const currentDoc = useMemo(() => {
    if (!documento) return null;
    if (!editing || !editable) return documento;
    return {
      ...documento,
      ...editable,
      tipo_documento: editable.tipo_documento,
      numero_cat: editable.numero_cat,
      numero_art: editable.numero_art,
      profissional: editable.profissional,
      registro_crea: editable.registro_crea,
      empresa_contratada: editable.empresa_contratada,
      contratante: editable.contratante,
      cnpj_contratante: editable.cnpj_contratante,
      objeto: editable.objeto,
      processo_administrativo: editable.processo_administrativo,
      contrato: editable.contrato,
      endereco_obra: editable.endereco_obra,
      cidade: editable.cidade,
      estado: editable.estado,
      data_inicio: editable.data_inicio,
      data_fim: editable.data_fim,
      area_m2: editable.area_m2,
      valor_contrato: editable.valor_contrato,
      apelido: editable.apelido,
      arquivo_pdf: editable.arquivo_pdf,
      caminho_pdf: editable.caminho_pdf,
      desmaterializado: editable.desmaterializado,
      autenticado: editable.autenticado,
      servicos: editable.servicos,
    } as CatDetalhe;
  }, [documento, editable, editing]);

  const tipoDocumento = currentDoc?.tipo_documento || "CAT";
  const tituloObra = currentDoc?.apelido || originServico?.apelido || originCat?.apelido || "Documento sem identificação";
  const numeroDocumento = currentDoc?.numero_cat || originServico?.numero_cat || originCat?.numero_cat || "—";
  const contratante = currentDoc?.contratante || originServico?.contratante || originCat?.contratante || "—";
  const localidade = [currentDoc?.cidade, currentDoc?.estado].filter(Boolean).join(" / ") || "—";
  const periodo =
    currentDoc?.data_inicio || currentDoc?.data_fim
      ? `${formatDate(currentDoc?.data_inicio)} — ${formatDate(currentDoc?.data_fim)}`
      : originServico?.data_inicio || originServico?.data_fim
        ? `${formatDate(originServico.data_inicio)} — ${formatDate(originServico.data_fim)}`
        : originCat?.data_inicio || originCat?.data_fim
          ? `${formatDate(originCat.data_inicio)} — ${formatDate(originCat.data_fim)}`
          : "—";

  const effectiveError = !catId ? "Não foi possível identificar a CAT selecionada." : error;

  const serviceLabel =
    selectedServico?.pagina_pdf != null
      ? `Pág. ${selectedServico.pagina_pdf}${
          selectedServico.ordem_na_pagina != null ? ` · Item ${selectedServico.ordem_na_pagina}` : ""
        }`
      : "Serviço";

  const updateField = (field: keyof CatUpdatePayload, value: string | number | boolean | null) => {
    setEditable((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateServico = (index: number, field: keyof ServicoDetalhe, value: string | number | null) => {
    setEditable((current) => {
      if (!current) return current;
      const servicos = [...current.servicos];
      servicos[index] = { ...servicos[index], [field]: value };
      return { ...current, servicos };
    });
  };

  const saveChanges = async () => {
    if (!catId || !editable) return;
    setSaving(true);
    try {
      const saved = await updateCatById(catId, editable);
      setDocumento(saved);
      setEditable(toEditablePayload(saved));
      setEditing(false);
      setError(null);
    } catch {
      setError("Não foi possível salvar as alterações da CAT.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cat-viewer-overlay fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true" aria-labelledby="document-viewer-title">
      <button type="button" className="absolute inset-0 bg-slate-900/65 backdrop-blur-[3px]" onClick={onClose} aria-label="Fechar visualização do documento" />

      <div className="cat-viewer-shell relative flex flex-col w-full max-w-[min(96vw,1440px)] h-[min(94vh,920px)] overflow-hidden">
        <DocumentHeader
          tipoDocumento={tipoDocumento}
          numeroDocumento={numeroDocumento}
          tituloObra={loading ? originServico?.apelido || originCat?.apelido || "Carregando..." : tituloObra}
          contratante={contratante}
          localidade={localidade}
          periodo={periodo}
          level={level}
          serviceLabel={serviceLabel}
          onClose={onClose}
          editing={editing}
          saving={saving}
          onToggleEdit={() => {
            if (editing && documento) {
              setEditable(toEditablePayload(documento));
            }
            setEditing((current) => !current);
          }}
          onSave={saveChanges}
          canEdit={source.mode === "cat" && level === "document" && !!currentDoc}
        />

        <div className="flex-1 flex flex-col min-h-0 bg-slate-100">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 p-10 bg-white">
              <Loader2 size={36} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium">Carregando documento...</p>
            </div>
          )}

          {effectiveError && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10 bg-white text-center">
              <AlertCircle size={40} className="text-red-400" />
              <p className="text-sm text-slate-700 max-w-sm">{effectiveError}</p>
            </div>
          )}

          {currentDoc && !loading && level === "document" && (
            <div className="flex-1 overflow-y-auto cat-viewer-document bg-white">
              <div className="p-4 sm:p-5 space-y-4">
                <DocumentSummary
                  documento={currentDoc}
                  tipoDocumento={tipoDocumento}
                  editing={editing}
                  onFieldChange={updateField}
                />
                <DocumentServicesTable
                  servicos={currentDoc.servicos}
                  editing={editing}
                  onServicoChange={updateServico}
                  documentMeta={{ cat_id: currentDoc.id, apelido: currentDoc.apelido, numero_cat: currentDoc.numero_cat }}
                  highlightServico={originContext}
                  onSelectServico={(servico) => {
                    if (editing) return;
                    setSelectedServico(servico);
                    setLevel("service");
                  }}
                  sectionNumber="04"
                />
              </div>
            </div>
          )}

          {currentDoc && !loading && level === "service" && selectedServico && (
            <ServiceContextView
              servico={selectedServico}
              numeroDocumento={numeroDocumento}
              tipoDocumento={tipoDocumento}
              catId={currentDoc.id}
              apelido={currentDoc.apelido}
              onBack={() => {
                setLevel("document");
                setSelectedServico(null);
              }}
            />
          )}
        </div>

        {currentDoc && !loading && (
          <footer className="shrink-0 px-4 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <span id="document-viewer-title" className="sr-only">{tituloObra}</span>
            <span>
              {editing
                ? "Modo edição — altere os campos e clique em salvar"
                : level === "document"
                  ? "Nível 1 — Ficha do documento · clique em um serviço para visualizar"
                  : "Nível 2 — Contexto do serviço · ESC para voltar"}
            </span>
            <span className="font-mono">{tipoDocumento} {numeroDocumento}</span>
          </footer>
        )}
      </div>
    </div>
  );
}
