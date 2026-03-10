"use server";

import { UsersListType } from "@/lib/types/user";

export async function getUsers(): Promise<UsersListType> {
  const res = await fetch(`${process.env.API}/users`, {
    next: { revalidate: 60 * 60 * 8, tags: ["users"] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getUsers error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}
