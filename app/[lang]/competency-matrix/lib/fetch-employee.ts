export async function fetchEmployeeByEmail(email: string) {
  const res = await fetch(
    `${process.env.API}/competency-matrix/employees?email=${encodeURIComponent(email)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEmployeeByEmail error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}

export async function fetchEmployeeByIdentifier(identifier: string) {
  const res = await fetch(
    `${process.env.API}/competency-matrix/employees?identifier=${encodeURIComponent(identifier)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEmployeeByIdentifier error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
