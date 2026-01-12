---
marp: true
---

# Overtime System Overview

## Architecture & Integration

---

## System Components

```
+------------------+     +------------------+     +------------------+
|   BRUSS-INTRA    |     |     MONGODB      |     |   BRUSS-CRON     |
|   (Next.js)      |<--->|                  |<--->|   (Node.js)      |
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| - User interface |     | - overtime_      |     | - Scheduled      |
| - Forms & CRUD   |     |   submissions    |     |   reminders      |
| - Approval       |     | - overtime_      |     | - Monthly        |
|   workflows      |     |   orders         |     |   reports        |
| - Real-time      |     | - users          |     | - Attendance     |
|   email alerts   |     |                  |     |   reminders      |
+------------------+     +------------------+     +------------------+
```

---

## Two Main Modules

| Module                   | Purpose                                  | Users                   |
| ------------------------ | ---------------------------------------- | ----------------------- |
| **Overtime Submissions** | Employees report worked overtime hours   | All employees           |
| **Overtime Orders**      | Managers request overtime work for teams | Group Leaders, Managers |

---

# Module 1: Overtime Submissions

---

## What Is It?

- Employee submits a record of overtime hours worked
- Goes through approval workflow
- Can request payment or time-off compensation
- HR settles approved submissions

---

## Workflow Diagram

```
                         EMPLOYEE
                            |
                            v
                      +-----------+
                      |  PENDING  |  <-- New submission
                      +-----------+
                            |
              +-------------+-------------+
              |                           |
              v                           v
        +-----------+              +-----------+
        | REJECTED  |              | APPROVED  |  (simple case)
        +-----------+              +-----------+
              |                           |
           [EMAIL]                        |
        "Rejected with                    |
           reason"                        |
                                          |
        - - - - - - - - - - - - - - - - - + - - - - - - - - -
        IF PAYMENT REQUESTED:             |
                                          v
                              +---------------------+
                              | PENDING-PLANT-MGR   |
                              +---------------------+
                                          |
                                       [EMAIL]
                                  "Supervisor approved,
                                   awaiting Plant Mgr"
                                          |
                                          v
                                    +-----------+
                                    | APPROVED  |
                                    +-----------+
                                          |
                                       [EMAIL]
                                    "Final approval"
                                          |
                                          v
                                    +-----------+
                                    | ACCOUNTED |  <-- HR settles
                                    +-----------+
```

---

## Status Definitions

| Status                  | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `pending`               | Awaiting supervisor approval                                        |
| `pending-plant-manager` | Supervisor approved, awaiting plant manager (payment requests only) |
| `approved`              | Fully approved, ready for settlement                                |
| `rejected`              | Declined by approver                                                |
| `accounted`             | Settled/paid by HR                                                  |
| `cancelled`             | Cancelled (during corrections)                                      |

---

## Approval Path: Standard vs Payment

**Standard Overtime** (time-off compensation):

```
pending --> approved --> accounted
   |
   +--> rejected
```

**Payment Request** (cash payout):

```
pending --> pending-plant-manager --> approved --> accounted
   |                |
   +--> rejected    +--> rejected
```

---

## Real-Time Emails (bruss-intra)

| Action                        | Email Sent | Recipient                  |
| ----------------------------- | ---------- | -------------------------- |
| Supervisor approves (payment) | YES        | Employee                   |
| Final approval                | YES        | Employee                   |
| Rejection                     | YES        | Employee (includes reason) |
| Mark as accounted             | NO         | -                          |
| Convert to payout             | NO         | -                          |

---

## Scheduled Emails (bruss-cron)

| Schedule                              | Task              | Recipients                                    |
| ------------------------------------- | ----------------- | --------------------------------------------- |
| Workdays 03:25                        | Approval reminder | Supervisors (pending), Plant Mgrs (payout)    |
| Workdays 03:20 (last 7 days of month) | Balance reminder  | Employees with unsettled hours                |
| Last day of month 04:00               | Month-end report  | Plant Managers                                |

---

