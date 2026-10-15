export type JobCategory =
  | 'technology'
  | 'administrative'
  | 'support'
  | 'design'
  | 'sales'
  | 'marketing'
  | 'other';

export type WorkplaceType = 'remote' | 'hybrid' | 'onsite' | 'unknown';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  workplace_type: WorkplaceType;
  category: JobCategory;
  description: string;
  url: string;
  source: string;
  published_at: string;
  discovered_at: string;
  tags: string[];
  is_new: boolean;
}

export interface JobListResponse {
  data: Job[];
  total: number;
  updated_at: string;
  sources: string[];
}

export interface MatchResponse {
  available: boolean;
  summary: string;
}
