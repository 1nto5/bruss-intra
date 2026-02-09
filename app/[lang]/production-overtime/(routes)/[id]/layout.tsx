import { Metadata } from 'next';

export const metadata: Metadata = {
  title:
    'Zlecenie wykonania pracy w godzinach nadliczbowych - produkcja (BRUSS)',
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
