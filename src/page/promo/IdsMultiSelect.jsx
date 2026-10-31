import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const IdsMultiSelect = ({
  options,
  value,
  onChange,
  loading = false,
  placeholder,
  selectedLabel,
  searchPlaceholder,
  emptyMessage
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between font-normal h-10 bg-background">
            <span className="truncate text-muted-foreground">
              {loading
                ? t("common.ui.loadingEllipsis")
                : value.length > 0
                  ? `${value.length} ${selectedLabel}`
                  : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => {
                  const isSelected = value.includes(opt.value);
                  return (
                    <CommandItem key={opt.value} onSelect={() => toggle(opt.value)}>
                      <Check
                        className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")}
                      />
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {opt.label}
              <button
                aria-label={t("common.delete")}
                type="button"
                onClick={() => toggle(opt.value)}
                className="hover:text-destructive">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdsMultiSelect;
