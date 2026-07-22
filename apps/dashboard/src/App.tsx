import { useState, useEffect } from 'react';
import { 
  Building2, 
  TrendingDown, 
  MapPin, 
  Search, 
  Activity, 
  DollarSign, 
  Clock, 
  ArrowRight, 
  Info, 
  Sliders, 
  Scale, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface Property {
  id: string;
  provider: string;
  providerId: string;
  title: string;
  price: number;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage: number | null;
  neighborhood: string | null;
  city: string;
  url: string;
  createdAt: string;
  discountPercentage?: number;
  neighborhoodMedian?: number;
}

interface NeighborhoodMetric {
  name: string;
  count: number;
  averagePrice: number;
  medianPrice: number;
}

interface OverviewData {
  totalProperties: number;
  averagePrice: number;
  medianPrice: number;
  averagePricePerM2: number;
  neighborhoods: NeighborhoodMetric[];
}

interface PipelineLog {
  id: string;
  stage: string;
  status: string;
  itemsFound: number | null;
  itemsValid: number | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
}

const API_URL = 'http://localhost:3005';

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'simulator' | 'logs'>('overview');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [opportunities, setOpportunities] = useState<Property[]>([]);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados do Simulador
  const [simNeighborhood, setSimNeighborhood] = useState('Centro');
  const [simArea, setSimArea] = useState(80);
  const [simBedrooms, setSimBedrooms] = useState(2);
  const [simPriceRange, setSimPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Estados de Busca
  const [searchQuery, setSearchQuery] = useState('');
  const [filterNeighborhood, setFilterNeighborhood] = useState('Todos');

  // Load Data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [overviewRes, propsRes, oppsRes, logsRes] = await Promise.all([
          fetch(`${API_URL}/analytics/overview`),
          fetch(`${API_URL}/properties`),
          fetch(`${API_URL}/analytics/opportunities`),
          fetch(`${API_URL}/system/logs`)
        ]);

        const overviewData = await overviewRes.json();
        const propsData = await propsRes.json();
        const oppsData = await oppsRes.json();
        const logsData = await logsRes.json();

        setOverview(overviewData);
        setProperties(propsData);
        setOpportunities(oppsData);
        setLogs(logsData);
        
        // Define bairro inicial para o simulador se houver
        if (overviewData.neighborhoods && overviewData.neighborhoods.length > 0) {
          setSimNeighborhood(overviewData.neighborhoods[0].name);
        }
      } catch (err) {
        console.error('Erro ao buscar dados da API:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Simular Preço
  const handleSimulate = () => {
    if (!overview) return;
    const targetNgh = overview.neighborhoods.find(n => n.name === simNeighborhood);
    const avgM2 = overview.averagePricePerM2 || 12000; // fallback m² price
    
    // Fatores simples de precificação baseado em dados
    const basePrice = simArea * avgM2;
    const roomMultiplier = 1 + (simBedrooms - 2) * 0.12; // 12% por quarto a mais/menos que 2
    
    // Ajuste baseado no peso do bairro em relação à média geral
    const neighborhoodFactor = targetNgh ? targetNgh.averagePrice / overview.averagePrice : 1;
    
    const estimatedBase = basePrice * roomMultiplier * neighborhoodFactor;
    
    // Variação de +- 8% para faixa de mercado justa
    setSimPriceRange({
      min: Math.round(estimatedBase * 0.92),
      max: Math.round(estimatedBase * 1.08)
    });
  };

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
  };

  // Filtragem de Imóveis para a aba geral
  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.neighborhood && p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesNgh = filterNeighborhood === 'Todos' || p.neighborhood === filterNeighborhood;
    return matchesSearch && matchesNgh;
  });

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E4E4E7] flex flex-col font-sans selection:bg-purple-500/30">
      
      {/* Header */}
      <header className="border-b border-[#1F1F23] bg-[#0E0E12]/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">PropIntel</h1>
              <p className="text-xs text-zinc-500">Property Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              API Online
            </span>
            <span className="text-xs text-zinc-500">Porta: 3005</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-8">
        
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-500 border-t-transparent"></div>
            <p className="text-zinc-400 text-sm">Carregando painel imobiliário...</p>
          </div>
        ) : (
          <>
            {/* Overview KPI Cards */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/30 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Monitorados</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{overview?.totalProperties || 0}</h3>
                  <p className="text-xs text-zinc-600 mt-1">Imóveis ativos em Gramado</p>
                </div>
              </div>

              <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/30 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Preço Médio</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{formatBRL(overview?.averagePrice || 0)}</h3>
                  <p className="text-xs text-zinc-600 mt-1">Média de mercado anunciado</p>
                </div>
              </div>

              <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/30 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Scale className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Preço Mediano</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{formatBRL(overview?.medianPrice || 0)}</h3>
                  <p className="text-xs text-zinc-600 mt-1">Imune a anomalias de topo</p>
                </div>
              </div>

              <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-5 flex items-center gap-4 hover:border-purple-500/30 transition-all duration-300 group">
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Oportunidades</p>
                  <h3 className="text-2xl font-bold text-emerald-400 mt-1">{opportunities.length}</h3>
                  <p className="text-xs text-emerald-500/60 mt-1">≥ 10% abaixo da mediana local</p>
                </div>
              </div>
            </section>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#1F1F23] gap-6">
              {[
                { id: 'overview', label: 'Imóveis & Bairros', icon: Building2 },
                { id: 'opportunities', label: 'Radar de Oportunidades', icon: TrendingDown },
                { id: 'simulator', label: 'Simulador de Avaliação', icon: Sliders },
                { id: 'logs', label: 'Logs de Auditoria', icon: Clock }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-all ${
                    activeTab === tab.id 
                      ? 'border-purple-500 text-purple-400' 
                      : 'border-transparent text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB: Overview & Bairros */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Column 1 & 2: Properties List & Charts */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                  
                  {/* Bairros Chart */}
                  <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-6 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-400" />
                      Preço Médio por Bairro (BRL)
                    </h3>
                    <div className="h-64">
                      {overview?.neighborhoods && overview.neighborhoods.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={overview.neighborhoods}>
                            <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                            <YAxis stroke="#71717a" fontSize={11} tickFormatter={(v) => `${(v/1000)}k`} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#121217', borderColor: '#1F1F23', borderRadius: '8px' }}
                              formatter={(value: any) => [formatBRL(value), 'Preço Médio']}
                            />
                            <Bar dataKey="averagePrice" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500 text-sm">Sem dados suficientes para gráficos</div>
                      )}
                    </div>
                  </div>

                  {/* Properties list */}
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <h3 className="font-semibold text-lg text-white">Todos os Imóveis</h3>
                      
                      {/* Filtros */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-60">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <input 
                            type="text" 
                            placeholder="Buscar título ou bairro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#121217] border border-[#1F1F23] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                          />
                        </div>

                        <select
                          value={filterNeighborhood}
                          onChange={(e) => setFilterNeighborhood(e.target.value)}
                          className="bg-[#121217] border border-[#1F1F23] rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="Todos">Todos os bairros</option>
                          {overview?.neighborhoods.map(n => (
                            <option key={n.name} value={n.name}>{n.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#1F1F23] bg-[#18181F]/50 text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                              <th className="p-4">Título</th>
                              <th className="p-4">Bairro</th>
                              <th className="p-4">Área</th>
                              <th className="p-4">Quartos</th>
                              <th className="p-4">Preço</th>
                              <th className="p-4 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1F1F23] text-sm text-zinc-300">
                            {filteredProperties.length > 0 ? (
                              filteredProperties.map(p => (
                                <tr key={p.id} className="hover:bg-[#18181F]/40 transition-colors">
                                  <td className="p-4 font-medium text-white max-w-xs truncate">{p.title}</td>
                                  <td className="p-4">{p.neighborhood || 'Não Informado'}</td>
                                  <td className="p-4">{p.area ? `${p.area} m²` : '-'}</td>
                                  <td className="p-4">{p.bedrooms ? `${p.bedrooms} Q` : '-'}</td>
                                  <td className="p-4 font-semibold text-purple-400">{formatBRL(p.price)}</td>
                                  <td className="p-4 text-right">
                                    <a 
                                      href={p.url} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white bg-[#1F1F23]/60 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all"
                                    >
                                      Ver Origem <ArrowRight className="h-3 w-3" />
                                    </a>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-zinc-500">Nenhum imóvel corresponde aos filtros</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 3: Bairro metrics lists & Side widgets */}
                <div className="flex flex-col gap-6">
                  <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">Métricas Geográficas</h3>
                    <div className="flex flex-col gap-3">
                      {overview?.neighborhoods.map(n => (
                        <div key={n.name} className="flex items-center justify-between p-3 rounded-xl bg-[#18181F]/60 border border-[#1F1F23]">
                          <div>
                            <h4 className="font-semibold text-white text-sm">{n.name}</h4>
                            <p className="text-xs text-zinc-500">{n.count} imóveis anunciados</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-purple-400 block">{formatBRL(n.medianPrice)}</span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest">mediana local</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Info className="h-5 w-5" />
                      <h4 className="font-semibold text-sm">Posicionamento Metodológico</h4>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-400">
                      A PropIntel baseia seus indicadores exclusivamente em inteligência de dados históricos e estatística descritiva (mediana local de equivalência).
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      As faixas estimadas não servem como laudos ou julgamento absoluto de valor, e sim como métrica analítica de apoio a corretores e investidores.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Radar de Oportunidades */}
            {activeTab === 'opportunities' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Radar de Pechinchas</h3>
                  <p className="text-sm text-zinc-400">Listagem de ofertas com preço anunciado substancialmente abaixo da mediana local do bairro.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {opportunities.length > 0 ? (
                    opportunities.map(p => (
                      <div key={p.id} className="bg-[#121217] border border-[#1F1F23] rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-emerald-500/20 transition-all duration-300 relative group overflow-hidden">
                        {/* Discount badge */}
                        <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          -{p.discountPercentage}%
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 flex items-center gap-1">
                            <span className="h-1 w-1 bg-emerald-400 rounded-full"></span>
                            Oportunidade Detectada
                          </span>
                          <h4 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-2">{p.title}</h4>
                          
                          <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                            <MapPin className="h-3 w-3" />
                            {p.neighborhood || 'Bairro Não Informado'}
                          </div>
                        </div>

                        <div className="border-t border-[#1F1F23] pt-4 mt-2 flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-zinc-500">Preço Mediano Local:</span>
                            <span className="text-zinc-400 font-medium">{formatBRL(p.neighborhoodMedian || 0)}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-zinc-500">Valor Anunciado:</span>
                            <div className="text-right">
                              <span className="text-lg font-bold text-white block">{formatBRL(p.price)}</span>
                            </div>
                          </div>
                        </div>

                        <a 
                          href={p.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-full mt-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-center py-2 rounded-xl text-xs font-semibold transition-all"
                        >
                          Ir Para a Imobiliária
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-3 bg-[#121217] border border-[#1F1F23] rounded-2xl p-12 text-center text-zinc-500">
                      Nenhuma pechincha de mercado detectada neste momento.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Simulador */}
            {activeTab === 'simulator' && (
              <div className="max-w-2xl mx-auto w-full bg-[#121217] border border-[#1F1F23] rounded-2xl p-8 flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-purple-400" />
                    Simulador Estimador de Faixa
                  </h3>
                  <p className="text-sm text-zinc-400">Insira as especificações do imóvel para simular a faixa de preço justo estimada no bairro selecionado.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Bairro Alvo</label>
                    <select
                      value={simNeighborhood}
                      onChange={(e) => setSimNeighborhood(e.target.value)}
                      className="bg-[#18181F] border border-[#1F1F23] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    >
                      {overview?.neighborhoods.map(n => (
                        <option key={n.name} value={n.name}>{n.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Área Útil (m²)</label>
                    <input 
                      type="number" 
                      value={simArea}
                      onChange={(e) => setSimArea(Number(e.target.value))}
                      className="bg-[#18181F] border border-[#1F1F23] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Dormitórios</label>
                    <input 
                      type="number" 
                      value={simBedrooms}
                      onChange={(e) => setSimBedrooms(Number(e.target.value))}
                      className="bg-[#18181F] border border-[#1F1F23] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex flex-col gap-2 justify-end">
                    <button
                      onClick={handleSimulate}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-500/25 active:scale-[0.98]"
                    >
                      Rodar Simulação
                    </button>
                  </div>
                </div>

                {simPriceRange && (
                  <div className="border-t border-[#1F1F23] pt-6 mt-4 flex flex-col gap-3 text-center">
                    <span className="text-xs uppercase tracking-widest text-zinc-500">Faixa Estatística Justa</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white flex items-center justify-center gap-3">
                      <span className="text-purple-400">{formatBRL(simPriceRange.min)}</span>
                      <span className="text-zinc-500 text-lg">a</span>
                      <span className="text-purple-400">{formatBRL(simPriceRange.max)}</span>
                    </div>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed mt-2">
                      Estimativa baseada no preço médio de m² do bairro {simNeighborhood} ajustado pelo número de quartos cadastrados na base de dados histórica.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Logs de Auditoria */}
            {activeTab === 'logs' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Métricas de Execução do Pipeline</h3>
                  <p className="text-sm text-zinc-400">Auditoria técnica de tempo de execução e eficiência de ingestão de dados de mercado.</p>
                </div>

                <div className="bg-[#121217] border border-[#1F1F23] rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#1F1F23] bg-[#18181F]/50 text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                          <th className="p-4">Horário</th>
                          <th className="p-4">Etapa</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Itens Encontrados</th>
                          <th className="p-4">Itens Higienizados</th>
                          <th className="p-4 text-right">Duração (ms)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F1F23] text-sm text-zinc-300">
                        {logs.length > 0 ? (
                          logs.map(log => (
                            <tr key={log.id} className="hover:bg-[#18181F]/40 transition-colors">
                              <td className="p-4 text-zinc-500">{new Date(log.createdAt).toLocaleString()}</td>
                              <td className="p-4 font-semibold text-white">{log.stage}</td>
                              <td className="p-4">
                                {log.status === 'SUCCESS' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckCircle2 className="h-3 w-3" /> Sucesso
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-rose-400 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20">
                                    <AlertTriangle className="h-3 w-3" /> Falhou
                                  </span>
                                )}
                              </td>
                              <td className="p-4">{log.itemsFound ?? '-'}</td>
                              <td className="p-4">{log.itemsValid ?? '-'}</td>
                              <td className="p-4 text-right font-mono">{log.durationMs}ms</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-zinc-500">Nenhum log operacional registrado no SQLite</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F1F23] bg-[#0A0A0C] px-6 py-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 PropIntel Inc. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-300">Termos de Uso</a>
            <a href="#" className="hover:text-zinc-300">Privacidade</a>
            <a href="#" className="hover:text-zinc-300">API Documentation</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
