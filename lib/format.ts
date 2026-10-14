import type { PrioridadeAlerta, StatusFrequencia } from "./types";

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "-";
  const data = new Date(iso.includes("T") || iso.includes(" ") ? iso.replace(" ", "T") : iso + "T00:00:00");
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleDateString("pt-BR");
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return "-";
  const data = new Date(iso.includes("T") ? iso : iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
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
