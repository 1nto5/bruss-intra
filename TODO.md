# TODO

- [ ] Add MongoDB indexes for Overtime Orders, Overtime Submissions, and Individual Overtimes collections
- [ ] Overtime Submissions: add view for managers to see remaining monthly approval hours quota
- [ ] Overtime Submissions: disable email notifications for users outside the company domain
- [ ] Overtime Submissions: auto-select supervisor in forms based on the last selected one
- [ ] Overtime Submissions: in hours column add "(payout)" label when entry is a payout request for overtime
- [ ] Overtime Submissions: balances should not include unapproved entries in calculations
- [ ] Overtime Submissions: verify that bruss-cron notifications are correctly sent when entries await overtime approval or payout request approval
- [ ] Individual Overtime Orders: allow creating orders up to 3 days in the past
- [ ] Datetime picker: fix bug where "today" cannot be selected initially, but becomes selectable after switching to another day first
- [ ] Individual Overtime Orders: send email notifications only to users with company domain, show mail icon for others after order creation, Currently, email notifications are not being sent, even to employees who have an account in the Users collection.
- [ ] Individual Overtime Orders + Overtime Orders: add export functionality for each order (similar to deviations)
- [ ] Individual Overtime Orders: fix actions display on details page (button formatting, remove "set day off" option) and correct available actions in the actions column on main page
- [ ] Individual Overtime Orders: add bulk actions for table rows
- [ ] Individual Overtime Orders: fix correction form layout not centered on page (verify layout and page.tsx against other pages)
