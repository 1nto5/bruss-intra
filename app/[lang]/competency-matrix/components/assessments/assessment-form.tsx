'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';

import type {
  CompetencyType,
  RequiredCompetency,
  CompetencyRating,
  AssessmentType,
} from '../../lib/types';
import { localize } from '../../lib/types';
import type { Dictionary } from '../../lib/dict';
import {
  saveAssessmentDraft,
  submitAssessment,
} from '../../actions/assessments';
import type { Locale } from '@/lib/config/i18n';

interface AssessmentFormProps {
  dict: Dictionary;
  lang: Locale;
  employeeIdentifier: string;
  positionId: string;
  evaluationPeriodId: string;
  assessmentType: AssessmentType;
  competencies: CompetencyType[];
  requirements: RequiredCompetency[];
  existingRatings?: CompetencyRating[];
  existingId?: string;
  selfRatings?: CompetencyRating[]; // For supervisor view: show self-assessment side-by-side
}

export function AssessmentForm({
  dict,
  lang,
  employeeIdentifier,
  positionId,
  evaluationPeriodId,
  assessmentType,
  competencies,
  requirements,
  existingRatings,
  existingId,
  selfRatings,
}: AssessmentFormProps) {
  const router = useRouter();
  const safeLang = (['pl', 'de', 'en'].includes(lang) ? lang : 'pl') as 'pl' | 'de' | 'en';

  // Group requirements by process area
  const compMap = new Map(competencies.map((c) => [c._id!, c]));
  const selfRatingMap = selfRatings
    ? new Map(selfRatings.map((r) => [r.competencyId, r]))
    : null;

  // Initialize ratings from existing or defaults
  const [ratings, setRatings] = useState<
    Map<string, { rating: number | null; comment: string }>
  >(() => {
    const map = new Map<string, { rating: number | null; comment: string }>();
    for (const req of requirements) {
      const existing = existingRatings?.find(
        (r) => r.competencyId === req.competencyId,
      );
      map.set(req.competencyId, {
        rating: existing?.rating ?? null,
        comment: existing?.comment ?? '',
      });
    }
    return map;
  });

  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState(existingId || '');

  function updateRating(competencyId: string, rating: number | null) {
    setRatings((prev) => {
      const next = new Map(prev);
      const current = next.get(competencyId) || { rating: null, comment: '' };
      next.set(competencyId, { ...current, rating });
      return next;
    });
  }

  function updateComment(competencyId: string, comment: string) {
    setRatings((prev) => {
      const next = new Map(prev);
      const current = next.get(competencyId) || { rating: null, comment: '' };
      next.set(competencyId, { ...current, comment });
      return next;
    });
  }

  function buildRatingsArray(): CompetencyRating[] {
    return requirements.map((req) => {
      const r = ratings.get(req.competencyId);
      return {
        competencyId: req.competencyId,
        rating: r?.rating ?? null,
        comment: r?.comment || undefined,
      };
    });
  }

  async function handleSaveDraft() {
    setSaving(true);
    const data = {
      employeeIdentifier,
      positionId,
      evaluationPeriodId,
      assessmentType,
      ratings: buildRatingsArray(),
    };

    const res = await saveAssessmentDraft(data, lang);

    if ('error' in res) {
      if (res.error === 'validation' && res.issues) {
        toast.error(res.issues[0]?.message || dict.errors.contactIT);
      } else {
        toast.error(dict.errors.serverError);
      }
    } else {
      toast.success(dict.assessments.draftSaved);
      if (res.id) setDraftId(res.id);
    }
    setSaving(false);
  }

  async function handleSubmit() {
    // Save draft first if no ID
    if (!draftId) {
      await handleSaveDraft();
    }

    if (!draftId && !existingId) {
      toast.error(dict.errors.serverError);
      return;
    }

    const targetId = draftId || existingId!;
    const res = await submitAssessment(targetId);

    if ('error' in res) {
      toast.error(dict.errors.serverError);
    } else {
      toast.success(dict.assessments.submitted);
      router.push(`/${lang}/competency-matrix/assessments`);
      router.refresh();
    }
  }

  // Group by process area for organized display
  const byProcessArea = new Map<string, RequiredCompetency[]>();
  for (const req of requirements) {
    const comp = compMap.get(req.competencyId);
    const area = comp?.processArea ?? 'other';
    const arr = byProcessArea.get(area) || [];
    arr.push(req);
    byProcessArea.set(area, arr);
  }

  return (
    <div className="space-y-6">
      {[...byProcessArea.entries()].map(([area, reqs]) => (
        <Card key={area}>
          <CardHeader>
            <CardTitle className="text-base">
              {dict.processAreas[area as keyof typeof dict.processAreas] || area}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">
                      {dict.competencies.name}
                    </TableHead>
                    <TableHead className="w-16">
                      {dict.positions.requiredLevel}
                    </TableHead>
                    {selfRatingMap && (
                      <TableHead className="w-16">
                        {dict.assessments.selfRating}
                      </TableHead>
                    )}
                    <TableHead className="w-32">
                      {dict.assessments.rating}
                    </TableHead>
                    <TableHead>{dict.assessments.comment}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reqs.map((req) => {
                    const comp = compMap.get(req.competencyId);
                    const r = ratings.get(req.competencyId);
                    const selfR = selfRatingMap?.get(req.competencyId);

                    return (
                      <TableRow key={req.competencyId}>
                        <TableCell className="font-medium">
                          {comp ? localize(comp.name, safeLang) : req.competencyId}
                        </TableCell>
                        <TableCell className="text-center">
                          {req.requiredLevel}
                        </TableCell>
                        {selfRatingMap && (
                          <TableCell className="text-center">
                            {selfR?.rating ?? dict.assessments.notApplicable}
                          </TableCell>
                        )}
                        <TableCell>
                          <Select
                            value={
                              r?.rating !== null && r?.rating !== undefined
                                ? String(r.rating)
                                : 'na'
                            }
                            onValueChange={(v) =>
                              updateRating(
                                req.competencyId,
                                v === 'na' ? null : Number(v),
                              )
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="na">
                                {dict.assessments.notApplicable}
                              </SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={r?.comment ?? ''}
                            onChange={(e) =>
                              updateComment(req.competencyId, e.target.value)
                            }
                            rows={1}
                            className="min-h-[36px]"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={saving}
        >
          {saving ? dict.loading : dict.assessments.saveDraft}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button>{dict.assessments.submit}</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dict.assessments.submit}</AlertDialogTitle>
              <AlertDialogDescription>
                {dict.assessments.submitConfirm}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{dict.cancel}</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>
                {dict.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="ghost"
          onClick={() => router.push(`/${lang}/competency-matrix/assessments`)}
        >
          {dict.cancel}
        </Button>
      </div>
    </div>
  );
}
