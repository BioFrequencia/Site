import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SCRIPT_TEMA } from "@/lib/tema";
import { AplicarTema } from "@/components/AplicarTema";
import { ToastProvider } from "@/components/Toast";
import { PreferenciasProvider } from "@/components/Preferencias";

const fonteDisplay = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const fonteBody = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "BioFrequência",
  description: "Painel de acompanhamento de frequência escolar BioFrequência.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe o data-tema no <html>
    // antes de o React hidratar (ver lib/tema.ts).
    <html lang="pt-BR" className={`${fonteDisplay.variable} ${fonteBody.variable}`} suppressHydrationWarning>
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
