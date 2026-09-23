"use client";

import { Fragment, useMemo, useState, type DragEvent } from "react";
import { Check, GripVertical, FolderTree, PencilLine, X } from "lucide-react";
import { ServicoDetalhe } from "@/lib/api";
import SelectionToggleButton from "@/components/selection/selection-toggle-button";
import { selectedItemFromContext } from "@/lib/selection-basket/types";
import { ServicoContext } from "./types";
import { formatNumber } from "./formatters";

interface Props {
  servicos: ServicoDetalhe[];
  editing: boolean;
  onServicoChange: (index: number, field: keyof ServicoDetalhe, value: string | number | null) => void;
  onServicoMove: (from: number, to: number, grupo?: string) => void;
  onGrupoMove: (from: number, to: number) => void;
  onGrupoRename: (grupo: string, novoNome: string) => void;
  documentMeta: { cat_id: number; apelido: string | null; numero_cat: string | null };
  highlightServico?: ServicoContext;
  onSelectServico: (servico: ServicoContext) => void;
  sectionNumber: string;
}

type Group = { group: string; items: { item: ServicoDetalhe; index: number }[] };
type DragPayload = { type: "service" | "group"; index: number; groupIndex?: number };

export default function DocumentServicesTable({
  servicos,
  editing,
  onServicoChange,
  onServicoMove,
  onGrupoMove,
  onGrupoRename,
  documentMeta,
  highlightServico,
  onSelectServico,
  sectionNumber,
}: Props) {
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState("");

  const groups = useMemo(() => servicos.reduce<Group[]>((result, item, index) => {
    const group = item.grupo?.trim() || "Sem grupo informado";
    const current = result.find((entry) => entry.group === group);
    if (current) current.items.push({ item, index });
    else result.push({ group, items: [{ item, index }] });
    return result;
  }, []), [servicos]);

  const startDrag = (event: DragEvent, payload: DragPayload) => {
    if (!editing) return;
    setDragging(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };

  const readDrag = (event: DragEvent) => {
    if (dragging) return dragging;
    try { return JSON.parse(event.dataTransfer.getData("text/plain")) as DragPayload; } catch { return null; }
  };

  const dropService = (event: DragEvent, targetIndex: number, targetGroup: string) => {
    event.preventDefault();
    const payload = readDrag(event);
    if (!payload || payload.type !== "service") return;
    const adjustedTarget = payload.index < targetIndex ? targetIndex - 1 : targetIndex;
    onServicoMove(payload.index, Math.max(0, adjustedTarget), targetGroup === "Sem grupo informado" ? "" : targetGroup);
    setDragging(null);
  };

  const dropGroup = (event: DragEvent, targetGroupIndex: number) => {
    event.preventDefault();
    const payload = readDrag(event);
    if (!payload) return;
    if (payload.type === "service") {
      const target = groups[targetGroupIndex];
      const firstTargetIndex = target.items[0]?.index ?? servicos.length;
      onServicoMove(payload.index, payload.index < firstTargetIndex ? firstTargetIndex - 1 : firstTargetIndex, target.group === "Sem grupo informado" ? "" : target.group);
      setDragging(null);
      return;
    }
    if (payload.type === "group" && payload.groupIndex !== undefined && payload.groupIndex !== targetGroupIndex) {
      onGrupoMove(payload.groupIndex, targetGroupIndex);
    }
    setDragging(null);
  };

  const beginGroupEdit = (group: string) => {
    setEditingGroup(group);
    setGroupDraft(group === "Sem grupo informado" ? "" : group);
  };

  const saveGroupEdit = (group: string) => {
    const next = groupDraft.trim();
    onGrupoRename(group, next || "Sem grupo informado");
    setEditingGroup(null);
  };

  return (
    <section className="document-services">
      <div className="document-services__header">
        <div><p className="document-card__eyebrow">{sectionNumber} · Composição técnica</p><h3>Serviços por grupo</h3></div>
        <span className="document-services__count">{servicos.length} itens · {groups.length} grupos</span>
      </div>
      {editing && <div className="document-services__edit-hint"><GripVertical size={15} /> Arraste um serviço para outro grupo ou reordene os grupos pela alça. O nome do grupo pode ser editado diretamente.</div>}
      <div className="document-services__scroll">
        <table className="document-services__table">
          <thead><tr><th>+</th><th className="document-services__drag-column">Mover</th><th>Código</th><th>Descrição do serviço</th><th>Un.</th><th>Qtd.</th><th>Origem</th></tr></thead>
          <tbody>
            {groups.map((group, groupIndex) => <Fragment key={`group-${group.group}`}>
              <tr
                className={`document-services__group ${dragging?.type === "group" && dragging.groupIndex === groupIndex ? "is-dragging" : ""}`}
                onDragOver={(event) => editing && event.preventDefault()}
                onDrop={(event) => dropGroup(event, groupIndex)}
              >
                <td colSpan={7}>
                  <div className="document-services__group-inner">
                    {editing && <span className="document-services__drag-handle" draggable onDragStart={(event) => startDrag(event, { type: "group", index: 0, groupIndex })} onDragEnd={() => setDragging(null)} title="Arrastar grupo" aria-label="Arrastar grupo"><GripVertical size={16} /></span>}
                    <span className="document-services__group-title"><FolderTree size={15} />
                      {editingGroup === group.group ? <input autoFocus value={groupDraft} onChange={(event) => setGroupDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveGroupEdit(group.group); if (event.key === "Escape") setEditingGroup(null); }} onClick={(event) => event.stopPropagation()} className="modal-control document-services__group-input" aria-label="Nome do grupo" /> : group.group}
                    </span>
                    {editing && (editingGroup === group.group ? <span className="document-services__group-actions"><button type="button" className="icon-button icon-button--small" onClick={() => saveGroupEdit(group.group)} aria-label="Salvar nome"><Check size={14} /></button><button type="button" className="icon-button icon-button--small" onClick={() => setEditingGroup(null)} aria-label="Cancelar nome"><X size={14} /></button></span> : <button type="button" className="document-services__rename" onClick={() => beginGroupEdit(group.group)}><PencilLine size={12} /> Editar nome</button>)}
                    <small>{group.items.length} itens</small>
                  </div>
                </td>
              </tr>
              {group.items.map(({ item: servico, index }) => {
                const context: ServicoContext = { id: null, grupo: servico.grupo, codigo: servico.codigo, descricao: servico.descricao, unidade: servico.unidade, quantidade: servico.quantidade, pagina_pdf: servico.pagina_pdf, ordem_na_pagina: servico.ordem_na_pagina };
                const highlighted = Boolean(highlightServico && highlightServico.descricao === context.descricao && highlightServico.pagina_pdf === context.pagina_pdf);
                return <tr key={`${servico.codigo || "sem-codigo"}-${servico.pagina_pdf || "sem-pagina"}-${index}`} onClick={() => !editing && onSelectServico(context)} className={`${highlighted ? "is-highlighted" : ""} ${dragging?.type === "service" && dragging.index === index ? "is-dragging" : ""}`} onDragOver={(event) => editing && event.preventDefault()} onDrop={(event) => dropService(event, index, group.group)}>
                  <td onClick={(event) => event.stopPropagation()}><SelectionToggleButton item={selectedItemFromContext(context, documentMeta)} /></td>
                  <td className="document-services__drag-column">{editing && <span className="document-services__drag-handle" draggable onDragStart={(event) => startDrag(event, { type: "service", index })} onDragEnd={() => setDragging(null)} title="Arrastar serviço" aria-label="Arrastar serviço"><GripVertical size={16} /></span>}</td>
                  <td className="document-services__code">{editing ? <input value={servico.codigo || ""} onChange={(event) => onServicoChange(index, "codigo", event.target.value)} className="modal-control" /> : servico.codigo || "—"}</td>
                  <td className="document-services__description">{editing ? <input value={servico.descricao || ""} onChange={(event) => onServicoChange(index, "descricao", event.target.value)} className="modal-control" /> : servico.descricao || "—"}</td>
                  <td className="document-services__unit">{servico.unidade || "—"}</td>
                  <td className="document-services__quantity">{editing ? <input type="number" value={servico.quantidade ?? ""} onChange={(event) => onServicoChange(index, "quantidade", event.target.value ? Number(event.target.value) : null)} className="modal-control" /> : formatNumber(servico.quantidade)}</td>
                  <td className="document-services__origin">{servico.pagina_pdf ? `Pág. ${servico.pagina_pdf}` : "Sem página"}{servico.ordem_na_pagina ? ` · item ${servico.ordem_na_pagina}` : ""}{highlighted && <span className="document-services__highlight"><PencilLine size={11} /> selecionado</span>}</td>
                </tr>;
              })}
            </Fragment>)}
          </tbody>
        </table>
      </div>
      {servicos.length === 0 && <div className="document-services__empty">Nenhum serviço registrado nesta CAT.</div>}
      <div className="document-services__footer">Cada grupo aparece como um subtópico. Clique no serviço para conferir o contexto ou use <strong>+</strong> para adicioná-lo à seleção.</div>
    </section>
  );
}
