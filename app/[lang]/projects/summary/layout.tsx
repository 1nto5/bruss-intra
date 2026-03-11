import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monthly Summary - Adrian's Projects (BRUSS)",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
