export type JobModality = 'REMOTE' | 'HYBRID' | 'ON_SITE' | 'ONSITE';
export type ExperienceLevel = 'INTERNSHIP' | 'TRAINEE' | 'ENTRY_LEVEL' | 'JUNIOR' | 'SEMI_SENIOR' | 'MID' | 'SENIOR';

// Usado por la página de Vacantes (/jobs)
export interface JobOffer {
  id: string;
  companyName: string;
  title: string;
  description: string;
  requirements?: string | null;
  requiredSkills?: string[] | null;
  location?: string | null;
  modality?: string | null;
  experienceLevel?: string | null;
  minSalary?: number | null;
  maxSalary?: number | null;
  isActive?: boolean;
  createdAt?: string | number[] | null;
  matchedSkills?: string[] | null;
  compatibilityPercent?: number | null;
  compatibilityLabel?: string | null;
}

export interface JobApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  status: string;
  appliedAt?: string | number[] | null;
}

// Usado por la columna derecha del Dashboard (/dashboard o /feed)
export interface JobRecommendationResponse {
  id: string;
  companyName: string;
  companyLogoUrl?: string;
  title: string;
  description: string;
  location: string;
  modality: JobModality | string;
  experienceLevel: ExperienceLevel | string;
  minSalary?: number;
  maxSalary?: number;
  requiredSkills: string[];
  matchedSkills: string[];
  compatibilityPercent: number;
  compatibilityLabel?: string;
  createdAt: string | Date;
  isApplied?: boolean;
  isSaved?: boolean;
}