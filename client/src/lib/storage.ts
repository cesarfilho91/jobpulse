import type { Job } from '../types/job';

const STORAGE_KEY = 'jobpulse:recent-jobs:v1';
const RETENTION_MS = 24 * 60 * 60 * 1000;

export function readStoredJobs(): Job[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return prune(value as Job[]);
  } catch {
    return [];
  }
}

export function storeJobs(jobs: Job[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prune(jobs)));
  } catch {
    // Storage can be unavailable in private browsing or when quota is exhausted.
  }
}

export function prune(jobs: Job[], now = Date.now()): Job[] {
  return jobs.filter((job) => {
    const publishedAt = Date.parse(job.published_at);
    return Number.isFinite(publishedAt) && publishedAt <= now + 5 * 60 * 1000 && now - publishedAt <= RETENTION_MS;
  });
}
