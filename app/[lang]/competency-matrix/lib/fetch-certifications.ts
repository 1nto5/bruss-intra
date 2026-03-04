export async function fetchEmployeeCertifications(identifier: string) {
  const res = await fetch(
    `${process.env.API}/competency-matrix/certifications?employeeIdentifier=${encodeURIComponent(identifier)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(
      `fetchEmployeeCertifications error: ${res.status} ${res.statusText}`,
    );
  }

  return res.json();
}