## Approval Reminder Email

**When**: Workdays at 03:25

**Who receives**:

- Supervisors: pending submissions assigned to them
- Plant Managers: pending-plant-manager submissions (payout requests)

**Content**:

- Count of submissions awaiting approval
- Link to overtime submissions page
- Trilingual (PL/EN/DE)

---

## Balance Reminder Email

**When**: Last 7 days of month, workdays at 03:20

**Who receives**: Employees with overtime hours not yet settled

**Content**:

- Current overtime balance (positive = hours to claim, negative = hours owed)
- Link to overtime submissions page
- Trilingual (PL/EN/DE)

---

## Month-End Report Email

**When**: Last day of month at 04:00

**Who receives**: All Plant Managers

**Content**:

- HTML table of employees with unsettled overtime
- Hours and entry count per employee
- Allows managers to review and mark for payout

---

# Module 2: Overtime Orders

---

## What Is It?

- Manager requests overtime work for a group of employees
- Two-stage approval: Production Manager -> Plant Manager
- Requires attendance list upload after completion
- HR performs final accounting

---

## Workflow Diagram

```
                        MANAGER
                           |
                           v
                   +---------------+
                   |    PENDING    |  <-- New order (always starts here)
                   +---------------+
                           |
         +-----------------+-----------------+
         |                                   |
    [LOGISTICS]                        [OTHER DEPTS]
         |                                   |
         |                                   v
         |                         +------------------+
         |                         |   PRE_APPROVED   |
         |                         +------------------+
         |                                   |
         |                                [EMAIL]
         |                           "Pre-approved by
         |                            Production Mgr"
         |                                   |
         +----------------+------------------+
                          |
                          v
                   +---------------+
                   |   APPROVED    |
                   +---------------+
                          |
                       [EMAIL]
                   "Final approval"
                          |
         +----------------+----------------+
         |                                 |
         v                                 v
  +---------------+                +---------------+
  |   CANCELED    |                |   COMPLETED   |
  +---------------+                +---------------+
         |                                 |
         | (reactivate)              (upload attendance)
         |                                 |
         +----------------+----------------+
                          |
                          v
                   +---------------+
                   |   ACCOUNTED   |  <-- HR settles
                   +---------------+
```

---

## Status Definitions

| Status         | Description                                 |
| -------------- | ------------------------------------------- |
| `pending`      | Awaiting approval                           |
| `pre_approved` | Production Manager approved (non-logistics) |
| `approved`     | Plant Manager approved, ready for execution |
| `completed`    | Attendance list uploaded                    |
| `canceled`     | Order cancelled                             |
| `accounted`    | Settled by HR                               |

---

## Approval Path by Department

**Logistics Department**:

```
pending --> approved --> completed --> accounted
              ^
              |
        (Plant Manager only - skip pre-approval)
```

**All Other Departments**:

```
pending --> pre_approved --> approved --> completed --> accounted
                 ^               ^
                 |               |
          Production Mgr    Plant Mgr
```

---

## Real-Time Emails (bruss-intra)

| Action              | Email Sent | Recipient |
| ------------------- | ---------- | --------- |
| Pre-approval        | YES        | Requestor |
| Final approval      | YES        | Requestor |
| Cancellation        | NO         | -         |
| Completion (upload) | NO         | -         |
| Mark as accounted   | NO         | -         |

---

## Scheduled Emails (bruss-cron)

| Schedule       | Task                 | Recipients                                                       |
| -------------- | -------------------- | ---------------------------------------------------------------- |
| Workdays 03:15 | Approval reminders   | Production Mgrs (pending), Plant Mgrs (pre_approved + logistics) |
| Workdays 09:05 | Attendance reminders | Responsible employees (approved orders past end date)            |

---

## Approval Reminder Email

**When**: Workdays at 03:15

**Who receives**:

- Production Managers: pending non-logistics orders
- Plant Managers: pre_approved orders + pending logistics orders

**Content**:

- Count of orders awaiting approval
- Link to overtime orders page

---

