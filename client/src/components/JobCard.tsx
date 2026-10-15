import { useState } from 'react';
import { ArrowUpRight, Bot, BriefcaseBusiness, MapPin } from 'lucide-react';
import { matchJob } from '../lib/api';
import type { Job, MatchResponse } from '../types/job';

const categoryLabels: Record<string, string> = {
  technology: 'Tecnologia', administrative: 'Administrativo', support: 'Suporte',
  design: 'Design', sales: 'Comercial', marketing: 'Marketing', other: 'Outras áreas',
};
const workplaceLabels: Record<string, string> = {
  remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial', unknown: 'Modelo não informado',
};

function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function relativeDate(value: string): string {
  const hours = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 3_600_000));
  if (hours < 1) return 'Publicada há menos de 1 hora';
  if (hours === 1) return 'Publicada há 1 hora';
  return `Publicada há ${hours} horas`;
}

export function JobCard({ job, isNew }: { job: Job; isNew: boolean }) {
  const [profile, setProfile] = useState('');
  const [match, setMatch] = useState<MatchResponse | null>(null);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState('');

  async function analyze() {
    if (!profile.trim()) {
      setMatchError('Descreva brevemente seu perfil para analisar a vaga.');
      return;
    }
    setMatching(true);
    setMatchError('');
    try {
      setMatch(await matchJob(job, profile));
    } catch {
      setMatchError('Não foi possível analisar esta vaga agora. Tente novamente.');
    } finally {
      setMatching(false);
    }
  }

  return (
    <article className={`job-card${isNew ? ' job-card--new' : ''}`}>
      <div className="job-card__topline">
        <span className="company-mark">{job.company.trim().charAt(0).toUpperCase() || 'J'}</span>
        <div className="job-card__heading">
          <h3>{job.title}</h3>
          <p>{job.company}</p>
        </div>
        {isNew && <span className="new-badge"><span />Nova</span>}
      </div>
      <div className="job-meta">
        <span><MapPin size={14} />{job.location || 'Local não informado'}</span>
        <span><BriefcaseBusiness size={14} />{workplaceLabels[job.workplace_type]}</span>
      </div>
      <div className="job-tags">
        <span className="tag tag--category">{categoryLabels[job.category]}</span>
        <span className="tag">{relativeDate(job.published_at)}</span>
        <span className="tag">{job.source === 'arbeitnow' ? 'Arbeitnow' : job.source === 'remotive' ? 'Remotive' : job.source}</span>
      </div>
      <p className="job-description">{plainText(job.description).slice(0, 220)}{plainText(job.description).length > 220 ? "…" : ""}</p>
      <div className="job-card__actions">
        <a className="primary-link" href={job.url} target="_blank" rel="noreferrer">Ver vaga <ArrowUpRight size={16} /></a>
        <button className="quiet-button" onClick={() => setMatch((current) => current ? null : { available: false, summary: '' })} type="button"><Bot size={16} /> Analisar perfil</button>
      </div>
      {match && <div className="match-panel">
        <label htmlFor={`profile-${job.id}`}>Seu perfil profissional</label>
        <textarea id={`profile-${job.id}`} value={profile} onChange={(event) => setProfile(event.target.value)} maxLength={500} placeholder="Ex.: Desenvolvedor PHP, Laravel, APIs REST e PostgreSQL..." rows={3} />
        <button className="analyze-button" onClick={() => void analyze()} disabled={matching} type="button">{matching ? 'Analisando…' : 'Avaliar aderência'}</button>
        {matchError && <p className="inline-error">{matchError}</p>}
        {match && match.summary && <p className="match-result">{match.summary}</p>}
      </div>}
    </article>
  );
}
