"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";

interface Pagina {
  href: string;
  nome: string;
  icone: string;
  para: string;
  detalhe: string;
  so?: "gestao" | "equipe";
}

const PAGINAS: Pagina[] = [
  {
    href: "/dashboard",
    nome: "Dashboard",
    icone: "home",
    para: "Ver a escola de relance.",
    detalhe:
      "Pontualidade do mês (o anel), entradas atrasadas e saídas antecipadas dos últimos meses (o gráfico), a pontualidade de cada turma e os alunos que mais precisam de atenção.",
  },
  {
    href: "/registros",
    nome: "Entradas e saídas",
    icone: "clock",
    para: "Registrar na portaria.",
    detalhe:
      "Escolha o aluno pelo nome e registre a entrada atrasada ou a saída antecipada - o horário já vem preenchido. Mostra tudo o que foi registrado no dia, inclusive o que veio sozinho pela presença do app.",
  },
  {
    href: "/alertas",
    nome: "Alertas",
    icone: "alert",
    para: "Saber quem passou do limite.",
    detalhe:
      "Cada alerta mostra quantas entradas atrasadas ou saídas antecipadas o aluno teve, em quantos dias de aula, e a porcentagem. \"Encerrar\" tira o alerta até o próximo registro.",
  },
  {
    href: "/presencas",
    nome: "Presenças",
    icone: "userCheck",
    para: "Conferir quem chegou.",
    detalhe: "As presenças registradas pelo app de biometria no tablet: quem já chegou, a que horas e por qual método (rosto, digital ou manual).",
  },
  {
    href: "/turmas",
    nome: "Turmas e alunos",
    icone: "users",
    para: "Cadastrar e acompanhar cada aluno.",
    detalhe:
      "Turmas (com o período e o horário) e alunos, com as ocorrências dos últimos dias e a situação de cada um. A ficha do aluno junta o histórico, a biometria, os responsáveis e o acompanhamento.",
  },
  {
    href: "/responsaveis",
    nome: "Responsáveis",
    icone: "shield",
    para: "Quem a escola avisa.",
    detalhe:
      "Todos os responsáveis, com o canal de aviso preferido (WhatsApp, e-mail ou os dois), e a lista dos alunos que ainda não têm ninguém cadastrado - esses a escola não consegue avisar.",
  },
  {
    href: "/notificacoes",
    nome: "Notificações",
    icone: "bell",
    para: "As mensagens às famílias.",
    detalhe:
      "Cada aviso automático: enviado, na fila ou com erro. Sem o envio automático configurado, a mensagem fica na fila com o link do WhatsApp pronto - é só clicar e enviar.",
  },
  {
    href: "/acompanhamento",
    nome: "Acompanhamento",
    icone: "activity",
    para: "O que a escola fez.",
    detalhe: "Ligações, mensagens, reuniões e comunicados com os responsáveis, em ordem, para ninguém da equipe repetir o contato ou esquecer um caso.",
  },
  {
    href: "/relatorios",
    nome: "Relatórios",
    icone: "fileText",
    para: "Levar os números para fora.",
    detalhe: "Planilhas (CSV) e XML dos registros, da situação de cada aluno, dos alertas, dos meses, das turmas e dos acompanhamentos.",
  },
  {
    href: "/escola",
    nome: "Escola",
    icone: "building",
    para: "As regras da escola.",
    detalhe:
      "Dados do catálogo da Secretaria da Educação, horário de cada turma, calendário (feriados automáticos e os dias próprios da escola), tolerância, limites de aviso e a equipe. Toda a equipe vê; só a gestão altera.",
  },
  {
    href: "/suporte",
    nome: "Suporte",
    icone: "lifeBuoy",
    para: "Tirar dúvidas.",
    detalhe: "Perguntas frequentes e os chamados para a equipe do sistema, com a resposta aparecendo ali mesmo.",
  },
  {
    href: "/conta",
    nome: "Minha conta",
    icone: "user",
    para: "Os seus dados.",
    detalhe: "Nome, e-mail, senha, tema claro ou escuro, sons e os aparelhos conectados (dá para desconectar um aparelho perdido).",
  },
  {
    href: "/downloads",
    nome: "Baixar app",
    icone: "download",
    para: "Instalar o app do tablet.",
    detalhe: "O APK do app de biometria da coordenação, que reconhece os alunos na chegada.",
  },
  {
    href: "/admin",
    nome: "Administração",
    icone: "settings",
    para: "Só a equipe do sistema.",
    detalhe: "Contas de todas as escolas (aprovar, mover de escola), o catálogo das escolas e as respostas aos chamados de suporte.",
    so: "equipe",
  },
];

/**
 * Como o BioFrequência funciona e para que serve cada página - a
 * explicação que a equipe pediu, dentro do próprio sistema.
 */
