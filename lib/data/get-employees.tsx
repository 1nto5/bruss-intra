"use server";

import { EmployeeType } from "@/lib/types/employee-types";

export default async function getEmployees(): Promise<EmployeeType[]> {
  const res = await fetch(`${process.env.API}/employees`, {
    next: {
      revalidate: 60 * 60 * 8, // 8 hours
      tags: ["employees"],
    },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getEmployees error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}
