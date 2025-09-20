'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyTeacherTeachersRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params?.subdomain) {
      router.replace(`/${params.subdomain}/teacher/people/teachers`);
    }
  }, [params?.subdomain, router]);
  return null;
}
