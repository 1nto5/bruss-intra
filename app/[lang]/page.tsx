import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Locale } from "@/lib/config/i18n";
import { NewsList } from "./news/components/news-list";
import { PaginationControls } from "./news/components/pagination-controls";
import { RefreshButton } from "./news/components/refresh-button";
import { getDictionary } from "./news/lib/dict";

async function getNews(page: number = 1) {
  try {
    const res = await fetch(`${process.env.API}/news?page=${page}&limit=3`, {
      next: { revalidate: 60, tags: ["news"] },
    });

    if (!res.ok) {
      console.error("Failed to fetch news:", res.status, res.statusText);
      return {
        news: [],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    return res.json();
  } catch (error) {
    console.error("Error fetching news:", error);
    return {
      news: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }
}

export default async function HomePage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang } = params;
  const page = parseInt(searchParams.page || "1");

  const dict = await getDictionary(lang);
  const data = await getNews(page);
  const session = await auth();
  const isAdmin = session?.user?.roles?.includes("admin") ?? false;

  if (data.news.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{dict.title}</CardTitle>
            {isAdmin && <RefreshButton dict={dict} />}
          </div>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">{dict.noNews}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{dict.title}</CardTitle>
          {isAdmin && <RefreshButton dict={dict} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <NewsList news={data.news} isAdmin={isAdmin} lang={lang} dict={dict} />
        <PaginationControls
          data={data}
          lang={lang}
          dict={dict}
          currentPage={page}
        />
      </CardContent>
    </Card>
  );
}
