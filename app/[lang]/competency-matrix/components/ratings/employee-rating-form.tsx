"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PROCESS_AREA_LABELS } from "../../lib/constants";
import { PROCESS_AREAS, localize } from "../../lib/types";
import type { I18nString } from "../../lib/types";
import { saveEmployeeRatings } from "../../actions/employee-ratings";
import type { Dictionary } from "../../lib/dict";
import type { Locale } from "@/lib/config/i18n";

interface CompetencyItem {
  _id: string;
  name: I18nString;
  processArea: string;
}

interface Requirement {
  competencyId: string;
  requiredLevel: number;
}

interface RatingEntry {
  competencyId: string;
  rating: number | null;
}

interface EmployeeRatingFormProps {
  dict: Dictionary;
  lang: Locale;
  employeeIdentifier: string;
  employeeName: string;
  competencies: CompetencyItem[];
  requirements: Requirement[];
  currentRatings: RatingEntry[];
}

export function EmployeeRatingForm({
  dict,
  lang,
  employeeIdentifier,
  employeeName,
  competencies,
  requirements,
  currentRatings,
}: EmployeeRatingFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const safeLang = (["pl", "de", "en"].includes(lang) ? lang : "pl") as
    | "pl"
    | "de"
    | "en";

  // Build initial ratings state
  const initialRatings = new Map<string, number | null>();
  for (const r of currentRatings) {
    initialRatings.set(r.competencyId, r.rating);
  }

  const [ratings, setRatings] = useState(initialRatings);

  // Build requirements map
  const reqMap = new Map(
    requirements.map((r) => [r.competencyId, r.requiredLevel]),
  );

  // Group competencies by process area
  const grouped = new Map<string, CompetencyItem[]>();
  for (const c of competencies) {
    if (!grouped.has(c.processArea)) grouped.set(c.processArea, []);
    grouped.get(c.processArea)!.push(c);
  }

  function handleRatingChange(competencyId: string, value: string) {
    setRatings((prev) => {
      const next = new Map(prev);
      if (value === "na") {
        next.delete(competencyId);
      } else {
        next.set(competencyId, parseInt(value, 10));
      }
      return next;
    });
  }

  function handleSubmit() {
    const ratingsArray = [...ratings.entries()].map(
      ([competencyId, rating]) => ({
        competencyId,
        rating,
      }),
    );

    if (ratingsArray.length === 0) {
      toast.error(dict.validation.atLeastOneRating);
      return;
    }

    startTransition(async () => {
      const res = await saveEmployeeRatings(
        {
          employeeIdentifier,
          ratings: ratingsArray,
        },
        lang,
      );

      if ("error" in res) {
        if (res.error === "unauthorized") {
          toast.error(dict.errors.unauthorized);
        } else if (res.error === "validation" && res.issues) {
          toast.error(res.issues[0]?.message || dict.errors.contactIT);
        } else {
          toast.error(dict.errors.serverError);
        }
        return;
      }

      toast.success(dict.employees.ratingsSaved);
      router.push(`/${lang}/competency-matrix/employees/${employeeIdentifier}`);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {dict.employees.editCompetencies} - {employeeName}
        </CardTitle>
      </CardHeader>
      <Separator className="mb-4" />

      <CardContent className="space-y-6">
        {[...grouped.entries()]
          .sort(
            ([a], [b]) =>
              PROCESS_AREAS.indexOf(a as (typeof PROCESS_AREAS)[number]) -
              PROCESS_AREAS.indexOf(b as (typeof PROCESS_AREAS)[number]),
          )
          .map(([area, comps]) => (
            <div key={area}>
              <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                {localize(
                  PROCESS_AREA_LABELS[area as keyof typeof PROCESS_AREA_LABELS],
                  safeLang,
                )}
              </h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{dict.competencies.name}</TableHead>
                      <TableHead className="w-28">
                        {dict.employees.employeeLevel}
                      </TableHead>
                      <TableHead className="w-28">
                        {dict.positions.requiredLevel}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comps.map((comp) => {
                      const reqLevel = reqMap.get(comp._id) ?? null;
                      const currentValue = ratings.get(comp._id);

                      return (
                        <TableRow key={comp._id}>
                          <TableCell>{localize(comp.name, safeLang)}</TableCell>
                          <TableCell>
                            <Select
                              value={
                                currentValue != null
                                  ? String(currentValue)
                                  : "na"
                              }
                              onValueChange={(v) =>
                                handleRatingChange(comp._id, v)
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="na">
                                  {dict.employees.notApplicable}
                                </SelectItem>
                                <SelectItem value="1">1</SelectItem>
                                <SelectItem value="2">2</SelectItem>
                                <SelectItem value="3">3</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {reqLevel != null ? (
                              reqLevel
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        <p className="text-xs text-muted-foreground">
          {dict.employees.levelLegend}
        </p>
      </CardContent>

      <Separator className="mb-4" />

      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link
            href={`/${lang}/competency-matrix/employees/${employeeIdentifier}`}
          >
            {dict.cancel}
          </Link>
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? <Loader className="animate-spin" /> : <Save />}
          {dict.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
