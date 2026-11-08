"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { useToast } from "./Toast";
import { tocarSom } from "@/lib/sons";
import { EXTENSOES_PLANILHA, problemaDaPlanilha } from "@/lib/importacao";
import type { RespostaApi } from "@/lib/api";

/**
 * Peças comuns às duas importações por planilha - turmas e alunos
 * (/turmas/importar) e entradas e saídas anotadas sem internet
 * (/registros/importar): as etapas, o modelo, a área do arquivo, as
 * observações de cada linha, o rodapé da prévia e o painel do fim.
 */

export type EtapaImportacao<P, R> =
  | { tipo: "escolher" }
  | { tipo: "lendo"; arquivo: File }
  | { tipo: "previa"; arquivo: File; previa: P }
  | { tipo: "gravando"; arquivo: File; previa: P }
  | { tipo: "pronto"; resultado: R };

/**
 * Escolher o arquivo, ler a prévia (nada é gravado), confirmar com o
 * mesmo arquivo e o hash da prévia - a API confere tudo de novo - e
 * recomeçar.
 */
export function useImportacao<P extends { arquivo: { hash: string } }, R>(
  pedirPrevia: (arquivo: File) => Promise<RespostaApi<P>>,
  pedirConfirmacao: (arquivo: File, hash: string) => Promise<RespostaApi<R>>
) {
  const [etapa, setEtapa] = useState<EtapaImportacao<P, R>>({ tipo: "escolher" });
  const [erro, setErro] = useState<string | null>(null);
  const [soErros, setSoErros] = useState(false);

  async function lerArquivo(arquivo: File) {
    setErro(null);
    setSoErros(false);
    const problema = problemaDaPlanilha(arquivo);
    if (problema) {
      setErro(problema);
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "lendo", arquivo });
    const resposta = await pedirPrevia(arquivo);
    if (!resposta.sucesso || !resposta.dados) {
      setEtapa({ tipo: "escolher" });
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "previa", arquivo, previa: resposta.dados });
  }

  async function confirmar() {
    if (etapa.tipo !== "previa") return;
    setErro(null);
    setEtapa({ ...etapa, tipo: "gravando" });
    const resposta = await pedirConfirmacao(etapa.arquivo, etapa.previa.arquivo.hash);
    if (!resposta.sucesso || !resposta.dados) {
      setEtapa({ ...etapa, tipo: "previa" });
      setErro(resposta.mensagem);
      void tocarSom("erro");
      return;
    }
    setEtapa({ tipo: "pronto", resultado: resposta.dados });
    void tocarSom("confirmacao");
  }

  function recomecar() {
    setErro(null);
    setEtapa({ tipo: "escolher" });
  }

  const previa = etapa.tipo === "previa" || etapa.tipo === "gravando" ? etapa.previa : null;
  return { etapa, erro, previa, soErros, setSoErros, lerArquivo, confirmar, recomecar };
}

/** Passo 1: baixar o modelo (.xlsx) da escola. */
export function PassoModelo({ children, baixar }: { children: ReactNode; baixar: () => Promise<{ sucesso: boolean; mensagem: string }> }) {
  const { mostrarToast } = useToast();
  const [baixando, setBaixando] = useState(false);

  async function aoBaixar() {
    setBaixando(true);
    const resposta = await baixar();
    setBaixando(false);
    mostrarToast(resposta.mensagem, !resposta.sucesso);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>1. Baixe o modelo</h2>
      </div>
      <p className="results-caption">{children}</p>
      <button type="button" className="btn" onClick={aoBaixar} disabled={baixando} aria-busy={baixando}>
        <Icon name="download" /> {baixando ? "Gerando…" : "Baixar o modelo (.xlsx)"}
      </button>
    </section>
  );
}

