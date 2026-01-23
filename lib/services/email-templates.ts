/**
 * Single-Language Email Template System
 * Emails sent in Polish (employees/team leaders/group leaders) or English (managers/supervisors)
 */

import { extractNameFromEmail as formatInitialAndSurname } from '@/lib/utils/name-format';

export type EmailLang = 'pl' | 'en';

type Lang = 'pl' | 'en' | 'de';

// Supported languages constant (kept for translations reference)
const SUPPORTED_LANGS: Lang[] = ['pl', 'en', 'de'];

// Common translations used across emails
const COMMON = {
  goToDeviation: {
    pl: 'Przejdź do odchylenia',
    en: 'Go to deviation',
    de: 'Zur Abweichung gehen',
  },
  goToRequest: {
    pl: 'Przejdź do wniosku',
    en: 'Go to request',
    de: 'Zum Antrag gehen',
  },
  area: {
    pl: 'Obszar',
    en: 'Area',
    de: 'Bereich',
  },
  deadline: {
    pl: 'Termin wykonania',
    en: 'Deadline',
    de: 'Frist',
  },
  actionDescription: {
    pl: 'Opis akcji',
    en: 'Action description',
    de: 'Aktionsbeschreibung',
  },
  comment: {
    pl: 'Komentarz',
    en: 'Comment',
    de: 'Kommentar',
  },
  approved: {
    pl: 'zatwierdzone',
    en: 'approved',
    de: 'genehmigt',
  },
  rejected: {
    pl: 'odrzucone',
    en: 'rejected',
    de: 'abgelehnt',
  },
  approval: {
    pl: 'zatwierdzenie',
    en: 'approval',
    de: 'Genehmigung',
  },
  created: {
    pl: 'Utworzono',
    en: 'Created',
    de: 'Erstellt',
  },
  edited: {
    pl: 'Edytowano',
    en: 'Edited',
    de: 'Bearbeitet',
  },
  general: {
    pl: 'Ogólny',
    en: 'General',
    de: 'Allgemein',
  },
} as const;

// Role translations
export const ROLE_TRANSLATIONS_TRILINGUAL = {
  group_leader: { pl: 'Group Leader', en: 'Group Leader', de: 'Gruppenleiter' },
  quality_manager: { pl: 'Kierownik Jakości', en: 'Quality Manager', de: 'Qualitätsleiter' },
  production_manager: { pl: 'Kierownik Produkcji', en: 'Production Manager', de: 'Produktionsleiter' },
  technology_manager: { pl: 'Kierownik Technologii', en: 'Technology Manager', de: 'Technologieleiter' },
  maintenance_manager: { pl: 'Kierownik Utrzymania Ruchu', en: 'Maintenance Manager', de: 'Instandhaltungsleiter' },
  plant_manager: { pl: 'Dyrektor Zakładu', en: 'Plant Manager', de: 'Werksleiter' },
  team_leader: { pl: 'Team Leader', en: 'Team Leader', de: 'Teamleiter' },
  logistics_manager: { pl: 'Kierownik Logistyki', en: 'Logistics Manager', de: 'Logistikleiter' },
} as const;

type RoleKey = keyof typeof ROLE_TRANSLATIONS_TRILINGUAL;

// Area translations for display
const AREA_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  coating: { pl: 'POWLEKANIE', en: 'COATING', de: 'BESCHICHTUNG' },
};

// Helper to get translated area
const getAreaDisplay = (area: string, lang: Lang): string => {
  const translated = AREA_TRANSLATIONS[area.toLowerCase()]?.[lang];
  return translated || area.toUpperCase();
};

// Helper to get translated role
export const getTranslatedRole = (role: string, lang: Lang): string => {
  const translations = ROLE_TRANSLATIONS_TRILINGUAL[role as RoleKey];
  return translations?.[lang] || role;
};

// Styling constants
const STYLES = {
  button: `display: inline-block; padding: 10px 20px; font-size: 16px; color: white; background-color: #007bff; text-decoration: none; border-radius: 5px;`,
  warning: `color: red; font-weight: bold;`,
  warningOrange: `color: orange; font-weight: bold;`,
  separator: `border: none; border-top: 1px solid #ccc; margin: 20px 0;`,
  langHeader: `font-size: 12px; color: #666; margin-bottom: 5px;`,
  section: `margin-bottom: 25px;`,
};

// Button component
const button = (url: string, text: Record<Lang, string>, lang: Lang): string =>
  `<a href="${url}" style="${STYLES.button}">${text[lang]}</a>`;

// Language section wrapper
const langSection = (lang: Lang, content: string): string => {
  const flags: Record<Lang, string> = { pl: '🇵🇱', en: '🇬🇧', de: '🇩🇪' };
  const names: Record<Lang, string> = { pl: 'Polski', en: 'English', de: 'Deutsch' };
  return `
    <div style="${STYLES.section}">
      <div style="${STYLES.langHeader}">${flags[lang]} ${names[lang]}</div>
      ${content}
    </div>
  `;
};

