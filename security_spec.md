# Security Specification & Test Matrix for MindFlow Firestore

## 1. Data Invariants

1. **User Identity Isolation**:
   - Every document in `users`, `tasks`, `wellnessCheckIns`, and `proposals` must belong to the authenticated user (`userId == request.auth.uid`).
   - A user cannot read, update, or list data belonging to other students.
   - PII data (such as user email, academic goals) is strictly isolated to the document owner.

2. **Temporal Integrity**:
   - `createdAt` timestamps must equal `request.time` on creation and remain immutable on updates.
   - `updatedAt` timestamps must equal `request.time` on updates.

3. **Field & Boundary Enforcement**:
   - IDs must be alphanumeric strings up to 128 characters matching `^[a-zA-Z0-9_-]+$`.
   - String fields must satisfy explicit length bounds (`size() <= MAX`).
   - Numeric metrics (composite scores, energy, stress) must fall within bounded ranges (0 to 10, etc.).
   - No shadow fields or unlisted properties allowed on document creation.

4. **Action-Based Updates**:
   - Updates must validate affected keys using `.diff(existing()).affectedKeys().hasOnly([...])`.
   - Immutability of identity fields (`userId`, `id`, `createdAt`) is strictly enforced.

---

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)

1. **Unauthenticated Read/Write**:
   - Anonymous or null-auth caller attempting `get` or `create` on `/tasks/task-1`.
   - Expected: `PERMISSION_DENIED`.

2. **Cross-User Snooping (Read Other's Profile)**:
   - Authenticated user `user-A` attempting `get` on `/users/user-B`.
   - Expected: `PERMISSION_DENIED`.

3. **Spoofed Task Creation**:
   - Authenticated user `user-A` submitting a task with `userId: "user-B"`.
   - Expected: `PERMISSION_DENIED`.

4. **Shadow Field Injection**:
   - Submitting a task creation payload containing an unexpected ghost field `__isAdmin: true` or `bypassed: true`.
   - Expected: `PERMISSION_DENIED`.

5. **ID Poisoning Attack**:
   - Attempting to target document ID with a 10KB string or special characters: `/tasks/../../../system`.
   - Expected: `PERMISSION_DENIED`.

6. **Blanket Query Scraping**:
   - Querying `collection('tasks')` without restricting `where('userId', '==', request.auth.uid)`.
   - Expected: `PERMISSION_DENIED`.

7. **Immutability Breach (Owner Hijack)**:
   - Updating an existing task and modifying `userId: "attacker-id"`.
   - Expected: `PERMISSION_DENIED`.

8. **Temporal Spoofing**:
   - Creating a check-in with arbitrary backdated or future timestamp `createdAt: timestamp(2099-01-01)`.
   - Expected: `PERMISSION_DENIED`.

9. **Volumetric Denial of Wallet (1MB Payload)**:
   - Creating a task with a 500,000 character string in `title` or `notes`.
   - Expected: `PERMISSION_DENIED`.

10. **Out-of-Range Metric Injection**:
    - Submitting a wellness check-in with `wellnessComposite: 9999` or `stress: -50`.
    - Expected: `PERMISSION_DENIED`.

11. **Cross-User Delete**:
    - Authenticated user `user-A` attempting `delete` on `/wellnessCheckIns/checkin-of-user-B`.
    - Expected: `PERMISSION_DENIED`.

12. **Proposal Tampering**:
    - Non-owner attempting to modify or accept a student's adaptive study proposal.
    - Expected: `PERMISSION_DENIED`.
