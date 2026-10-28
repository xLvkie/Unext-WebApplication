export interface StudentSkillResponse {
  id: string;
  name: string;
  masteryLevel: string;
  isTopSkill?: boolean;
  isValidatedByInstitution: boolean;
  validatedInstitutionName?: string | null;
  validatedInstitutionLogoUrl?: string | null;
}

export interface StudentSkillRequest {
  name: string;
  masteryLevel: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
  isTopSkill?: boolean;
}

export interface StudentSkillUpdate {
  name?: string;
  masteryLevel?: 'BASICO' | 'INTERMEDIO' | 'AVANZADO';
  isTopSkill?: boolean;
}

export interface InstitutionSummary {
  id: string;
  userId?: string;
  name: string;
  domain: string;
  logoUrl?: string | null;
  description?: string | null;
}

export interface PostulantProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  studentCode?: string | null;
  career?: string | null;
  currentCycle?: number | null;
  institutionalEmail?: string | null;
  academicStatus?: 'STUDENT' | 'GRADUATE' | string | null;
  academicEvidenceUrl?: string | null;
  academicEvidenceName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bannerText?: string | null;
  cvUrl?: string | null;
  cvFileName?: string | null;
  cvFileSize?: string | null;
  headline?: string | null;
  bio?: string | null;
  hasUniversityBase?: boolean;
  isInstitutionVerified?: boolean;
  institutionProfile?: string | null;
  institutionName?: string | null;
  institutionLogoUrl?: string | null;
  skills: StudentSkillResponse[];
}

export interface PostulantProfileRequest {
  firstName: string;
  lastName: string;
  headline?: string;
  bio?: string;
  bannerText?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  cvUrl?: string;
  cvFileName?: string;
  cvFileSize?: string;
}

export type PostulantProfileUpdate = Partial<PostulantProfileRequest>;