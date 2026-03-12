# TODO

- [ ] Individual Overtime Orders + Overtime Orders: add export functionality for each order (similar to deviations)
- [ ] Individual Overtime Orders config: rename the collection and set actual hour limits for each supervisor in both Overtime Submissions and Individual Overtime Orders applications
- [ ] Remove old production-overtime app files: delete `app/[lang]/production-overtime/` directory and `app/api/production-overtime/` routes (proxy redirect is already in place, migration is complete)
- [ ] Implement R2Platnik integration to pull employee count per department (use employment dates hired from/to to calculate active employees); coordinate with Kasia on the correct data source/table
- [ ] Implement monthly overtime approval limit for supervisors: 5h/employee/month (3% above standard working time), shared across Overtime Orders and Overtime Submissions apps - within limit, supervisor is final approver (no plant manager approval needed); limit applies to paid working time only (overtime orders + overtime payout requests)
- [ ] Test supervisor overtime limits implementation end-to-end, then deploy to production
- [ ] Competency Matrix - Evaluations module: review and finalize the employee performance review system (19-criteria, 1-5 scale, 3 weighted sections, dual self+supervisor assessment, draft->submitted->approved workflow); verify evaluation creation from employee list, self-assessment page, supervisor assessment with remarks/recommendations, grade calculation, and HR approval flow
- [ ] Competency Matrix - Fix layout/formatting issues when the sidebar navigation panel is in narrow/collapsed state (tables, forms, and content areas overflow or display incorrectly)
- [ ] Verify the correctness of the content of email notification messages
- [s] Fix: employee does not receive a notification after an individual overtime work order is created, and the work order is not visible on the work-orders page (reference case: work order 25/26)
