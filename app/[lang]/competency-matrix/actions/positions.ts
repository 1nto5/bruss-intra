"use server";

import { ObjectId } from "mongodb";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import * as z from "zod";
import { getDictionary } from "../lib/dict";
import { createPositionSchema } from "../lib/zod";
import { COLLECTIONS } from "../lib/constants";
import {
  canManageCompetencies,
  canDeleteCompetencies,
} from "../lib/permissions";
import { requireAuth, revalidateCompetencyMatrix } from "./utils";

export async function insertPosition(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canManageCompetencies(userRoles)) {
    return { error: "unauthorized" };
  }

  const dict = await getDictionary(lang);
  const schema = createPositionSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: "validation", issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.positions);
    const now = new Date();
    const userEmail = session.user!.email as string;

    await coll.insertOne({
      ...result.data,
      createdAt: now,
      updatedAt: now,
      createdBy: userEmail,
      updatedBy: userEmail,
    });

    revalidateCompetencyMatrix();
    return { success: "inserted" };
  } catch (error) {
    console.error("insertPosition error:", error);
    return { error: "server" };
  }
}

export async function updatePosition(
  id: string,
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canManageCompetencies(userRoles)) {
    return { error: "unauthorized" };
  }

  const dict = await getDictionary(lang);
  const schema = createPositionSchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: "validation", issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.positions);

    await coll.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...result.data,
          updatedAt: new Date(),
          updatedBy: session.user!.email as string,
        },
      },
    );

    revalidateCompetencyMatrix();
    return { success: "updated" };
  } catch (error) {
    console.error("updatePosition error:", error);
    return { error: "server" };
  }
}

export async function deletePosition(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canDeleteCompetencies(userRoles)) {
    return { error: "unauthorized" };
  }

  try {
    const coll = await dbc(COLLECTIONS.positions);
    await coll.deleteOne({ _id: new ObjectId(id) });

    revalidateCompetencyMatrix();
    return { success: "deleted" };
  } catch (error) {
    console.error("deletePosition error:", error);
    return { error: "server" };
  }
}
