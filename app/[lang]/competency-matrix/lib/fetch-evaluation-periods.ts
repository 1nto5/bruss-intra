export async function fetchEvaluationPeriodsForEmployee(identifier: string) {
  const res = await fetch(
    `${process.env.API}/competency-matrix/evaluation-periods?employeeIdentifier=${encodeURIComponent(identifier)}`,
    {
      next: {
        revalidate: 3600,
        tags: ["competency-matrix-evaluation-periods"],
      },
    },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEvaluationPeriodsForEmployee error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
