"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileInput, FileJson, Loader2, RefreshCw, Send, UploadCloud, XCircle } from "lucide-react";
import {
  approveIngestionJob,
  createIngestionJob,
  fetchIngestionJob,
  fetchIngestionJobs,
  IngestionDraft,
  IngestionJob,
  IngestionLogEntry,
  retryIngestionJob,
  syncCatsJson,
} from "@/lib/api";
import SelectionBasketShell from "@/components/selection/selection-basket-shell";

const CAT_FIELDS: Array<{ key: string; label: string; placeholder?: string; type?: "date" | "number" }> = [
  { key: "numero_cat", label: "Número da CAT", placeholder: "Identificador do documento" },
  { key: "numero_art", label: "ART", placeholder: "Número da ART" },
  { key: "profissional", label: "Profissional" },
  { key: "registro_crea", label: "Registro CREA" },
  { key: "empresa_contratada", label: "Empresa contratada" },
  { key: "contratante", label: "Contratante" },
  { key: "cnpj_contratante", label: "CNPJ do contratante" },
  { key: "processo_administrativo", label: "Processo administrativo" },
  { key: "contrato", label: "Contrato" },
  { key: "endereco_obra", label: "Endereço da obra" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "data_inicio", label: "Início da obra", type: "date" },
  { key: "data_fim", label: "Fim da obra", type: "date" },
  { key: "area_m2", label: "Área executada", type: "number" },
  { key: "valor_contrato", label: "Valor do contrato", type: "number" },
];

function statusLabel(status: IngestionJob["status"]) {
  return { queued: "Na fila", processing: "Processando", ready: "Pronto para revisão", failed: "Falhou", approved: "Aprovado" }[status];
}

