'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { CompetencyType, RequiredCompetency } from '../../lib/types';
import { localize } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';

interface RequirementsEditorProps {
  competencies: CompetencyType[];
  requirements: RequiredCompetency[];
  onChange: (requirements: RequiredCompetency[]) => void;
  dict: Dictionary;
  lang: 'pl' | 'de' | 'en';
}

export function RequirementsEditor({
  competencies,
  requirements,
  onChange,
  dict,
  lang,
}: RequirementsEditorProps) {
  const assignedIds = new Set(requirements.map((r) => r.competencyId));
  const available = competencies.filter((c) => !assignedIds.has(c._id!) && c.active);

  function addCompetency(competencyId: string) {
    onChange([
      ...requirements,
      { competencyId, requiredLevel: 1, weight: 1 },
    ]);
  }

  function updateRequirement(
    idx: number,
    field: 'requiredLevel' | 'weight',
    value: number,
  ) {
    const updated = [...requirements];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  }

  function removeRequirement(idx: number) {
    onChange(requirements.filter((_, i) => i !== idx));
  }

  // Build a map of competency ID -> name
  const compMap = new Map(competencies.map((c) => [c._id!, c]));

  return (
    <div className="space-y-4">
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
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={String(req.requiredLevel)}
                        onValueChange={(v) =>
                          updateRequirement(idx, 'requiredLevel', Number(v))
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
                          updateRequirement(idx, 'weight', Number(v))
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeRequirement(idx)}
                      >
                        &times;
                      </Button>
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

      {available.length > 0 && (
        <Select onValueChange={addCompetency}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={dict.positions.addCompetency} />
          </SelectTrigger>
          <SelectContent>
            {available.map((c) => (
              <SelectItem key={c._id!} value={c._id!}>
                {localize(c.name, lang)} (
                {dict.processAreas[c.processArea as keyof typeof dict.processAreas]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
