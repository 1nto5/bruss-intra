"use server";

import { dbc } from "@/lib/db/mongo";

export type Article = {
  _id: string;
  number: string;
  name: string;
  unit: string;
};

export default async function getAllArticles(): Promise<Article[]> {
  try {
    const coll = await dbc("inventory_articles");

    const articles = await coll
      .find({})
      .project({ _id: 1, number: 1, name: 1, unit: 1 })
      .sort({ number: 1 })
      .toArray();

    return articles.map((article) => ({
      _id: article._id.toString(),
      number: article.number,
      name: article.name,
      unit: article.unit,
    }));
  } catch (error) {
    console.error("getAllArticles error:", error);
    throw new Error("Failed to fetch articles");
  }
}