export default function ComoFuncionaPage() {
  const { coordenacao } = useAuth();
  const paginas = PAGINAS.filter((p) => p.so !== "equipe" || coordenacao?.administrador);

  return (
    <>
      <Topbar titulo="Como funciona" subtitulo="O que o BioFrequência faz, de onde vêm os números e para que serve cada página." />

      <div className="guia entrada-em-cascata">
        <section className="panel guia-destaque">
          <h2>O que o sistema faz</h2>
          <p>
            O BioFrequência registra as <b>entradas atrasadas</b> e as <b>saídas antecipadas</b> dos alunos e avisa as famílias
            quando elas viram rotina. As <b>faltas não são registradas aqui</b>: a frequência já fica na Sala do Futuro, e duas
            fontes para o mesmo dado só gerariam divergência.
          </p>
        </section>

        <section className="panel">
          <h2>Do portão ao aviso para a família</h2>
          <ol className="guia-fluxo">
            <li>
              <span className="guia-passo">1</span>
              <div>
                <b>O aluno chega</b>
                <p>O tablet da coordenação reconhece o rosto (app de biometria) e registra a presença.</p>
              </div>
            </li>
            <li>
              <span className="guia-passo">2</span>
              <div>
                <b>Chegou atrasado?</b>
                <p>
                  Se a presença foi depois do início da aula mais a tolerância, ela já vira <b>entrada atrasada</b>. Sem o tablet, a
                  coordenação registra em <Link href="/registros">Entradas e saídas</Link>.
                </p>
              </div>
            </li>
            <li>
              <span className="guia-passo">3</span>
              <div>
                <b>O sistema confere</b>
                <p>
                  Só aceita num dia de aula (nada em fim de semana, feriado ou dia sem aula da escola) e dentro do horário da turma
                  - um aluno da manhã não recebe entrada atrasada à tarde. No máximo um registro de cada tipo por dia.
                </p>
              </div>
            </li>
            <li>
              <span className="guia-passo">4</span>
              <div>
                <b>Passou do limite?</b>
                <p>
                  Com muitas ocorrências nos últimos dias (padrão: 20% dos dias de aula em 30 dias, com pelo menos 3), o aluno entra
                  em <Link href="/alertas">Alertas</Link>.
                </p>
              </div>
            </li>
            <li>
              <span className="guia-passo">5</span>
              <div>
                <b>A família é avisada</b>
                <p>
                  Pelo canal de cada responsável (WhatsApp, e-mail ou os dois), no máximo uma vez por semana. Tudo fica em{" "}
                  <Link href="/notificacoes">Notificações</Link>.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <div className="grid-2">
          <section className="panel">
            <h2>De onde vêm as porcentagens</h2>
            <dl className="lista-dados">
              <div>
                <dt>Dia de aula</dt>
                <dd>Segunda a sexta, menos feriados (nacionais, de SP, Carnaval e Corpus Christi) e os dias sem aula da escola; mais os sábados letivos.</dd>
              </div>
              <div>
                <dt>Taxa do aluno</dt>
                <dd>Dias com entrada atrasada ÷ dias de aula que já passaram desde que ele entrou na escola (no período analisado).</dd>
              </div>
              <div>
                <dt>Pontualidade</dt>
                <dd>Dias de aula sem entrada atrasada, somando todos os alunos (é o anel do dashboard). Sem dia de aula, aparece &quot;—&quot;, nunca 100%.</dd>
              </div>
              <div>
                <dt>Prioridade</dt>
                <dd>Baixa: metade do limite (perto). Média: o limite - a família é avisada. Alta: o dobro do limite.</dd>
              </div>
              <div>
                <dt>Registros antigos</dt>
                <dd>Feitos num fim de semana ou feriado antes destas regras: continuam guardados, mas não entram nas contas.</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <h2>Quem faz o quê</h2>
            <dl className="lista-dados">
              <div>
                <dt>Gestão da escola</dt>
                <dd>A primeira conta da escola. Aprova quem entra, define horários, calendário, tolerância e limites, e pode apagar um registro feito por engano.</dd>
              </div>
              <div>
                <dt>Coordenação</dt>
                <dd>Registra entradas e saídas, cuida dos alunos e responsáveis e acompanha os alertas.</dd>
              </div>
              <div>
                <dt>Equipe do sistema</dt>
                <dd>Cuida das contas de todas as escolas, do catálogo e responde os chamados de suporte.</dd>
              </div>
            </dl>
            <p className="results-caption">
              Cada conta é de uma escola, escolhida no cadastro entre as escolas estaduais de São Paulo. Alunos e responsáveis de
              uma escola nunca aparecem para outra.
            </p>
          </section>
        </div>

        <section className="panel">
          <h2>Para que serve cada página</h2>
          <div className="guia-paginas">
            {paginas.map((pagina) => (
              <Link href={pagina.href} className="guia-pagina" key={pagina.href}>
                <span className="guia-pagina-icone">
                  <Icon name={pagina.icone} />
                </span>
                <span>
                  <b>{pagina.nome}</b>
                  <span className="guia-pagina-para">{pagina.para}</span>
                  <span className="guia-pagina-detalhe">{pagina.detalhe}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
