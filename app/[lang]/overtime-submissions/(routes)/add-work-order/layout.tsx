import { getDictionary } from '../../lib/dict';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: dict.metadata.addWorkOrder };
}

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <div className='flex justify-center'>{children}</div>;
}
