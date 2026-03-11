import "@/app/globals.css";
import Footer from "@/components/footer";
import { Locale } from "@/lib/config/i18n";
import { getDictionary } from "@/lib/dict";
import { NuqsProvider } from "@/lib/providers/nuqs-provider";
import { Metadata } from "next";
import Header from "./components/header";

export const metadata: Metadata = {
  title: "BRUSS",
  description: "Company helper applications",
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const { children } = props;

  const dictionary = await getDictionary(lang as Locale);

  return (
    <>
      <div className="flex min-h-screen flex-col space-y-1">
        <Header dict={dictionary} lang={lang as Locale} />
        <main className="mx-auto w-full max-w-[96rem] flex-1">
          <div className="w-full">
            <NuqsProvider>{children}</NuqsProvider>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
