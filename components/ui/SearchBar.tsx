'use client';

import { useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Search…' }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Search icon */}
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        style={{
          position: 'absolute',
          left: '0.5625rem',
          width: '14px',
          height: '14px',
          color: 'var(--muted-2)',
          pointerEvents: 'none',
          flexShrink: 0,
        }}
        aria-hidden
      >
        <circle cx="6.5" cy="6.5" r="5" />
        <path d="M10.5 10.5l3.5 3.5" strokeLinecap="round" />
      </svg>

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input"
        style={{
          paddingLeft: '2rem',
          paddingRight: value ? '2rem' : undefined,
          minWidth: '220px',
        }}
        aria-label={placeholder}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'var(--border)',
            color: 'var(--muted)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '10px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
