---
name: Bug report
about: Create a report to help us improve
title: "[Bug]: "
labels: ["🐛 bug"]
assignees: ''

---

**Overview**
Briefly describe the issue and why it matters. Mention if it’s due to missing checks, improper access control, misconfiguration, etc.
Example: *The endpoint for permanently deleting resources is exposed via API and only protected by authentication, not authorization. This allows any authenticated user to trigger destructive actions.*
**Affected Endpoint and Files**
List the exact API routes, files, and functions involved.
* **Endpoint(s):** `METHOD /path/to/endpoint`
* **Route file:** `path/to/route.js`
* **Controller:** `path/to/controller.js`
* **Middleware (if applicable):** `path/to/middleware.js`
* **Service/DAO:** `path/to/service.js`
**Evidence**
Show code snippets or configuration proving the vulnerability.
```js
// Example: route is only protected by authentication
router.delete('/deleteall', authentication, brainController.deleteAllBrain);
```
**Steps to Reproduce**
```
Clear, reproducible instructions:
1. Precondition (e.g., obtain a valid non-admin token).
2. Make the request (show curl/Postman example).
3. Observe the behavior (what happens).
```
**Expected Behavior**
```
What *should* happen if the system were secure?
Example: *Only admins/superadmins with `resource:delete_all` permission should be able to perform this action.*
```
**Actual Behavior**
```
What *currently* happens.
Example: *Any authenticated user can trigger bulk permanent deletion.*
```
**Impact**
```
Why is this an issue? What is the risk level?
Example: *Loss of user data integrity, escalation of privileges, destructive operations without safeguards.*
```
**Proposed Remediation**
```
Suggest fixes:
* **If unused:** remove/disable the vulnerable route.
* **If needed:** enforce authorization (role/permission checks).
* Add defense-in-depth (service-level validation, audit logging, feature flags).
* Align with canonical auth checks to avoid bypasses.
```
