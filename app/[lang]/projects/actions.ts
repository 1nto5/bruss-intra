'use server';

import { auth } from '@/lib/auth';
import { dbc } from '@/lib/db/mongo';
import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { ProjectsType } from './lib/zod';

export async function revalidateProjects() {
  revalidateTag('projects', { expire: 0 });
}

export async function redirectToProjects(lang: string) {
  redirect(`/${lang}/projects`);
}

export async function insertProjectsEntry(
  data: ProjectsType,
): Promise<{ success: 'inserted' } | { error: string }> {
  const session = await auth();
  if (!session || !session.user?.email) {
    redirect('/auth?callbackUrl=/projects');
  }
  try {
    const coll = await dbc('projects');

    const res = await coll.insertOne(data);
    if (res) {
      revalidateProjects();
      return { success: 'inserted' };
    } else {
      return { error: 'not inserted' };
    }
  } catch (error) {
    console.error(error);
    return { error: 'insertProjectsEntry server action error' };
  }
}
