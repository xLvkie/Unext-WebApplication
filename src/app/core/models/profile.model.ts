export interface StudentSkillResponse {
  id: string;
  name: string;
  masteryLevel: string;
  isValidatedByInstitution: boolean;
}

export interface PostulantProfileResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  studentCode: string;
  career: string;
  currentCycle: number;
  cvUrl?: string;
  headline?: string;
  bio?: string;
  hasUniversityBase?: boolean;
  isInstitutionVerified: boolean;
  institutionProfile?: string;
  skills: StudentSkillResponse[];
}
