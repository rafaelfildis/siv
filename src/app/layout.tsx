import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIV · Painel de Inteligência Territorial",
  description:
    "Painel interno de coordenação — cobertura e intenção declarada por município, Bahia 2026.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          Fontes por <link> em vez de next/font: o build precisa rodar em
          ambiente sem acesso a fonts.googleapis.com, e next/font baixa os
          arquivos em tempo de build.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
