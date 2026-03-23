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
- [ ] Overtime Submissions: remove direct `dbc()` queries from server components (`page.tsx:128-142`) - violates CLAUDE.md rule; move `pendingPayoutsResult` logic to a dedicated API route or extend `/api/overtime-submissions/balances`
- [ ] Overtime Submissions: add Zod validation in server actions - currently actions accept typed data without runtime validation; target pattern: `data: unknown` + `schema.safeParse(data)` (as in Warehouse Corrections)
- [ ] Overtime Submissions: extract `lib/permissions.ts` - currently permission checks are inline in actions/pages; target: dedicated file with clean sync helpers (as in Warehouse Corrections)
- [ ] Overtime Submissions: extract `lib/fetchers.ts` - currently fetching is inline in `page.tsx`; target: separate file with reusable fetcher functions (as in Warehouse Corrections, per CLAUDE.md pattern)
- [ ] Overtime Submissions: extract constants to `lib/constants.ts` - `OVERTIME_FILTER_STATUSES` and `STATUS_TO_DICT_KEY` are in `types.ts`; target: separate `lib/constants.ts` (as in Warehouse Corrections)
- [ ] All apps: unify `import type` usage for type-only imports - prefer `import type { X }` over `import { X }` when X is used only as a type (applies to: `Metadata` from "next", `Locale` from "@/lib/config/i18n", `Session` from "next-auth")
