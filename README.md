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

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

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

Rules:
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
		"estimatedValue": 125.00
	}
}
```
`estimatedValue` is a convenience (percentage of `totalAmount` or fixed amount). Final business logic can refine application at payment/statement generation time.

