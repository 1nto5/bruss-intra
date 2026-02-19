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
  'production',
  'it',
  'quality',
  'laboratory',
  'maintenance',
  'logistics',
  'launch',
  'purchasing',
  'bvp',
  'management',
  'form-service',
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

export type AssessmentType = 'self' | 'supervisor';
export type AssessmentStatus = 'draft' | 'submitted' | 'approved';

export const ASSESSMENT_STATUSES = [
  'draft',
  'submitted',
  'approved',
] as const satisfies readonly AssessmentStatus[];

export type EvaluationPeriodKind =
  | 'annual'
  | 'pre-hire'
  | 'probation-2m'
  | 'probation-5m'
  | 'contract-end';

export type EvaluationPeriodStatus = 'planned' | 'active' | 'closed';

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
  sortOrder: number;
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
  status: EvaluationPeriodStatus;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

// ── Assessment ───────────────────────────────────────────────────────
export type CompetencyRating = {
  competencyId: string;
  rating: number | null; // null = n/a, 1, 2, 3
  comment?: string;
};

export type AssessmentDocType = {
  _id?: string;
  employeeIdentifier: string;
  employeeEmail?: string;
  positionId: string;
  assessorEmail: string;
  assessmentType: AssessmentType;
  evaluationPeriodId: string;
  ratings: CompetencyRating[];
  overallMatchPercentage: number;
  gapRatio: number;
  gapCount: number;
  criticalGapCount: number;
  status: AssessmentStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  active: boolean;
};

export type CompetencyMatrixConfigType = {
  _id?: string;
  key: string;
  values: ConfigValue[];
  updatedAt?: Date;
  updatedBy?: string;
};

// ── Helper: resolve i18n string to current locale ────────────────────
export function localize(
  str: I18nString | undefined | null,
  lang: 'pl' | 'de' | 'en',
): string {
  if (!str) return '';
  return str[lang] || str.pl || '';
}
