# Sukuu1 (Next.js)

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Finance: Scholarships Feature (Custom Extension)

The project now includes a Scholarships module enabling percentage or fixed reductions applied to student invoices.

### API Endpoints

| Method | Endpoint                                                                 | Description |
|--------|--------------------------------------------------------------------------|-------------|
| GET    | `/api/schools/{schoolId}/finance/scholarships`                           | List scholarships (query: `studentId`, `academicYearId`, `isActive`) |
| POST   | `/api/schools/{schoolId}/finance/scholarships`                           | Create scholarship (percentage or fixed) |
| GET    | `/api/schools/{schoolId}/finance/scholarships/{scholarshipId}`           | Retrieve single scholarship |
| PATCH  | `/api/schools/{schoolId}/finance/scholarships/{scholarshipId}`           | Update scholarship (status, value, type) |
| DELETE | `/api/schools/{schoolId}/finance/scholarships/{scholarshipId}`           | Remove scholarship |
| GET    | `/api/schools/{schoolId}/finance/invoices?includeScholarship=true`       | Invoice listing enriched with scholarship metadata |

### Validators

Defined in `validators/finance.validators.js`:

- `createScholarshipSchema`
- `updateScholarshipSchema`

### Rules

- `type = PERCENTAGE` requires `percentage` (0–100), forbids `amount`.
- `type = FIXED` requires `amount`, forbids `percentage`.
- Uniqueness: one scholarship per (student, academicYear).

### UI Page

`app/[subdomain]/(school_app)/finance/scholarships/page.jsx` includes:

- Filters: search, academic year, active status.
- Create modal.
- Active toggle (optimistic update).
- Table display with estimated scholarship context.

### Invoice Enrichment

When `includeScholarship=true` is supplied to invoices listing, each invoice may include:

```json
{
  "scholarship": {
    "id": "...",
    "type": "PERCENTAGE|FIXED",
    "percentage": 50,
    "amount": null,
    "estimatedValue": 125.0
  }
}
```

`estimatedValue` is a convenience (percentage of `totalAmount` or fixed amount). Final business logic can refine application at payment/statement generation time.


## Student Portal & Grade Publication

Student accounts (`User.role = STUDENT`) are linked 1:1 with `Student` records, enabling secure, read-only academic visibility.

- View assignments (`/academics/assignments`)
- View only published grades (dashboard + grades page)
- See performance analytics (subject & term averages)

### Grade Publication Workflow

1. Teacher/Admin enters grades (tests / assignments / exams).
2. Grades remain editable & hidden from students while `isPublished = false`.
3. Admin publishes via: `POST /api/schools/{schoolId}/academics/grades/publish` body: `{ "gradeIds": ["gid1","gid2"] }`.
4. After publication: teachers blocked from editing/deleting; only admins can modify.

### Student Self-Service APIs

| Purpose | Endpoint | Notes |
|---------|----------|-------|
| Assignments | `GET /api/schools/{schoolId}/students/me/assignments` | Filters by current enrollment. |
| Published Grades | `GET /api/schools/{schoolId}/students/me/grades` | Returns only `isPublished = true`. |
| Performance | `GET /api/schools/{schoolId}/students/me/performance` | Aggregated subject & term averages. |

### Performance Output Shape

```json
{
  "subjects": [{ "subjectId": "...", "name": "Math", "average": 78.5, "count": 6 }],
  "terms": [{ "termId": "...", "name": "Term 1", "average": 80.2, "count": 14 }],
  "overallAverage": 79.1
}
```

### Access Control

Middleware enforces a STUDENT allowlist (dashboard, selected academics pages, attendance, invoices/payments, library, hostel, announcements). Unauthorized paths redirect to `/dashboard`.

### Linking a Student User

1. Create `User` with `role = STUDENT`.
2. Set `Student.userId = user.id`.
3. Student logs in using the school subdomain login route.

### Creating Student Login Accounts During Enrollment (Option B Implementation)

The system now supports creating a portal login at the moment of student enrollment.

#### UI Workflow

1. Navigate to: `/<subdomain>/people/students`.
2. Click `Add New Student`.
3. Fill in required personal + enrollment fields.
4. Tick the checkbox: **"Create portal login account now?"**.
5. Provide an email (required for the user account) and either enter or generate a secure password.
6. Enter the same value in Confirm Password (auto-filled if you used Generate).
7. Submit. A `User` row (role `STUDENT`) is created and linked to the new `Student` (`student.userId`).
8. Student signs in via: `/<subdomain>/student-login`.

