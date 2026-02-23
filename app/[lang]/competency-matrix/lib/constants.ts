import type { I18nString, ProcessArea, CertificationType, EducationLevel, ExperienceLevel, EvaluationPeriodKind } from './types';

// ── Process Areas (16) ───────────────────────────────────────────────
export const PROCESS_AREA_LABELS: Record<ProcessArea, I18nString> = {
  bhp: { pl: 'BHP', de: 'Arbeitssicherheit', en: 'Health & Safety' },
  hr: { pl: 'HR', de: 'Personalwesen', en: 'Human Resources' },
  finance: { pl: 'Finanse', de: 'Finanzen', en: 'Finance' },
  qm: { pl: 'QM', de: 'Qualitätsmanagement', en: 'Quality Management' },
  production: { pl: 'Produkcja', de: 'Produktion', en: 'Production' },
  it: { pl: 'IT', de: 'IT', en: 'IT' },
  quality: { pl: 'Jakość', de: 'Qualität', en: 'Quality' },
  laboratory: { pl: 'Laboratorium', de: 'Labor', en: 'Laboratory' },
  maintenance: { pl: 'Utrzymanie ruchu', de: 'Instandhaltung', en: 'Maintenance' },
  logistics: { pl: 'Logistyka', de: 'Logistik', en: 'Logistics' },
  launch: { pl: 'Launch', de: 'Anlauf', en: 'Launch' },
  purchasing: { pl: 'Zakupy', de: 'Einkauf', en: 'Purchasing' },
  bvp: { pl: 'BVP', de: 'BVP', en: 'BVP' },
  management: { pl: 'Zarządzanie', de: 'Management', en: 'Management' },
  additional: { pl: 'Kompetencje dodatkowe', de: 'Zusätzliche Kompetenzen', en: 'Additional Competencies' },
  'form-service': { pl: 'Serwis form', de: 'Formenservice', en: 'Form Service' },
  'soft-skills': { pl: 'Kompetencje miękkie', de: 'Soft Skills', en: 'Soft Skills' },
};

// ── Certification Types (9) ──────────────────────────────────────────
export const CERTIFICATION_TYPE_LABELS: Record<CertificationType, I18nString> = {
  'first-aid': { pl: 'Pierwsza pomoc', de: 'Erste Hilfe', en: 'First Aid' },
  'bhp-specialist': { pl: 'Specjalista BHP', de: 'Arbeitssicherheitsspezialist', en: 'H&S Specialist' },
  'fire-inspector': { pl: 'Inspektor p.poż.', de: 'Brandschutzinspektor', en: 'Fire Inspector' },
  forklift: { pl: 'Wózek widłowy', de: 'Gabelstapler', en: 'Forklift' },
  sep: { pl: 'SEP', de: 'SEP', en: 'SEP' },
  'sep-supervision': { pl: 'SEP nadzór', de: 'SEP Aufsicht', en: 'SEP Supervision' },
  lift: { pl: 'Podnośnik', de: 'Hebebühne', en: 'Lift' },
  crane: { pl: 'Suwnica', de: 'Kran', en: 'Crane' },
  heights: { pl: 'Praca na wysokości', de: 'Höhenarbeit', en: 'Working at Heights' },
};

// ── Education Levels ─────────────────────────────────────────────────
export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, I18nString> = {
  none: { pl: 'Brak wymagań', de: 'Keine Anforderung', en: 'No requirement' },
  vocational: { pl: 'Zawodowe', de: 'Berufsausbildung', en: 'Vocational' },
  'secondary-general': { pl: 'Średnie ogólne', de: 'Allgemeine Sekundarstufe', en: 'Secondary (general)' },
  'secondary-specialized': { pl: 'Średnie kierunkowe', de: 'Fachsekundarstufe', en: 'Secondary (specialized)' },
  'higher-general': { pl: 'Wyższe ogólne', de: 'Allgemeines Hochschulstudium', en: 'Higher (general)' },
  'higher-specialized': { pl: 'Wyższe kierunkowe', de: 'Fachstudium', en: 'Higher (specialized)' },
};

// ── Experience Levels ────────────────────────────────────────────────
export const EXPERIENCE_LEVEL_LABELS: Record<ExperienceLevel, I18nString> = {
  none: { pl: 'Brak wymagań', de: 'Keine Anforderung', en: 'No requirement' },
  '1yr': { pl: '1 rok', de: '1 Jahr', en: '1 year' },
  '2yr': { pl: '2 lata', de: '2 Jahre', en: '2 years' },
  '3yr': { pl: '3 lata', de: '3 Jahre', en: '3 years' },
  '4yr': { pl: '4 lata', de: '4 Jahre', en: '4 years' },
  '5yr': { pl: '5 lat', de: '5 Jahre', en: '5 years' },
};

// ── Evaluation Period Types ──────────────────────────────────────────
export const EVALUATION_PERIOD_LABELS: Record<EvaluationPeriodKind, I18nString> = {
  annual: { pl: 'Roczna', de: 'Jährlich', en: 'Annual' },
  'pre-hire': { pl: 'Przed zatrudnieniem', de: 'Vor der Einstellung', en: 'Pre-hire' },
  'probation-2m': { pl: 'Okres próbny (2 mies.)', de: 'Probezeit (2 Mon.)', en: 'Probation (2 mo.)' },
  'probation-5m': { pl: 'Okres próbny (5 mies.)', de: 'Probezeit (5 Mon.)', en: 'Probation (5 mo.)' },
  'contract-end': { pl: 'Koniec umowy', de: 'Vertragsende', en: 'Contract end' },
};

// ── Rating Level Labels ──────────────────────────────────────────────
export const RATING_LABELS: Record<number, I18nString> = {
  1: { pl: 'Podstawowy', de: 'Grundlegend', en: 'Basic' },
  2: { pl: 'Zaawansowany', de: 'Fortgeschritten', en: 'Advanced' },
  3: { pl: 'Ekspercki', de: 'Experte', en: 'Expert' },
};

// ── Match % color thresholds ─────────────────────────────────────────
export const MATCH_THRESHOLDS = {
  green: 80,
  yellow: 60,
} as const;

// ── MongoDB collection names ─────────────────────────────────────────
export const COLLECTIONS = {
  competencies: 'competency_matrix_competencies',
  positions: 'competency_matrix_positions',
  evaluationPeriods: 'competency_matrix_evaluation_periods',
  assessments: 'competency_matrix_assessments',
  employeeCertifications: 'competency_matrix_employee_certifications',
  competencyMatrixConfigs: 'competency_matrix_configs',
  employees: 'employees',
} as const;
