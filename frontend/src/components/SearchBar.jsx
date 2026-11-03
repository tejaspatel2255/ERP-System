import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

/**
 * Reusable Search Bar Component with 300ms Debounce
 * @param {string} value - External query string
 * @param {Function} onChange - Callback triggered after 300ms debounce
 * @param {string} placeholder - Input placeholder
 */
const SearchBar = ({ value = '', onChange, placeholder = 'Search...' }) => {
  const [localValue, setLocalValue] = useState(value);

  // Synchronize internal state when external parent value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the input value changes
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
        <Search size={16} />
      </div>
      <input
        type="text"
        className="field pl-9"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;
