/**
 * Single-Language Email Template System
 * Emails sent in Polish (employees/team leaders/group leaders) or English (managers/supervisors)
 */

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
  lang?: EmailLang;
}

export const overtimeOrderApprovalNotification = ({
  requestUrl,
  lang = 'pl',
}: OvertimeOrderApprovalParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: 'Zatwierdzone zlecanie wykonania pracy w godzinach nadliczbowych',
    en: 'Approved overtime work order',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: 'Twoje zlecenie wykonania pracy w godzinach nadliczbowych zostało zatwierdzone.',
      en: 'Your overtime work order has been approved.',
    };

    return `
      <p>${messages[l]}</p>
      <p>${button(requestUrl, OVERTIME_BUTTONS.openOrder, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface OvertimeSubmissionRejectionParams {
  requestUrl: string;
  reason?: string | null;
  lang?: EmailLang;
}

export const overtimeSubmissionRejectionNotification = ({
  requestUrl,
  reason,
  lang = 'pl',
}: OvertimeSubmissionRejectionParams) => {
  const subjects: Record<EmailLang, string> = {
    pl: 'Odrzucone nadgodziny',
    en: 'Rejected overtime',
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<EmailLang, string> = {
      pl: 'Twoje zgłoszenie nadgodzin zostało odrzucone.',
      en: 'Your overtime submission has been rejected.',
    };

    const reasonLabel: Record<EmailLang, string> = {
      pl: 'Powód odrzucenia',
      en: 'Rejection reason',
    };

    const reasonSection = reason
      ? `<p><strong>${reasonLabel[l]}:</strong> ${reason}</p>`
      : '';

    return `
      <p>${messages[l]}</p>
      ${reasonSection}
      <p>${button(requestUrl, OVERTIME_BUTTONS.openSubmission, l)}</p>
    `;
  });

  return { subject: subjects[lang], html, lang };
};

interface OvertimeSubmissionApprovalParams {
  requestUrl: string;
  stage: 'supervisor' | 'final';
  lang?: EmailLang;
}

export const overtimeSubmissionApprovalNotification = ({
  requestUrl,
  stage,
  lang = 'pl',
}: OvertimeSubmissionApprovalParams) => {
  const subjectsByStage: Record<'supervisor' | 'final', Record<EmailLang, string>> = {
    supervisor: {
      pl: 'Nadgodziny zatwierdzone przez przełożonego',
      en: 'Overtime approved by supervisor',
    },
    final: {
      pl: 'Zatwierdzone nadgodziny',
      en: 'Approved overtime',
    },
  };

  const html = buildSingleLanguageEmail(lang, (l) => {
    const messages: Record<typeof stage, Record<EmailLang, string>> = {
      supervisor: {
        pl: 'Twoje zgłoszenie nadgodzin zostało zatwierdzone przez przełożonego i oczekuje na zatwierdzenie przez Plant Managera.',
        en: 'Your overtime submission has been approved by supervisor and awaits Plant Manager approval.',
      },
      final: {
        pl: 'Twoje zgłoszenie nadgodzin zostało zatwierdzone!',
        en: 'Your overtime submission has been approved!',
      },
    };

    return `
      <p>${messages[stage][l]}</p>
      <p>${button(requestUrl, OVERTIME_BUTTONS.openSubmission, l)}</p>
    `;
  });

  return { subject: subjectsByStage[stage][lang], html, lang };
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

// Export utilities
export { buildTrilingualEmail, buildSingleLanguageEmail, getSubject, COMMON, STYLES, button, extractNameFromEmail };
