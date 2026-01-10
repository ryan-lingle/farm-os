import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
}

interface AddressSearchProps {
  mapboxToken: string;
  onAddressSelect: (suggestion: AddressSuggestion) => void;
  className?: string;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({
  mapboxToken,
  onAddressSelect,
  className
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search function
  const searchAddresses = async (searchQuery: string) => {
    if (!searchQuery.trim() || !mapboxToken) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json?access_token=${mapboxToken}&limit=6&types=address,poi,place`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    debounceTimer.current = setTimeout(() => {
      searchAddresses(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setQuery(suggestion.place_name);
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    onAddressSelect(suggestion);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for place type
  const getPlaceIcon = (placeTypes: string[]) => {
    if (placeTypes.includes('address')) return MapPin;
    if (placeTypes.includes('poi')) return Navigation;
    return MapPin;
  };

  return (
    <div className={cn("relative", className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search addresses..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          className="pl-10 bg-background"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => {
            const Icon = getPlaceIcon(suggestion.place_type);
            return (
              <div
                key={suggestion.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-border/50 last:border-b-0 transition-colors",
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-popover-foreground truncate">
                    {suggestion.place_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.place_name.split(',').slice(1).join(',').trim()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};