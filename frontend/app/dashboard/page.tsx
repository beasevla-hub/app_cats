"use client";

import { useState, useEffect } from "react";
import { fetchDashboard, DashboardStats } from "@/lib/api";
import { FileText, Wrench, Building2, AreaChart, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
      <div className="p-3 bg-blue-50 rounded-lg text-blue-600">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
          <ArrowLeft size={18} />
          Consulta
        </Link>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <AreaChart className="text-blue-600" size={22} />
          <h1 className="text-lg font-bold text-gray-900">Dashboard Gerencial</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">Carregando estatísticas...</div>
        ) : stats ? (
          <>
            {/* Cards principais */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <StatCard icon={<FileText size={22} />} label="Total de CATs" value={fmt(stats.total_cats)} />
              <StatCard icon={<Wrench size={22} />} label="Total de Serviços" value={fmt(stats.total_servicos)} />
              <StatCard icon={<Building2 size={22} />} label="Contratantes" value={fmt(stats.total_contratantes)} />
              <StatCard
                icon={<AreaChart size={22} />}
                label="Área Total"
                value={`${fmt(Math.round(stats.area_total_m2))} m²`}
              />
              <StatCard
                icon={<DollarSign size={22} />}
                label="Valor Total"
                value={fmtBRL(stats.valor_total_contratos)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CATs por Ano */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">CATs por Ano</h2>
                <div className="space-y-2">
                  {stats.cats_por_ano.map((item) => {
                    const max = Math.max(...stats.cats_por_ano.map((i) => i.total));
                    const pct = (item.total / max) * 100;
                    return (
                      <div key={item.ano} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-10 text-right">{item.ano}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-5 rounded-full flex items-center pl-2 transition-all"
                            style={{ width: `${pct}%` }}
                          >
                            <span className="text-xs text-white font-medium">{item.total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Grupos */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Grupos de Serviços</h2>
                <div className="space-y-2">
                  {stats.top_grupos.map((item) => {
                    const max = Math.max(...stats.top_grupos.map((i) => i.total));
                    const pct = (item.total / max) * 100;
                    return (
                      <div key={item.grupo} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-36 truncate text-right" title={item.grupo}>
                          {item.grupo}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-5 rounded-full flex items-center pl-2 transition-all"
                            style={{ width: `${pct}%` }}
                          >
                            <span className="text-xs text-white font-medium">{item.total}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Contratantes */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm lg:col-span-2">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Contratantes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {stats.top_contratantes.map((item, i) => (
                    <div key={item.contratante} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                      <span className="flex-1 text-sm text-gray-700 truncate" title={item.contratante}>
                        {item.contratante}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {item.total} CATs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-24 text-gray-400">
            Não foi possível carregar as estatísticas. Verifique se o backend está rodando.
          </div>
        )}
      </main>
    </div>
  );
}
