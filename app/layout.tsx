import type { Metadata } from "next";
import { IBM_Plex_Sans, Sora, Figtree } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SCRIPT_TEMA } from "@/lib/tema";
import { AplicarTema } from "@/components/AplicarTema";
import { ToastProvider } from "@/components/Toast";
import { PreferenciasProvider } from "@/components/Preferencias";

// IBM Plex Sans em todas as telas internas: boa leitura em tamanhos
// pequenos, acentos bem desenhados e números de largura fixa nas tabelas.
const fontePlex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Sora e Figtree: só nas telas de entrada (login, cadastro, senha), que
// mantêm o visual anterior. Sem pré-carregar, para não pesar nas outras.
const fonteDisplay = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});

const fonteBody = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "BioFrequência",
  description: "Painel de acompanhamento de frequência escolar BioFrequência.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe o data-tema no <html>
    // antes de o React hidratar (ver lib/tema.ts).
    <html lang="pt-BR" className={`${fontePlex.variable} ${fonteDisplay.variable} ${fonteBody.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <AplicarTema />
        <AuthProvider>
          <ToastProvider>
            <PreferenciasProvider>{children}</PreferenciasProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
