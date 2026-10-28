export interface AcademicVerificationRequest {
  institutionProfileId: string;
  academicStatus: 'STUDENT' | 'GRADUATE';
  institutionalEmail?: string;
  studentCode?: string;
  career?: string;
  currentCycle?: number | null;
  academicEvidenceUrl?: string;
  academicEvidenceName?: string;
}

export interface SkillValidationRequest {
  institutionProfileId: string;
  technicalSkillId: string;
  evidenceUrl: string;
}

export interface SkillValidationResponse {
  id: string;
  technicalSkillId?: string;
  institutionName: string;
  institutionLogoUrl?: string | null;
  technicalSkillName: string;
  evidenceUrl: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}