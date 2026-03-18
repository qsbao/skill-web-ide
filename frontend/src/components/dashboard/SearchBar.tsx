import { useState } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onTagFilter?: (tag: string) => void;
  onAuthorFilter?: (author: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <input
          type="text"
          placeholder="Search skills by name, description, tag, or author..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-800 text-sm px-4 py-2 pl-9 rounded-lg border border-gray-700 text-white outline-none focus:border-blue-500 placeholder-gray-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
    </div>
  );
}
