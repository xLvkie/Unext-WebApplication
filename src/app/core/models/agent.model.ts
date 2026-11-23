export interface AgentChatRequest {
  message: string;
}

export interface AgentChatResponse {
  reply: string;
}

export interface BioOptimizeRequest {
  bio: string;
}

export interface BioOptimizeResponse {
  role: string;
  originalBio: string;
  optimizedBio: string;
  keyImprovements: string[];
}

export interface TalentAnalysisRequest {
  targetRole?: string;
}

export interface TalentAnalysisResponse {
  postulantName: string;
  career: string;
  currentSkills: string[];
  matchedDemandSkills: string[];
  missingKeySkills: string[];
  activeVacanciesAnalyzed: number;
  marketCompatibilitySummary: string;
  actionPlan: string[];
}

export interface JobDesignRequest {
  prompt: string;
}

export interface JobBlueprintSuggestion {
  roleTitle: string;
  suggestedModality: string;
  suggestedExperienceLevel: string;
  estimatedSalaryRangeSoles: string;
  recommendedSkills: string[];
  optimizedDescription: string;
}

export interface JobSuggestionListResponse {
  suggestions: JobBlueprintSuggestion[];
}

export interface EmployabilityInsightsRequest {
  career?: string;
  focusQuestion?: string;
}

export interface EmployabilityInsightsResponse {
  institutionName: string;
  careerFilter: string | null;
  totalVerifiedStudents: number;
  totalHiredStudents: number;
  totalActiveAgreements: number;
  totalEndorsedCompanies: number;
  employabilityRate: number;
  executiveSummary: string;
  keyFindings: string[];
  strategicRecommendations: string[];
}

export interface AgentUiMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  isError?: boolean;
}
