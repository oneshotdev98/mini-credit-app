import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit application",
  description: "Complete your credit application securely.",
};

export default function ApplyLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
