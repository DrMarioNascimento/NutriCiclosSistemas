import type { CampoModelo } from "./catalogo";

export type Clinica = {
  nome: string;
  slogan: string;
  nutricionista: string;
  crn: string;
  contato: string;
  cidade: string;
  endereco: string;
  documentoEmissor: string;
  logo: string;
  protGKg: number;
  gordGKg: number;
  deficitKcal: number;
  superavitKcal: number;
  diasReavaliacao: number;
  adicionalGestanteT1: number;
  adicionalGestanteT2: number;
  adicionalGestanteT3: number;
  adicionalLactante: number;
  variacaoBia: number;
  variacaoAgua: number;
};

export type Paciente = {
  id: number;
  nome: string;
  dataNascimento: string | null;
  sexo: string;
  genero: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  alturaCm: number | null;
  objetivo: string;
  patologias: string;
  alergias: string;
  medicamentos: string;
  antecedentes: string;
  observacoes: string;
  status: string;
  tipoAtendimento: string;
  profissionalId: number | null;
  profissionalNome: string;
  administrativoId: number | null;
  administrativoNome: string;
  temDieta: boolean;
  idade: number | null;
  plano: "nenhum" | "rascunho" | "emitida";
};

export type Avaliacao = {
  id: number;
  data: string;
  peso: number;
  altura: number;
  cintura: number | null;
  quadril: number | null;
  atividade: string;
  equipamento: string;
  jejum: string;
  semExercicio: string;
  hidratacao: string;
  gestante: string;
  lactante: string;
  trimestre: string;
  imc: number;
  tmb: number;
  get: number;
  kcalMeta: number;
  protMeta: number;
  lipMeta: number;
  carbMeta: number;
  idade: number;
  diagnostico: string;
  observacoes: string;
  sugeridaKcal: number;
  gorduraPct: number | null;
  massaMuscular: number | null;
};

export type ItemPlano = {
  id: number;
  refeicaoId: number;
  ordem: number;
  alimentoId: string;
  alimentoNome: string;
  medida: string;
  qtd: number;
  gramas: number;
  kcal: number;
  ptn: number;
  cho: number;
  lip: number;
  fibra: number;
};

export type Refeicao = {
  id: number;
  ordem: number;
  nome: string;
  hora: string;
  orientacao: string;
  itens: ItemPlano[];
};

export type Prescricao = {
  id: number;
  titulo: string;
  data: string;
  situacao: string;
  retornoEm: string | null;
  kcalMeta: number;
  protMeta: number;
  carbMeta: number;
  lipMeta: number;
  hidratacao: string;
  emitidaEm: string | null;
  refeicoes: Refeicao[];
};

export type CapaPlano = {
  nomeClinica: string;
  pedeCpf: boolean;
  temNascimento: boolean;
  temSenha: boolean;
};

export type PlanoAberto = {
  clinica: Pick<Clinica, "nome" | "slogan" | "nutricionista" | "crn" | "cidade" | "contato" | "logo">;
  pacienteNome: string;
  cardapio: Prescricao | null;
  dieta: Pick<Dieta, "nome" | "indicacao" | "observacoes" | "kcalMeta" | "protMeta" | "carbMeta" | "lipMeta" | "refeicoes"> | null;
};

export type AgendaItem = {
  id: number;
  tipo: "retorno" | "lembrete" | "consulta";
  titulo: string;
  notas: string;
  pacienteId: number | null;
  pacienteNome: string | null;
  dia: string;
  hora: string | null;
  feito: boolean;
};

export type Listas = {
  objetivos: string[];
  atividades: Array<{ nome: string; fator: number }>;
  equipamentos: string[];
  refeicoes: Array<{ nome: string; hora: string }>;
  alergias: Array<{ nome: string; palavras: string }>;
};

export type FuncaoEquipe = "nutricionista" | "outro" | "administrativo";

export type Profissional = {
  id: number;
  nome: string;
  funcao: FuncaoEquipe;
  cargo: string;
  crn: string;
  cpf: string;
  ativo: boolean;
};

export type RefeicaoDieta = {
  nome: string;
  hora: string;
  substituicoes: string;
};

