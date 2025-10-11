'use client';

import React, { useMemo, useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from '@/components/ui/command';

type Option = { label: string; value: string };
type MultiSelectProps = {
  options: Option[];
  value: string[];
  onChange: (nextValues: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled,
  className,
  buttonClassName,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (v: string) => {
    const has = value.includes(v);
    const next = has ? value.filter(x => x !== v) : [...value, v];
    onChange(next);
  };

  const selectedCount = value.length;
  const buttonText =
    selectedCount === 0 ? placeholder : `${selectedCount} selected`;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`border border-gray-300 px-4 py-2 h-10 text-font-14 rounded-md shadow-sm bg-white flex items-center justify-between gap-2 min-w-[150px] ${buttonClassName ?? ''}`}
          >
            <span className="truncate">{buttonText}</span>
            <svg width="16" height="16" viewBox="0 0 20 20" className="opacity-70">
              <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="p-0 w-[260px]">
          <Command>
            <div className="flex items-center px-2 py-2">
              <CommandInput
                value={query}
                onValueChange={setQuery as any}
                placeholder="Search..."
                className="w-full"
              />
            </div>
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {filtered.map(opt => {
                  const checked = value.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      onSelect={() => toggle(opt.value)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-[4px] border ${checked ? 'bg-b2 border-b2' : 'bg-white border-gray-300'}`}
                        aria-checked={checked}
                        role="checkbox"
                      >
                        {checked ? (
                          <svg width="12" height="12" viewBox="0 0 20 20" className="text-white">
                            <path d="M7.5 13.5L4 10l1.5-1.5L7.5 10.5l7-7L16 5l-8.5 8.5z" fill="currentColor" />
                          </svg>
                        ) : null}
                      </span>
                      <span className="truncate">{opt.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
