"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { GraficoEntradasSaidas } from "@/components/Graficos";
import { classeBadgePrioridade, dataPorExtenso, formatarData, formatarPercentual, nomeMesLongo, rotuloPrioridade } from "@/lib/format";
import { barraPontualidade } from "@/lib/graficos";
import type { Dashboard } from "@/lib/types";

/** Situação da turma pela taxa de entradas atrasadas, escrita no selo (a cor só reforça). */
const SITUACAO_TURMA: Record<string, { texto: string; classe: string }> = {
  ok: { texto: "Dentro do limite", classe: "badge badge--regular" },
  acima: { texto: "Acima do limite", classe: "badge badge--media" },
  critica: { texto: "Muito acima do limite", classe: "badge badge--alta" },
  "sem-dados": { texto: "Sem dia de aula", classe: "badge badge--neutral" },
};

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** "0,2 ponto abaixo de outubro" (singular até 2, como "1,5 ponto"). */
function variacaoPontualidade(delta: number, mesAnterior: string): string {
  if (delta === 0) return `Igual a ${mesAnterior}`;
  const valor = Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${valor} ${Math.abs(delta) < 2 ? "ponto" : "pontos"} ${delta > 0 ? "acima" : "abaixo"} de ${mesAnterior}`;
}

export default function DashboardPage() {
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      const resposta = await Api.dashboard();
      if (!ativo) return;
      if (resposta.sucesso && resposta.dados) {
        setDados(resposta.dados);
        setErro(null);
      } else {
        setErro(resposta.mensagem);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const hoje = dataPorExtenso();
  const nomeMes = dados ? nomeMesLongo(dados.mes).split(" ")[0] : "";
  const mesAnterior = dados
    ? nomeMesLongo(dados.evolucao_mensal.length > 1 ? dados.evolucao_mensal[dados.evolucao_mensal.length - 2].mes : dados.mes).split(" ")[0]
    : "";
  // As turmas com mais entradas atrasadas primeiro: é o que pede atenção.
  const turmas = dados ? [...dados.turmas].sort((a, b) => (a.pontualidade ?? 101) - (b.pontualidade ?? 101)) : [];

  return (
    <>
      <Topbar
        titulo="Painel"
        subtitulo={`${hoje.charAt(0).toUpperCase() + hoje.slice(1)}. O resumo do mês: pontualidade, entradas atrasadas e os alunos que precisam de atenção.`}
        acoes={
          dados?.hoje.letivo ? (
            <>
              <Link href="/registros?registrar=saida" className="btn">
                Registrar saída antecipada
              </Link>
              <Link href="/registros?registrar=atraso" className="btn btn-primary">
                <Icon name="plus" />
                Registrar entrada atrasada
              </Link>
            </>
          ) : undefined
        }
      />

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dados && <Esqueleto variante="painel" texto="Carregando o painel…" />}

      {dados && (
        <div className="entrada-em-cascata">
          {!dados.hoje.letivo && (
            <div className="aviso-dia">
              <Icon name="calendar" />
              <span>
                Hoje ({formatarData(dados.hoje.data)}) não tem aula: <b>{dados.hoje.motivo}</b>. Entradas atrasadas e saídas
                antecipadas não podem ser registradas.
              </span>
            </div>
          )}

          <section className="indicadores" aria-label={`Números de ${nomeMes}`}>
            <div className="indicador">
              <span className="indicador-rotulo">Pontualidade em {nomeMes}</span>
              <span className="indicador-valor">{dados.pontualidade === null ? "—" : formatarPercentual(dados.pontualidade)}</span>
              <span className="indicador-contexto">
                {dados.pontualidade === null
                  ? "Ainda não houve dia de aula neste mês."
                  : `Dias de aula sem entrada atrasada, somando ${plural(dados.total_alunos, "aluno", "alunos")}.`}
              </span>
              {dados.delta_pontualidade !== null && (
                <span className={`indicador-contexto indicador-variacao ${dados.delta_pontualidade >= 0 ? "melhor" : "pior"}`}>
                  <Icon name={dados.delta_pontualidade >= 0 ? "arrowUp" : "arrowDown"} />
                  {variacaoPontualidade(dados.delta_pontualidade, mesAnterior)}
                </span>
              )}
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Entradas atrasadas em {nomeMes}</span>
              <span className="indicador-valor">{dados.atrasos_mes}</span>
              <span className="indicador-contexto">
                {plural(dados.saidas_mes, "saída antecipada", "saídas antecipadas")} no mês. <Link href="/registros">Ver registros</Link>
              </span>
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Alertas ativos</span>
              <span className="indicador-valor">{dados.alertas_ativos}</span>
              <span className="indicador-contexto">
                {plural(dados.alertas_alta_prioridade, "de prioridade alta", "de prioridade alta")};{" "}
                {plural(dados.alunos_acima_limite, "aluno passou", "alunos passaram")} do limite de {dados.limite_alerta}%.
              </span>
            </div>
            <div className="indicador">
              <span className="indicador-rotulo">Famílias avisadas em {nomeMes}</span>
              <span className="indicador-valor">{dados.responsaveis_avisados_mes}</span>
              <span className="indicador-contexto">
                {dados.contatos_pendentes > 0 ? (
                  <>
                    {plural(dados.contatos_pendentes, "aluno com alerta ainda sem", "alunos com alerta ainda sem")} acompanhamento.{" "}
                    <Link href="/acompanhamento">Ver acompanhamento</Link>
                  </>
                ) : (
                  "Todos os alunos com alerta já têm acompanhamento."
                )}
              </span>
            </div>
          </section>

          <section className="panel panel-tabela secao">
            <div className="panel-head">
              <h2>Alunos que precisam de atenção</h2>
              {dados.alertas_ativos > 0 && (
                <Link href="/alertas" className="panel-meta">
                  Ver todos os alertas ({dados.alertas_ativos})
                </Link>
              )}
              <p className="panel-desc">
                Quem chegou perto ou passou do limite de {dados.limite_alerta}% dos dias de aula nos últimos {dados.janela_alerta_dias} dias,
                da prioridade mais alta para a mais baixa.
              </p>
            </div>
            {dados.prioridade_lista.length === 0 ? (
              <div className="empty-state">
                <Icon name="checkCircle" />
                <p>Nenhum aluno chegou perto do limite de entradas atrasadas ou saídas antecipadas. Quando isso acontecer, ele aparece aqui.</p>
              </div>
            ) : (
              <table className="tabela tabela-cartoes">
                <thead>
                  <tr>
                    <th scope="col">Aluno</th>
                    <th scope="col">Motivo</th>
                    <th scope="col">Prioridade</th>
                    <th scope="col">
                      <span className="sr-only">Ação</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.prioridade_lista.map((alerta) => (
                    <tr key={alerta.id_alerta}>
                      <td className="celula-titulo">
                        <div className="student-name">{alerta.nome_aluno}</div>
                        <div className="student-turma">{alerta.turma ?? "Sem turma"}</div>
                      </td>
                      <td data-label="Motivo">{alerta.motivo}</td>
                      <td data-label="Prioridade">
                        <span className={classeBadgePrioridade(alerta.prioridade)}>{rotuloPrioridade(alerta.prioridade)}</span>
                      </td>
                      <td className="acoes celula-acoes">
                        <Link href={`/turmas/${alerta.id_aluno}`} className="btn btn-sm" aria-label={`Ver o aluno ${alerta.nome_aluno}`}>
                          Ver aluno
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <div className="grid-2 grid-iguais">
            <section className="panel panel-tabela">
              <div className="panel-head">
                <h2>Pontualidade por turma</h2>
                <span className="panel-meta">{nomeMesLongo(dados.mes)}</span>
                <p className="panel-desc">Dias de aula sem entrada atrasada, somando os alunos da turma. As turmas com mais atrasos vêm primeiro.</p>
              </div>
              {turmas.length === 0 ? (
                <div className="empty-state">
                  <Icon name="student" />
                  <p>
                    Nenhuma turma cadastrada ainda. <Link href="/turmas">Cadastre as turmas em Turmas e alunos</Link>.
                  </p>
                </div>
              ) : (
                <table className="tabela tabela-cartoes">
                  <thead>
                    <tr>
                      <th scope="col">Turma</th>
                      <th scope="col">Pontualidade</th>
                      <th scope="col">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((turma) => {
                      const barra = barraPontualidade(turma.pontualidade, dados.limite_alerta);
                      const situacao = SITUACAO_TURMA[barra.classe] ?? SITUACAO_TURMA["sem-dados"];
                      return (
                        <tr key={turma.id_sala}>
                          <td className="celula-titulo">
                            <div className="student-name">{turma.nome_sala}</div>
                            <div className="student-turma">
                              {plural(turma.total_alunos, "aluno", "alunos")} · {plural(turma.atrasos, "entrada atrasada", "entradas atrasadas")}
                            </div>
                          </td>
                          <td data-label="Pontualidade">
                            <div className="medidor">
                              <div className="medidor-trilha" aria-hidden="true">
                                <div className={`turma-bar-fill--${barra.classe}`} style={{ width: `${barra.largura}%` }} />
                              </div>
                              <span className="medidor-valor">{formatarPercentual(turma.pontualidade, 0)}</span>
                            </div>
                          </td>
                          <td data-label="Situação">
                            <span className={situacao.classe}>{situacao.texto}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>

            <GraficoEntradasSaidas meses={dados.evolucao_mensal} />
          </div>

          {dados.fora_do_calendario > 0 && (
            <p className="results-caption nota-dados">
              <Icon name="info" /> {dados.fora_do_calendario}{" "}
              {dados.fora_do_calendario === 1 ? "registro antigo foi feito" : "registros antigos foram feitos"} num fim de semana,
              feriado ou dia sem aula e não {dados.fora_do_calendario === 1 ? "entra" : "entram"} nas contas.
            </p>
          )}
        </div>
      )}
    </>
  );
}
