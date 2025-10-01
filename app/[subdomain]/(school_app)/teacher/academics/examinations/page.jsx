import { redirect } from 'next/navigation';

export default function Page({ params }) {
	// Teachers should not access Manage Examinations; redirect to Grades Summary
	const sub = params?.subdomain || '';
	redirect(`/${sub}/teacher/academics/grades/summary`);
}
