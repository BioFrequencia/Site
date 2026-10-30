import type { PrioridadeAlerta, StatusFrequencia } from "./types";

// Datas e horários: a API grava e devolve horários em UTC sem indicar o
// fuso ("2026-10-29 13:45:00", padrão do Supabase). Antes o site lia isso
// como horário local: tudo aparecia 3 horas adiantado (o código de vínculo
// "valia até" 3 h depois do que valia de verdade) e o que foi lançado
// depois das 21h aparecia no dia seguinte. Agora esses valores são lidos
// como UTC e mostrados no fuso da escola, independente do fuso do
// computador de quem abre o site.
export const FUSO_ESCOLA = "America/Sao_Paulo";

const SO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const HORARIO_SEM_FUSO = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)(\.\d+)?$/;

/** Converte um horário da API em Date (UTC quando vier sem fuso). */
export function lerHorarioApi(valor: string): Date | null {
  const semFuso = HORARIO_SEM_FUSO.exec(valor.trim());
  const texto = semFuso
    ? `${semFuso[1]}T${semFuso[2]}${semFuso[3] ? semFuso[3].slice(0, 4) : ""}Z`
    : valor.trim();
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "-";
  // Só a data (dia de calendário da escola): não passa por fuso nenhum.
  if (SO_DATA.test(iso)) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  const data = lerHorarioApi(iso);
  if (!data) return iso;
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO_ESCOLA });
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "-";
  const data = lerHorarioApi(iso);
  if (!data) return iso;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO_ESCOLA });
}

/** "AAAA-MM-DD HH:MM" no horário da escola - formato que a API aceita em dta_falta/dta_atraso. */
export function horarioLocalEscola(valorApi: string): string | null {
  const data = lerHorarioApi(valorApi);
  if (!data) return null;
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_ESCOLA, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(data);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")} ${p("hour")}:${p("minute")}`;
}

/** Data de hoje (AAAA-MM-DD) no calendário da escola. */
export function hojeNaEscola(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO_ESCOLA, year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function classeBadgeStatus(status: StatusFrequencia): string {
  switch (status) {
    case "Em risco":
      return "badge badge--em-risco";
    case "Atenção":
      return "badge badge--atencao";
    case "Regular":
      return "badge badge--regular";
    case "Excelente":
      return "badge badge--excelente";
    default:
      return "badge badge--neutral";
  }
}

export function classeBadgePrioridade(prioridade: PrioridadeAlerta): string {
  return `badge badge--${prioridade}`;
}

export function classeBarraStatus(status: StatusFrequencia): string {
  switch (status) {
    case "Em risco":
      return "var(--indigo)";
    case "Atenção":
      return "#9c8cfb";
    case "Regular":
      return "var(--emerald)";
    case "Excelente":
      return "var(--emerald)";
    default:
      return "var(--ink-300)";
  }
}

export function rotuloTipoAlerta(tipo: string): string {
  switch (tipo) {
    case "frequencia":
      return "Frequência";
    case "faltas":
      return "Faltas consecutivas";
    case "atrasos":
      return "Atrasos recorrentes";
    default:
      return tipo;
  }
}

export function formatarCpf(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length !== 11) return digitos;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarTelefone(digitos: string): string {
  const d = digitos.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return digitos;
}

/** Gera e baixa um CSV no navegador (sem dependências) - usado em Relatórios. */
export function baixarCsv(nomeArquivo: string, cabecalhos: string[], linhas: (string | number)[][]): void {
  const escapar = (valor: string | number) => {
    const texto = String(valor ?? "");
    return /[",\n;]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const conteudo = [cabecalhos, ...linhas].map((linha) => linha.map(escapar).join(";")).join("\r\n");
  const blob = new Blob(["﻿" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
