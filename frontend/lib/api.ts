import axios from "axios";

const api = axios.create({
  baseURL: (process.env.NEXT_PUBLIC_API_URL || "/api/v1").trim(),
  withCredentials: true,
});

export interface AuthUser {
  username: string;
  display_name: string;
}

export const login = (username: string, password: string) => api.post<{ user: AuthUser }>("/auth/login", { username, password }).then((r) => r.data.user);
export const fetchCurrentUser = () => api.get<{ user: AuthUser }>("/auth/me").then((r) => r.data.user);
export const logout = () => api.post("/auth/logout").then(() => undefined);

export interface Servico {
  id: number;
  cat_id: number;
  grupo: string | null;
  codigo: string | null;
  fonte: string | null;
  descricao: string | null;
  unidade: string | null;
  quantidade: number | null;
  pagina_pdf: number | null;
  ordem_na_pagina: number | null;
  ordem?: number | null;
  numero_cat: string | null;
  numero_art: string | null;
  apelido: string | null;
  contratante: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  arquivo_pdf: string | null;
  caminho_pdf: string | null;
  desmaterializado: boolean;
  autenticado: boolean;
  cao: boolean;
  objeto: string | null;
  area_m2: number | null;
  valor_contrato: number | null;
}

export interface PaginatedServicos {
  total: number;
  page: number;
  page_size: number;
  items: Servico[];
}

