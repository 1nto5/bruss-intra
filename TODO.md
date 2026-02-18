# TODO

- [ ] Individual Overtime Orders + Overtime Orders: add export functionality for each order (similar to deviations)
- [ ] Individual Overtime Orders config: rename the collection and set actual hour limits for each supervisor in both Overtime Submissions and Individual Overtime Orders applications
- [ ] Remove old production-overtime app files: delete `app/[lang]/production-overtime/` directory and `app/api/production-overtime/` routes (proxy redirect is already in place, migration is complete)
- [ ] Implement R2Platnik integration to pull employee count per department (use employment dates hired from/to to calculate active employees); coordinate with Kasia on the correct data source/table
- [ ] Implement monthly overtime approval limit for supervisors: 5h/employee/month (3% above standard working time), shared across Overtime Orders and Overtime Submissions apps — within limit, supervisor is final approver (no plant manager approval needed); limit applies to paid working time only (overtime orders + overtime payout requests)
- [ ] Test supervisor overtime limits implementation end-to-end, then deploy to production
