import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { fetchSearchSuggestions } from './parkingApi.js';

const suggestionCache = new Map();

export function SearchBar({ value, onChange, onSearch }) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue.length < 2) {
      return undefined;
    }

    if (suggestionCache.has(normalizedValue)) {
      const cacheTimer = window.setTimeout(() => {
        setSuggestions(suggestionCache.get(normalizedValue));
      }, 0);

      return () => window.clearTimeout(cacheTimer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const nextSuggestions = await fetchSearchSuggestions(normalizedValue, controller.signal);
        suggestionCache.set(normalizedValue, nextSuggestions);
        setSuggestions(nextSuggestions);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  function pickSuggestion(suggestion) {
    onChange(suggestion.value);
    setSuggestions([]);
    onSearch({ search: suggestion.value });
  }

  return (
    <form className="relative" onSubmit={onSearch}>
      <div className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 shadow-sm focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-950 outline-none"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search by city, area, or parking name"
          value={value}
        />
        {value ? (
          <button
            aria-label="Clear search"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => {
              onChange('');
              setSuggestions([]);
            }}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {value.trim().length >= 2 && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50"
              key={`${suggestion.type}-${suggestion.value}`}
              onClick={() => pickSuggestion(suggestion)}
              type="button"
            >
              <span className="font-medium text-slate-900">{suggestion.value}</span>
              <span className="text-xs uppercase text-slate-500">{suggestion.type}</span>
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
