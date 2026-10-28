/* eslint-disable no-unused-vars */
import React from "react";
import { Clock, Check, ChevronsUpDown } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, "0");
      const minute = m.toString().padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

const TIME_PRESETS = [
  { label: "Pagi", value: "08:00" },
  { label: "Siang", value: "12:00" },
  { label: "Sore", value: "17:00" },
  { label: "Malam", value: "20:00" }
];

export const TimePicker = React.forwardRef(function TimePicker(
  { id, value, onChange, placeholder = "Pilih jam", disabled = false, slots },
  ref
) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground"
          )}>
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari jam..." />
          <CommandList>
            <CommandEmpty>Tidak ada jam</CommandEmpty>
            {!value && (
              <CommandGroup heading="Cepat">
                <div className="grid grid-cols-4 gap-1.5 p-2">
                  {(slots ? TIME_PRESETS.filter((p) => slots.includes(p.value)) : TIME_PRESETS).map(
                    (preset) => (
                      <Button
                        key={preset.value}
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        onClick={() => {
                          onChange(preset.value);
                          setOpen(false);
                        }}>
                        {preset.label}
                      </Button>
                    )
                  )}
                </div>
              </CommandGroup>
            )}
            <CommandGroup heading="Semua Jam">
              <ScrollArea className="h-48">
                {(slots || TIME_SLOTS).map((time) => (
                  <CommandItem
                    key={time}
                    value={time}
                    onSelect={() => {
                      onChange(time);
                      setOpen(false);
                    }}>
                    <Check
                      className={cn("mr-2 h-4 w-4", value === time ? "opacity-100" : "opacity-0")}
                    />
                    {time}
                  </CommandItem>
                ))}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
