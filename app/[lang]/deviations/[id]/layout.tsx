import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Odchylenie (BRUSS)",
};

export default async function Layout(props: { children: React.ReactNode }) {
  const { children } = props;

  // const dict = await getDictionary(lang);

  // const session = await auth();
  // if (!session) {
  //   redirect('/auth');
  // }

  return <>{children}</>;
}
