import type { Metadata } from "next";
import type { Locale } from "@/lib/config/i18n";
import { getDictionary } from "../../lib/dict";
import { type AppointmentType } from "../../lib/types";
import TvBoardWrapper from "./tv-board-wrapper";

async function getAppointments(date: string): Promise<AppointmentType[]> {
  const res = await fetch(`${process.env.API}/aviso?date=${date}`, {
    next: { revalidate: 0, tags: ["aviso-appointments"] },
  });
  if (!res.ok) return [];
  return res.json();
}

function formatDateYmd(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: dict.page.tvTitle };
}

export default async function TvPage(props: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { lang } = params;

  const date = searchParams.date || formatDateYmd();
  const [dict, appointments] = await Promise.all([
    getDictionary(lang),
    getAppointments(date),
  ]);

  return (
    <TvBoardWrapper
      initialAppointments={appointments}
      date={date}
      dict={dict}
    />
  );
}
