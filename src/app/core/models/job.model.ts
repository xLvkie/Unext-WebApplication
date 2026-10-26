export type JobModality = 'REMOTE' | 'HYBRID' | 'ON_SITE';
export type ExperienceLevel = 'INTERNSHIP' | 'ENTRY_LEVEL' | 'JUNIOR' | 'MID' | 'SENIOR';

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
