"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Esqueleto } from "@/components/Esqueleto";
import { Icon } from "@/components/Icon";
import { GraficoEntradasSaidas, GraficoPontualidade } from "@/components/Graficos";
import {
  classeBadgePrioridade,
  dataPorExtenso,
  formatarData,
  formatarPercentual,
  iniciais,
  nomeMesLongo,
  rotuloPrioridade,
  rotuloTipoAlerta,
} from "@/lib/format";
import { barraPontualidade } from "@/lib/graficos";
import type { Dashboard } from "@/lib/types";

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
  const mesAnterior = dados
    ? nomeMesLongo(dados.evolucao_mensal.length > 1 ? dados.evolucao_mensal[dados.evolucao_mensal.length - 2].mes : dados.mes).split(" ")[0]
    : "";

  return (
    <>
      <Topbar titulo="Dashboard" subtitulo={hoje.charAt(0).toUpperCase() + hoje.slice(1)} />

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
            {/* Os quatro números do mês; cada cartão leva à tela que explica o número. */}
            <div className="hero-stats">
              <Link href="/alertas" className="kpi kpi--indigo">
                <span className="kpi-rotulo"><Icon name="alert" />Alertas ativos</span>
                <span className="kpi-valor">{dados.alertas_ativos}</span>
                <span className="kpi-sub">{dados.alertas_alta_prioridade} de alta prioridade</span>
              </Link>
              <Link href="/alertas" className="kpi kpi--tinta">
                <span className="kpi-rotulo"><Icon name="trend" />Acima do limite</span>
                <span className="kpi-valor">{dados.alunos_acima_limite}</span>
                <span className="kpi-sub">
                  {dados.limite_alerta}% dos dias de aula nos últimos {dados.janela_alerta_dias} dias
                </span>
              </Link>
              <Link href="/registros" className="kpi kpi--verde">
                <span className="kpi-rotulo"><Icon name="clock" />Entradas atrasadas no mês</span>
                <span className="kpi-valor">{dados.atrasos_mes}</span>
                <span className="kpi-sub">
                  {dados.saidas_mes} {dados.saidas_mes === 1 ? "saída antecipada" : "saídas antecipadas"}
                </span>
              </Link>
              <Link href="/notificacoes" className="kpi kpi--lilas">
                <span className="kpi-rotulo"><Icon name="send" />Famílias avisadas no mês</span>
                <span className="kpi-valor">{dados.responsaveis_avisados_mes}</span>
                <span className="kpi-sub">
                  {dados.contatos_pendentes} {dados.contatos_pendentes === 1 ? "aluno" : "alunos"} com alerta sem acompanhamento
                </span>
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
              {dados.turmas.map((turma) => {
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
                        style={{ width: `${barra.largura}%` }}
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
                        <span className={classeBadgePrioridade(alerta.prioridade)}>{rotuloPrioridade(alerta.prioridade)}</span>
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
