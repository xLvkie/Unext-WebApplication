export interface StudentSkillResponse {
  id: string;
  name: string;
  masteryLevel: string;
  isValidatedByInstitution?: boolean | null;
}

export interface SkillRequest {
  name: string;
  masteryLevel: string;
}

export interface PostulantProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
  career: string | null;
  currentCycle: number | null;
  cvUrl?: string | null;
  headline?: string | null;
  bio?: string | null;
  hasUniversityBase?: boolean;
  isInstitutionVerified?: boolean | null;
  institutionProfile?: string | null;
  skills: StudentSkillResponse[];
}

export interface PostulantProfileUpdateRequest {
  career?: string;
  currentCycle?: number;
  cvUrl?: string;
  headline?: string;
  bio?: string;
}

export interface RecruiterProfileResponse {
  id: string;
  userId: string;
  companyName: string;
  ruc: string;
  industry: string | null;
  description: string | null;
  isValidated: boolean;
}

export interface InstitutionProfileResponse {
  id: string;
  userId: string;
  name: string;
  domain: string;
  logoUrl: string | null;
  description: string | null;
}
