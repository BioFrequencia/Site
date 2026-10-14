import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata = {
  title: "Downloads — Biofrequência",
};

export default function DownloadsPage() {
  return (
    <>
      <nav className="top-public-nav">
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>
          Biofrequência
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" className="btn btn-sm">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn btn-primary btn-sm">
            Cadastrar coordenação
          </Link>
        </div>
      </nav>

      <div className="downloads-shell">
        <div className="downloads-header">
          <h1>Baixe o software e o app</h1>
          <p>
            Além do painel web, o Biofrequência tem um software desktop (Windows) para a coordenação e um
            app de celular para o check-in biométrico do aluno.
          </p>
        </div>

        <div className="download-cards">
          <div className="download-card">
            <div className="report-icon">
              <Icon name="desktop" />
            </div>
            <h3>Software desktop (Windows)</h3>
            <p>
              Aplicativo WPF (.NET) para a coordenação: dashboard, alertas, turmas, acompanhamento,
              relatórios, responsáveis, notificações e biometria facial. Distribuído como código-fonte —
              abra a solução no Visual Studio 2022+ (.NET 10) e compile para gerar o executável.
            </p>
            <a href="/downloads/biofrequencia-desktop-fonte.zip" className="btn btn-primary" download>
              <Icon name="download" /> Baixar código-fonte (.zip)
            </a>
          </div>

          <div className="download-card">
            <div className="report-icon">
              <Icon name="smartphone" />
            </div>
            <h3>App do aluno (Android/iOS)</h3>
            <p>
              App em React Native/Expo para o check-in biométrico do aluno (biometria local do celular +
              assinatura do dispositivo). Distribuído como código-fonte — veja o passo a passo abaixo para
              rodar com o Expo Go, sem precisar instalar Android Studio ou Xcode.
            </p>
            <a href="/downloads/biofrequencia-app-fonte.zip" className="btn btn-primary" download>
              <Icon name="download" /> Baixar código-fonte (.zip)
            </a>
          </div>
        </div>

        <div className="downloads-note">
          <b>Como usar o app do aluno (passo a passo):</b>
          <br />
          1. Baixe e extraia o .zip acima e, com Node.js instalado, rode <code>npm install</code> dentro da
          pasta <code>mobile-app</code>.
          <br />
          2. Rode <code>npx expo start</code> — vai abrir um QR code no terminal.
          <br />
          3. No celular do aluno, instale o app <b>Expo Go</b> (Play Store/App Store) e escaneie o QR code
          com ele — o app abre direto, sem precisar publicar em loja.
          <br />
          4. Na coordenação, gere um código de vínculo para o aluno na tela do aluno (em{" "}
          <Link href="/turmas" style={{ color: "var(--indigo)", fontWeight: 700 }}>
            Turmas e alunos
          </Link>{" "}
          → aluno → &quot;Gerar código&quot;) e digite esse código no app para vincular o celular ao
          cadastro do aluno.
          <br />
          5. A partir daí, o aluno confirma presença/atraso pelo app usando a biometria local do próprio
          celular; cada check-in aparece em{" "}
          <Link href="/checkins" style={{ color: "var(--indigo)", fontWeight: 700 }}>
            Check-ins
          </Link>{" "}
          aguardando a confirmação da coordenação antes de virar falta/atraso oficial.
          <br />
          <br />
          O app não vem pré-instalado em nenhuma loja: como é um projeto acadêmico (TCC), rodar pelo Expo
          Go evita o processo de publicação em loja e o custo de uma conta de desenvolvedor, mantendo o
          mesmo app real (biometria do celular + assinatura HMAC do check-in) que a coordenação usa em
          produção.
        </div>
      </div>
    </>
  );
}
