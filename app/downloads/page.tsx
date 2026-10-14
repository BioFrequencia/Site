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
            <h3>
              Software desktop (Windows)
              <span className="selo-em-breve">Em breve</span>
            </h3>
            <p>
              Aplicativo WPF (.NET) para a coordenação: dashboard, alertas, turmas, acompanhamento,
              relatórios, responsáveis, notificações e biometria facial. O instalador ainda não está
              disponível para download — enquanto isso, todas essas funções já funcionam pelo painel
              web, nesta mesma conta.
            </p>
            {/* Sem link: oferecer um download que não existe (ou um .zip
                que não é o instalador) é pior que dizer que ainda não
                está pronto. */}
            <button type="button" className="btn" disabled>
              <Icon name="download" /> Indisponível no momento
            </button>
          </div>

          <div className="download-card">
            <div className="report-icon">
              <Icon name="smartphone" />
            </div>
            <h3>App do aluno (Android)</h3>
            <p>
              Aplicativo para o aluno confirmar a chegada e justificar faltas e atrasos com a
              biometria do próprio celular. O arquivo abaixo é gerado automaticamente a cada
              atualização do sistema — é sempre a versão mais recente.
            </p>
            {/* Aponta para a release fixa que o workflow do Android
                republica a cada build (.github/workflows/android.yml),
                em vez de um arquivo colocado à mão no servidor. */}
            <a
              href="https://github.com/jvvvv780/mobile-app/releases/latest/download/app-release.apk"
              className="btn btn-primary"
              rel="noopener"
            >
              <Icon name="download" /> Baixar APK
            </a>
            <p className="download-nota">
              Para instalar, o celular precisa permitir aplicativos de fora da Play Store:
              Ajustes &rsaquo; Segurança &rsaquo; Instalar apps desconhecidos.
            </p>
          </div>
        </div>

        <div className="downloads-note">
          <b>Como usar o app do aluno:</b>
          <br />
          1. Baixe o APK acima no celular do aluno e instale (o Android vai pedir permissão para
          instalar um app de fora da Play Store).
          <br />
          2. Na coordenação, gere o código de vínculo do aluno em{" "}
          <Link href="/turmas" style={{ color: "var(--indigo)", fontWeight: 700 }}>
            Turmas e alunos
          </Link>{" "}
          &rsaquo; aluno &rsaquo; &quot;Gerar código&quot;. O código vale 15 minutos e serve uma vez só.
          <br />
          3. No app, o aluno digita esse código uma única vez. Não é preciso informar endereço de
          servidor nem token — isso já vem configurado no aplicativo.
          <br />
          4. A partir daí o aluno confirma a chegada com a biometria do próprio celular, e os
          check-ins aparecem em{" "}
          <Link href="/checkins" style={{ color: "var(--indigo)", fontWeight: 700 }}>
            Check-ins
          </Link>{" "}
          para a coordenação confirmar.
          <br />
          5. Para justificar uma falta ou atraso, o aluno usa &quot;Registrar falta ou atraso&quot;:
          confirma a biometria, escreve o motivo e se o responsável está ciente. O envio aparece em{" "}
          <Link href="/ocorrencias" style={{ color: "var(--indigo)", fontWeight: 700 }}>
            Ocorrências do app
          </Link>{" "}
          e <b>só vira falta depois que a coordenação aprova</b>.
        </div>
      </div>
    </>
  );
}
