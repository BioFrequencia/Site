// Formatos de resposta e entidades da BioFrequenciaApi.
// Espelha exatamente o que cada endpoint PHP devolve (ver helpers/resposta.php
// e os arquivos em BioFrequenciaApi/user, /acompanhamento, /responsavel,
// /notificacao e /digital) - nenhum campo aqui foi inventado.

export interface RespostaApi<T> {
  sucesso: boolean;
  mensagem: string;
  dados: T | null;
  naoAutenticado?: boolean;
}

export interface Coordenacao {
  id_coordenacao: number;
  nome_coordenacao: string;
  email_coordenacao: string;
}

export interface Sala {
  id_sala: number;
  nome_sala: string;
  periodo_sala: string;
}

export type StatusFrequencia = "Em risco" | "Atenção" | "Regular" | "Excelente";

export interface AlunoFiltro {
  id_aluno: number;
  nome_aluno: string;
  turma: string | null;
  faltas: number;
  atrasos: number;
  frequencia: string; // ex.: "92%"
  status: StatusFrequencia;
}

export interface ListaAlunos {
  alunos: AlunoFiltro[];
  pagina_atual: number;
  total_paginas: number;
  total_registros: number;
}

export type TipoAlerta = "frequencia" | "faltas" | "atrasos";
export type PrioridadeAlerta = "alta" | "media" | "baixa";

export interface Alerta {
  id_alerta: string;
  id_aluno: number;
  nome_aluno: string;
  id_sala?: number;
  turma: string | null;
  tipo: TipoAlerta;
  prioridade: PrioridadeAlerta;
  motivo: string;
  frequencia: number;
  dta_referencia: string;
}

export interface ListaAlertas {
  alertas: Alerta[];
  total: number;
}

export interface EvolucaoMensal {
  mes: string;
  frequencia: number;
}

export interface TurmaResumo {
  id_sala?: number;
  nome_sala: string;
  total_alunos: number;
  frequencia: number;
}

export interface Dashboard {
  frequencia_geral: number;
  delta_frequencia: number;
  alertas_ativos: number;
  alertas_alta_prioridade: number;
  alunos_observacao: number;
  atrasos_mes: number;
  delta_atrasos: number;
  contatos_pendentes: number;
  evolucao_mensal: EvolucaoMensal[];
  turmas: TurmaResumo[];
  prioridade_lista: Alerta[];
}

export interface RegistroFalta {
  id: number;
  data: string;
  motivo: string | null;
  justificado: boolean;
  observacao: string | null;
}

export interface HistoricoAluno {
  aluno: {
    id_aluno: number;
    nome_aluno: string;
    nome_sala: string | null;
    /** Responsável que autorizou o uso da biometria (null: sem consentimento). */
    consentimento_responsavel: string | null;
    consentimento_em: string | null;
    /** Biometria facial cadastrada pelo app (null: não cadastrada). */
    facial_atualizada_em: string | null;
    facial_amostras: number | null;
    digitais: number;
  };
  periodo: { inicio: string; fim: string };
  faltas: RegistroFalta[];
  atrasos: RegistroFalta[];
}

export type MetodoPresenca = "facial" | "digital" | "manual";

export const ROTULOS_METODO_PRESENCA: Record<MetodoPresenca, string> = {
  facial: "Reconhecimento facial",
  digital: "Digital",
  manual: "Manual",
};

/** presenca/listar.php: quem está presente num dia e quem ainda não foi registrado. */
export interface PresencasDoDia {
  data: string;
  total_alunos: number;
  presentes: {
    id_aluno: number;
    nome_aluno: string;
    id_sala: number;
    nome_sala: string;
    id_presenca: number;
    registrada_em: string;
    metodo: MetodoPresenca;
  }[];
  ausentes: { id_aluno: number; nome_aluno: string; id_sala: number; nome_sala: string }[];
}

export const PERIODOS_SALA = ["Matutino", "Vespertino", "Noturno", "Indefinido"] as const;

export const CANAIS_ACOMPANHAMENTO = [
  "Ligação para responsável",
  "Mensagem pelo aplicativo",
  "Reunião presencial",
  "Comunicado por escrito",
] as const;
export type CanalAcompanhamento = (typeof CANAIS_ACOMPANHAMENTO)[number];

export interface Acompanhamento {
  id_acompanhamento: number;
  id_aluno: number;
  nome_aluno: string;
  nome_sala: string | null;
  canal: CanalAcompanhamento;
  observacao: string | null;
  data_registro: string;
  nome_coordenacao: string;
}

export interface ListaAcompanhamento {
  registros: Acompanhamento[];
  pagina_atual: number;
  total_paginas: number;
  total_registros: number;
}

// Valores aceitos pelo banco (restrição chk_genero_responsavel). O site
// oferecia "Outro", que o banco recusava (erro 500 no cadastro).
export const GENEROS_RESPONSAVEL = ["Feminino", "Masculino", "Indefinido"] as const;
export const ROTULOS_GENERO_RESPONSAVEL: Record<(typeof GENEROS_RESPONSAVEL)[number], string> = {
  Feminino: "Feminino",
  Masculino: "Masculino",
  Indefinido: "Outro / prefere não informar",
};

export interface Responsavel {
  id_responsavel: number;
  nome_responsavel: string;
  cpf_responsavel: string;
  telefone_responsavel: string;
  email_responsavel: string | null;
  genero_responsavel: (typeof GENEROS_RESPONSAVEL)[number];
}

// "erro": o envio automático (provedor de WhatsApp/email) falhou.
export type StatusNotificacao = "pendente" | "enviada" | "erro";

export interface Notificacao {
  id_notificacao: number;
  id_aluno: number;
  nome_aluno: string;
  id_responsavel: number;
  nome_responsavel: string;
  telefone_responsavel: string;
  email_responsavel: string | null;
  mensagem: string;
  status_notificacao: StatusNotificacao;
  data_envio_notificacao: string | null;
  canal?: string | null;
  nivel_alerta?: number | null;
}

export interface ListaNotificacoes {
  notificacoes: Notificacao[];
  pagina_atual: number;
  total_paginas: number;
  total_registros: number;
}

export interface CheckinPendente {
  id_checkin: number;
  id_aluno: number;
  nome_aluno: string;
  nome_sala: string | null;
  tipo: "entrada" | "atraso" | string;
  metodo: string;
  data_checkin: string;
}

export const GENEROS_ALUNO = ["Feminino", "Masculino"] as const;

/** Ocorrência enviada pelo app do aluno, aguardando decisão da coordenação. */
export interface Ocorrencia {
  id_ocorrencia: number;
  id_aluno: number;
  nome_aluno: string;
  turma: string | null;
  tipo: "falta" | "atraso";
  motivo: string | null;
  observacao: string | null;
  responsavel_ciente: boolean;
  status: "pendente" | "aprovado" | "rejeitado";
  criado_em: string;
  revisado_em: string | null;
  revisado_por: string | null;
  observacao_revisao: string | null;
}
