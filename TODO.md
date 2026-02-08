# TODO

- [ ] Individual Overtime Orders + Overtime Orders: add export functionality for each order (similar to deviations)
- [ ] IT Inventory: display notes column in main inventory table
- [ ] IT Inventory: fix edit functionality - save button does nothing when clicked
- [ ] IT Inventory: fix back button in edit form - should return to details page, not main page
- [ ] IT Inventory: add multiselect filter for employee search
- [ ] IT Inventory: persist selected filters during navigation (restore filters when returning to list)
- [ ] Individual Overtime Orders config: rename the collection and set actual hour limits for each supervisor in both Overtime Submissions and Individual Overtime Orders applications

## Manual Testing: Employee Management & DMCheck Config Management (2026-02-08)

### DMCheck Config Management (`/dmcheck-configs`) — both plants

- [ ] Create config: fill form -> submit -> verify new config appears in list
- [ ] Edit config: change values -> save -> verify changes persisted
- [ ] Delete config: confirm in dialog -> verify config removed from list
- [ ] Duplicate check: same workplace + articleNumber -> should show error toast
- [ ] Validation: submit with empty required fields -> should show validation errors
- [ ] Conditional fields: "Druga walidacja" ON -> "Druga walidacja DMC" required; "Włącz raportowanie defektów" ON -> "Grupa defektów" required
- [ ] Custom workplace: select custom option -> enter name -> save
- [ ] Text search: search by article number/name -> verify filtered results
- [ ] Cache: after create/edit/delete, verify dmcheck-data pages reflect changes

### Employee Management (`/employee-management`) — BRI only (PLANT=bri)

- [ ] List page loads with employee list
- [ ] Search filters by identifier, firstName, lastName
- [ ] Create employee: fill identifier, firstName, lastName -> submit
- [ ] Duplicate identifier check -> should show error
- [ ] Edit employee: identifier field disabled, change firstName/lastName -> save
- [ ] Delete employee: confirm -> verify removed
- [ ] Auth guard: non-admin user redirected to homepage
- [ ] On MRG plant: `/employee-management` redirects to homepage (verified)
- [ ] On MRG plant: Admin nav does NOT show "Employee Management" (verified)

### Multi-language

- [ ] DE locale: all labels/messages in German
- [ ] EN locale: all labels/messages in English
- [ ] Validation messages display in correct locale
