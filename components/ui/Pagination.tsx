'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 ${className}`}>
      {totalItems !== undefined && itemsPerPage !== undefined ? (
        <p className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-800 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
          <span className="text-slate-800 font-bold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
          <span className="text-slate-800 font-bold">{totalItems}</span> results
        </p>
      ) : (
        <p className="text-xs font-semibold text-slate-500">
          Page <span className="text-slate-800 font-bold">{currentPage}</span> of <span className="text-slate-800 font-bold">{totalPages}</span>
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          leftIcon={<ChevronLeft size={16} />}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          rightIcon={<ChevronRight size={16} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
