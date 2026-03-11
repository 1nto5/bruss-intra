"use server";

export type FaultConfig = {
  _id: string;
  key: string;
  translations: {
    pl: string;
    de: string;
    en: string;
    [lang: string]: string;
  };
};

export async function getFaultConfigs(): Promise<FaultConfig[]> {
  const res = await fetch(`${process.env.API}/fault-configs`, {
    next: { revalidate: 60 * 60 * 8, tags: ["fault-configs"] },
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(
      `getFaultConfigs error: ${res.status} ${res.statusText} ${json.error}`,
    );
  }
  const data = await res.json();
  return data;
}
