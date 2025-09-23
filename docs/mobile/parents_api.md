# Parents Mobile API: Grades, Rankings, Analytics

This document describes the endpoints and payloads the Flutter app should use for the Parents experience. All endpoints require a mobile JWT token obtained from `POST /api/auth/mobile-login`.

Base URL
- Web: `https://<subdomain>.your-domain.tld`
- Local dev: `http://localhost:3000`

Auth
1) Login
- `POST /api/auth/mobile-login`
- Body: `{ "email": string, "password": string, "subdomain": string }`
- Returns: `{ token: string, user: { id, email, name, role, schoolId, schoolSubdomain, parentProfileId } }`
- Use `Authorization: Bearer <token>` for all subsequent requests.

2) Token lifetime
- 30 days. Re-login to refresh.

Common query params
- `academicYearId` (optional)
- `termId` (optional)
- `sectionId` (optional, only for rankings)

Endpoints
1) Children Grades (published only)
- GET `/api/schools/{schoolId}/parents/me/children/grades`
- Response:
```
{
  "children": [
    {
      "studentId": string,
      "name": string,
      "grades": [
        {
          "studentId": string,
          "marksObtained": number,
          "comments": string | null,
          "subject": { "id": string, "name": string },
          "examSchedule": {
            "id": string, "date": string, "startTime": string, "endTime": string, "maxMarks": number,
            "class": { "id": string, "name": string },
            "exam": { "id": string, "name": string },
            "subject": { "id": string, "name": string }
          },
          "term": { "id": string, "name": string },
          "academicYear": { "id": string, "name": string }
        }
      ]
    }
  ]
}
```

2) Children Rankings (published)
- GET `/api/schools/{schoolId}/parents/me/children/rankings?academicYearId=&termId=&sectionId=`
- Response:
```
{
  "rankings": [
    {
      "id": string,
      "studentId": string,
      "position": number,
      "score": number,               // normalized/computed total
      "sectionId": string,
      "termId": string,
      "academicYearId": string,
      "published": true,
      "computedAt": string,
      "student": { "id": string, "firstName": string, "lastName": string },
      "section": { "id": string, "name": string, "class": { "id": string, "name": string } },
      "term": { "id": string, "name": string },
      "academicYear": { "id": string, "name": string },
      "sectionTotal": number         // total students ranked in that section/term/year
    }
  ]
}
```

3) Children Grades Analytics
- GET `/api/schools/{schoolId}/parents/me/children/grades-analytics?academicYearId=&termId=`
- Response:
```
{
  "children": [
    {
      "student": { "id": string, "firstName": string, "lastName": string },
      "analytics": {
        "average": number,  // overall for selected scope
        "subjects": [ { "subjectId": string, "subjectName": string, "average": number } ],
        "predictions": { [subjectId: string]: { nextTerm: number | null, trend: "up"|"flat"|"down" } }
      }
    }
  ]
}
```

Errors
- 401 Unauthorized: missing/invalid token or role not PARENT
- 403 Forbidden: school mismatch
- 500 Server Error

Notes
- All returned grades are already published to parents.
- Rankings are visible only when admins publish them; otherwise arrays may be empty.
- For historical views, pass `academicYearId`/`termId`.

Versioning
- Contract is stable as of 2025-09-23. Breaking changes will be documented.
