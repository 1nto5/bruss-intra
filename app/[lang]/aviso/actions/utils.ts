"use server";

import { revalidateTag } from "next/cache";

export async function revalidateAviso() {
  revalidateTag("aviso-appointments", { expire: 0 });
}
