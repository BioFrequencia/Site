"use client";

import { useState } from "react";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { baixarCsv } from "@/lib/format";

// Mesmos 5 relatórios do desktop (Windows/Relatorios.xaml.cs) - mesma
// fonte de dados, só troca SaveFileDialog+File.WriteAllText por um
// download de Blob no navegador (baixarCsv, em lib/format.ts).
export default function RelatoriosPage() {
  const { mostrarToast } = useToast();
  const [gerando, setGerando] = useState<string | null>(null);
  const [gerandoXml, setGerandoXml] = useState<string | null>(null);
  const [buscaIndividual, setBuscaIndividual] = useState("");

  async function comFeedback(id: string, tarefa: () => Promise<void>) {
    setGerando(id);
    try {
      await tarefa();
    } finally {
      setGerando(null);
    }
  }

  /**
   * XML vem pronto do servidor (relatorio/exportarXml.php). Montar XML
   * no navegador concatenando string é como se produz aquele arquivo
   * ".xml" que na verdade não abre em lugar nenhum: faltaria escapar &,
   * < e aspas vindos de nomes e observações.
   */
  async function baixarXml(relatorio: "alertas" | "alunos" | "acompanhamentos" | "ocorrencias") {
    setGerandoXml(relatorio);
    const resultado = await Api.baixarRelatorioXml(relatorio);
    setGerandoXml(null);
    mostrarToast(resultado.mensagem, !resultado.sucesso);
  }

  async function relatorioAlertas() {
    const resposta = await Api.alertas(null, null, null);
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `alertas_pendentes_${dataHoje()}.csv`,
      ["Aluno", "Turma", "Tipo", "Prioridade", "Frequência", "Motivo", "Data de referência"],
      resposta.dados.alertas.map((a) => [a.nome_aluno, a.turma ?? "", a.tipo, a.prioridade, `${a.frequencia}%`, a.motivo, a.dta_referencia])
    );
    mostrarToast("Relatório de alertas baixado.");
  }

  async function relatorioAcompanhamento() {
    const todos = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const resposta = await Api.listarAcompanhamento(null, pagina);
      if (!resposta.sucesso || !resposta.dados) {
        mostrarToast(resposta.mensagem, true);
        return;
      }
      todos.push(...resposta.dados.registros);
      totalPaginas = resposta.dados.total_paginas;
      pagina++;
    } while (pagina <= totalPaginas);

    baixarCsv(
      `historico_acompanhamentos_${dataHoje()}.csv`,
      ["Data", "Aluno", "Turma", "Canal", "Observação", "Registrado por"],
      todos.map((r) => [r.data_registro, r.nome_aluno, r.nome_sala ?? "", r.canal, r.observacao ?? "", r.nome_coordenacao])
    );
    mostrarToast("Relatório de acompanhamentos baixado.");
  }

  async function relatorioEvolucao() {
    const resposta = await Api.dashboard();
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `evolucao_mensal_frequencia_${dataHoje()}.csv`,
      ["Mês", "Frequência da rede"],
      resposta.dados.evolucao_mensal.map((m) => [m.mes, `${m.frequencia.toFixed(1)}%`])
    );
    mostrarToast("Relatório de evolução baixado.");
  }

  async function relatorioTurmas() {
    const resposta = await Api.dashboard();
    if (!resposta.sucesso || !resposta.dados) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    baixarCsv(
      `frequencia_por_turma_${dataHoje()}.csv`,
      ["Turma", "Alunos", "Frequência"],
      resposta.dados.turmas.map((t) => [t.nome_sala, t.total_alunos, `${t.frequencia.toFixed(1)}%`])
    );
    mostrarToast("Relatório de turmas baixado.");
  }

  async function relatorioIndividual() {
    const nome = buscaIndividual.trim();
    if (!nome) {
      mostrarToast("Digite o nome do aluno para gerar o relatório individual.", true);
      return;
    }
    const buscaAlunos = await Api.filtrarAlunos(nome, null, null, 1, 1);
    if (!buscaAlunos.sucesso || !buscaAlunos.dados) {
      mostrarToast(buscaAlunos.mensagem, true);
      return;
    }
    if (buscaAlunos.dados.alunos.length === 0) {
      mostrarToast("Nenhum aluno encontrado com esse nome.", true);
      return;
    }
    const aluno = buscaAlunos.dados.alunos[0];
    const hoje = new Date();
    const tresMesesAtras = new Date(hoje);
    tresMesesAtras.setMonth(hoje.getMonth() - 3);
    const historico = await Api.historicoAluno(aluno.id_aluno, isoData(tresMesesAtras), isoData(hoje));
    if (!historico.sucesso || !historico.dados) {
      mostrarToast(historico.mensagem, true);
      return;
    }

    const linhas = [
      ...historico.dados.faltas.map((f) => [f.data, "Falta", f.motivo ?? "", f.justificado ? "Sim" : "Não", f.observacao ?? ""]),
      ...historico.dados.atrasos.map((a) => [a.data, "Atraso", a.motivo ?? "", a.justificado ? "Sim" : "Não", a.observacao ?? ""]),
    ].sort((a, b) => (a[0] < b[0] ? 1 : -1));

    baixarCsv(
      `historico_${aluno.nome_aluno.replace(/\s+/g, "_")}_${dataHoje()}.csv`,
      ["Data", "Tipo", "Motivo", "Justificado", "Observação"],
      linhas
    );
    mostrarToast("Relatório individual baixado.");
  }

  // xml: null quando aquele relatório existe só em CSV (os dois são
  // montados a partir de agregados do dashboard, que não têm uma
  // listagem correspondente no servidor).
  const relatorios: {
    id: string; titulo: string; desc: string; executar: () => Promise<void>;
    xml: "alertas" | "alunos" | "acompanhamentos" | "ocorrencias" | null;
  }[] = [
    { id: "alertas", titulo: "Alertas pendentes", desc: "Todos os alunos com alerta ativo, sua prioridade e motivo.", executar: relatorioAlertas, xml: "alertas" },
    { id: "acompanhamento", titulo: "Histórico de acompanhamentos", desc: "Todos os contatos registrados com responsáveis.", executar: relatorioAcompanhamento, xml: "acompanhamentos" },
    { id: "evolucao", titulo: "Evolução mensal da frequência", desc: "Frequência geral da rede nos últimos 6 meses.", executar: relatorioEvolucao, xml: null },
    { id: "turmas", titulo: "Frequência por turma", desc: "Frequência atual de cada turma cadastrada.", executar: relatorioTurmas, xml: null },
  ];

  return (
    <>
      <Topbar titulo="Relatórios" subtitulo="Exporte dados da coordenação em CSV ou XML." />

      <div className="panel report-list">
        {relatorios.map((relatorio) => (
          <div className="report-item" key={relatorio.id}>
            <div className="report-icon">
              <Icon name="fileText" />
            </div>
            <div className="report-body">
              <div className="report-title">{relatorio.titulo}</div>
              <div className="report-desc">{relatorio.desc}</div>
            </div>
            <div className="report-acoes">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => comFeedback(relatorio.id, relatorio.executar)}
                disabled={gerando === relatorio.id}
              >
                {gerando === relatorio.id ? "Gerando…" : "CSV"}
              </button>
              {relatorio.xml && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => baixarXml(relatorio.xml!)}
                  disabled={gerandoXml === relatorio.xml}
                >
                  {gerandoXml === relatorio.xml ? "Gerando…" : "XML"}
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="report-item">
          <div className="report-icon">
            <Icon name="inbox" />
          </div>
          <div className="report-body">
            <div className="report-title">Ocorrências enviadas pelo aplicativo</div>
            <div className="report-desc">
              Todos os envios dos alunos, com motivo, observação e a decisão da coordenação.
            </div>
          </div>
          <div className="report-acoes">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => baixarXml("ocorrencias")}
              disabled={gerandoXml === "ocorrencias"}
            >
              {gerandoXml === "ocorrencias" ? "Gerando…" : "XML"}
            </button>
          </div>
        </div>

        <div className="report-item">
          <div className="report-icon">
            <Icon name="fileText" />
          </div>
          <div className="report-body">
            <div className="report-title">Histórico individual por aluno</div>
            <div className="report-desc">Faltas e atrasos dos últimos 3 meses de um aluno específico.</div>
            <input
              style={{
                marginTop: 10,
                border: "1px solid var(--mist-200)",
                borderRadius: "var(--radius-sm)",
                padding: "8px 12px",
                fontSize: 13,
                width: "100%",
                maxWidth: 260,
              }}
              placeholder="Nome do aluno"
              value={buscaIndividual}
              onChange={(e) => setBuscaIndividual(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => comFeedback("individual", relatorioIndividual)}
            disabled={gerando === "individual"}
          >
            {gerando === "individual" ? "Gerando…" : "Baixar CSV"}
          </button>
        </div>
      </div>
    </>
  );
}

function dataHoje(): string {
  return isoData(new Date());
}

function isoData(data: Date): string {
  return data.toISOString().slice(0, 10);
}
