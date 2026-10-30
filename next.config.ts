import type { NextConfig } from "next";

// Aviso no log de build da Vercel quando o deploy sai sem o endereço da
// API, ou com um endereço que só existe na máquina de quem desenvolve - os
// dois casos produzem um site que não consegue fazer login (ver lib/config.ts).
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
if (process.env.VERCEL) {
  if (!apiUrl) {
    console.warn("[BioFrequência] NEXT_PUBLIC_API_URL não definida neste deploy: o login vai mostrar erro de configuração.");
  } else if (/localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\.|^http:\/\//.test(apiUrl)) {
    console.warn(`[BioFrequência] NEXT_PUBLIC_API_URL aponta para um endereço local ou sem HTTPS (${apiUrl}).`);
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Cabeçalhos básicos de segurança em todas as páginas: o painel mostra
  // dados de alunos e não deve ser embutido em outro site (clickjacking).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
