import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
});

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
  numero_cat: string | null;
  apelido: string | null;
  contratante: string | null;
  data_inicio: string | null;
  data_fim: string | null;
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
  apelido?: string;
  ano_inicio?: number;
  ano_fim?: number;
  ordenar_quantidade?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export interface Cat {
  id: number;
  tipo_documento?: string | null;
  numero_cat: string | null;
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
}

export interface CatsQueryParams {
  busca?: string;
  objeto?: string;
  contratante?: string;
  cidade?: string;
  ano_inicio?: number;
  ano_fim?: number;
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
}

export interface CatDetalhe extends Cat {
  tipo_documento: string | null;
  numero_art: string | null;
  profissional: string | null;
  registro_crea: string | null;
  empresa_contratada: string | null;
  cnpj_contratante: string | null;
  processo_administrativo: string | null;
  contrato: string | null;
  endereco_obra: string | null;
  servicos: ServicoDetalhe[];
  created_at: string | null;
  arquivo_pdf?: string | null;
  caminho_pdf?: string | null;
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

export const fetchServicos = (params: ServicosQueryParams) =>
  api.get<PaginatedServicos>("/servicos", { params }).then((r) => r.data);

export const fetchGrupos = () =>
  api.get<string[]>("/servicos/grupos").then((r) => r.data);

export const fetchUnidades = () =>
  api.get<string[]>("/servicos/unidades").then((r) => r.data);

export interface SomaServico {
  unidade: string | null;
  total: number;
  ocorrencias: number;
}

export const fetchSomaServico = (descricao: string, unidade?: string) =>
  api.get<SomaServico[]>("/servicos/somar", { params: { descricao, unidade } }).then((r) => r.data);

export const fetchCats = (params?: CatsQueryParams) =>
  api.get<Cat[]>("/cats", { params }).then((r) => r.data);

export const fetchCatById = (id: number) =>
  api.get<CatDetalhe>(`/cats/${id}`).then((r) => r.data);

export const getCatPdfUrl = (id: number) => `${api.defaults.baseURL}/cats/${id}/pdf`;

export const updateCatById = (id: number, payload: CatUpdatePayload) =>
  api.put<CatDetalhe>(`/cats/${id}`, payload).then((r) => r.data);

export const fetchDashboard = () =>
  api.get<DashboardStats>("/dashboard/stats").then((r) => r.data);

export default api;
