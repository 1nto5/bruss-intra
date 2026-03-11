"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function revalidateInventory() {
  revalidateTag("it-inventory", { expire: 0 });
}

export async function revalidateInventoryItem() {
  revalidateTag("it-inventory-item", { expire: 0 });
}

export async function redirectToInventory(lang: string) {
  redirect(`/${lang}/it-inventory`);
}

export async function redirectToInventoryItem(id: string, lang: string) {
  redirect(`/${lang}/it-inventory/${id}`);
}