// Build trilingual email content (kept for backwards compatibility)
const buildTrilingualEmail = (
  contentBuilder: (lang: Lang) => string
): string => {
  return `
    <div style="font-family: sans-serif; max-width: 600px;">
      ${SUPPORTED_LANGS.map((lang, i) =>
        langSection(lang, contentBuilder(lang)) +
        (i < SUPPORTED_LANGS.length - 1 ? `<hr style="${STYLES.separator}" />` : '')
      ).join('')}
    </div>
  `;
};

// Build single-language email content
const buildSingleLanguageEmail = (
  lang: EmailLang,
  contentBuilder: (lang: EmailLang) => string
): string => {
  return `
    <div style="font-family: sans-serif; max-width: 600px;">
      ${contentBuilder(lang)}
    </div>
  `;
};

// Helper to get subject for specific language
const getSubject = (translations: Record<EmailLang, string>, lang: EmailLang): string => {
  return translations[lang];
};

// ============================================
// DEVIATION EMAIL TEMPLATES
// ============================================

interface DeviationBaseParams {
  internalId: string;
  deviationUrl: string;
  isEdit?: boolean;
}

interface DeviationRoleNotificationParams extends DeviationBaseParams {
  role: string;
  area?: string | null;
  lang?: EmailLang;
}

export const deviationRoleNotification = ({
  internalId,
  deviationUrl,
  role,
  area,
  isEdit = false,
  lang = 'en',
}: DeviationRoleNotificationParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] - wymagane zatwierdzenie (${getTranslatedRole(role, 'pl')})`,
    en: `Deviation [${internalId}] - approval required (${getTranslatedRole(role, 'en')})`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const action = isEdit ? COMMON.edited[l] : COMMON.created[l];
    const roleTranslated = getTranslatedRole(role, l);
    const areaText = area?.toUpperCase() || COMMON.general[l];

    const messages: Record<EmailLang, string> = {
      pl: `${action} odchylenie [${internalId}] - wymagane zatwierdzenie przez: ${roleTranslated}.`,
      en: `${action} deviation [${internalId}] - approval required by: ${roleTranslated}.`,
    };

    return `
      <p>${messages[l]}</p>
      <p>${COMMON.area[l]}: ${areaText}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface DeviationVacancyNotificationParams extends DeviationBaseParams {
  vacantRole: string;
  lang?: EmailLang;
}

export const deviationVacancyNotification = ({
  internalId,
  deviationUrl,
  vacantRole,
  isEdit = false,
  lang = 'en',
}: DeviationVacancyNotificationParams) => {
  const vacantRoleTranslated = (l: EmailLang) => getTranslatedRole(vacantRole, l);

  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] - wymagane zatwierdzenie (wakat - ${vacantRoleTranslated('pl')})`,
    en: `Deviation [${internalId}] - approval required (vacancy - ${vacantRoleTranslated('en')})`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const action = isEdit ? COMMON.edited[l] : COMMON.created[l];

    const messages: Record<EmailLang, string> = {
      pl: `${action} odchylenie [${internalId}] - wymagane zatwierdzenie.`,
      en: `${action} deviation [${internalId}] - approval required.`,
    };

    const warnings: Record<EmailLang, string> = {
      pl: `Powiadomienie wysłano do Dyrektora Zakładu z powodu wakatu na stanowisku: ${vacantRoleTranslated(l)}.`,
      en: `Notification sent to Plant Manager due to vacancy at position: ${vacantRoleTranslated(l)}.`,
    };

    return `
      <p>${messages[l]}</p>
      <p style="${STYLES.warning}">${warnings[l]}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface DeviationNoGroupLeaderParams extends DeviationBaseParams {
  area: string;
  lang?: EmailLang;
}

export const deviationNoGroupLeaderNotification = ({
  internalId,
  deviationUrl,
  area,
  isEdit = false,
  lang = 'en',
}: DeviationNoGroupLeaderParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] - wymagane zatwierdzenia (wakat Group Leader)`,
    en: `Deviation [${internalId}] - approval required (Group Leader vacancy)`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const action = isEdit ? COMMON.edited[l] : COMMON.created[l];
    const areaUpper = area?.toUpperCase();

    const messages: Record<EmailLang, string> = {
      pl: `${action} odchylenie [${internalId}] w obszarze ${areaUpper}, które wymaga zatwierdzenia.`,
      en: `${action} deviation [${internalId}] in area ${areaUpper}, which requires approval.`,
    };

    const warnings: Record<EmailLang, string> = {
      pl: `Powiadomienie wysłano do Dyrektora Zakładu z powodu braku przypisanego: Group Leadera (${areaUpper}).`,
      en: `Notification sent to Plant Manager due to missing: Group Leader (${areaUpper}).`,
    };

    return `
      <p>${messages[l]}</p>
      <p style="${STYLES.warningOrange}">${warnings[l]}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface CorrectiveActionAssignmentParams {
  internalId: string;
  deviationUrl: string;
  description: string;
  deadline: string;
  lang?: EmailLang;
}

