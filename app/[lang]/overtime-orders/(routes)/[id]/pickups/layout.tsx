import { getDictionary } from '../../../lib/dict';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: dict.metadata.pickups };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <>{children}</>;
}
