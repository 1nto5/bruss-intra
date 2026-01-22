import { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Zbiorowe zlecenia pracy nadliczbowej - produkcja (BRUSS)',
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
