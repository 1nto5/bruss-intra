export async function fetchEmployeeEvaluations(identifier: string) {
  const res = await fetch(
    `${process.env.API}/competency-matrix/evaluations?employeeIdentifier=${encodeURIComponent(identifier)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEmployeeEvaluations error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
