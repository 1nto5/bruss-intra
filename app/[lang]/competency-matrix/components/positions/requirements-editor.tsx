"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CompetencyType,
  RequiredCompetency,
  RatingValue,
  WeightValue,
} from "../../lib/types";
import { localize } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";

interface RequirementsEditorProps {
  competencies: CompetencyType[];
  requirements: RequiredCompetency[];
  onChange: (requirements: RequiredCompetency[]) => void;
  dict: Dictionary;
  lang: "pl" | "de" | "en";
}

export function RequirementsEditor({
  competencies,
  requirements,
  onChange,
  dict,
  lang,
}: RequirementsEditorProps) {
  const assignedIds = new Set(requirements.map((r) => r.competencyId));
  const available = competencies.filter(
    (c) => !assignedIds.has(c._id!) && c.active,
  );

  function updateRequirement(
    idx: number,
    field: "requiredLevel" | "weight",
    value: number,
  ) {
    const updated = [...requirements];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  }

  function removeRequirement(idx: number) {
    onChange(requirements.filter((_, i) => i !== idx));
  }

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<RatingValue>(1);
  const [selectedWeight, setSelectedWeight] = useState<WeightValue>(1);

  // Build a map of competency ID -> name
  const compMap = new Map(competencies.map((c) => [c._id!, c]));

  function handleAdd() {
    if (!selectedId) return;
    onChange([
      {
        competencyId: selectedId,
        requiredLevel: selectedLevel,
        weight: selectedWeight,
      },
      ...requirements,
    ]);
    setSelectedId(null);
    setSelectedLevel(1);
    setSelectedWeight(1);
  }

  return (
    <div className="space-y-4">
      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <CompetencyCombobox
            available={available}
            selected={selectedId}
            competencyMap={compMap}
            onSelect={setSelectedId}
            dict={dict}
            lang={lang}
          />
          <Select
            value={String(selectedLevel)}
            onValueChange={(v) => setSelectedLevel(Number(v) as RatingValue)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(selectedWeight)}
            onValueChange={(v) => setSelectedWeight(Number(v) as WeightValue)}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" disabled={!selectedId} onClick={handleAdd}>
            {dict.add}
          </Button>
        </div>
      )}

      {requirements.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{dict.competencies.name}</TableHead>
                <TableHead>{dict.competencies.processArea}</TableHead>
                <TableHead className="w-32">
                  {dict.positions.requiredLevel}
                </TableHead>
                <TableHead className="w-32">{dict.positions.weight}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((req, idx) => {
                const comp = compMap.get(req.competencyId);
                return (
                  <TableRow key={req.competencyId}>
                    <TableCell>
                      {comp ? localize(comp.name, lang) : req.competencyId}
                    </TableCell>
                    <TableCell>
                      {comp
                        ? dict.processAreas[
                            comp.processArea as keyof typeof dict.processAreas
                          ]
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(req.requiredLevel)}
                        onValueChange={(v) =>
                          updateRequirement(idx, "requiredLevel", Number(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(req.weight)}
                        onValueChange={(v) =>
                          updateRequirement(idx, "weight", Number(v))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                          >
                            &times;
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {dict.positions.removeCompetencyConfirm}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {comp
                                ? localize(comp.name, lang)
                                : req.competencyId}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeRequirement(idx)}
                            >
                              {dict.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {requirements.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {dict.positions.noCompetenciesAssigned}
        </p>
      )}
    </div>
  );
}

function CompetencyCombobox({
  available,
  selected,
  competencyMap,
  onSelect,
  dict,
  lang,
}: {
  available: CompetencyType[];
  selected: string | null;
  competencyMap: Map<string, CompetencyType>;
  onSelect: (id: string) => void;
  dict: Dictionary;
  lang: "pl" | "de" | "en";
}) {
  const [open, setOpen] = useState(false);
  const selectedComp = selected ? competencyMap.get(selected) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "max-w-sm justify-between bg-[var(--panel-inset)] shadow-[inset_0_1px_2px_oklch(0.2_0.02_260/0.08)]",
            !selected && "opacity-50",
          )}
        >
          {selectedComp
            ? localize(selectedComp.name, lang)
            : dict.positions.addCompetency}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={dict.search} />
          <CommandList>
            <CommandEmpty>{dict.noData}</CommandEmpty>
            <CommandGroup>
              {available.map((c) => {
                const areaLabel = dict.processAreas[
                  c.processArea as keyof typeof dict.processAreas
                ] as string;
                return (
                  <CommandItem
                    key={c._id!}
                    value={c._id!}
                    keywords={[localize(c.name, lang), areaLabel]}
                    onSelect={(id) => {
                      onSelect(id);
                      setOpen(false);
                    }}
                  >
                    {localize(c.name, lang)}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {areaLabel}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
