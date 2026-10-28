"use client";
import * as React from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

export function Combobox({
  id,
  options = [],
  value,
  onChange,
  placeholder = "Pilih...",
  searchPlaceholder = "Cari...",
  emptyMessage = "Data tidak ditemukan",
  disabled = false,
  loading = false,
  onClear,
  className
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const selected = options.find((opt) => opt.value === value);
  const showClear = !!onClear && !!selected && !disabled && !loading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled || loading}>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn("w-full justify-between font-normal h-10", className)}>
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("page.employee.add.loading")}
            </span>
          ) : selected ? (
            // Long labels (store names) truncate inside the field instead of
            // pushing past its border and the chevron.
            <span
              className="min-w-0 truncate text-left"
              title={typeof selected.label === "string" ? selected.label : undefined}>
              {selected.label}
            </span>
          ) : (
            <span className="min-w-0 truncate text-left text-muted-foreground">{placeholder}</span>
          )}
          <span className="ml-2 flex items-center gap-1 shrink-0">
            {showClear && (
              <span
                role="button"
                tabIndex={0}
                aria-label={t("common.clear")}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onClear?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    onClear?.();
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <X size={14} />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  disabled={opt.disabled}
                  onSelect={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === opt.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className={cn("flex-1", opt.disabled && "opacity-50")}>{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
