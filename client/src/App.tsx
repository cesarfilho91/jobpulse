import { useMemo, useState } from 'react';
import { Activity, ArrowDownUp, Bell, BriefcaseBusiness, Clock3, MapPin, RefreshCw, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { JobCard } from './components/JobCard';
import { useJobs } from './hooks/useJobs';
import './styles.css';

const categories = [
  ['all', 'Todas as áreas'], ['technology', 'Tecnologia'], ['administrative', 'Administrativo'],
  ['support', 'Suporte'], ['design', 'Design'], ['sales', 'Comercial'], ['marketing', 'Marketing'], ['other', 'Outras áreas'],
];
const workplaces = [['all', 'Todos os modelos'], ['remote', 'Remoto'], ['hybrid', 'Híbrido'], ['onsite', 'Presencial'], ['unknown', 'Não informado']];

export default function App() {
  const { jobs, allJobs, filters, setFilters, loading, error, lastUpdated, newIds, refresh, clearNew } = useJobs();
  const [sort, setSort] = useState<'recent' | 'company'>('recent');
  const newCount = useMemo(() => newIds.filter((id) => jobs.some((job) => job.id === id)).length, [jobs, newIds]);
  const sortedJobs = useMemo(() => [...jobs].sort((a, b) => sort === 'recent'
    ? Date.parse(b.published_at) - Date.parse(a.published_at)
    : a.company.localeCompare(b.company)), [jobs, sort]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="JobPulse início"><span className="brand-icon"><Activity size={20} /></span><span>job<span>pulse</span></span></a>
        <div className="topbar__right"><span className="live-indicator"><span />Monitoramento ligado</span><button className="icon-button" aria-label="Atualizar vagas" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div>
      </header>

      <section className="hero" id="top">
        <div className="hero__copy">
          <div className="eyebrow"><Sparkles size={14} /> SEU RADAR DE CARREIRA</div>
          <h1>Oportunidades certas.<br /><span>Na hora certa.</span></h1>
          <p>Acompanhe vagas recentes de diferentes fontes, filtre o que importa e encontre seu próximo passo profissional.</p>
          <div className="hero__meta"><span><Clock3 size={15} /> Janela de 24 horas</span><span><Activity size={15} /> Atualização automática</span></div>
        </div>
        <div className="hero-card">
          <div className="hero-card__icon"><Bell size={20} /></div>
          <div><strong>{newCount} {newCount === 1 ? 'vaga nova' : 'vagas novas'}</strong><p>Encontradas nesta sessão</p></div>
          <span className="pulse-dot" />
        </div>
      </section>

      <section className="stats-grid" aria-label="Resumo das vagas">
        <div className="stat-card"><span className="stat-icon stat-icon--blue"><BriefcaseBusiness size={18} /></span><div><span className="stat-label">Vagas no radar</span><strong>{allJobs.length}</strong></div><small>últimas 24h</small></div>
        <div className="stat-card"><span className="stat-icon stat-icon--green"><Activity size={18} /></span><div><span className="stat-label">Novas nesta sessão</span><strong>{newIds.length}</strong></div><small>identificadas</small></div>
        <div className="stat-card"><span className="stat-icon stat-icon--violet"><MapPin size={18} /></span><div><span className="stat-label">Fontes conectadas</span><strong>2</strong></div><small>APIs públicas</small></div>
      </section>

      <section className="search-section">
        <div className="section-heading"><div><div className="eyebrow">BUSCA DE OPORTUNIDADES</div><h2>Encontre sua próxima oportunidade</h2></div><span className="results-count">{jobs.length} resultados</span></div>
        <div className="search-bar"><Search size={19} /><input value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} placeholder="Cargo, empresa ou palavra-chave..." aria-label="Buscar cargo, empresa ou palavra-chave" /><kbd>Ctrl K</kbd></div>
        <div className="filters-row">
          <label className="filter-control"><span>Área profissional</span><select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-control"><span>Modelo de trabalho</span><select value={filters.workplace} onChange={(event) => updateFilter('workplace', event.target.value)}>{workplaces.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="filter-control filter-control--location"><span>Localização</span><div className="location-input"><MapPin size={15} /><input value={filters.location} onChange={(event) => updateFilter('location', event.target.value)} placeholder="Cidade, estado ou país" /></div></label>
          <button className="filter-reset" onClick={() => setFilters({ q: '', category: 'all', workplace: 'all', location: '' })} type="button"><SlidersHorizontal size={15} /> Limpar</button>
        </div>
      </section>

      <section className="list-section">
        <div className="list-heading"><div><h2>Vagas recentes</h2><p>Oportunidades publicadas nas últimas 24 horas</p></div><label className="sort-control"><ArrowDownUp size={15} /><select aria-label="Ordenar vagas" value={sort} onChange={(event) => setSort(event.target.value as 'recent' | 'company')}><option value="recent">Mais recentes</option><option value="company">Empresa (A–Z)</option></select></label></div>
        {error && <div className="error-banner" role="alert">{error} <button onClick={() => void refresh()} type="button">Tentar novamente</button></div>}
        {loading && allJobs.length === 0 && <div className="empty-state"><RefreshCw size={24} className="spin" /><h3>Buscando oportunidades</h3><p>Estamos consultando as fontes disponíveis.</p></div>}
        {!loading && sortedJobs.length === 0 && <div className="empty-state"><Search size={25} /><h3>Nenhuma vaga encontrada</h3><p>Tente ajustar os filtros ou atualizar a busca.</p><button className="primary-button" onClick={() => void refresh()} type="button">Atualizar vagas</button></div>}
        <div className="jobs-grid">{sortedJobs.map((job) => <JobCard key={job.id} job={job} isNew={newIds.includes(job.id)} />)}</div>
        {newIds.length > 0 && <div className="list-footer"><span><span className="legend-dot" /> Vaga encontrada nesta sessão</span><button onClick={clearNew} type="button">Marcar novas vagas como visualizadas</button></div>}
        <div className="source-note">{lastUpdated ? `Última sincronização: ${new Date(lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Aguardando primeira sincronização'} <span>·</span> Os anúncios são publicados por suas fontes originais.</div>
      </section>
      <footer className="footer"><a className="brand brand--small" href="#top"><span className="brand-icon"><Activity size={16} /></span><span>job<span>pulse</span></span></a><span>Feito para tornar a busca de emprego mais objetiva.</span><span className="footer-status"><span /> Sistema funcionando</span></footer>
    </main>
  );
}
