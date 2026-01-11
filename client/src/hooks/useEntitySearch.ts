/**
 * useEntitySearch - Hook for searching entities with debouncing
 *
 * Provides debounced search functionality for finding assets, locations,
 * tasks, plans, and logs.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { searchApi, type EntityType, type SearchResult } from '@/lib/api';

interface UseEntitySearchOptions {
  /** Entity types to search */
  types?: EntityType[];
  /** Maximum number of results */
  limit?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
  /** Minimum query length to trigger search */
  minQueryLength?: number;
}

interface UseEntitySearchReturn {
  results: SearchResult[];
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => void;
  clearResults: () => void;
}

export function useEntitySearch(options: UseEntitySearchOptions = {}): UseEntitySearchReturn {
  const {
    types,
    limit = 10,
    debounceMs = 200,
    minQueryLength = 1,
  } = options;

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQuery] = useState('');

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Perform the actual search
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsLoading(true);
      setError(null);

      try {
        const response = await searchApi.search(searchQuery, types, limit);
        setResults(response.data || []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Ignore aborted requests
          return;
        }
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [types, limit, minQueryLength]
  );

  // Debounced search
  const search = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      cleanup();

      if (searchQuery.length < minQueryLength) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      timeoutRef.current = setTimeout(() => {
        performSearch(searchQuery);
      }, debounceMs);
    },
    [cleanup, debounceMs, minQueryLength, performSearch]
  );

  // Clear results
  const clearResults = useCallback(() => {
    cleanup();
    setResults([]);
    setQuery('');
    setIsLoading(false);
    setError(null);
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    results,
    isLoading,
    error,
    search,
    clearResults,
  };
}

/**
 * Hook for searching a single entity type
 */
export function useAssetSearch(options: Omit<UseEntitySearchOptions, 'types'> = {}) {
  return useEntitySearch({ ...options, types: ['asset'] });
}

export function useLocationSearch(options: Omit<UseEntitySearchOptions, 'types'> = {}) {
  return useEntitySearch({ ...options, types: ['location'] });
}

export function useTaskSearch(options: Omit<UseEntitySearchOptions, 'types'> = {}) {
  return useEntitySearch({ ...options, types: ['task'] });
}

export function usePlanSearch(options: Omit<UseEntitySearchOptions, 'types'> = {}) {
  return useEntitySearch({ ...options, types: ['plan'] });
}

export function useLogSearch(options: Omit<UseEntitySearchOptions, 'types'> = {}) {
  return useEntitySearch({ ...options, types: ['log'] });
}

export default useEntitySearch;
