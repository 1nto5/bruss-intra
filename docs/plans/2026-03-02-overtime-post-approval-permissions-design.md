# Overtime Post-Approval Permissions Design

**Date:** 2026-03-02
**Status:** Draft
**Scope:** Individual Overtime Orders, Overtime Submissions, Overtime Orders

## Problem

Managers/supervisors who create overtime orders cannot edit or cancel them after plant-manager approval. When a mistake is discovered post-approval (e.g., wrong employee assigned), only HR or Admin can fix it. Managers are requesting the ability to correct or cancel approved records themselves.

## Decision

Extend existing `correct` and `cancel` permissions so that the order's **supervisor** and **creator** can act on `approved` records. When a supervisor/creator corrects an approved order, the status resets to `pending` for full re-approval. HR/Admin corrections continue to preserve the current status.

## Design

### Permission Changes

#### Who Can Correct Approved Orders

| Role                          | Before                 | After                          |
| ----------------------------- | ---------------------- | ------------------------------ |
| Admin                         | Yes (status preserved) | Yes (status preserved)         |
| HR                            | Yes (status preserved) | Yes (status preserved)         |
| Supervisor (order.supervisor) | No                     | Yes (status resets to pending) |
| Creator (order.createdBy)     | No                     | Yes (status resets to pending) |

#### Who Can Cancel Approved Orders

| Role                          | Before | After |
| ----------------------------- | ------ | ----- |
| Admin                         | No     | Yes   |
| HR                            | No     | Yes   |
| Supervisor (order.supervisor) | No     | Yes   |
| Creator (order.createdBy)     | No     | Yes   |
| Plant Manager                 | No     | Yes   |

### Status Reset on Supervisor/Creator Correction

When a supervisor or creator corrects an `approved` order (and they are not also HR/Admin), the following happens:

1. Status resets to `pending`
2. Approval fields are cleared:
   - `approvedAt`, `approvedBy`
   - `supervisorApprovedAt`, `supervisorApprovedBy`, `supervisorFinalApproval`
   - `plantManagerApprovedAt`, `plantManagerApprovedBy`
3. Correction history entry records:
   - `statusChanged: { from: 'approved', to: 'pending' }`
   - All changed field values
   - Mandatory reason
4. Email notification sent to the employee about the correction

HR/Admin corrections on approved orders preserve the `approved` status (existing behavior, unchanged).

### Per-Application Changes

#### 1. Individual Overtime Orders (first implementation)

**Server Actions (`actions/crud.ts`):**

- `correctOrder`: Add supervisor/creator permission check at `approved` status. Add status reset logic when corrector is supervisor/creator (not HR/admin).
- `cancelOrder`: Remove `approved` from the blocked status list. Keep `accounted` and `cancelled` as blocked. Add permission check: only supervisor, creator, HR, Admin, and plant-manager can cancel approved orders.

**UI Components:**

- `detail-actions.tsx`: Show "Correct" button when `status === 'approved'` AND (isSupervisor OR isCreator). Show "Cancel" button when `status === 'approved'` AND (isSupervisor OR isCreator OR isHR OR isAdmin OR isPlantManager).
- `table/columns.tsx`: Same permission expansion for row-level actions.

#### 2. Overtime Submissions (second implementation)

**Server Actions (`actions/crud.ts`):**

- `correctOvertimeSubmission`: Extend supervisor permission from `['pending', 'pending-plant-manager']` to include `'approved'`. Add creator as new allowed role for corrections. Add status reset logic.
- `cancelOvertimeSubmission`: Allow supervisor/creator (not just author) to cancel. Allow cancellation of `approved` status for supervisor/creator/HR/Admin.

**UI Components:**

- `detail-actions.tsx`: Add correction/cancel buttons for supervisor/creator at `approved`.
- `table/columns.tsx`: Same permission expansion.
- `correct-overtime/[id]/page.tsx`: Update page-level redirect guard.

#### 3. Overtime Orders (third implementation)

**Server Actions (`actions/crud.ts`):**

- `updateOvertimeRequest` / `getOvertimeRequestForEdit`: Extend author permission from `pending` to include `approved`. Add status reset logic when author edits approved order.

**Server Actions (`actions/approval.ts`):**

- `cancelOvertimeRequest`: Already allows cancel on `approved` for most roles. No change needed for cancel.

**UI Components:**

- `detail-page-actions.tsx`: Show edit button for author at `approved` status.

### Approval Field Clearing

When status resets from `approved` to `pending`, these fields are unset:

```
$unset: {
  approvedAt: '',
  approvedBy: '',
  supervisorApprovedAt: '',
  supervisorApprovedBy: '',
  supervisorFinalApproval: '',
  plantManagerApprovedAt: '',
  plantManagerApprovedBy: '',
}
```

For Overtime Orders (different field names):

```
$unset: {
  approvedAt: '',
  approvedBy: '',
  preApprovedAt: '',
  preApprovedBy: '',
}
```

### Unchanged Behavior

- `accounted` orders remain completely locked (no corrections by anyone)
- Employee self-edit still requires `pending` status only
- Admin retains ability to correct any non-accounted order without status reset
- HR retains ability to correct pending/approved orders without status reset
- Soft delete remains admin-only
- Mark as accounted remains HR/Admin-only

## Implementation Order

1. Individual Overtime Orders (test implementation)
2. Overtime Submissions
3. Overtime Orders
