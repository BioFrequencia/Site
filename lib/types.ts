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

export type PapelConta = "gestor" | "coordenador";

/**
 * Cargo na escola (migração 010): a função da pessoa, só descritiva. A
 * permissão no sistema é o papel (Gestão ou Coordenação), escolhida por
 * quem aprova - com a sugerida pelo cargo já marcada.
 */
export type CargoNaEscola = "direcao" | "vice_direcao" | "coordenacao" | "secretaria" | "outro";

export const ROTULOS_CARGO: Record<CargoNaEscola, string> = {
  direcao: "Direção",
  vice_direcao: "Vice-direção",
  coordenacao: "Coordenação pedagógica",
  secretaria: "Secretaria",
  outro: "Outro",
};

export const CARGOS_NA_ESCOLA = Object.keys(ROTULOS_CARGO) as CargoNaEscola[];

export const ROTULOS_PAPEL: Record<PapelConta, string> = { gestor: "Gestão", coordenador: "Coordenação" };

/** A mesma sugestão da API: direção e vice-direção ficam com a Gestão. */
export function papelSugeridoPeloCargo(cargo: CargoNaEscola | null | undefined): PapelConta {
  return cargo === "direcao" || cargo === "vice_direcao" ? "gestor" : "coordenador";
}

export interface Coordenacao {
  id_coordenacao: number;
  nome_coordenacao: string;
  email_coordenacao: string;
  /** Vem no login desde a migração 006; sessões salvas antes não têm. */
  nome_escola?: string;
  /** Migração 008: gestão (configura a escola e aprova a equipe) ou coordenação. */
  papel?: PapelConta;
  /** Conta da equipe do sistema (ADMIN_EMAILS na API): vê a tela /admin. */
  administrador?: boolean;
  municipio?: string | null;
}

/** conta/perfil.php e conta/atualizarPerfil.php. */
export interface PerfilConta {
  nome_coordenacao: string;
  email_coordenacao: string;
  nome_escola: string;
  papel?: PapelConta;
  /** Contas de antes da migração 010 ficam sem cargo até alguém informar. */
  cargo?: CargoNaEscola | null;
  municipio?: string | null;
  /** Escola do catálogo da SEDUC: o nome é o oficial e não muda pelo perfil. */
  escola_do_catalogo?: boolean;
  /** E-mail novo de uma troca que espera a confirmação pelo link (o login segue o atual). */
  email_pendente?: string | null;
}

/** Quem libera uma conta pendente: a gestão da escola ou a equipe do sistema. */
export type QuemAprova = "gestao" | "equipe";

/** user/addCoord.php: a conta nasce pendente, com o e-mail por confirmar. */
export interface ContaCriada {
  nome_escola: string;
  papel: PapelConta;
  cargo?: CargoNaEscola;
  situacao: SituacaoConta;
  email_verificado: boolean;
  /** O link de confirmação saiu (false: sem provedor de e-mail ou falha no envio). */
  email_enviado: boolean;
  aprovacao: QuemAprova;
}

/** conta/confirmarEmail.php. */
export interface EmailConfirmado {
  finalidade: "cadastro" | "troca_email";
  email: string;
  situacao: SituacaoConta;
  aprovacao: QuemAprova | null;
}

/** Por que o login foi recusado (dados do 403 de user/selectCoord.php). */
export interface LoginRecusado {
  situacao: SituacaoConta | "email_nao_confirmado";
}

/** Preferências da conta como a API guarda (conta/preferencias.php). */
export interface PreferenciasApi {
  tema: "claro" | "escuro" | "sistema";
  sons_ativos: boolean;
  volume_sons: number;
  som_confirmacao: boolean;
  som_notificacao: boolean;
  som_erro: boolean;
}

/** Aparelho conectado à conta (conta/sessoes.php). */
export interface SessaoConectada {
  id_sessao: string;
  cliente: "site" | "app";
  dispositivo: string;
  lembrar: boolean;
  criada_em: string;
  ultimo_acesso: string;
  expira_em: string;
  atual: boolean;
}

export type CategoriaChamado = "duvida" | "problema" | "biometria" | "conta" | "sugestao";
export type StatusChamado = "aberto" | "em_andamento" | "respondido" | "fechado";

export const ROTULOS_CATEGORIA_CHAMADO: Record<CategoriaChamado, string> = {
  duvida: "Dúvida",
  problema: "Problema no sistema",
  biometria: "Biometria e app",
  conta: "Conta e acesso",
  sugestao: "Sugestão",
};

