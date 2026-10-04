'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Trash2, Loader2 } from 'lucide-react';

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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors shadow-sm"
    >
      {deleting ? (
        <>
          <Loader2 size={12} className="animate-spin" />
          Deleting…
        </>
      ) : (
        <>
          <Trash2 size={12} />
          Delete
        </>
      )}
    </button>
  );
}