export const correctiveActionAssignmentNotification = ({
  internalId,
  deviationUrl,
  description,
  deadline,
  lang = 'pl',
}: CorrectiveActionAssignmentParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Przypisano akcję korygującą w odchyleniu [${internalId}]`,
    en: `Corrective action assigned in deviation [${internalId}]`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Zostałeś/aś wyznaczony/a jako osoba odpowiedzialna za wykonanie akcji korygującej w odchyleniu [${internalId}].`,
      en: `You have been assigned as the person responsible for completing a corrective action in deviation [${internalId}].`,
    };

    return `
      <p>${messages[l]}</p>
      <p><strong>${COMMON.actionDescription[l]}:</strong> ${description}</p>
      <p><strong>${COMMON.deadline[l]}:</strong> ${deadline}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface RejectionReevaluationParams {
  internalId: string;
  deviationUrl: string;
  reason: 'corrective_action' | 'attachment';
  lang?: EmailLang;
}

export const rejectionReevaluationNotification = ({
  internalId,
  deviationUrl,
  reason,
  lang = 'en',
}: RejectionReevaluationParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] - aktualizacja (wymaga ponownej weryfikacji)`,
    en: `Deviation [${internalId}] - update (requires re-verification)`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const reasonTexts: Record<typeof reason, Record<EmailLang, string>> = {
      corrective_action: {
        pl: 'dodano nową akcję korygującą',
        en: 'a new corrective action was added',
      },
      attachment: {
        pl: 'dodano nowy załącznik',
        en: 'a new attachment was added',
      },
    };

    const messages: Record<EmailLang, string> = {
      pl: `W odchyleniu [${internalId}], które wcześniej odrzuciłeś/aś, ${reasonTexts[reason][l]}.`,
      en: `In deviation [${internalId}], which you previously rejected, ${reasonTexts[reason][l]}.`,
    };

    return `
      <p>${messages[l]}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface ApprovalDecisionParams {
  internalId: string;
  deviationUrl: string;
  decision: 'approved' | 'rejected';
  approverEmail: string;
  approverRole: string;
  comment?: string | null;
  lang?: EmailLang;
}

export const approvalDecisionNotification = ({
  internalId,
  deviationUrl,
  decision,
  approverEmail,
  approverRole,
  comment,
  lang = 'pl',
}: ApprovalDecisionParams) => {
  const decisionText = (l: EmailLang) => COMMON[decision][l];
  const roleTranslated = (l: EmailLang) => getTranslatedRole(approverRole, l);
  const approverName = extractNameFromEmail(approverEmail);

  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] zostało ${decisionText('pl')}`,
    en: `Deviation [${internalId}] was ${decisionText('en')}`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Twoje odchylenie [${internalId}] zostało ${decisionText(l)} przez ${approverName} (${roleTranslated(l)}).`,
      en: `Your deviation [${internalId}] was ${decisionText(l)} by ${approverName} (${roleTranslated(l)}).`,
    };

    const commentSection = decision === 'rejected' && comment
      ? `<p><strong>${COMMON.comment[l]}:</strong> ${comment}</p>`
      : '';

    return `
      <p>${messages[l]}</p>
      ${commentSection}
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface PrintImplementationParams {
  internalId: string;
  deviationUrl: string;
  area: string;
  lang?: EmailLang;
}

export const printImplementationNotification = ({
  internalId,
  deviationUrl,
  area,
  lang = 'pl',
}: PrintImplementationParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] wymaga wydruku i wdrożenia`,
    en: `Deviation [${internalId}] requires printing and implementation`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const areaDisplay = getAreaDisplay(area, l);

    const messages: Record<EmailLang, string> = {
      pl: `Odchylenie [${internalId}] zostało zatwierdzone - wymaga wydruku i wdrożenia na: ${areaDisplay}`,
      en: `Deviation [${internalId}] has been approved - requires printing and implementation at: ${areaDisplay}`,
    };

    return `
      <p>${messages[l]}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface PlantManagerFinalApprovalParams {
  internalId: string;
  deviationUrl: string;
  lang?: EmailLang;
}

