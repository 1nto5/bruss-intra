# Email Language Configuration

## Overview

- **Polish (PL):** Employees, Team Leaders, Group Leaders
- **English (EN):** Supervisors, Managers (Quality, Production, Plant)
- **Footer:** Always trilingual (PL/EN/DE)

---

## bruss-intra

### Overtime Submissions (`overtime-submissions/actions/utils.ts`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| `sendRejectionEmailToEmployee` | Employee | PL |
| `sendApprovalEmailToEmployee` | Employee | PL |

### Overtime Orders (`overtime-orders/actions/utils.ts`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| `sendEmailNotificationToRequestor` | Employee | PL |

### Deviations (`deviations/actions.ts`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| `sendGroupLeaderNotification` | Group Leader | PL |
| `sendRoleNotification` (quality-manager) | Manager | EN |
| `sendRoleNotification` (production-manager) | Manager | EN |
| `sendVacancyNotificationToPlantManager` | Plant Manager | EN |
| `sendNoGroupLeaderNotification` | Plant Manager | EN |
| `sendApprovalDecisionNotificationToOwner` | Employee | PL |
| `sendCorrectiveActionAssignmentNotification` | Employee | PL |
| `sendRejectionReevaluationNotification` | Manager | EN |
| `sendTeamLeaderNotificationForPrint` | Team Leader | PL |

---

## bruss-cron

### Overtime Submissions

| Job | Recipient | Language |
|-----|-----------|----------|
| `send-balance-reminders.js` | Employee | PL |
| `send-approval-reminders.js` (supervisors) | Supervisor | EN |
| `send-approval-reminders.js` (plant-managers) | Plant Manager | EN |
| `send-supervisor-month-end-report.js` | Supervisor | EN |
| `send-month-end-report.js` | Plant Manager | EN |

### Overtime Orders (`send-reminders.js`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| Pending pre-approval | Production Manager | EN |
| Pending final approval | Plant Manager | EN |
| Attendance reminder | Employee | PL |

### Deviations (`send-reminders.js`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| Awaiting approval | Group Leader | PL |
| Awaiting approval | Quality Manager | EN |
| Awaiting approval | Production Manager | EN |
| Plant manager final | Plant Manager | EN |
| Vacancy notification | Plant Manager | EN |

### HR Training (`evaluation-notifications.js`)

| Notification | Recipient | Language |
|--------------|-----------|----------|
| Evaluation reminder | Supervisor | PL |
| Error/summary report | HR | PL |

---

## Footer

All emails include trilingual footer:

> Wiadomość wysłana automatycznie. Nie odpowiadaj. / Message sent automatically. Do not reply. / Nachricht automatisch gesendet. Bitte nicht antworten.
