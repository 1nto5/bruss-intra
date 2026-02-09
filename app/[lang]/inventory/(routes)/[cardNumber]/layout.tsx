// import { redirect } from 'next/navigation';
// import { auth } from '@/lib/auth';
import { Metadata } from 'next';

// import Container from '@/components/ui/container';

export const metadata: Metadata = {
  title: 'Inwentaryzacja (BRUSS)',
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
