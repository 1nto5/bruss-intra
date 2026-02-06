import { auth } from '@/lib/auth';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "New Entry - Adrian's Projects (BRUSS)",
};

export default async function Layout(props: {
  children: React.ReactNode;
}) {
  const { children } = props;

  const session = await auth();
  if (!session || !session.user || !session.user.email) {
    redirect('/auth?callbackUrl=/projects');
  }
  const access = session.user.email === 'adrian.antosiak@bruss-group.com';
  if (access === false) {
    redirect(`/projects`);
  }

  return <div className='flex justify-center'>{children}</div>;
}