export const ROTULOS_STATUS_CHAMADO: Record<StatusChamado, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  respondido: "Respondido",
  fechado: "Fechado",
};

/** Chamado de suporte (suporte/listarChamados.php). */
export interface ChamadoSuporte {
  id_chamado: number;
  categoria: CategoriaChamado;
  assunto: string;
  mensagem: string;
  status: StatusChamado;
  resposta: string | null;
  respondido_em: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface HorarioTurma {
  inicio: string;
  fim: string;
}

export interface Sala {
  id_sala: number;
  nome_sala: string;
  periodo_sala: string;
  /** Horário gravado na turma (null: vale o padrão do período). */
  horario_inicio?: string | null;
  horario_fim?: string | null;
  /** Horário que vale de fato (o da turma ou o padrão do período). */
  horario?: HorarioTurma;
  total_alunos?: number;
}

/** Situação do aluno pela taxa de entradas atrasadas e saídas antecipadas (user/filtroAluno.php). */
export type StatusAluno = "Regular" | "Perto do limite" | "Acima do limite" | "Crítico" | "Sem dias de aula";
export const STATUS_ALUNO: StatusAluno[] = ["Regular", "Perto do limite", "Acima do limite", "Crítico"];

export interface AlunoFiltro {
  id_aluno: number;
  nome_aluno: string;
  id_sala: number;
  turma: string | null;
  /** Dias com entrada atrasada / saída antecipada na janela da escola (padrão: 30 dias). */
  atrasos: number;
  saidas: number;
  dias_letivos: number;
  taxa_atrasos: number | null;
  taxa_saidas: number | null;
  status: StatusAluno;
}

export interface JanelaIndicadores {
  inicio: string;
  fim: string;
  dias: number;
  dias_letivos?: number;
}

export interface ListaAlunos {
  alunos: AlunoFiltro[];
  pagina_atual: number;
  total_paginas: number;
  total_registros: number;
  janela?: JanelaIndicadores;
  limite?: number;
}

export type TipoAlerta = "atrasos" | "saidas";
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
  ocorrencias: number;
  dias_letivos: number;
  taxa: number | null;
  dta_referencia: string;
  nivel?: number;
  nivel_rotulo?: string;
}

export interface ListaAlertas {
  alertas: Alerta[];
  total: number;
  limite?: number;
  janela?: JanelaIndicadores;
}

/** Um mês do gráfico do dashboard: dias distintos com registro, só em dia letivo. */
export interface EvolucaoMensal {
  mes: string;
  atrasos: number;
  saidas: number;
  dias_letivos: number;
  pontualidade: number | null;
}

export interface TurmaResumo {
  id_sala: number;
  nome_sala: string;
  periodo_sala?: string;
  total_alunos: number;
  atrasos: number;
  saidas: number;
  pontualidade: number | null;
}

export interface SituacaoDia {
  letivo: boolean;
  motivo: string | null;
}

export interface Dashboard {
  mes: string;
  hoje: { data: string } & SituacaoDia;
  /** % dos dias de aula do mês sem entrada atrasada; null antes do primeiro dia de aula. */
  pontualidade: number | null;
  pontualidade_anterior: number | null;
  delta_pontualidade: number | null;
  dias_letivos_mes: number;
  aluno_dias_mes: number;
  total_alunos: number;
  atrasos_mes: number;
  delta_atrasos: number;
  saidas_mes: number;
  delta_saidas: number;
  alertas_ativos: number;
  alertas_alta_prioridade: number;
  alunos_acima_limite: number;
  responsaveis_avisados_mes: number;
  contatos_pendentes: number;
  limite_alerta: number;
  janela_alerta_dias: number;
  evolucao_mensal: EvolucaoMensal[];
  turmas: TurmaResumo[];
  /** Registros antigos num fim de semana, feriado ou dia sem aula: não entram nas contas. */
  fora_do_calendario: number;
  prioridade_lista: Alerta[];
}

export type TipoRegistro = "atraso" | "saida";
export type OrigemAtraso = "manual" | "presenca" | "ocorrencia";

export interface RegistroEvento {
  id: number;
  data: string;
  motivo: string | null;
  justificado: boolean;
  observacao: string | null;
  origem?: OrigemAtraso | null;
  retirado_por?: string | null;
  registrado_por?: string | null;
}