## Attendance Reminder Email

**When**: Workdays at 09:05

**Who receives**: Responsible employees for approved orders where end date has passed

**Content**:

- Count of orders needing attendance list
- Link to overtime orders page

---

# CRON Schedule Overview

---

## Daily Schedule (Workdays)

```
TIME     TASK
-----    ----------------------------------------
03:05    Production Overtime - approval reminders
03:15    Overtime Orders - approval reminders
03:20    Overtime Submissions - balance reminders
         (last 7 days of month only)
03:25    Overtime Submissions - approval reminders
04:00    Overtime Submissions - month-end report
         (last day of month only)
09:00    Production Overtime - attendance reminders
09:05    Overtime Orders - attendance reminders
```

---

# Email Templates

---

## Trilingual Format

All emails sent in **Polish / English / German**

```
Subject: Zatwierdzone nadgodziny | Approved overtime | Genehmigte Überstunden

Body:
[Polish section - blue]
Twoje zgłoszenie nadgodzin zostało zatwierdzone...

[English section - green]
Your overtime submission has been approved...

[German section - orange]
Ihr Überstundenantrag wurde genehmigt...

[Action Button]
Go to overtime submission
```

---

## Email Types Summary

| Module      | Event               | Email Type       |
| ----------- | ------------------- | ---------------- |
| Submissions | Approval            | Real-time        |
| Submissions | Rejection           | Real-time        |
| Submissions | Approval reminder   | Scheduled (CRON) |
| Submissions | Balance reminder    | Scheduled (CRON) |
| Submissions | Month-end report    | Scheduled (CRON) |
| Orders      | Pre-approval        | Real-time        |
| Orders      | Final approval      | Real-time        |
| Orders      | Approval reminder   | Scheduled (CRON) |
| Orders      | Attendance reminder | Scheduled (CRON) |

---

# Permissions Matrix

---

## Overtime Submissions

| Action             | Employee | Supervisor | HR  | Admin | Plant Mgr |
| ------------------ | -------- | ---------- | --- | ----- | --------- |
| Create             | YES      | YES        | YES | YES   | YES       |
| Edit own (pending) | YES      | -          | -   | -     | -         |
| Edit any           | -        | -          | YES | YES   | -         |
| Approve            | -        | YES        | YES | YES   | -         |
| Approve (stage 2)  | -        | -          | -   | YES   | YES       |
| Reject             | -        | YES        | YES | YES   | -         |
| Mark accounted     | -        | -          | YES | YES   | -         |
| Convert to payout  | -        | -          | -   | YES   | YES       |

---

## Overtime Orders

| Action            | GL  | Prod Mgr | Plant Mgr | HR  | Admin |
| ----------------- | --- | -------- | --------- | --- | ----- |
| Create            | YES | YES      | YES       | YES | YES   |
| Edit              | -   | -        | YES       | YES | YES   |
| Pre-approve       | -   | YES      | -         | -   | YES   |
| Final approve     | -   | -        | YES       | -   | YES   |
| Upload attendance | YES | YES      | YES       | YES | YES   |
| Cancel            | YES | YES      | YES       | YES | YES   |
| Mark accounted    | -   | -        | -         | YES | -     |
| Reactivate        | -   | -        | -         | YES | YES   |

---

# Summary

---

## Key Takeaways

1. **Two modules**: Submissions (employee hours) vs Orders (manager requests)

2. **Multi-stage approval**: Payment requests and non-logistics orders require two approvals

3. **Real-time + Scheduled emails**: Immediate notifications for approvals/rejections, daily reminders for pending items

4. **Trilingual support**: All emails in PL/EN/DE

5. **Complete audit trail**: Every action tracked with timestamp and user

---

## Integration Points

```
BRUSS-INTRA                    BRUSS-CRON
-----------                    ----------
User actions      ------>      MongoDB      <------  Scheduled queries
Real-time emails               Data store            Batch emails
                                  |
                                  v
                              SMTP Server
                              (via /mailer API)
```

---

# Questions?