function statusIcon(status: IngestionJob["status"]) {
  if (status === "processing" || status === "queued") return <Loader2 size={15} className="spin" />;
  if (status === "ready") return <FileJson size={15} />;
  if (status === "approved") return <CheckCircle2 size={15} />;
  return <AlertCircle size={15} />;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function LogList({ logs }: { logs: IngestionLogEntry[] }) {
  return <div className="ingestion-logs">{logs.length ? logs.map((entry, index) => <div key={`${entry.timestamp}-${index}`} className={`ingestion-log ingestion-log--${entry.level}`}><span className="ingestion-log__time">{formatTime(entry.timestamp)}</span><span className="ingestion-log__level">{entry.level}</span><p>{entry.message}</p></div>) : <div className="ingestion-empty-log">Os eventos desta ingestão aparecerão aqui.</div>}</div>;
}

function DraftEditor({ draft, onChange }: { draft: IngestionDraft; onChange: (draft: IngestionDraft) => void }) {
  const updateCat = (key: string, value: string | number | null) => onChange({ ...draft, cat: { ...draft.cat, [key]: value } });
  const updateService = (index: number, key: string, value: string | number | null) => {
    const servicos = [...draft.servicos];
    servicos[index] = { ...servicos[index], [key]: value };
    onChange({ ...draft, servicos });
  };
  const removeService = (index: number) => onChange({ ...draft, servicos: draft.servicos.filter((_, currentIndex) => currentIndex !== index) });

  return <div className="ingestion-review"><div className="ingestion-review__header"><div><span className="page-hero__eyebrow"><FileJson size={14} /> Revisão antes do banco</span><h2>Confira e ajuste a CAT extraída.</h2><p>O rascunho ainda não foi persistido. Só será criado ou atualizado no PostgreSQL depois da aprovação.</p></div><span className="ingestion-review__draft-tag">Rascunho editável</span></div><section className="ingestion-form-card"><div className="ingestion-form-card__title"><div><span>Identificação e metadados</span><h3>Dados da CAT</h3></div><span className="ingestion-form-card__count">{draft.servicos.length} serviços</span></div><div className="ingestion-form-grid"><label className="ingestion-field ingestion-field--wide"><span>Apelido / obra</span><input className="control" value={draft.apelido || ""} onChange={(event) => onChange({ ...draft, apelido: event.target.value })} placeholder="Nome interno da obra" /></label>{CAT_FIELDS.map((field) => <label key={field.key} className={`ingestion-field${field.key === "objeto" ? " ingestion-field--wide" : ""}`}><span>{field.label}</span><input className="control" type={field.type || "text"} value={draft.cat[field.key] == null ? "" : String(draft.cat[field.key])} onChange={(event) => updateCat(field.key, field.type === "number" ? (event.target.value ? Number(event.target.value) : null) : event.target.value)} placeholder={field.placeholder} /></label>)}<label className="ingestion-field ingestion-field--wide"><span>Objeto da obra</span><textarea className="control control--textarea" value={draft.cat.objeto == null ? "" : String(draft.cat.objeto)} onChange={(event) => updateCat("objeto", event.target.value)} rows={3} placeholder="Descrição do objeto" /></label><div className="ingestion-flags ingestion-field--wide"><label><input type="checkbox" checked={draft.desmaterializado !== false} onChange={(event) => onChange({ ...draft, desmaterializado: event.target.checked })} /> Desmaterializado</label><label><input type="checkbox" checked={draft.autenticado !== false} onChange={(event) => onChange({ ...draft, autenticado: event.target.checked })} /> Autenticado</label><label><input type="checkbox" checked={draft.cao !== false} onChange={(event) => onChange({ ...draft, cao: event.target.checked })} /> CAO</label></div></div></section><section className="ingestion-form-card"><div className="ingestion-form-card__title"><div><span>Composição técnica</span><h3>Serviços extraídos</h3></div><span className="ingestion-form-card__count">Auditáveis por linha</span></div><div className="ingestion-services"><div className="ingestion-services__head"><span>Grupo</span><span>Código</span><span>Descrição</span><span>Un.</span><span>Qtd.</span><span>Pág.</span><span /></div>{draft.servicos.map((service, index) => <div className="ingestion-service-row" key={`${index}-${service.codigo || "service"}`}><input className="control" value={service.grupo || ""} onChange={(event) => updateService(index, "grupo", event.target.value)} placeholder="Grupo" /><input className="control" value={service.codigo || ""} onChange={(event) => updateService(index, "codigo", event.target.value)} placeholder="Código" /><input className="control" value={service.descricao || ""} onChange={(event) => updateService(index, "descricao", event.target.value)} placeholder="Descrição literal" /><input className="control" value={service.unidade || ""} onChange={(event) => updateService(index, "unidade", event.target.value)} placeholder="Un." /><input className="control" type="number" value={service.quantidade ?? ""} onChange={(event) => updateService(index, "quantidade", event.target.value ? Number(event.target.value) : null)} placeholder="Qtd." /><input className="control" type="number" value={service.pagina_pdf ?? ""} onChange={(event) => updateService(index, "pagina_pdf", event.target.value ? Number(event.target.value) : null)} placeholder="Pág." /><button type="button" className="icon-button" onClick={() => removeService(index)} title="Remover serviço" aria-label="Remover serviço"><XCircle size={16} /></button></div>)}{draft.servicos.length === 0 && <div className="ingestion-empty-services">Nenhum serviço no rascunho. Você pode aprovar para auditar a CAT vazia ou corrigir a extração antes de continuar.</div>}</div></section></div>;
}

function Content() {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [draft, setDraft] = useState<IngestionDraft | null>(null);
  const [uploading, setUploading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshJobs = useCallback(async () => {
    try { setJobs(await fetchIngestionJobs()); setError(""); } catch { setError("Não foi possível carregar o histórico de ingestões."); }
  }, []);

  const refreshSelected = useCallback(async () => {
    if (!selectedId) return;
    try { const job = await fetchIngestionJob(selectedId); setSelectedJob(job); if (job.draft_json) setDraft((current) => current || job.draft_json); } catch { setError("Não foi possível atualizar o job selecionado."); }
  }, [selectedId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshJobs(), 0);
    return () => window.clearTimeout(initial);
  }, [refreshJobs]);
  useEffect(() => {
    if (!selectedId) return undefined;
    const initial = window.setTimeout(() => void refreshSelected(), 0);
    const timer = window.setInterval(() => void refreshSelected(), 1600);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [selectedId, refreshSelected]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true); setError(""); setNotice("");
    try { const job = await createIngestionJob(file); setSelectedId(job.id); setSelectedJob(job); setDraft(null); await refreshJobs(); } catch (uploadError) { setError(String(uploadError instanceof Error ? uploadError.message : "Não foi possível iniciar a ingestão.")); } finally { setUploading(false); }
  };

  const selectJob = (job: IngestionJob) => { setSelectedId(job.id); setSelectedJob(job); setDraft(job.draft_json); };
  const retry = async () => { if (!selectedJob) return; try { const job = await retryIngestionJob(selectedJob.id); setSelectedJob(job); setDraft(null); await refreshJobs(); } catch { setError("Não foi possível reenfileirar o job."); } };
  const approve = async () => { if (!selectedJob || !draft) return; setApproving(true); setError(""); setNotice(""); try { const job = await approveIngestionJob(selectedJob.id, draft); setSelectedJob(job); setDraft(job.draft_json); await refreshJobs(); } catch { setError("Não foi possível aprovar a CAT. Revise o número da CAT e os campos obrigatórios."); } finally { setApproving(false); } };
  const syncBackups = async () => { setSyncing(true); setError(""); setNotice(""); try { const result = await syncCatsJson(); setNotice(`${result.sincronizadas} CATs sincronizadas em outputs_json.`); } catch { setError("Não foi possível sincronizar os snapshots JSON."); } finally { setSyncing(false); } };
  const currentStatus = selectedJob?.status;
  const canEdit = currentStatus === "ready" && !!draft;
  const progressText = useMemo(() => currentStatus === "processing" ? "O Gemini está analisando o PDF e gerando o JSON estruturado." : currentStatus === "queued" ? "O arquivo foi recebido e aguarda o processamento." : currentStatus === "ready" ? "Revise os dados abaixo antes de enviar ao PostgreSQL." : currentStatus === "approved" ? "A CAT foi persistida e o snapshot JSON foi atualizado." : currentStatus === "failed" ? "O job falhou. Veja os logs e tente novamente." : "Selecione uma ingestão ou envie um novo PDF.", [currentStatus]);

  return <main className="page ingestion-page"><section className="page-hero"><div className="page-hero__copy"><span className="page-hero__eyebrow"><FileInput size={14} /> Pipeline auditável</span><h1>Ingestão sob seu controle.</h1><p>Envie um PDF, acompanhe o processamento com logs e revise cada campo antes de criar ou atualizar a CAT no PostgreSQL.</p></div><div className="page-hero__metric"><span>Jobs registrados</span><strong>{jobs.length.toLocaleString("pt-BR")}</strong></div></section><section className="ingestion-toolbar surface"><div><span className="filters__title"><UploadCloud size={16} /> Novo processamento</span><p className="surface__hint">O PDF original é salvo no backend e o JSON aprovado é sincronizado em <code>outputs_json</code>.</p></div><div className="ingestion-toolbar__actions"><button type="button" className="button button--secondary" onClick={syncBackups} disabled={syncing}><RefreshCw size={14} className={syncing ? "spin" : ""} />{syncing ? "Sincronizando..." : "Sincronizar JSONs"}</button><label className={`button button--primary ingestion-upload${uploading ? " is-loading" : ""}`}><UploadCloud size={15} />{uploading ? "Enviando..." : "Selecionar PDF"}<input type="file" accept="application/pdf,.pdf" onChange={handleUpload} disabled={uploading} /></label></div></section>{notice && <div className="alert alert--success" style={{ marginTop: 16 }}>{notice}</div>}{error && <div className="alert alert--error" style={{ marginTop: 16 }}>{error}</div>}<div className="ingestion-layout"><section className="surface ingestion-history"><div className="ingestion-panel-title"><div><span className="page-section-kicker">Histórico</span><h2>Processamentos recentes</h2></div><button type="button" className="icon-button" onClick={() => void refreshJobs()} title="Atualizar histórico" aria-label="Atualizar histórico"><RefreshCw size={15} /></button></div><div className="ingestion-job-list">{jobs.length ? jobs.map((job) => <button type="button" key={job.id} onClick={() => selectJob(job)} className={`ingestion-job${job.id === selectedId ? " is-selected" : ""}`}><div className={`ingestion-job__status ingestion-job__status--${job.status}`}>{statusIcon(job.status)}</div><div className="ingestion-job__body"><strong>{job.source_filename}</strong><span>#{job.id} · {formatTime(job.created_at)}</span></div><span className="ingestion-job__label">{statusLabel(job.status)}</span></button>) : <div className="ingestion-history-empty"><Clock3 size={22} /><p>Nenhum PDF processado ainda.</p><span>Selecione um arquivo acima para iniciar.</span></div>}</div></section><section className="surface ingestion-detail">{selectedJob ? <><div className="ingestion-detail__header"><div><span className={`ingestion-status ingestion-status--${selectedJob.status}`}>{statusIcon(selectedJob.status)}{statusLabel(selectedJob.status)}</span><h2>{selectedJob.source_filename}</h2><p>Job #{selectedJob.id} · criado em {formatTime(selectedJob.created_at)}</p></div><div className="ingestion-detail__actions">{selectedJob.status === "failed" && <button type="button" className="button button--secondary" onClick={retry}><RefreshCw size={14} />Tentar novamente</button>}{selectedJob.status === "approved" && <span className="ingestion-approved"><CheckCircle2 size={15} />CAT #{selectedJob.approved_cat_id}</span>}</div></div><p className="ingestion-progress-copy">{progressText}</p><LogList logs={selectedJob.logs || []} />{canEdit && draft && <><DraftEditor draft={draft} onChange={setDraft} /><div className="ingestion-approve-bar"><div><strong>Pronto para decisão</strong><span>A aprovação grava a CAT, substitui seus serviços e atualiza o JSON de backup.</span></div><button type="button" className="button button--primary" onClick={approve} disabled={approving}>{approving ? <><Loader2 size={15} className="spin" />Aprovando...</> : <><Send size={15} />Aprovar e subir ao PostgreSQL</>}</button></div></>}{selectedJob.status === "failed" && selectedJob.error_message && <div className="alert alert--error ingestion-error"><AlertCircle size={15} />{selectedJob.error_message}</div>}</> : <div className="ingestion-detail-empty"><FileInput size={35} /><h2>Escolha um job para auditar.</h2><p>O painel exibirá o log completo e abrirá o rascunho editável quando a IA terminar.</p></div>}</section></div></main>;
}

export default function IngestionPage() {
  return <SelectionBasketShell><Content /></SelectionBasketShell>;
}
