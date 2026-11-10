'use client';
import { useCallback, useState } from 'react';
import { clearSmsDraft, getSmsDraft, setSmsDraft } from '@/utils/sms/drafts';

/* React binding for the per-type draft store. */
export function useSmsDrafts() {
  const [, bump] = useState(0);
  const getDraft = useCallback((messageType: string, fallback = '') => getSmsDraft(messageType, fallback), []);
  const saveDraft = useCallback((messageType: string, value: string) => {
    setSmsDraft(messageType, value);
    bump((n) => n + 1);
  }, []);
  const discardDraft = useCallback((messageType: string) => {
    clearSmsDraft(messageType);
    bump((n) => n + 1);
  }, []);
  return { getDraft, saveDraft, discardDraft };
}