export interface ServicosQueryParams {
  busca?: string;
  grupo?: string;
  unidade?: string;
  contratante?: string;
  numero_cat?: string;
  numero_art?: string;
  apelido?: string;
  objeto?: string;
  cidade?: string;
  ano_inicio?: number;
  ano_fim?: number;
  data_inicio_de?: string;
  data_inicio_ate?: string;
  data_fim_de?: string;
  data_fim_ate?: string;
  area_min?: number;
  area_max?: number;
  valor_min?: number;
  valor_max?: number;
  desmaterializado?: boolean;
  autenticado?: boolean;
  ordenar_quantidade?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface Cat {
  id: number;
  tipo_documento?: string | null;
  numero_cat: string | null;
  numero_art: string | null;
  apelido: string | null;
  contratante: string | null;
  objeto: string | null;
  cidade: string | null;
  estado: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  area_m2: number | null;
  valor_contrato: number | null;
  total_servicos: number | null;
  arquivo_pdf?: string | null;
  caminho_pdf?: string | null;
  desmaterializado: boolean;
  autenticado: boolean;
  cao: boolean;
}

export interface CatsQueryParams {
  busca?: string;
  objeto?: string;
  contratante?: string;
  cidade?: string;
  numero_art?: string;
  data_inicio_de?: string;
  data_inicio_ate?: string;
  data_fim_de?: string;
  data_fim_ate?: string;
  area_min?: number;
  area_max?: number;
  valor_min?: number;
  valor_max?: number;
  desmaterializado?: boolean;
  autenticado?: boolean;
  cao?: boolean;
  skip?: number;
  limit?: number;
}

export interface ServicoDetalhe {
  grupo: string | null;
  codigo: string | null;
  fonte: string | null;
  descricao: string | null;
  unidade: string | null;
  quantidade: number | null;
  pagina_pdf: number | null;
  ordem_na_pagina: number | null;
  ordem?: number | null;
}

export interface CatDetalhe extends Cat {
  tipo_documento: string | null;
  profissional: string | null;
  registro_crea: string | null;
  empresa_contratada: string | null;
  cnpj_contratante: string | null;
  processo_administrativo: string | null;
  contrato: string | null;
  endereco_obra: string | null;
  created_at: string | null;
  servicos: ServicoDetalhe[];
}

export interface CatUpdatePayload {
  tipo_documento: string | null;
  numero_cat: string | null;
  numero_art: string | null;
  profissional: string | null;
  registro_crea: string | null;
  empresa_contratada: string | null;
  contratante: string | null;
  cnpj_contratante: string | null;
  objeto: string | null;
  processo_administrativo: string | null;
  contrato: string | null;
  endereco_obra: string | null;
  cidade: string | null;
  estado: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  area_m2: number | null;
  valor_contrato: number | null;
  apelido: string | null;
  arquivo_pdf: string | null;
  caminho_pdf: string | null;
  desmaterializado: boolean;
  autenticado: boolean;
  cao: boolean;
  servicos: ServicoDetalhe[];
}

export interface DashboardStats {
  total_cats: number;
  total_servicos: number;
  total_contratantes: number;
  area_total_m2: number;
  valor_total_contratos: number;
  cats_por_ano: { ano: number; total: number }[];
  top_grupos: { grupo: string; total: number }[];
  top_contratantes: { contratante: string; total: number }[];
}

export interface SomaServico {
  unidade: string | null;
  total: number;
  ocorrencias: number;
}

export const fetchServicos = (params: ServicosQueryParams) =>
  api.get<PaginatedServicos>("/servicos", { params }).then((r) => r.data);

export const fetchGrupos = () => api.get<string[]>("/servicos/grupos").then((r) => r.data);
export const fetchUnidades = () => api.get<string[]>("/servicos/unidades").then((r) => r.data);
export const fetchSomaServico = (descricao: string, unidade?: string) =>
  api.get<SomaServico[]>("/servicos/somar", { params: { descricao, unidade } }).then((r) => r.data);
export const fetchCats = (params?: CatsQueryParams) => api.get<Cat[]>("/cats", { params }).then((r) => r.data);
export const fetchCatById = (id: number) => api.get<CatDetalhe>(`/cats/${id}`).then((r) => r.data);
export const chooseCatPdf = (id: number) => api.post<CatDetalhe>(`/cats/${id}/choose-pdf`).then((r) => r.data);
export const openCatPdf = async (id: number) => {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  if (!isLocal && typeof window !== "undefined") {
    window.open(`${api.defaults.baseURL}/cats/${id}/pdf`, "_blank", "noopener,noreferrer");
    return { aberto: true, caminho: "visualização remota" };
  }
  return api.post<{ aberto: boolean; caminho: string }>(`/cats/${id}/open-pdf`).then((r) => r.data);
};
export const updateCatById = (id: number, payload: CatUpdatePayload) => api.put<CatDetalhe>(`/cats/${id}`, payload).then((r) => r.data);
export const fetchDashboard = () => api.get<DashboardStats>("/dashboard/stats").then((r) => r.data);
export const syncCatsJson = () => api.post<{ sincronizadas: number }>("/cats/sync-json").then((r) => r.data);

export interface IngestionLogEntry {
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

export type IngestionStatus = "queued" | "processing" | "ready" | "failed" | "approved";

export interface IngestionJob {
  id: number;
  source_filename: string;
  status: IngestionStatus;
  logs: IngestionLogEntry[];
  draft_json: IngestionDraft | null;
  error_message: string | null;
  approved_cat_id: number | null;
  created_at: string | null;
  updated_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface IngestionDraft {
  tipo_documento?: string | null;
  cat: Record<string, string | number | null>;
  apelido?: string | null;
  arquivo_pdf?: string | null;
  caminho_pdf?: string | null;
  desmaterializado?: boolean;
  autenticado?: boolean;
  cao?: boolean;
  servicos: ServicoDetalhe[];
}

export const fetchIngestionJobs = () => api.get<IngestionJob[]>("/ingestion/jobs").then((r) => r.data);
export const fetchIngestionJob = (id: number) => api.get<IngestionJob>(`/ingestion/jobs/${id}`).then((r) => r.data);
export const createIngestionJob = (file: File) => {
  const body = new FormData();
  body.append("file", file);
  return api.post<IngestionJob>("/ingestion/jobs", body).then((r) => r.data);
};
export const retryIngestionJob = (id: number) => api.post<IngestionJob>(`/ingestion/jobs/${id}/retry`).then((r) => r.data);
export const approveIngestionJob = (id: number, payload: IngestionDraft) => api.post<IngestionJob>(`/ingestion/jobs/${id}/approve`, { payload }).then((r) => r.data);

export default api;