export const plantManagerFinalApprovalNotification = ({
  internalId,
  deviationUrl,
  lang = 'en',
}: PlantManagerFinalApprovalParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: `Odchylenie [${internalId}] - wymaga decyzji Dyrektora Zakładu`,
    en: `Deviation [${internalId}] - requires Plant Manager decision`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Wszystkie stanowiska zatwierdziły odchylenie [${internalId}], czeka na decyzję Dyrektora Zakładu.`,
      en: `All positions have approved deviation [${internalId}], awaiting Plant Manager decision.`,
    };

    return `
      <p>${messages[l]}</p>
      <p>${button(deviationUrl, COMMON.goToDeviation, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

// ============================================
// OVERTIME EMAIL TEMPLATES
// ============================================

// Common button text for overtime
const OVERTIME_BUTTONS = {
  openOrder: {
    pl: 'Otwórz zlecenie',
    en: 'Open order',
    de: 'Auftrag öffnen',
  },
  openSubmission: {
    pl: 'Otwórz zgłoszenie',
    en: 'Open submission',
    de: 'Meldung öffnen',
  },
};

interface OvertimeOrderApprovalParams {
  requestUrl: string;
  approverName: string;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  payment?: boolean;
  scheduledDayOff?: Date | null;
}

export const overtimeOrderApprovalNotification = ({
  requestUrl,
  approverName,
  workStartTime,
  workEndTime,
  hours,
  payment,
  scheduledDayOff,
}: OvertimeOrderApprovalParams) => {
  const subject = 'Collective overtime order approved';

  const html = buildSingleLanguageEmail('en', () => {
    // Build work details section
    let workDetails = '';
    if (workStartTime && workEndTime) {
      const formatTime = (d: Date): string => {
        return new Date(d).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      };
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} hrs)` : '';
      workDetails = `<p><strong>Planned work time:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    }

    // Build compensation details
    let compensationDetails = '';
    if (payment) {
      compensationDetails = '<p><strong>Compensation:</strong> Payout</p>';
    } else if (scheduledDayOff) {
      const dayOffStr = formatDatePL(new Date(scheduledDayOff));
      compensationDetails = `<p><strong>Compensation:</strong> Time off (${dayOffStr})</p>`;
    }

    return `
      <p>Your collective overtime order has been approved by: ${approverName}.</p>
      ${workDetails}
      ${compensationDetails}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openOrder, 'en')}</p>
    `;
  });

  return { subject, html, lang: 'en' as EmailLang };
};

interface OvertimeSubmissionRejectionParams {
  requestUrl: string;
  reason?: string | null;
  payment?: boolean;
  scheduledDayOff?: Date | null;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  date?: Date | null;
  lang?: EmailLang;
}

export const overtimeSubmissionRejectionNotification = ({
  requestUrl,
  reason,
  payment,
  scheduledDayOff,
  workStartTime,
  workEndTime,
  hours,
  date,
  lang = 'pl',
}: OvertimeSubmissionRejectionParams) => {
  const isWorkOrder = !!workStartTime && !!workEndTime;
  const isPlannedOvertime = payment || !!scheduledDayOff || isWorkOrder;

  const getSubject = (l: EmailLang): string => {
    if (isWorkOrder) {
      return l === 'pl' ? 'Planowana praca odrzucona' : 'Planned work rejected';
    }
    if (isPlannedOvertime) {
      return l === 'pl' ? 'Planowana praca odrzucona' : 'Planned overtime rejected';
    }
    return l === 'pl' ? 'Nadgodziny odrzucone' : 'Overtime rejected';
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const getMessage = (): string => {
      if (isWorkOrder) {
        return l === 'pl'
          ? 'Twoja planowana praca została odrzucona.'
          : 'Your planned work has been rejected.';
      }
      if (isPlannedOvertime) {
        return l === 'pl'
          ? 'Twoja planowana praca została odrzucona.'
          : 'Your planned overtime request has been rejected.';
      }
      return l === 'pl'
        ? 'Twoje zgłoszenie nadgodzin zostało odrzucone.'
        : 'Your overtime submission has been rejected.';
    };

    // Build work details section
    let workDetails = '';
    if (isWorkOrder && workStartTime && workEndTime) {
      const formatTime = (d: Date): string => {
        return new Date(d).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      };
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} ${l === 'pl' ? 'godz.' : 'hrs'})` : '';
      workDetails = l === 'pl'
        ? `<p><strong>Planowana praca:</strong> ${workDate}, godz. ${startTime}–${endTime}${hoursStr}</p>`
        : `<p><strong>Planned work:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    } else if (date && hours !== undefined) {
      const dateStr = formatDatePL(new Date(date));
      workDetails = l === 'pl'
        ? `<p><strong>Data:</strong> ${dateStr} (${hours} godz.)</p>`
        : `<p><strong>Date:</strong> ${dateStr} (${hours} hrs)</p>`;
    }

    const reasonLabel: Record<EmailLang, string> = {
      pl: 'Powód odrzucenia',
      en: 'Rejection reason',
    };

    const reasonSection = reason
      ? `<p><strong>${reasonLabel[l]}:</strong> ${reason}</p>`
      : '';

    return `
      <p>${getMessage()}</p>
      ${workDetails}
      ${reasonSection}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openSubmission, l)}</p>
    `;
  });

  return { subject: getSubject(lang), html, lang };
};

interface OvertimeSubmissionApprovalParams {
  requestUrl: string;
  stage: 'supervisor' | 'final';
  payment?: boolean;
  scheduledDayOff?: Date | null;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  date?: Date | null;
  lang?: EmailLang;
}

