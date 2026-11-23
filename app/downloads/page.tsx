import Link from "next/link";
import { Icon } from "@/components/Icon";
import { NavPublica } from "@/components/NavPublica";
import { resolverApkUrl, resolverDesktopUrl } from "@/lib/config";

export const metadata = {
  title: "Downloads — BioFrequência",
};

// O link anterior apontava para github.com/jvvvv780/mobile-app, um
// repositório que não existe mais publicamente (404). O endereço vem de
// NEXT_PUBLIC_APK_URL, ou da release fixa que o workflow do app publica
// (ver lib/config.ts).
const APK_URL = resolverApkUrl(process.env.NEXT_PUBLIC_APK_URL);

// O .exe do desktop sai do workflow do repositório SoftwareDesktop (Release
// numa tag v*). Só aparece com NEXT_PUBLIC_DESKTOP_URL definida no deploy.
const DESKTOP_URL = resolverDesktopUrl(process.env.NEXT_PUBLIC_DESKTOP_URL);

export default function DownloadsPage() {
  return (
    <>
      <NavPublica />

      <main className="downloads-shell">
        <header className="downloads-header">
          <h1>Baixe o software e o app</h1>
          <p>
            Além do painel web, o BioFrequência tem um software desktop (Windows) para a coordenação e um
            app de celular para o check-in biométrico do aluno.
          </p>
        </header>

        <div className="download-cards">
          <section className="download-card" aria-labelledby="download-desktop">
            <h2 id="download-desktop">
              <Icon name="desktop" />
              Software desktop (Windows)
              {!DESKTOP_URL && <span className="selo-em-breve">Em breve</span>}
            </h2>
            <p>
              Para o computador da coordenação: as mesmas telas deste painel — dashboard, alertas,
              entradas e saídas, presenças, turmas e alunos, responsáveis, avisos às famílias, escola e
              relatórios — com a mesma conta, o mesmo tema e os mesmos sons.
            </p>
            {DESKTOP_URL ? (
              <>
                <a href={DESKTOP_URL} className="btn btn-primary" rel="noopener">
                  <Icon name="download" /> Baixar para Windows
                </a>
                <p className="download-nota">
                  Windows 10 ou 11 (64 bits). É um arquivo só, sem instalação. Se o Windows avisar que
                  protegeu o computador, clique em &ldquo;Mais informações&rdquo; &rsaquo; &ldquo;Executar
                  assim mesmo&rdquo;.
                </p>
              </>
            ) : (
              <>
                {/* Sem link: oferecer um download que não existe é pior que
                    dizer que ainda não está pronto. */}
                <button type="button" className="btn" disabled>
                  <Icon name="download" /> Indisponível no momento
                </button>
                <p className="download-nota">Enquanto isso, tudo isso já funciona aqui no painel web.</p>
              </>
            )}
          </section>

          <section className="download-card" aria-labelledby="download-android">
            <h2 id="download-android">
              <Icon name="smartphone" />
              App de biometria (Android)
            </h2>
            <p>
              Para os tablets e celulares da coordenação: cadastra a biometria facial dos alunos e
              registra a presença sozinho ao reconhecê-los na entrada. O arquivo abaixo é gerado
              automaticamente a cada atualização do sistema — é sempre a versão mais recente.
            </p>
            {/* Aponta para a release fixa que o workflow do Android
                republica a cada build (.github/workflows/android.yml),
                em vez de um arquivo colocado à mão no servidor. */}
            <a href={APK_URL} className="btn btn-primary" rel="noopener">
              <Icon name="download" /> Baixar APK
            </a>
            <p className="download-nota">
              Para instalar, o celular precisa permitir aplicativos de fora da Play Store:
              Ajustes &rsaquo; Segurança &rsaquo; Instalar apps desconhecidos.
            </p>
          </section>
        </div>

        <section className="downloads-note" aria-labelledby="como-usar-app">
          <h2 id="como-usar-app">Como usar o app de biometria</h2>
          <ol>
            <li>
              Baixe o APK acima no tablet ou celular da coordenação e instale (o Android vai pedir
              permissão para instalar um app de fora da Play Store).
            </li>
            <li>
              Entre com a mesma conta da coordenação usada neste site. O app só mostra os alunos da sua
              escola, cadastrados em <Link href="/turmas">Turmas e alunos</Link>.
            </li>
            <li>
              Em &quot;Cadastrar biometria&quot;, escolha o aluno, confira nome e data de nascimento,
              registre o consentimento do responsável e tire as três fotos do rosto. As fotos não saem
              do aparelho: o sistema guarda só um código numérico do rosto, cifrado.
            </li>
            <li>
              Em &quot;Identificar aluno&quot;, cada aluno olha para a câmera na chegada. Reconhecido, a
              presença é registrada na hora e aparece em <Link href="/presencas">Presenças</Link>, sem
              lançamento manual. Se não for reconhecido, a presença pode ser registrada à mão, no app ou
              aqui no site.
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
