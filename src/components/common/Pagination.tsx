import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (items: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'DARK';
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} gap-4`}>
      <div className="flex items-center text-xs text-slate-500">
        <span>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries</span>
        {onItemsPerPageChange && (
          <select 
            value={itemsPerPage}
            onChange={(e) => {
              onItemsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className={`ml-4 rounded-md border text-xs px-2 py-1 outline-none ${isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-lg border ${
            currentPage === 1 
              ? 'opacity-50 cursor-not-allowed border-transparent' 
              : isDark ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-slate-100 border-slate-300'
          }`}
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-lg border ${
            currentPage === 1 
              ? 'opacity-50 cursor-not-allowed border-transparent' 
              : isDark ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-slate-100 border-slate-300'
          }`}
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center px-2 text-xs font-medium space-x-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = currentPage;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-lg border ${
            currentPage === totalPages 
              ? 'opacity-50 cursor-not-allowed border-transparent' 
              : isDark ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-slate-100 border-slate-300'
          }`}
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded-lg border ${
            currentPage === totalPages 
              ? 'opacity-50 cursor-not-allowed border-transparent' 
              : isDark ? 'hover:bg-slate-800 border-slate-700' : 'hover:bg-slate-100 border-slate-300'
          }`}
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
