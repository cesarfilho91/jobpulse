import type { Job, JobListResponse, MatchResponse } from '../types/job';

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

export interface JobFilters {
  q: string;
  category: string;
  workplace: string;
  location: string;
}

export async function fetchJobs(filters: JobFilters, signal?: AbortSignal): Promise<JobListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') params.set(key, value);
  });
  const response = await fetch(`${API_URL}/api/jobs?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Could not load jobs (${response.status})`);
  return response.json() as Promise<JobListResponse>;
}

export async function refreshJobs(): Promise<JobListResponse> {
  const response = await fetch(`${API_URL}/api/refresh`, { method: 'POST' });
  if (!response.ok) throw new Error(`Could not refresh jobs (${response.status})`);
  return response.json() as Promise<JobListResponse>;
}

export async function matchJob(job: Job, profile: string): Promise<MatchResponse> {
  const response = await fetch(`${API_URL}/api/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: job.id, profile }),
  });
  if (!response.ok) throw new Error('Não foi possível analisar esta vaga.');
  return response.json() as Promise<MatchResponse>;
}

export function getEventsUrl(): string {
  return `${API_URL}/api/events`;
}