/** O aluno na janela de alerta da escola (o mesmo número que decide o aviso ao responsável). */
export interface IndicadorAluno {
  dias_letivos: number;
  atrasos: number;
  saidas: number;
  taxa_atrasos: number | null;
  taxa_saidas: number | null;
  prioridade_atrasos: PrioridadeAlerta | null;
  prioridade_saidas: PrioridadeAlerta | null;
  ultimo_atraso: string | null;
  ultima_saida: string | null;
  situacao: StatusAluno;
  limite: number;
  minimo: number;
  janela_dias: number;
}

export interface HistoricoAluno {
  aluno: {
    id_aluno: number;
    nome_aluno: string;
    id_sala?: number;
    nome_sala: string | null;
    periodo_sala?: string | null;
    horario_inicio?: string | null;
    horario_fim?: string | null;
    /** Responsável que autorizou o uso da biometria (null: sem consentimento). */
    consentimento_responsavel: string | null;
    consentimento_em: string | null;
    /** Biometria facial cadastrada pelo app (null: não cadastrada). */
    facial_atualizada_em: string | null;
    facial_amostras: number | null;
    digitais: number;
  };
  periodo: { inicio: string; fim: string };
  atrasos: RegistroEvento[];
  saidas: RegistroEvento[];
  indicador: IndicadorAluno | null;
}

/** registro/listar.php: entradas atrasadas e saídas antecipadas de um dia. */
export interface RegistroDoDia {
  tipo: TipoRegistro;
  id: number;
  id_aluno: number;
  nome_aluno: string;
  id_sala: number;
  nome_sala: string;
  momento: string;
  motivo: string | null;
  justificado: boolean;
  observacao: string | null;
  origem: OrigemAtraso | null;
  retirado_por: string | null;
  registrado_por: string | null;
}

export interface RegistrosDoDia {
  data: string;
  dia: SituacaoDia;
  registros: RegistroDoDia[];
  atrasos: number;
  saidas: number;
  presentes: number;
  total_alunos: number;
}

/** O que os avisos aos responsáveis fizeram depois de um registro. */
export interface ResumoAviso {
  responsaveis?: number;
  enviados?: number;
  na_fila?: number;
  falhas?: number;
  sem_contato?: number;
  ja_avisado?: boolean;
  sem_responsavel?: boolean;
}

export interface AvisosDoRegistro {
  registro: ResumoAviso | null;
  limite: Partial<Record<TipoAlerta, ResumoAviso>> | [];
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

export const PERIODOS_SALA = ["Matutino", "Vespertino", "Noturno", "Integral", "Indefinido"] as const;

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

/** Por onde o responsável prefere receber os avisos (migração 008). */
export type CanalResponsavel = "whatsapp" | "email" | "ambos";
export const ROTULOS_CANAL_RESPONSAVEL: Record<CanalResponsavel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  ambos: "WhatsApp e e-mail",
};
export const PARENTESCOS_SUGERIDOS = ["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Irmã", "Irmão", "Responsável legal"] as const;

export interface Responsavel {
  id_responsavel: number;
  nome_responsavel: string;
  cpf_responsavel: string;
  telefone_responsavel: string;
  email_responsavel: string | null;
  genero_responsavel: (typeof GENEROS_RESPONSAVEL)[number];
  canal_preferido?: CanalResponsavel;
  /** Parentesco com o aluno da tela (é do vínculo, não da pessoa). */
  parentesco?: string | null;
}

/** responsavel/buscarResponsavelPorCpf.php: com os alunos desta escola que já acompanha. */
export interface ResponsavelEncontrado extends Responsavel {
  alunos: { id_aluno: number; nome_aluno: string; nome_sala: string; parentesco: string | null }[];
}

/** responsavel/listarDaEscola.php. */
export interface ResponsavelDaEscola extends Responsavel {
  alunos: { id_aluno: number; nome_aluno: string; id_sala: number; nome_sala: string; parentesco: string | null }[];
}

