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
    // Tarayici eklentileri (ceviri, Grammarly, dark mode vb.) React yuklenmeden once
    // html/body'ye attribute ekleyip hydration uyarisi uretiyor. suppressHydrationWarning
    // yalnizca bu iki etiketin kendi attribute farkini yok sayar; alt agactaki gercek
    // hydration hatalari raporlanmaya devam eder.
    <html lang="tr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