// Helper to format date for Polish display
const formatDatePL = (date: Date): string => {
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const overtimeSubmissionApprovalNotification = ({
  requestUrl,
  stage,
  payment,
  scheduledDayOff,
  workStartTime,
  workEndTime,
  hours,
  date,
  lang = 'pl',
}: OvertimeSubmissionApprovalParams) => {
  // Type 1: payment=true → "Planowana praca nadliczbowa" (wypłata)
  // Type 2: scheduledDayOff set → "Planowana praca nadliczbowa" (odbiór z terminem)
  // Type 3: payment=false + no scheduledDayOff → "Nadgodziny" (odbiór bez terminu)
  const isWorkOrder = !!workStartTime && !!workEndTime;

  const formatTime = (d: Date): string => {
    return new Date(d).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getSubject = (l: EmailLang): string => {
    if (payment) {
      return l === 'pl'
        ? 'Planowana praca nadliczbowa zatwierdzona (wypłata)'
        : 'Planned overtime approved (payout)';
    }
    if (scheduledDayOff) {
      return l === 'pl'
        ? 'Planowana praca nadliczbowa zatwierdzona'
        : 'Planned overtime approved';
    }
    return l === 'pl' ? 'Nadgodziny zatwierdzone' : 'Overtime approved';
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    let message: string;
    let workDetails = '';
    let compensationDetails = '';

    // Build main message
    if (payment) {
      if (stage === 'supervisor') {
        message = l === 'pl'
          ? 'Twoje zlecenie planowanej pracy nadliczbowej do wypłaty zostało zatwierdzone przez przełożonego i oczekuje na zatwierdzenie przez Plant Managera.'
          : 'Your planned overtime request for payout has been approved by supervisor and awaits Plant Manager approval.';
      } else {
        message = l === 'pl'
          ? 'Twoje zlecenie planowanej pracy nadliczbowej zostało zatwierdzone do wypłaty!'
          : 'Your planned overtime request has been approved for payout!';
      }
    } else if (scheduledDayOff) {
      message = l === 'pl'
        ? 'Twoje zgłoszenie planowanej pracy nadliczbowej zostało zatwierdzone.'
        : 'Your planned overtime submission has been approved.';
    } else {
      message = l === 'pl'
        ? 'Twoje zgłoszenie nadgodzin zostało zatwierdzone.'
        : 'Your overtime submission has been approved.';
    }

    // Build work details section
    if (isWorkOrder && workStartTime && workEndTime) {
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} ${l === 'pl' ? 'godz.' : 'hrs'})` : '';
      workDetails = l === 'pl'
        ? `<p><strong>Planowana praca:</strong> ${workDate}, godz. ${startTime}–${endTime}${hoursStr}</p>`
        : `<p><strong>Planned work:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    } else if (date && hours !== undefined) {
      // Regular overtime
      const dateStr = formatDatePL(new Date(date));
      workDetails = l === 'pl'
        ? `<p><strong>Data:</strong> ${dateStr} (${hours} godz.)</p>`
        : `<p><strong>Date:</strong> ${dateStr} (${hours} hrs)</p>`;
    }

    // Build compensation details (only for work orders)
    if (isWorkOrder) {
      if (payment) {
        compensationDetails = l === 'pl'
          ? '<p><strong>Forma rozliczenia:</strong> Wypłata</p>'
          : '<p><strong>Compensation:</strong> Payout</p>';
      } else if (scheduledDayOff) {
        const dayOffStr = formatDatePL(new Date(scheduledDayOff));
        compensationDetails = l === 'pl'
          ? `<p><strong>Forma rozliczenia:</strong> Odbiór czasu wolnego dnia ${dayOffStr}</p>`
          : `<p><strong>Compensation:</strong> Time off on ${dayOffStr}</p>`;
      }
    }

    return `
      <p>${message}</p>
      ${workDetails}
      ${compensationDetails}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openSubmission, l)}</p>
    `;
  });

  return { subject: getSubject(lang), html, lang };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function extractNameFromEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const localPart = email.split('@')[0] || '';
  if (!localPart) return email;
  return (
    localPart
      .split('.')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || email
  );
}

// ============================================
// OVERTIME REMINDER EMAIL TEMPLATES
// ============================================

// Common button text for overtime balances
const OVERTIME_BALANCES_BUTTONS = {
  viewOvertime: {
    pl: 'Przejdź do nadgodzin',
    en: 'View overtime',
    de: 'Überstunden anzeigen',
  },
  viewBalances: {
    pl: 'Przejdź do sald',
    en: 'View balances',
    de: 'Konten anzeigen',
  },
};

interface EmployeeOvertimeReminderParams {
  employeeEmail: string;
  totalHours: number;
  customNote?: string;
  senderEmail?: string;
  balancesUrl: string;
  lang?: EmailLang;
}

