import { Badge } from "@/components/ui/badge";
import type { SectionTotal, EvaluationGrade } from "../../lib/types";
import type { Dictionary } from "../../lib/dict";

interface EvaluationSummaryProps {
  sectionTotals: SectionTotal[];
  selfTotalPoints: number;
  supervisorTotalPoints: number;
  grade: EvaluationGrade;
  isPositive: boolean;
  dict: Dictionary;
}

export function EvaluationSummary({
  sectionTotals,
  selfTotalPoints,
  supervisorTotalPoints,
  grade,
  isPositive,
  dict,
}: EvaluationSummaryProps) {
  const gradeVariant = isPositive ? "statusApproved" : "statusRejected";
  const gradeLabel =
    dict.evaluations.grades[grade as keyof typeof dict.evaluations.grades] ??
    grade;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-2 text-left font-medium">
                {dict.evaluations.weight}
              </th>
              <th className="p-2 text-center font-medium">
                {dict.evaluations.selfRating}
              </th>
              <th className="p-2 text-center font-medium">
                {dict.evaluations.supervisorRating}
              </th>
            </tr>
          </thead>
          <tbody>
            {sectionTotals.map((st) => {
              const sectionKey =
                `section${st.section}` as keyof typeof dict.evaluations;
              return (
                <tr key={st.section} className="border-b">
                  <td className="p-2">
                    {dict.evaluations[sectionKey] as string} (×{st.weight})
                  </td>
                  <td className="p-2 text-center">
                    {st.selfTotal} → {st.selfWeighted}
                  </td>
                  <td className="p-2 text-center">
                    {st.supervisorTotal} → {st.supervisorWeighted}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t-2 font-bold">
              <td className="p-2">{dict.evaluations.grandTotal}</td>
              <td className="p-2 text-center">{selfTotalPoints}</td>
              <td className="p-2 text-center">{supervisorTotalPoints}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <span className="font-medium">{dict.evaluations.grade}:</span>
        <Badge variant={gradeVariant} size="lg">
          {gradeLabel}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({isPositive ? dict.evaluations.positive : dict.evaluations.negative})
        </span>
      </div>
    </div>
  );
}
