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

export interface Cat {
  id: number;
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

export const fetchServicos = (params: Record<string, unknown>) =>
  api.get<PaginatedServicos>("/servicos", { params }).then((r) => r.data);

export const fetchGrupos = () =>
  api.get<string[]>("/servicos/grupos").then((r) => r.data);

export const fetchUnidades = () =>
  api.get<string[]>("/servicos/unidades").then((r) => r.data);

export const fetchCats = (params?: Record<string, unknown>) =>
  api.get<Cat[]>("/cats", { params }).then((r) => r.data);

export const fetchDashboard = () =>
  api.get<DashboardStats>("/dashboard/stats").then((r) => r.data);

export default api;
