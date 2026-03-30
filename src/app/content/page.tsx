'use client';

import { ContentManager } from '@/app/dashboard/content/page';

/** Public content feed — shows all posts, edit controls appear when logged in as admin */
export default function PublicContentPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <ContentManager />
    </div>
  );
}
