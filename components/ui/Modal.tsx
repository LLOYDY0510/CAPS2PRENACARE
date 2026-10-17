'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import Button from './Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen || !dialog.current) return;
    const node = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]'));
      const first = focusable[0]; const last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
    node.addEventListener('keydown', handleKeyDown);
    return () => {
      node.removeEventListener('keydown', handleKeyDown);
      node.close(); document.body.style.overflow = overflow; previous?.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const widthClasses = { sm: 'max-w-sm', md: 'max-w-xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return <dialog ref={dialog} className={`app-dialog ${widthClasses[maxWidth]}`} aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="flex justify-between items-start gap-4 border-b pb-4 mb-5">
      <div><h2 id={titleId} className="text-xl font-bold">{title ?? 'Details'}</h2>
        {description && <p id={descriptionId} className="text-sm mt-2">{description}</p>}</div>
      <button type="button" onClick={onClose} aria-label="Close dialog" className="p-3"><X size={20}/></button>
    </header>
    {children}
  </dialog>;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            variant === 'danger' ? 'bg-green-50 text-green-600' : 'bg-green-50 text-[var(--brand)]'
          }`}
        >
          <AlertTriangle size={28} />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-neutral-900">{title}</h4>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
        <div className="flex items-center gap-3 w-full pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
