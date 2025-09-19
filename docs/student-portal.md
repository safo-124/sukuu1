# Student Portal & Grade Publication

This document supplements the main README until the merge tooling allows patching the existing file.

## Overview

Student accounts (`User.role = STUDENT`) link to `Student` records. Students can view:

- Assignments (`/academics/assignments`)
- Published grades (`/academics/grades` + dashboard summary)
- Performance analytics (subject & term averages) via dashboard

## Grade Publication Lifecycle

1. Teacher/Admin records grades (tests / assignments / exams endpoints).
2. Grades stay mutable & hidden while `isPublished = false`.
3. Admin publishes: `POST /api/schools/{schoolId}/academics/grades/publish` body: `{ "gradeIds": ["gid1","gid2"] }`.
4. Post-publish: teachers blocked from editing/deleting; only admins may modify.

## Student Self-Service Endpoints

| Purpose | Endpoint | Notes |
|---------|----------|-------|
| Assignments | `GET /api/schools/{schoolId}/students/me/assignments` | Filters by current enrollment section/class. |
| Published Grades | `GET /api/schools/{schoolId}/students/me/grades` | Only `isPublished = true` grades. |
| Performance | `GET /api/schools/{schoolId}/students/me/performance` | Aggregated per subject & term averages. |

## Performance Aggregation

Implemented in `lib/performance.js` (`computeStudentPerformance`). Returns:

```json
{
  "subjects": [{ "subjectId": "...", "name": "Math", "average": 78.5, "count": 6 }],
  "terms": [{ "termId": "...", "name": "Term 1", "average": 80.2, "count": 14 }],
  "overallAverage": 79.1
}
```

## Access Control

Middleware adds a STUDENT allowlist (dashboard, selected academics pages, attendance, invoices/payments, library, hostel, announcements). Unauthorized paths redirect to `/dashboard`.

## Linking a Student User

1. Create a `User` (`role = STUDENT`).
2. Set `Student.userId = user.id`.
3. Student logs in via `/{subdomain}/login`.

## Future Enhancements

- Parent portal views.
- Batch publish UI.
- Grade audit logging.
- Caching for performance metrics.

