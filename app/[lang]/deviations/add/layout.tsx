import { auth } from '@/lib/auth';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Nowe odchylenie (BRUSS)',
};

export default async function Layout(props: {
  children: React.ReactNode;
}) {
  const { children } = props;

  const session = await auth();
  if (!session) {
    redirect('/auth?callbackUrl=/deviations');
  }

  return <div className='flex justify-center'>{children}</div>;
}
