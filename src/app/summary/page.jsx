'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SummaryPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to unified Reports page with summary tab
    router.replace('/reports?tab=summary');
  }, [router]);

  return null;
}
