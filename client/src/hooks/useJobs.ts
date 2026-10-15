import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchJobs, getEventsUrl, refreshJobs, type JobFilters } from '../lib/api';
import { prune, readStoredJobs, storeJobs } from '../lib/storage';
import type { Job } from '../types/job';

const EMPTY_FILTERS: JobFilters = { q: '', category: 'all', workplace: 'all', location: '' };

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>(() => readStoredJobs());
  const [filters, setFilters] = useState<JobFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<string[]>([]);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetchJobs(EMPTY_FILTERS, signal);
      setJobs((current) => {
        const existing = new Set(current.map((job) => job.id));
        const isFirstLoad = current.length === 0;
        const fresh = response.data.map((job) => ({ ...job, is_new: !isFirstLoad && !existing.has(job.id) }));
        const merged = prune([...fresh, ...current.filter((job) => !fresh.some((item) => item.id === job.id))]);
        storeJobs(merged);
        setNewIds(isFirstLoad ? [] : fresh.filter((job) => !existing.has(job.id)).map((job) => job.id));
        return merged;
      });
      setLastUpdated(response.updated_at);
      setError(null);
    } catch (caught) {
      if (caught instanceof Error && caught.name === 'AbortError') return;
      setError('Não foi possível atualizar as vagas. Verifique a conexão com a API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => void load(), 60_000);
    const cleanup = window.setInterval(() => {
      setJobs((current) => {
        const cleaned = prune(current);
        storeJobs(cleaned);
        return cleaned;
      });
    }, 60_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.clearInterval(cleanup);
    };
  }, [load]);

  useEffect(() => {
    const events = new EventSource(getEventsUrl());
    events.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as { jobs?: Job[]; new_ids?: string[] };
        if (!payload.jobs) return;
        setJobs((current) => {
          const incomingNewIds = new Set(payload.new_ids ?? []);
          const incoming = payload.jobs!.map((job) => ({ ...job, is_new: incomingNewIds.has(job.id) }));
          const merged = prune([...incoming, ...current.filter((job) => !incoming.some((item) => item.id === job.id))]);
          storeJobs(merged);
          return merged;
        });
        setNewIds(payload.new_ids ?? []);
      } catch {
        // Ignore malformed events and keep the last valid snapshot.
      }
    };
    return () => events.close();
  }, []);

  const filteredJobs = useMemo(() => jobs.filter((job) => {
    const searchText = `${job.title} ${job.company} ${job.description} ${job.tags.join(' ')}`.toLocaleLowerCase();
    return (!filters.q || searchText.includes(filters.q.toLocaleLowerCase()))
      && (filters.category === 'all' || job.category === filters.category)
      && (filters.workplace === 'all' || job.workplace_type === filters.workplace)
      && (!filters.location || job.location.toLocaleLowerCase().includes(filters.location.toLocaleLowerCase()));
  }), [filters, jobs]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshJobs();
      await load();
    } catch {
      setError('A atualização falhou. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }, [load]);

  const clearNew = useCallback(() => setNewIds([]), []);
  return { jobs: filteredJobs, allJobs: jobs, filters, setFilters, loading, error, lastUpdated, newIds, refresh, clearNew };
}
