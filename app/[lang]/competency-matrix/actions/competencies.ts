"use server";

import { ObjectId } from "mongodb";
import { dbc } from "@/lib/db/mongo";
import { Locale } from "@/lib/config/i18n";
import * as z from "zod";
import { getDictionary } from "../lib/dict";
import { createCompetencySchema } from "../lib/zod";
import { COLLECTIONS } from "../lib/constants";
import {
  canManageCompetencies,
  canDeleteCompetencies,
} from "../lib/permissions";
import { requireAuth, revalidateCompetencyMatrix } from "./utils";

export async function insertCompetency(
  data: unknown,
  lang: Locale,
): Promise<{ success: string } | { error: string; issues?: z.ZodIssue[] }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canManageCompetencies(userRoles)) {
    return { error: "unauthorized" };
  }

  const dict = await getDictionary(lang);
  const schema = createCompetencySchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: "validation", issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencies);
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
    console.error("insertCompetency error:", error);
    return { error: "server" };
  }
}

export async function updateCompetency(
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
  const schema = createCompetencySchema(dict.validation);
  const result = schema.safeParse(data);

  if (!result.success) {
    return { error: "validation", issues: result.error.issues };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencies);

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
    console.error("updateCompetency error:", error);
    return { error: "server" };
  }
}

export async function deleteCompetency(
  id: string,
): Promise<{ success: string } | { error: string }> {
  const session = await requireAuth();
  const userRoles = session.user?.roles ?? [];

  if (!canDeleteCompetencies(userRoles)) {
    return { error: "unauthorized" };
  }

  try {
    const coll = await dbc(COLLECTIONS.competencies);
    await coll.deleteOne({ _id: new ObjectId(id) });

    revalidateCompetencyMatrix();
    return { success: "deleted" };
  } catch (error) {
    console.error("deleteCompetency error:", error);
    return { error: "server" };
  }
}
