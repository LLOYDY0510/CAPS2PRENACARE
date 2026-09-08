'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function DeleteRecordButton({ id }: { id: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this record? This cannot be undone.'
    );
    if (!confirmed) return;

    setDeleting(true);
    await supabase.from('pregnant_mothers').delete().eq('id', id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="btn-danger"
      style={{ padding: '0.25rem 0.625rem', fontSize: '0.8125rem' }}
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}