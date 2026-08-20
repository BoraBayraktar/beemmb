import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEEMMB",
  description: "BEEMMB e-ticaret vitrin ve backoffice uygulamasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
