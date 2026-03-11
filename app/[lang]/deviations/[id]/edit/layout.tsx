import { Metadata } from "next";
// import { getDictionary } from '@/lib/dict';
// import Info from '../../components/Info';

export const metadata: Metadata = {
  title: "Edytowanie odchylenia (BRUSS)",
};

export default function Layout(props: { children: React.ReactNode }) {
  const { children } = props;
  return <div className="flex justify-center">{children}</div>;
}