export type Dieta = {
  id: number;
  tipo: "paciente" | "modelo";
  pacienteId: number | null;
  nome: string;
  data: string;
  indicacao: string;
  kcalMeta: number;
  protMeta: number;
  carbMeta: number;
  lipMeta: number;
  observacoes: string;
  refeicoes: RefeicaoDieta[];
};

export type AlimentoProprio = {
  id: number;
  nome: string;
  grupo: string;
  kcal: number;
  ptn: number;
  cho: number;
  lip: number;
  fibra: number;
  medidas: string;
};

export type ItemModelo = {
  alimentoId: string;
  alimentoNome: string;
  medida: string;
  qtd: number;
  gramas: number;
  kcal: number;
  ptn: number;
  cho: number;
  lip: number;
  fibra: number;
};

export type RefeicaoModelo = {
  nome: string;
  hora: string;
  orientacao: string;
  itens: ItemModelo[];
};

export type ModeloCardapio = {
  id: number;
  titulo: string;
  tema: string;
  kcalMeta: number;
  protMeta: number;
  carbMeta: number;
  lipMeta: number;
  hidratacao: string;
  refeicoes: RefeicaoModelo[];
};

export type Painel = {
  hoje: string;
  clinica: Clinica;
  pacientes: Paciente[];
  agenda: AgendaItem[];
  listas: Listas;
  profissionais: Profissional[];
};

export type RelatoRefeicao = {
  hora: string;
  relato: string;
  obs: string;
};

export type Recordatorio = {
  id: number;
  data: string;
  tipo: string;
  queixa: string;
  refeicoes: RelatoRefeicao[];
  gosta: string;
  naoGosta: string;
  alergias: string;
  restricoes: string;
  quemCozinha: string;
  rotina: string;
  agua: string;
  bebidas: string;
  sonoApetite: string;
  atividade: string;
  suplementos: string;
  digestao: string;
  orcamento: string;
  observacoes: string;
};

export type Exame = {
  id: number;
  data: string;
  exame: string;
  resultado: string;
  unidade: string;
  referencia: string;
  foraFaixa: boolean;
  situacao: string;
  observacao: string;
};

export type Documento = {
  id: number;
  tipo: string;
  titulo: string;
  data: string;
  situacao: string;
  horaInicio: string;
  horaFim: string;
  destinatario: string;
  valor: string;
  referente: string;
  motivo: string;
  textoLivre: string;
  texto: string;
  emitidoEm: string | null;
  verificacaoToken: string;
};

export type ReferenciaExame = {
  id: number;
  nome: string;
  unidade: string;
  referencia: string;
};

export type ModeloSalvo = {
  id: number;
  chave: string;
  titulo: string;
  campos: CampoModelo[];
  texto: string;
};

export type CatalogoBase = {
  origem: "fabrica" | "arquivo";
  nome: string;
  quantidade: number;
  atualizadoEm: string | null;
};

export type Sistema = {
  clinica: Clinica;
  referencias: ReferenciaExame[];
  modelos: ModeloSalvo[];
  listas: Listas;
  profissionais: Profissional[];
  alimentos: AlimentoProprio[];
  modelosCardapio: ModeloCardapio[];
  modelosDieta: Dieta[];
  catalogo: CatalogoBase;
};

export type Prontuario = {
  hoje: string;
  clinica: Clinica;
  paciente: Paciente;
  avaliacoes: Avaliacao[];
  prescricoes: Prescricao[];
  agenda: AgendaItem[];
  recordatorios: Recordatorio[];
  exames: Exame[];
  documentos: Documento[];
  referencias: ReferenciaExame[];
  modelos: ModeloSalvo[];
  listas: Listas;
  profissionais: Profissional[];
  dietas: Dieta[];
  modelosDieta: Dieta[];
  modelosCardapio: Array<{ id: number; titulo: string; tema: string }>;
  prescricoesOutras: Array<{ id: number; titulo: string; data: string; pacienteNome: string }>;
};

export type AlimentoBusca = {
  id: string;
  n: string;
  g: string;
  k: number;
  p: number;
  l: number;
  c: number;
  f: number;
  m: Array<[string, number]>;
};