export interface ResponsaveisDaEscola {
  responsaveis: ResponsavelDaEscola[];
  sem_responsavel: { id_aluno: number; nome_aluno: string; id_sala: number; nome_sala: string }[];
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
  /** registro_atraso, registro_saida, limite_atrasos, limite_saidas (migração 008). */
  tipo_aviso?: string | null;
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

/** escola/buscar.php: escola do catálogo da SEDUC, para o cadastro. */
export interface EscolaCatalogo {
  id_escola: number;
  nome_escola: string;
  codigo_cie: number;
  municipio: string | null;
  bairro: string | null;
  endereco: string | null;
  numero: string | null;
  diretoria_ensino: string | null;
  /** A escola já usa o sistema: a conta nova precisa da aprovação da gestão. */
  tem_gestao: boolean;
}

export interface ConfiguracaoEscola {
  tolerancia_minutos: number;
  limite_alerta_percentual: number;
  minimo_ocorrencias_alerta: number;
  janela_alerta_dias: number;
  intervalo_aviso_dias: number;
  aviso_automatico: boolean;
  aviso_cada_registro: boolean;
  atraso_pela_presenca: boolean;
}

export type TipoCalendario = "sem_aula" | "aula_extra";

export interface ItemCalendario {
  id_calendario: number;
  data_inicio: string;
  data_fim: string;
  tipo: TipoCalendario;
  descricao: string;
}

/** escola/configuracao.php: a tela Escola. */
export interface DadosEscola {
  escola: {
    id_escola: number;
    nome_escola: string;
    nome_oficial: string | null;
    codigo_cie: number | null;
    codigo_inep: string | null;
    rede: string | null;
    diretoria_ensino: string | null;
    municipio: string | null;
    distrito: string | null;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
  };
  configuracao: ConfiguracaoEscola;
  padroes: ConfiguracaoEscola;
  faixas: Record<string, [number, number]>;
  horario_padrao: Record<string, HorarioTurma>;
  turmas: (Sala & { horario: HorarioTurma; total_alunos: number })[];
  ano: number;
  calendario: ItemCalendario[];
  feriados: { data: string; nome: string; dia_da_semana: number }[];
  hoje: { data: string } & SituacaoDia;
  papel: PapelConta;
  pode_editar: boolean;
}

export type SituacaoConta = "pendente" | "ativo" | "recusado" | "desativado";
export type AcaoEquipe = "aprovar" | "recusar" | "desativar" | "reativar" | "tornar_gestor" | "tornar_coordenador";

export interface MembroEquipe {
  id_coordenacao: number;
  nome_coordenacao: string;
  email_coordenacao?: string;
  papel: PapelConta;
  cargo?: CargoNaEscola | null;
  situacao: SituacaoConta;
  /** A aprovação só libera depois que a pessoa confirma o e-mail (migração 009). */
  email_verificado?: boolean;
  criado_em?: string | null;
  aprovado_em?: string | null;
  voce: boolean;
}

/** admin/resumo.php. */
export interface ResumoSistema {
  escolas_catalogo: number;
  escolas_em_uso: number;
  escolas_fora_catalogo: number;
  contas_ativas: number;
  /** Pendentes que já confirmaram o e-mail: as que dá para aprovar. */
  contas_pendentes: number;
  /** Pendentes que ainda não abriram o link do e-mail. */
  contas_sem_email: number;
  alunos: number;
  turmas: number;
  atrasos_mes: number;
  saidas_mes: number;
  presencas_mes: number;
  chamados_abertos: number;
  avisos_pendentes: number;
  catalogo: { versao: string; total: number; importado_em: string } | null;
  catalogo_versao_atual: string;
  administradores: number;
}

export interface EscolaAdmin {
  id_escola: number;
  nome_escola: string;
  codigo_cie: number | null;
  municipio: string | null;
  diretoria_ensino: string | null;
  bairro: string | null;
  contas_ativas: number;
  contas_pendentes: number;
  turmas: number;
  alunos: number;
}

export interface ContaAdmin {
  id_coordenacao: number;
  nome_coordenacao: string;
  email_coordenacao: string;
  papel: PapelConta;
  cargo?: CargoNaEscola | null;
  situacao: SituacaoConta;
  criado_em: string | null;
  id_escola: number;
  nome_escola: string;
  municipio: string | null;
  ultimo_acesso: string | null;
  administrador: boolean;
  email_verificado: boolean;
  /** A escola já tem gestão ativa (sem ela, quem for aprovado vira a gestão). */
  escola_tem_gestao?: boolean;
}

export interface ChamadoAdmin extends ChamadoSuporte {
  nome_coordenacao: string;
  email_coordenacao: string;
  nome_escola: string;
}

/** Listas paginadas da tela /admin. */
export interface ListaPaginada {
  pagina_atual: number;
  total_paginas: number;
  total_registros: number;
}
