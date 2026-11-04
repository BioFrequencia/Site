import type { Metadata } from "next";
import type { ReactNode } from "react";

// O endereço desta página leva o código do link: "no-referrer" impede que
// ele vá junto para outro site num clique.
export const metadata: Metadata = {
  title: "Senha nova · Biofrequência",
  referrer: "no-referrer",
};

export default function LayoutRedefinirSenha({ children }: { children: ReactNode }) {
  return children;
}
