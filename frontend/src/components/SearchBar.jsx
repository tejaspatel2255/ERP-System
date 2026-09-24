import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

/**
 * Reusable Industrial Search Bar Component
 */
const SearchBar = ({ value = '', onChange, placeholder = 'Search telemetry records...' }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [localValue, onChange, value]);

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
        <Search size={15} />
      </div>
      <input
        type="text"
        className="block w-full rounded-xs border border-border-color bg-bg-card py-2 pl-9 pr-3 text-sm font-mono text-text-primary placeholder:text-text-muted transition-colors duration-150 shadow-2xs focus:border-accent-primary"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
