'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function LegacyTeacherStudentsRedirect() {
  const router = useRouter();
  const params = useParams();
  useEffect(() => {
    if (params?.subdomain) {
      router.replace(`/${params.subdomain}/teacher/students`);
    }
  }, [params?.subdomain, router]);
  return null;
}