export const employeeOvertimeReminderNotification = ({
  employeeEmail,
  totalHours,
  customNote,
  senderEmail,
  balancesUrl,
  lang = 'pl',
}: EmployeeOvertimeReminderParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: 'Przypomnienie: Proszę rozliczyć nadgodziny',
    en: 'Reminder: Please settle your overtime',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Proszę o rozliczenie zaległych nadgodzin. Aktualny stan: <strong>${totalHours}h</strong>.`,
      en: `Please settle your pending overtime. Current balance: <strong>${totalHours}h</strong>.`,
    };

    let noteSection = '';
    if (customNote) {
      const senderName = senderEmail ? formatInitialAndSurname(senderEmail) : '';
      const noteLabel = l === 'pl'
        ? (senderName ? `Notatka od ${senderName}` : 'Notatka')
        : (senderName ? `Note from ${senderName}` : 'Note');
      noteSection = `<p style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #007bff;"><strong>${noteLabel}:</strong> ${customNote}</p>`;
    }

    return `
      <p>${messages[l]}</p>
      ${noteSection}
      <p>${button(balancesUrl, OVERTIME_BALANCES_BUTTONS.viewOvertime, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface SupervisorOvertimeNotificationParams {
  supervisorEmail: string;
  employeeEmail: string;
  totalHours: number;
  customNote?: string;
  senderEmail?: string;
  balancesUrl: string;
  lang?: EmailLang;
}

export const supervisorOvertimeNotification = ({
  supervisorEmail,
  employeeEmail,
  totalHours,
  customNote,
  senderEmail,
  balancesUrl,
  lang = 'en',
}: SupervisorOvertimeNotificationParams) => {
  const employeeName = extractNameFromEmail(employeeEmail);

  const subjects: Record<EmailLang, string> = {
    pl: `Saldo nadgodzin: ${employeeName} - wymaga działania`,
    en: `Overtime balance: ${employeeName} - action needed`,
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Pracownik <strong>${employeeName}</strong> ma nierozliczone saldo nadgodzin: <strong>${totalHours}h</strong>.`,
      en: `Employee <strong>${employeeName}</strong> has unsettled overtime balance: <strong>${totalHours}h</strong>.`,
    };

    const actionMessages: Record<EmailLang, string> = {
      pl: 'Proszę o kontakt z pracownikiem w sprawie rozliczenia nadgodzin.',
      en: 'Please contact the employee regarding overtime settlement.',
    };

    let noteSection = '';
    if (customNote) {
      const senderName = senderEmail ? formatInitialAndSurname(senderEmail) : '';
      const noteLabel = l === 'pl'
        ? (senderName ? `Notatka od ${senderName}` : 'Notatka')
        : (senderName ? `Note from ${senderName}` : 'Note');
      noteSection = `<p style="margin-top: 15px; padding: 10px; background-color: #f5f5f5; border-left: 3px solid #007bff;"><strong>${noteLabel}:</strong> ${customNote}</p>`;
    }

    return `
      <p>${messages[l]}</p>
      <p>${actionMessages[l]}</p>
      ${noteSection}
      <p>${button(balancesUrl, OVERTIME_BALANCES_BUTTONS.viewBalances, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

// ============================================
// INDIVIDUAL OVERTIME ORDER EMAIL TEMPLATES
// ============================================

interface IndividualOvertimeOrderApprovalParams {
  requestUrl: string;
  stage: 'supervisor' | 'final';
  payment: boolean;
  approverName: string;
  scheduledDayOff?: Date | null;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  lang?: EmailLang;
}

export const individualOvertimeOrderApprovalNotification = ({
  requestUrl,
  stage,
  payment,
  approverName,
  scheduledDayOff,
  workStartTime,
  workEndTime,
  hours,
  lang = 'pl',
}: IndividualOvertimeOrderApprovalParams) => {
  const formatTime = (d: Date): string => {
    return new Date(d).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getSubject = (l: EmailLang): string => {
    if (stage === 'supervisor') {
      return l === 'pl'
        ? 'Indywidualne zlecenie nadgodzin - zatwierdzone przez przełożonego'
        : 'Individual overtime order - approved by supervisor';
    }
    if (payment) {
      return l === 'pl'
        ? 'Indywidualne zlecenie nadgodzin zatwierdzone (wypłata)'
        : 'Individual overtime order approved (payout)';
    }
    return l === 'pl'
      ? 'Indywidualne zlecenie nadgodzin zatwierdzone'
      : 'Individual overtime order approved';
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    let message: string;
    let workDetails = '';
    let compensationDetails = '';

    // Build main message
    if (stage === 'supervisor') {
      message = l === 'pl'
        ? 'Twoje indywidualne zlecenie nadgodzin zostało zatwierdzone przez przełożonego i oczekuje na zatwierdzenie przez Plant Managera.'
        : 'Your individual overtime order has been approved by supervisor and awaits Plant Manager approval.';
    } else if (payment) {
      message = l === 'pl'
        ? 'Twoje indywidualne zlecenie nadgodzin zostało zatwierdzone do wypłaty!'
        : 'Your individual overtime order has been approved for payout!';
    } else {
      message = l === 'pl'
        ? 'Twoje indywidualne zlecenie nadgodzin zostało zatwierdzone.'
        : 'Your individual overtime order has been approved.';
    }

    // Approver info
    const approverInfo = l === 'pl'
      ? `<p><strong>Zatwierdzone przez:</strong> ${approverName}</p>`
      : `<p><strong>Approved by:</strong> ${approverName}</p>`;

    // Build work details section
    if (workStartTime && workEndTime) {
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} ${l === 'pl' ? 'godz.' : 'hrs'})` : '';
      workDetails = l === 'pl'
        ? `<p><strong>Planowana praca:</strong> ${workDate}, godz. ${startTime}–${endTime}${hoursStr}</p>`
        : `<p><strong>Planned work:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    }

    // Build compensation details
    if (payment) {
      compensationDetails = l === 'pl'
        ? '<p><strong>Forma rozliczenia:</strong> Wypłata</p>'
        : '<p><strong>Compensation:</strong> Payout</p>';
    } else if (scheduledDayOff) {
      const dayOffStr = formatDatePL(new Date(scheduledDayOff));
      compensationDetails = l === 'pl'
        ? `<p><strong>Forma rozliczenia:</strong> Odbiór czasu wolnego dnia ${dayOffStr}</p>`
        : `<p><strong>Compensation:</strong> Time off on ${dayOffStr}</p>`;
    }

    return `
      <p>${message}</p>
      ${approverInfo}
      ${workDetails}
      ${compensationDetails}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openOrder, l)}</p>
    `;
  });

  return { subject: getSubject(lang), html, lang };
};

interface IndividualOvertimeOrderRejectionParams {
  requestUrl: string;
  reason?: string | null;
  payment: boolean;
  scheduledDayOff?: Date | null;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  lang?: EmailLang;
}

interface IndividualOvertimeOrderCreationParams {
  requestUrl: string;
  payment: boolean;
  scheduledDayOff?: Date | null;
  workStartTime?: Date | null;
  workEndTime?: Date | null;
  hours?: number;
  creatorName?: string;
  lang?: EmailLang;
}

export const individualOvertimeOrderCreationNotification = ({
  requestUrl,
  payment,
  scheduledDayOff,
  workStartTime,
  workEndTime,
  hours,
  creatorName,
  lang = 'pl',
}: IndividualOvertimeOrderCreationParams) => {
  const formatTime = (d: Date): string => {
    return new Date(d).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const getSubject = (l: EmailLang): string => {
    if (payment) {
      return l === 'pl'
        ? 'Nowe indywidualne zlecenie nadgodzin (wypłata)'
        : 'New individual overtime order (payout)';
    }
    return l === 'pl'
      ? 'Nowe indywidualne zlecenie nadgodzin'
      : 'New individual overtime order';
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    let message: string;
    let workDetails = '';
    let compensationDetails = '';

    // Build main message
    const creatorText = creatorName
      ? l === 'pl'
        ? ` przez ${creatorName}`
        : ` by ${creatorName}`
      : '';

    message = l === 'pl'
      ? `Utworzono dla Ciebie nowe indywidualne zlecenie nadgodzin${creatorText}.`
      : `A new individual overtime order has been created for you${creatorText}.`;

    // Build work details section
    if (workStartTime && workEndTime) {
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} ${l === 'pl' ? 'godz.' : 'hrs'})` : '';
      workDetails = l === 'pl'
        ? `<p><strong>Planowana praca:</strong> ${workDate}, godz. ${startTime}–${endTime}${hoursStr}</p>`
        : `<p><strong>Planned work:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    }

    // Build compensation details
    if (payment) {
      compensationDetails = l === 'pl'
        ? '<p><strong>Forma rozliczenia:</strong> Wypłata</p>'
        : '<p><strong>Compensation:</strong> Payout</p>';
    } else if (scheduledDayOff) {
      const dayOffStr = formatDatePL(new Date(scheduledDayOff));
      compensationDetails = l === 'pl'
        ? `<p><strong>Forma rozliczenia:</strong> Odbiór czasu wolnego dnia ${dayOffStr}</p>`
        : `<p><strong>Compensation:</strong> Time off on ${dayOffStr}</p>`;
    }

    return `
      <p>${message}</p>
      ${workDetails}
      ${compensationDetails}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openOrder, l)}</p>
    `;
  });

  return { subject: getSubject(lang), html, lang };
};

export const individualOvertimeOrderRejectionNotification = ({
  requestUrl,
  reason,
  payment,
  scheduledDayOff,
  workStartTime,
  workEndTime,
  hours,
  lang = 'pl',
}: IndividualOvertimeOrderRejectionParams) => {
  const formatTime = (d: Date): string => {
    return new Date(d).toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const subjects: Record<EmailLang, string> = {
    pl: 'Indywidualne zlecenie nadgodzin odrzucone',
    en: 'Individual overtime order rejected',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const message = l === 'pl'
      ? 'Twoje indywidualne zlecenie nadgodzin zostało odrzucone.'
      : 'Your individual overtime order has been rejected.';

    // Build work details section
    let workDetails = '';
    if (workStartTime && workEndTime) {
      const workDate = formatDatePL(new Date(workStartTime));
      const startTime = formatTime(workStartTime);
      const endTime = formatTime(workEndTime);
      const hoursStr = hours !== undefined ? ` (${hours} ${l === 'pl' ? 'godz.' : 'hrs'})` : '';
      workDetails = l === 'pl'
        ? `<p><strong>Planowana praca:</strong> ${workDate}, godz. ${startTime}–${endTime}${hoursStr}</p>`
        : `<p><strong>Planned work:</strong> ${workDate}, ${startTime}–${endTime}${hoursStr}</p>`;
    }

    const reasonLabel: Record<EmailLang, string> = {
      pl: 'Powód odrzucenia',
      en: 'Rejection reason',
    };

    const reasonSection = reason
      ? `<p><strong>${reasonLabel[l]}:</strong> ${reason}</p>`
      : '';

    return `
      <p>${message}</p>
      ${workDetails}
      ${reasonSection}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openOrder, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

