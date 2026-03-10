"use server";

export async function getOvens(): Promise<string[]> {
  const res = await fetch(`${process.env.API}oven-data/ovens`, {
    next: { revalidate: 60 * 60 * 8, tags: ["oven-data-ovens"] },
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getOvens error:  ${res.status}  ${res.statusText} ${json.error}`,
    );
  }

  return await res.json();
}
