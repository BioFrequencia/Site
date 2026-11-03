"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { NumeroAnimado } from "@/components/NumeroAnimado";
import { GraficoEntradasSaidas, GraficoPontualidade } from "@/components/Graficos";
import { classeBadgePrioridade, formatarData, formatarPercentual, iniciais, nomeMesLongo, rotuloTipoAlerta } from "@/lib/format";
import { barraPontualidade } from "@/lib/graficos";
import type { Dashboard } from "@/lib/types";

export default function DashboardPage() {
  const { coordenacao } = useAuth();
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

  const primeiroNome = coordenacao?.nome_coordenacao?.split(" ")[0] ?? "";
  const mesAnterior = dados
    ? nomeMesLongo(dados.evolucao_mensal.length > 1 ? dados.evolucao_mensal[dados.evolucao_mensal.length - 2].mes : dados.mes).split(" ")[0]
    : "";

  return (
    <>
      <Topbar titulo={`Olá, ${primeiroNome}`} subtitulo="Entradas atrasadas, saídas antecipadas e quem precisa de atenção na sua escola." />

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dados && <Esqueleto variante="painel" texto="Carregando o dashboard…" />}

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

          <div className="hero">
            <div className="hero-gauge">
              <GraficoPontualidade
                valor={dados.pontualidade}
                delta={dados.delta_pontualidade}
                mesAnterior={mesAnterior}
                alunoDias={dados.aluno_dias_mes}
                totalAlunos={dados.total_alunos}
                diasLetivos={dados.dias_letivos_mes}
              />
            </div>
            <div className="hero-stats">
              <Link href="/alertas" className="stat-row stat-link">
                <div>
                  <div className="stat-label">Alertas ativos</div>
                  <div className="stat-sub">{dados.alertas_alta_prioridade} de alta prioridade</div>
                </div>
                <div className="stat-value">
                  <NumeroAnimado valor={dados.alertas_ativos} />
                </div>
              </Link>
              <div className="stat-row">
                <div>
                  <div className="stat-label">Acima do limite</div>
                  <div className="stat-sub">
                    {dados.limite_alerta}% dos dias de aula nos últimos {dados.janela_alerta_dias} dias
                  </div>
                </div>
                <div className="stat-value">
                  <NumeroAnimado valor={dados.alunos_acima_limite} />
                </div>
              </div>
              <Link href="/registros" className="stat-row stat-link">
                <div>
                  <div className="stat-label">Entradas atrasadas no mês</div>
                  <div className="stat-sub">
                    {dados.saidas_mes} {dados.saidas_mes === 1 ? "saída antecipada" : "saídas antecipadas"}
                  </div>
                </div>
                <div className="stat-value">
                  <NumeroAnimado valor={dados.atrasos_mes} />
                </div>
              </Link>
              <Link href="/notificacoes" className="stat-row stat-link">
                <div>
                  <div className="stat-label">Famílias avisadas no mês</div>
                  <div className="stat-sub">
                    {dados.contatos_pendentes} {dados.contatos_pendentes === 1 ? "aluno" : "alunos"} com alerta sem acompanhamento
                  </div>
                </div>
                <div className="stat-value">
                  <NumeroAnimado valor={dados.responsaveis_avisados_mes} />
                </div>
              </Link>
            </div>
          </div>

          <div className="grid-2">
            <GraficoEntradasSaidas meses={dados.evolucao_mensal} />

            <div className="panel">
              <div className="panel-head">
                <h2>Pontualidade por turma</h2>
                <span className="panel-meta">{nomeMesLongo(dados.mes)}</span>
              </div>
              {dados.turmas.length === 0 && <p className="results-caption">Nenhuma turma cadastrada.</p>}
              {dados.turmas.map((turma, indice) => {
                const barra = barraPontualidade(turma.pontualidade, dados.limite_alerta);
                return (
                  <div
                    className="turma-row"
                    key={turma.id_sala}
                    title={`${turma.nome_sala}: ${turma.atrasos} ${turma.atrasos === 1 ? "entrada atrasada" : "entradas atrasadas"}, ${turma.saidas} ${
                      turma.saidas === 1 ? "saída antecipada" : "saídas antecipadas"
                    } no mês`}
                  >
                    <span className="turma-name">{turma.nome_sala}</span>
                    <div className="turma-bar-track">
                      {/* As barras crescem uma depois da outra, de cima para baixo. */}
                      <div
                        className={`turma-bar-fill turma-bar-fill--${barra.classe}`}
                        style={{ width: `${barra.largura}%`, animationDelay: `${Math.min(indice, 12) * 60}ms` }}
                      />
                    </div>
                    <span className="turma-pct">{formatarPercentual(turma.pontualidade, 0)}</span>
                  </div>
                );
              })}
              <p className="results-caption">Dias de aula sem entrada atrasada, somando os alunos da turma.</p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Alunos que precisam de atenção</h2>
              <Link href="/alertas" className="panel-meta">
                Ver todos os alertas
              </Link>
            </div>
            {dados.prioridade_lista.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Nenhum aluno passou do limite de entradas atrasadas ou saídas antecipadas.</p>
              </div>
            ) : (
              <table className="priority-list">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.prioridade_lista.map((alerta) => (
                    <tr key={alerta.id_alerta}>
                      <td>
                        <Link href={`/turmas/${alerta.id_aluno}`} className="student-cell">
                          <div className="avatar">{iniciais(alerta.nome_aluno)}</div>
                          <div>
                            <div className="student-name">{alerta.nome_aluno}</div>
                            <div className="student-turma">{alerta.turma ?? "Sem turma"}</div>
                          </div>
                        </Link>
                      </td>
                      <td>{rotuloTipoAlerta(alerta.tipo)}</td>
                      <td>{alerta.motivo}</td>
                      <td>
                        <span className={classeBadgePrioridade(alerta.prioridade)}>{alerta.prioridade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {dados.fora_do_calendario > 0 && (
            <p className="results-caption nota-dados">
              <Icon name="alert" /> {dados.fora_do_calendario}{" "}
              {dados.fora_do_calendario === 1 ? "registro antigo foi feito" : "registros antigos foram feitos"} num fim de semana,
              feriado ou dia sem aula e não {dados.fora_do_calendario === 1 ? "entra" : "entram"} nas contas.
            </p>
          )}
        </div>
      )}
    </>
  );
}