// ============================================
// PASSWORD RESET EMAIL TEMPLATE
// ============================================

interface PasswordResetCodeParams {
  code: string;
  displayName?: string;
  lang?: EmailLang;
}

export const passwordResetCodeEmail = ({
  code,
  displayName,
  lang = 'pl',
}: PasswordResetCodeParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: 'Kod resetowania hasła',
    en: 'Password Reset Code',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const greetings: Record<EmailLang, string> = {
      pl: displayName ? `Cześć ${displayName},` : 'Cześć,',
      en: displayName ? `Hello ${displayName},` : 'Hello,',
    };

    const messages: Record<EmailLang, string> = {
      pl: 'Otrzymaliśmy prośbę o zresetowanie hasła. Użyj poniższego kodu:',
      en: 'You requested to reset your password. Use the following code:',
    };

    const expiryMessages: Record<EmailLang, string> = {
      pl: 'Kod wygasa za <strong>15 minut</strong>.',
      en: 'This code will expire in <strong>15 minutes</strong>.',
    };

    const ignoreMessages: Record<EmailLang, string> = {
      pl: 'Jeśli nie prosiłeś/aś o reset hasła, zignoruj tę wiadomość.',
      en: 'If you did not request a password reset, please ignore this email.',
    };

    return `
      <p>${greetings[l]}</p>
      <p>${messages[l]}</p>
      <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
      </div>
      <p>${expiryMessages[l]}</p>
      <p>${ignoreMessages[l]}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

// ============================================
// OVERTIME SUBMISSION CORRECTION EMAIL TEMPLATE
// ============================================

interface OvertimeSubmissionCorrectionParams {
  requestUrl: string;
  correctorEmail: string;
  reason: string;
  changes: Record<string, { from: any; to: any }>;
  statusChanged?: { from: string; to: string };
  hours?: number;
  date?: Date | null;
  lang?: EmailLang;
}

export const overtimeSubmissionCorrectionNotification = ({
  requestUrl,
  correctorEmail,
  reason,
  changes,
  statusChanged,
  hours,
  date,
  lang = 'pl',
}: OvertimeSubmissionCorrectionParams) => {
  const correctorName = extractNameFromEmail(correctorEmail);

  const subjects: Record<EmailLang, string> = {
    pl: 'Twoje zgłoszenie nadgodzin zostało skorygowane',
    en: 'Your overtime submission was corrected',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: `Twoje zgłoszenie nadgodzin zostało skorygowane przez <strong>${correctorName}</strong>.`,
      en: `Your overtime submission was corrected by <strong>${correctorName}</strong>.`,
    };

    const reasonLabel: Record<EmailLang, string> = {
      pl: 'Powód korekty',
      en: 'Correction reason',
    };

    const changesLabel: Record<EmailLang, string> = {
      pl: 'Wprowadzone zmiany',
      en: 'Changes made',
    };

    // Build date info
    let dateInfo = '';
    if (date && hours !== undefined) {
      const dateStr = formatDatePL(new Date(date));
      dateInfo = l === 'pl'
        ? `<p><strong>Zgłoszenie:</strong> ${dateStr} (${hours} godz.)</p>`
        : `<p><strong>Submission:</strong> ${dateStr} (${hours} hrs)</p>`;
    }

    // Build changes list
    const fieldNames: Record<string, Record<EmailLang, string>> = {
      supervisor: { pl: 'Przełożony', en: 'Supervisor' },
      date: { pl: 'Data', en: 'Date' },
      hours: { pl: 'Godziny', en: 'Hours' },
      reason: { pl: 'Powód', en: 'Reason' },
    };

    const formatValue = (key: string, value: any): string => {
      if (key === 'date' && value) {
        return formatDatePL(new Date(value));
      }
      if (key === 'supervisor' && value) {
        return extractNameFromEmail(value);
      }
      return String(value ?? '-');
    };

    let changesList = '';
    const changeEntries = Object.entries(changes);
    if (changeEntries.length > 0) {
      const changesHtml = changeEntries
        .map(([key, { from, to }]) => {
          const fieldName = fieldNames[key]?.[l] || key;
          return `<li><strong>${fieldName}:</strong> ${formatValue(key, from)} → ${formatValue(key, to)}</li>`;
        })
        .join('');
      changesList = `
        <p><strong>${changesLabel[l]}:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">${changesHtml}</ul>
      `;
    }

    // Status change info
    let statusInfo = '';
    if (statusChanged) {
      const statusLabels: Record<string, Record<EmailLang, string>> = {
        pending: { pl: 'oczekujące', en: 'pending' },
        approved: { pl: 'zatwierdzone', en: 'approved' },
        rejected: { pl: 'odrzucone', en: 'rejected' },
        cancelled: { pl: 'anulowane', en: 'cancelled' },
        accounted: { pl: 'rozliczone', en: 'accounted' },
      };
      const fromLabel = statusLabels[statusChanged.from]?.[l] || statusChanged.from;
      const toLabel = statusLabels[statusChanged.to]?.[l] || statusChanged.to;
      statusInfo = l === 'pl'
        ? `<p style="color: orange;"><strong>Status zmieniony:</strong> ${fromLabel} → ${toLabel}</p>`
        : `<p style="color: orange;"><strong>Status changed:</strong> ${fromLabel} → ${toLabel}</p>`;
    }

    return `
      <p>${messages[l]}</p>
      ${dateInfo}
      <p><strong>${reasonLabel[l]}:</strong> ${reason}</p>
      ${changesList}
      ${statusInfo}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openSubmission, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

// Export utilities
export { buildTrilingualEmail, buildSingleLanguageEmail, getSubject, COMMON, STYLES, button, extractNameFromEmail };
