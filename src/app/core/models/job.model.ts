export type JobModality = 'REMOTE' | 'HYBRID' | 'ON_SITE' | 'ONSITE';
export type ExperienceLevel = 'INTERNSHIP' | 'TRAINEE' | 'ENTRY_LEVEL' | 'JUNIOR' | 'SEMI_SENIOR' | 'MID' | 'SENIOR';
export type ApplicationStatus = 'RECEIVED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
export type CompatibilityLabel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type AgreementStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

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

// Manejo y administración de vacantes del reclutador <<
export interface JobOfferRequest {
  title: string;
  description: string;
  requirements: string;
  requiredSkills: string[];
  location?: string;
  modality: JobModality;
  experienceLevel: ExperienceLevel;
  minSalary?: number | null;
  maxSalary?: number | null;
}

export type JobOfferUpdate = Partial<JobOfferRequest>;

export interface RecruiterApplicationItem {
  id: string;
  postulantProfileId: string;
  postulantUserId?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  career?: string | null;
  currentCycle?: number | null;
  headline?: string | null;
  isInstitutionVerified?: boolean;
  skills: string[];
  status: ApplicationStatus;
  appliedAt: string | number[] | Date;
  compatibilityPercent?: number | null;
  compatibilityLabel?: CompatibilityLabel;
  matchingHint?: string | null;
  averageStars?: number | null;
  reviewCount?: number | null;
}

export interface RecruiterApplicantFilters {
  career?: string;
  minCycle?: number | null;
  skill?: string;
  minRating?: number | null;
  minReviews?: number | null;
} 

export interface AgreementCreateRequest {
  postulantId: string;
  jobApplicationId?: string | null;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  weeklyHours: number;
  documentUrl: string;
  observations?: string;
}

export interface AgreementResponse {
  id: string;
  jobApplicationId?: string | null;
  title: string;
  companyName: string;
  studentName: string;
  startDate: string;
  endDate: string;
  weeklyHours: number;
  documentUrl: string;
  status: AgreementStatus;
  observations?: string | null;
  reviewedAt?: string | number[] | Date | null;
  createdAt?: string | number[] | Date | null;
}