/** Passo 2: escolher ou arrastar a planilha (o campo de arquivo fica dentro do rótulo). */
export function PassoArquivo({
  etapa,
  nomeDaPrevia,
  erro,
  onArquivo,
}: {
  etapa: EtapaImportacao<unknown, unknown>;
  nomeDaPrevia: string | null;
  erro: string | null;
  onArquivo: (arquivo: File) => void;
}) {
  const [arrastando, setArrastando] = useState(false);

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Limpa o campo: escolher o mesmo arquivo de novo (corrigido) dispara de novo.
    evento.target.value = "";
    if (arquivo) onArquivo(arquivo);
  }

  function aoSoltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastando(false);
    const arquivo = evento.dataTransfer.files?.[0];
    if (arquivo) onArquivo(arquivo);
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>2. Escolha a planilha</h2>
      </div>
      <label
        className={`area-arquivo${arrastando ? " arrastando" : ""}${etapa.tipo === "lendo" ? " lendo" : ""}`}
        onDragOver={(evento) => {
          evento.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={aoSoltar}
      >
        <input
          type="file"
          accept={EXTENSOES_PLANILHA.join(",")}
          onChange={aoEscolher}
          disabled={etapa.tipo === "lendo" || etapa.tipo === "gravando"}
          aria-describedby="dicaArquivo"
        />
        <Icon name="fileText" />
        <strong>
          {etapa.tipo === "lendo"
            ? `Lendo ${etapa.arquivo.name}…`
            : (nomeDaPrevia ?? "Arraste a planilha para cá ou clique para escolher")}
        </strong>
        <span id="dicaArquivo">Excel (.xlsx ou .xls), LibreOffice (.ods) ou .csv, até 2 MB.</span>
      </label>
      {erro && etapa.tipo === "escolher" && (
        <p className="field-error show" role="alert">
          {erro}
        </p>
      )}
    </section>
  );
}

/** Avisos da leitura e o filtro "só as linhas com erro", no topo da prévia. */
export function AvisosEFiltro({
  avisos,
  comErro,
  soErros,
  onSoErros,
}: {
  avisos: string[];
  comErro: number;
  soErros: boolean;
  onSoErros: (marcado: boolean) => void;
}) {
  return (
    <>
      {avisos.length > 0 && (
        <ul className="importacao-avisos">
          {avisos.map((aviso) => (
            <li key={aviso}>{aviso}</li>
          ))}
        </ul>
      )}
      {comErro > 0 && (
        <label className="importacao-filtro">
          <input type="checkbox" checked={soErros} onChange={(e) => onSoErros(e.target.checked)} /> Mostrar só as linhas com erro
        </label>
      )}
    </>
  );
}

/** O motivo do erro e os avisos de uma linha da prévia. */
export function Observacoes({ erros, avisos }: { erros: string[]; avisos: string[] }) {
  if (erros.length === 0 && avisos.length === 0) return <span className="panel-meta">-</span>;
  return (
    <ul className="importacao-observacoes">
      {erros.map((texto) => (
        <li key={texto} className="erro">
          {texto}
        </li>
      ))}
      {avisos.map((texto) => (
        <li key={texto}>{texto}</li>
      ))}
    </ul>
  );
}

/** Fim da prévia: o erro da confirmação, o que vai entrar e os botões. */
export function RodapeDaPrevia({
  erro,
  legenda,
  gravando,
  podeConfirmar,
  rotuloConfirmar,
  rotuloGravando,
  onConfirmar,
  onRecomecar,
}: {
  erro: string | null;
  legenda: ReactNode;
  gravando: boolean;
  podeConfirmar: boolean;
  rotuloConfirmar: string;
  rotuloGravando: string;
  onConfirmar: () => void;
  onRecomecar: () => void;
}) {
  return (
    <>
      {erro && (
        <p className="field-error show" role="alert">
          {erro}
        </p>
      )}
      <div className="importacao-confirmar">
        <p className="results-caption">{legenda}</p>
        <div className="importacao-acoes">
          <button type="button" className="btn" onClick={onRecomecar} disabled={gravando}>
            Escolher outro arquivo
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirmar}
            disabled={!podeConfirmar || gravando}
            aria-busy={gravando}
          >
            {gravando ? rotuloGravando : rotuloConfirmar}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * O painel do fim da importação. Ele toma o lugar do botão clicado: o foco
 * vai para o título, para quem usa teclado ou leitor de tela não ficar
 * perdido.
 */
export function PainelConcluido({ children, acoes }: { children: ReactNode; acoes: ReactNode }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <div className="panel importacao-pronta">
      <svg className="check-animado" viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r="23" />
        <path d="M15 27l7 7 15-16" />
      </svg>
      <h2 ref={titulo} tabIndex={-1}>
        Importação concluída
      </h2>
      {children}
      <div className="importacao-acoes">{acoes}</div>
    </div>
  );
}
