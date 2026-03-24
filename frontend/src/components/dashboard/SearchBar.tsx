import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onTagFilter?: (tag: string) => void;
  onAuthorFilter?: (author: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-lg">
        <input
          type="text"
          placeholder="Search skills by name, description, tag, or author..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base pl-9"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      </div>
    </div>
  );
}
