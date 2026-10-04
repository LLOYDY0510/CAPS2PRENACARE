'use client';

import { useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative inline-flex items-center">
      <Search
        size={16}
        className="absolute left-3 text-slate-400 pointer-events-none"
        aria-hidden
      />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input pl-10 pr-10 min-w-[220px]"
        aria-label={placeholder}
      />

      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
          className="absolute right-2.5 flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
