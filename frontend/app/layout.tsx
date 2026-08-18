import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Acervo Técnico · CATs e Serviços",
  description: "Pesquisa e composição de acervo técnico por CATs e serviços",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className={`${inter.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