- Minimum 8 characters; maximum 72 (bcrypt safe range).
- Must contain: at least one uppercase letter, one lowercase letter, and one digit.
- A generator button creates a 12‑character high-entropy password (includes symbols & avoids ambiguous characters) and auto-fills both password & confirm fields.

#### API Behavior (`POST /api/schools/{schoolId}/students`)

Request body additions when creating an account:

```jsonc
{
  "firstName": "...",
  "lastName": "...",
  "studentIdNumber": "ADM001",
  "admissionDate": "2025-09-01T00:00:00.000Z",
  "academicYearId": "...",
  "sectionId": "...",
  "createUserAccount": true,
  "email": "student@example.com",
  "password": "P@ssw0rd123"
}
```

Successful response contains `userCreated: true`:

```json
{
  "success": true,
  "userCreated": true,
  "student": { "id": "...", "firstName": "...", "enrollments": [ ... ] }
}
```

#### Validation Rules (Server)

| Field | Condition | Rule |
|-------|-----------|------|
| `createUserAccount` | optional | boolean (default false) |
| `email` | if `createUserAccount` | required, valid email <= 255 chars |
| `password` | if `createUserAccount` | 8–72 chars, must include upper, lower, digit |
| `studentIdNumber` | always | unique per school |

#### Common Failure Scenarios

| Scenario | HTTP | Message |
|----------|------|---------|
| Duplicate admission number | 409 | Admission number already exists for this school. |
| Duplicate user email | 400 | A user with this email already exists. |
| Missing password when `createUserAccount` true | 400 | Email & password are required when creating a user account. |
| Weak password (regex fail) | 400 | Password must include upper, lower, and a digit. |

- Editing a student profile does NOT expose account creation (future enhancement: “Create Account” action for existing students lacking `userId`).
- Admission number & admission date are immutable in the edit dialog.

#### Student Login Page

Path: `app/[subdomain]/student-login/page.jsx` (mirrors teacher login UI; now redirects to `/<subdomain>/student/dashboard`).

- Passwords hashed with bcrypt (`bcryptjs`, cost 10).
- No raw password persisted or logged.
- Encourage future: password reset, forced first-login rotation, rate limiting.
- Parent/guardian account provisioning.
- Force password change on first login (`mustChangePassword` flag on `User`).
- Dedicated student dashboard & navigation constraints.
- Parent portal & guardian linking.
- Batch publish UI & status dashboard.
- Grade audit logging & immutable history.
- Caching / denormalized performance metrics.


## Hostel Management Module


Allocation & Moves:

- POST `/api/schools/{schoolId}/resources/hostels/{hostelId}/rooms/{roomId}/move` body: `{ studentId, toRoomId }`
- POST `/api/schools/{schoolId}/resources/hostels/{hostelId}/rooms`
- GET `/api/schools/{schoolId}/people/students?hostelRoomId={roomId}` — to fetch room occupants

Stats:

- Allocation/move/unassign: `SCHOOL_ADMIN` or `HOSTEL_WARDEN`
- Rooms listing: `SCHOOL_ADMIN`, `HOSTEL_WARDEN`, `TEACHER`
- Students listing (for allocation): `SCHOOL_ADMIN`, `HOSTEL_WARDEN`, `TEACHER`, `SECRETARY`, `ACCOUNTANT`, `LIBRARIAN`, `PARENT` (parents see only their children)
- Stats: `SCHOOL_ADMIN`, `HOSTEL_WARDEN`, `TEACHER`, `SECRETARY`

Path: `app/[subdomain]/(school_app)/resources/hostel/page.jsx`

- Hostels view: lists defined hostels; shows overall stats cards (hostels, rooms, capacity, occupancy%).
- Rooms view (`?hostelId=...`): shows per-hostel stats (rooms, capacity, occupancy%, vacancy, gender split). Includes:

### Business Rules

- Capacity enforced at room level: no over-allocation.
- Gender preference enforced at hostel level when set (non-Mixed).
- Duplicate allocation prevented; use the move endpoint.

### Quick Test Steps

1. Create a hostel and a few rooms in it.
2. Ensure some students exist; set gender where needed.
3. Open `/<subdomain>/resources/hostel?hostelId=<HOSTEL_ID>`.
4. Allocation panel: filter (optional) and allocate students to rooms.
5. Occupants dialog: unassign or move students; confirm occupancy changes in room list and stats cards.

