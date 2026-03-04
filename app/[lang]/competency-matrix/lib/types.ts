// ── Multilingual string ──────────────────────────────────────────────
export type I18nString = {
  pl: string;
  de?: string;
  en?: string;
};

// ── Enums ────────────────────────────────────────────────────────────
export const PROCESS_AREAS = [
  'bhp',
  'hr',
  'finance',
  'qm',
  'launch',
  'bvp',
  'logistics',
  'production',
  'it',
  'purchasing',
  'quality',
  'laboratory',
  'maintenance',
  'form-service',
  'additional',
  'management',
  'soft-skills',
] as const;
export type ProcessArea = (typeof PROCESS_AREAS)[number];

export const CERTIFICATION_TYPES = [
  'first-aid',
  'bhp-specialist',
  'fire-inspector',
  'forklift',
  'sep',
  'sep-supervision',
  'lift',
  'crane',
  'heights',
] as const;
export type CertificationType = (typeof CERTIFICATION_TYPES)[number];

export const EDUCATION_LEVELS = [
  'none',
  'vocational',
  'secondary-general',
  'secondary-specialized',
  'higher-general',
  'higher-specialized',
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

export const EXPERIENCE_LEVELS = [
  'none',
  '1yr',
  '2yr',
  '3yr',
  '4yr',
  '5yr',
] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export type RatingValue = 1 | 2 | 3;
export type WeightValue = 1 | 2 | 3;

export type EvaluationPeriodKind =
  | 'annual'
  | 'pre-hire'
  | 'probation-2m'
  | 'probation-5m'
  | 'contract-end';

// ── Gap-analysis color coding ────────────────────────────────────────
export type MatchColor = 'green' | 'yellow' | 'red';

// ── Competency ───────────────────────────────────────────────────────
export type CompetencyType = {
  _id?: string;
  name: I18nString;
  description?: I18nString;
  processArea: ProcessArea;
  levels: {
    1: I18nString;
    2: I18nString;
    3: I18nString;
  };
  trainingRecommendation?: I18nString;
  helpText?: I18nString;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

// ── Position ─────────────────────────────────────────────────────────
export type RequiredCompetency = {
  competencyId: string;
  requiredLevel: RatingValue;
  weight: WeightValue;
};

export type PositionType = {
  _id?: string;
  name: I18nString;
  department: string;
  requiredCompetencies: RequiredCompetency[];
  requiredExperience: ExperienceLevel;
  requiredEducation: EducationLevel;
  requiredCertifications: string[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

// ── Evaluation Period ────────────────────────────────────────────────
export type EvaluationPeriodType = {
  _id?: string;
  name: string;
  type: EvaluationPeriodKind;
  startDate: Date;
  endDate: Date;
  employeeIdentifiers: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// ── Competency Rating (used by calculations) ────────────────────────
export type CompetencyRating = {
  competencyId: string;
  rating: number | null; // null = n/a, 1, 2, 3
  comment?: string;
};

// ── Employee Ratings (competency ratings per employee) ───────────────
export type EmployeeRatingsDoc = {
  _id?: string;
  employeeIdentifier: string;
  ratings: CompetencyRating[];
  updatedAt: Date;
  updatedBy: string;
};

// ── Certification Status ─────────────────────────────────────────────
export const CERTIFICATION_STATUSES = [
  'valid',
  'expiring',
  'expired',
  'no-expiration',
] as const;
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number];

export type CertificationTableRow = {
  _id: string;
  employeeIdentifier: string;
  employeeName: string;
  certificationType: string;
  issuedDate: string;
  expirationDate: string | null;
  status: CertificationStatus;
  daysLeft: number | null;
  documentRef?: string;
  notes?: string;
};

// ── Employee Certification ───────────────────────────────────────────
export type EmployeeCertificationType = {
  _id?: string;
  employeeIdentifier: string;
  certificationType: string;
  issuedDate: Date;
  expirationDate?: Date;
  documentRef?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
};

// ── Config ───────────────────────────────────────────────────────────
export type ConfigValue = {
  slug: string;
  name: I18nString;
};

export type CompetencyMatrixConfigType = {
  _id?: string;
  key: string;
  values: ConfigValue[];
  updatedAt?: Date;
  updatedBy?: string;
};

// ── Evaluation (Performance Review) ─────────────────────────────────
export type EvaluationRating = 1 | 2 | 3 | 4 | 5;

export type EvaluationCause =
  | 'standard'
  | 'after-stated-time'
  | 'worsening-effectiveness'
  | 'after-negative-mark';

export type EvaluationGrade =
  | 'outstanding'
  | 'very-good'
  | 'good'
  | 'below-expectations'
  | 'unsatisfactory';

export type EvaluationRecommendation =
  | 'keep-position'
  | 'keep-with-conditions'
  | 'continue-contract'
  | 'cease-contract'
  | 'change-position'
  | 'offer-promotion'
  | 'other';

export type CriterionRating = {
  criterionKey: string;
  selfRating: EvaluationRating | null;
  supervisorRating: EvaluationRating | null;
};

export type SectionTotal = {
  section: 1 | 2 | 3;
  selfTotal: number;
  supervisorTotal: number;
  weight: number;
  selfWeighted: number;
  supervisorWeighted: number;
};

export type EvaluationDocType = {
  _id?: string;
  employeeIdentifier: string;
  employeeEmail?: string;
  employeeName: string;
  employeePosition: string;
  employeeDepartment: string;
  employeeHireDate: Date;
  employeePositionStartDate?: Date;
  assessorEmail: string;
  assessorName: string;
  assessorPosition: string;
  assessorDepartment: string;
  previousEvaluation?: {
    totalMark: EvaluationGrade;
    date: Date;
  };
  periodFrom: Date;
  periodTo: Date;
  evaluationPeriodId?: string;
  cause: EvaluationCause;
  recentTrainings: string[];
  ratings: CriterionRating[];
  sectionTotals: SectionTotal[];
  selfTotalPoints: number;
  supervisorTotalPoints: number;
  grade: EvaluationGrade;
  isPositive: boolean;
  assessorRemarks?: string;
  employeeRemarks?: string;
  employeeAppeal?: boolean;
  appealJustification?: string;
  recommendation: EvaluationRecommendation;
  recommendationDetails?: string;
  selfAssessmentStatus: 'pending' | 'completed';
  supervisorAssessmentStatus: 'pending' | 'completed';
  selfAssessmentCompletedBy?: string;
  status: 'draft' | 'submitted' | 'approved';
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

// ── Helper: resolve i18n string to current locale ────────────────────
export function localize(
  str: I18nString | undefined | null,
  lang: 'pl' | 'de' | 'en',
): string {
  if (!str) return '';
  return str[lang] || str.pl || '';
}
