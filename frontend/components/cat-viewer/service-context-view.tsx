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
  return <div className="service-context"><button type="button" onClick={onBack} className="button button--secondary service-context__back"><ArrowLeft size={15} />Voltar para a ficha</button><div className="service-context__inner"><div className="service-context__intro"><span className="service-context__icon"><FileSearch size={21} /></span><div><p className="document-card__eyebrow">Contexto do serviço</p><h3>{servico.descricao || "Serviço sem descrição"}</h3><p>{apelido || "Obra sem apelido"} · {tipoDocumento} {numeroDocumento}</p></div></div><div className="service-context__grid"><div className="service-context__panel"><div className="service-context__label"><Layers3 size={15} />Grupo</div><p className="service-context__value">{servico.grupo || "—"}</p><div className="service-context__label"><Hash size={15} />Código</div><p className="service-context__code">{servico.codigo || "—"}</p></div><div className="service-context__panel"><div className="service-context__label"><Ruler size={15} />Quantitativo</div><p className="service-context__quantity">{formatNumber(servico.quantidade)} <span>{servico.unidade || ""}</span></p><div className="service-context__label"><ScanLine size={15} />Origem no documento</div><p className="service-context__origin">{servico.pagina_pdf ? `Página ${servico.pagina_pdf}` : "Página não informada"}{servico.ordem_na_pagina ? ` · item ${servico.ordem_na_pagina}` : ""}</p></div></div><div className="service-context__note"><strong>Como usar:</strong> este é o item que motivou a abertura da CAT. Confira o quantitativo, a unidade e a página de origem para validar a evidência antes de adicioná-la ao acervo da licitação.</div></div></div>;
}
