"use client";

import { Fragment } from "react";
import { FolderTree, PencilLine } from "lucide-react";
import { ServicoDetalhe } from "@/lib/api";
import SelectionToggleButton from "@/components/selection/selection-toggle-button";
import { selectedItemFromContext } from "@/lib/selection-basket/types";
import { ServicoContext } from "./types";
import { formatNumber } from "./formatters";

interface Props {
  servicos: ServicoDetalhe[];
  editing: boolean;
  onServicoChange: (index: number, field: keyof ServicoDetalhe, value: string | number | null) => void;
  documentMeta: { cat_id: number; apelido: string | null; numero_cat: string | null };
  highlightServico?: ServicoContext;
  onSelectServico: (servico: ServicoContext) => void;
  sectionNumber: string;
}

export default function DocumentServicesTable({ servicos, editing, onServicoChange, documentMeta, highlightServico, onSelectServico, sectionNumber }: Props) {
  const groups = servicos.reduce<{ group: string; items: { item: ServicoDetalhe; index: number }[] }[]>((result, item, index) => {
    const group = item.grupo?.trim() || "Sem grupo informado";
    const current = result.find((entry) => entry.group === group);
    if (current) current.items.push({ item, index });
    else result.push({ group, items: [{ item, index }] });
    return result;
  }, []);

  return <section className="document-services"><div className="document-services__header"><div><p className="document-card__eyebrow">{sectionNumber} · Composição técnica</p><h3>Serviços por grupo</h3></div><span className="document-services__count">{servicos.length} itens · {groups.length} grupos</span></div><div className="document-services__scroll"><table className="document-services__table"><thead><tr><th>+</th><th>Código</th><th>Descrição do serviço</th><th>Un.</th><th>Qtd.</th><th>Origem</th></tr></thead><tbody>{groups.map((group) => <Fragment key={`group-${group.group}`}><tr className="document-services__group"><td colSpan={6}><span><FolderTree size={15} />{group.group}</span><small>{group.items.length} itens</small></td></tr>{group.items.map(({ item: servico, index }) => { const context: ServicoContext = { id: null, grupo: servico.grupo, codigo: servico.codigo, descricao: servico.descricao, unidade: servico.unidade, quantidade: servico.quantidade, pagina_pdf: servico.pagina_pdf, ordem_na_pagina: servico.ordem_na_pagina }; const highlighted = Boolean(highlightServico && highlightServico.descricao === context.descricao && highlightServico.pagina_pdf === context.pagina_pdf); return <tr key={`${servico.codigo || "sem-codigo"}-${servico.pagina_pdf || "sem-pagina"}-${index}`} onClick={() => !editing && onSelectServico(context)} className={highlighted ? "is-highlighted" : ""}><td onClick={(event) => event.stopPropagation()}><SelectionToggleButton item={selectedItemFromContext(context, documentMeta)} /></td><td className="document-services__code">{editing ? <input value={servico.codigo || ""} onChange={(event) => onServicoChange(index, "codigo", event.target.value)} className="modal-control" /> : servico.codigo || "—"}</td><td className="document-services__description">{editing ? <input value={servico.descricao || ""} onChange={(event) => onServicoChange(index, "descricao", event.target.value)} className="modal-control" /> : servico.descricao || "—"}</td><td className="document-services__unit">{servico.unidade || "—"}</td><td className="document-services__quantity">{editing ? <input type="number" value={servico.quantidade ?? ""} onChange={(event) => onServicoChange(index, "quantidade", event.target.value ? Number(event.target.value) : null)} className="modal-control" /> : formatNumber(servico.quantidade)}</td><td className="document-services__origin">{servico.pagina_pdf ? `Pág. ${servico.pagina_pdf}` : "Sem página"}{servico.ordem_na_pagina ? ` · item ${servico.ordem_na_pagina}` : ""}{highlighted && <span className="document-services__highlight"><PencilLine size={11} /> selecionado</span>}</td></tr>; })}</Fragment>)}</tbody></table></div>{servicos.length === 0 && <div className="document-services__empty">Nenhum serviço registrado nesta CAT.</div>}<div className="document-services__footer">Cada grupo aparece como um subtópico. Clique no serviço para conferir o contexto ou use <strong>+</strong> para adicioná-lo à seleção.</div></section>;
}
