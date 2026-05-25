'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { Badge } from './Badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({
  value,
  onChange,
  maxTags = 5,
  placeholder = 'Add tags...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const atMaxTags = value.length >= maxTags;

  // Fetch user's existing tags for autocomplete
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/tags', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.tags || []);
        }
      } catch (error) {
        console.error('Failed to fetch tag suggestions:', error);
      }
    };
    fetchTags();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = inputValue.trim()
    ? suggestions.filter((s) =>
        s.name.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(s.name)
      )
    : [];

  // Validate tag name
  const validateTag = (tag: string): string | null => {
    const trimmed = tag.trim();
    if (!trimmed) return 'Tag name cannot be empty';
    if (trimmed.length > 30) return 'Tag name must be 30 characters or less';
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmed)) {
      return 'Tag can only contain letters, numbers, spaces, hyphens, and underscores';
    }
    if (value.includes(trimmed)) return 'This tag is already added';
    return null;
  };

  const addTag = (tagName: string) => {
    const normalized = tagName.trim().replace(/\s+/g, ' ');
    const validationError = validateTag(normalized);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (value.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    onChange([...value, normalized]);
    setInputValue('');
    setError(null);
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getTagColor = (tagName: string): string => {
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 85%)`;
  };

  return (
    <div className="space-y-2">
      {/* Input and counter */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setError(null);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  // Delay to allow clicking suggestions
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder={atMaxTags ? 'Maximum tags reached' : placeholder}
                disabled={disabled || atMaxTags}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
              />

              {/* Suggestions dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.name}
                      type="button"
                      onClick={() => addTag(suggestion.name)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                    >
                      {suggestion.name} <span className="text-gray-500">({suggestion.count})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tag counter */}
          <span
            className={`text-sm font-medium whitespace-nowrap ${
              value.length >= maxTags
                ? 'text-red-600'
                : value.length >= maxTags - 1
                ? 'text-yellow-600'
                : 'text-gray-600'
            }`}
          >
            {value.length}/{maxTags}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Tag pills */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: getTagColor(tag), color: '#1f2937' }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="ml-1 hover:text-red-600 transition-colors"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
