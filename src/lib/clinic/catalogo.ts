export type ExameCatalogo = {
  nome: string;
  unidade: string;
  referencia: string;
};

export const CATALOGO_EXAMES: readonly ExameCatalogo[] = [
  { nome: "Hemograma completo", unidade: "", referencia: "" },
  { nome: "Glicemia de jejum", unidade: "mg/dL", referencia: "70-99" },
  { nome: "Hemoglobina glicada (HbA1c)", unidade: "%", referencia: "4-5,6" },
  { nome: "Insulina de jejum", unidade: "µUI/mL", referencia: "2-25" },
  { nome: "Colesterol total", unidade: "mg/dL", referencia: "0-190" },
  { nome: "HDL", unidade: "mg/dL", referencia: "40-200" },
  { nome: "LDL", unidade: "mg/dL", referencia: "0-130" },
  { nome: "Triglicerídeos", unidade: "mg/dL", referencia: "0-150" },
  { nome: "TSH", unidade: "µUI/mL", referencia: "0,4-4,5" },
  { nome: "T4 livre", unidade: "ng/dL", referencia: "0,7-1,8" },
  { nome: "Ferritina", unidade: "ng/mL", referencia: "15-150" },
  { nome: "Ferro sérico", unidade: "µg/dL", referencia: "50-170" },
  { nome: "Vitamina B12", unidade: "pg/mL", referencia: "200-900" },
  { nome: "Ácido fólico", unidade: "ng/mL", referencia: "3-17" },
  { nome: "Vitamina D (25-OH)", unidade: "ng/mL", referencia: "30-100" },
  { nome: "Creatinina", unidade: "mg/dL", referencia: "0,5-1,1" },
  { nome: "Ureia", unidade: "mg/dL", referencia: "15-45" },
  { nome: "TGO (AST)", unidade: "U/L", referencia: "0-40" },
  { nome: "TGP (ALT)", unidade: "U/L", referencia: "0-41" },
  { nome: "Gama-GT", unidade: "U/L", referencia: "0-38" },
  { nome: "Ácido úrico", unidade: "mg/dL", referencia: "2,4-6" },
  { nome: "PCR ultrassensível", unidade: "mg/L", referencia: "0-3" },
  { nome: "Cálcio", unidade: "mg/dL", referencia: "8,5-10,5" },
  { nome: "Magnésio", unidade: "mg/dL", referencia: "1,7-2,6" },
  { nome: "Zinco", unidade: "µg/dL", referencia: "70-120" },
  { nome: "Estradiol", unidade: "pg/mL", referencia: "" },
  { nome: "FSH", unidade: "mUI/mL", referencia: "" },
  { nome: "Progesterona", unidade: "ng/mL", referencia: "" },
];

export function exameDoCatalogo(nome: string): ExameCatalogo | undefined {
  return CATALOGO_EXAMES.find((e) => e.nome === nome);
}

export type CampoModelo = "horaInicio" | "horaFim" | "destinatario" | "valor" | "referente" | "motivo" | "textoLivre";

export type ModeloDocumento = {
  chave: string;
  titulo: string;
  campos: CampoModelo[];
  texto: string;
};

export const MODELOS: readonly ModeloDocumento[] = [
  {
    chave: "declaracao_comparecimento",
    titulo: "Declaração de Comparecimento",
    campos: ["horaInicio", "horaFim"],
    texto: "Declaro, para os devidos fins, que {{nome}}, CPF {{cpf}}, esteve em atendimento nutricional nesta clínica no dia {{data}}, das {{hora_inicio}} às {{hora_fim}}.",
  },
  {
    chave: "atestado",
    titulo: "Atestado",
    campos: ["textoLivre"],
    texto: "Atesto, para os devidos fins, que {{nome}}, CPF {{cpf}}, esteve sob meus cuidados profissionais nesta data.\n{{texto_livre}}",
  },
  {
    chave: "orientacoes_gerais",
    titulo: "Orientações Gerais",
    campos: ["textoLivre"],
    texto:
      "Beba água ao longo do dia, mesmo sem sede.\nFaça as refeições com calma, em ambiente tranquilo, mastigando bem.\nPriorize alimentos in natura e minimamente processados; evite ultraprocessados.\nSiga o plano alimentar e anote dúvidas para a próxima consulta.\n{{texto_livre}}",
  },
  {
    chave: "declaracao_acompanhamento",
    titulo: "Declaração de Acompanhamento Nutricional",
    campos: ["textoLivre"],
    texto:
      "Declaro, para os devidos fins, que {{nome}}, CPF {{cpf}}, está em acompanhamento nutricional nesta clínica, sob a responsabilidade de {{nutricionista}} ({{crn}}).\nEm acompanhamento desde: {{primeira_consulta}}\n{{texto_livre}}",
  },
  {
    chave: "encaminhamento",
    titulo: "Encaminhamento",
    campos: ["destinatario", "motivo", "textoLivre"],
    texto:
      "Encaminho {{nome}}, CPF {{cpf}}, nascido(a) em {{nascimento}}, para avaliação e conduta de {{destinatario}}.\nMotivo do encaminhamento: {{motivo}}\n{{texto_livre}}\nColoco-me à disposição para a troca de informações sobre o caso.",
  },
  {
    chave: "relatorio_nutricional",
    titulo: "Relatório Nutricional",
    campos: ["destinatario", "textoLivre"],
    texto:
      "Destinatário: {{destinatario}}\nPaciente: {{nome}}, CPF {{cpf}}, nascido(a) em {{nascimento}}.\nEm acompanhamento desde: {{primeira_consulta}}\nÚltima avaliação: {{resumo_avaliacao}}\nDiagnóstico nutricional: {{diagnostico}}\nConduta: {{prescricao_vigente}}\n{{texto_livre}}",
  },
  {
    chave: "recibo",
    titulo: "Recibo",
    campos: ["valor", "referente", "textoLivre"],
    texto:
      "Recebi de {{nome}}, CPF {{cpf}}, a importância de R$ {{valor}}, referente a {{referente}}.\nEmitente: {{nutricionista}}\nCPF/CNPJ do emitente: {{documento_emissor}}\nPara clareza, firmo o presente recibo.\n{{texto_livre}}",
  },
  {
    chave: "tcle_presencial",
    titulo: "Termo de Consentimento Livre e Esclarecido — Atendimento Presencial",
    campos: [],
    texto:
      "Eu, {{nome}}, CPF {{cpf}}, nascido(a) em {{nascimento}}, declaro que fui informado(a) de forma clara sobre os objetivos, procedimentos e limites do acompanhamento nutricional realizado por {{nutricionista}} ({{crn}}), na clínica {{clinica}}.\nAutorizo a realização de avaliação antropométrica e de composição corporal por bioimpedância, bem como o registro das informações em prontuário, que será guardado pelo prazo mínimo de 20 anos, conforme a Resolução CFN nº 594/2017.\nEstou ciente de que meus dados pessoais e de saúde serão tratados com sigilo, exclusivamente para a finalidade do atendimento, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), e que posso solicitar acesso, correção ou informações sobre eles a qualquer momento.\nDeclaro que posso retirar este consentimento a qualquer tempo, sem prejuízo ao meu atendimento.",
  },
  {
    chave: "tcle_telenutricao",
    titulo: "Termo de Consentimento Livre e Esclarecido — Telenutrição",
    campos: [],
    texto:
      "Eu, {{nome}}, CPF {{cpf}}, nascido(a) em {{nascimento}}, declaro que aceito ser atendido(a) na modalidade de telenutrição por {{nutricionista}} ({{crn}}), da clínica {{clinica}}, conforme a Resolução CFN nº 666/2020.\nFui informado(a) sobre as limitações do atendimento não presencial, em especial quanto à avaliação física, e de que medidas enviadas por mim serão consideradas autorreferidas.\nAutorizo o registro das informações em prontuário, guardado pelo prazo mínimo de 20 anos (Resolução CFN nº 594/2017), e o tratamento dos meus dados com sigilo, nos termos da LGPD (Lei nº 13.709/2018).\nDeclaro que posso retirar este consentimento a qualquer tempo.",
  },
  {
    chave: "lgpd_dados",
    titulo: "Termo de Consentimento para Tratamento de Dados Pessoais",
    campos: ["textoLivre"],
    texto:
      "Eu, {{nome}}, CPF {{cpf}}, autorizo a clínica {{clinica}}, por meio de {{nutricionista}} ({{crn}}), a coletar, registrar e armazenar meus dados pessoais e dados pessoais sensíveis de saúde (medidas, exames, hábitos alimentares e condições clínicas) com a finalidade exclusiva de prestar o atendimento nutricional e manter o prontuário.\nOs dados não serão compartilhados com terceiros sem minha autorização, salvo obrigação legal ou regulatória, e serão guardados pelo prazo exigido para o prontuário profissional.\nPosso, a qualquer momento, solicitar acesso, correção ou informações sobre o uso dos meus dados e revogar este consentimento, sem prejuízo da guarda obrigatória do prontuário (Lei nº 13.709/2018 — LGPD).\n{{texto_livre}}",
  },
  {
    chave: "uso_imagem_adulto",
    titulo: "Termo de Autorização de Uso de Imagem",
    campos: ["textoLivre"],
    texto:
      "Eu, {{nome}}, CPF {{cpf}}, autorizo {{nutricionista}} ({{crn}}), da clínica {{clinica}}, a registrar minha imagem por fotografia durante o acompanhamento nutricional, com a finalidade de acompanhar a evolução do tratamento.\nAs imagens ficam restritas ao prontuário e à finalidade clínica. Uso em material educativo ou de divulgação, sempre sem identificação do rosto:  (   ) autorizo     (   ) não autorizo.\nEsta autorização é gratuita e pode ser revogada a qualquer momento, por escrito, sem prejuízo do atendimento (Código Civil, art. 20; Lei nº 13.709/2018).\n{{texto_livre}}",
  },
];

export const CAMPOS_MODELO = [
  "horaInicio",
  "horaFim",
  "destinatario",
  "valor",
  "referente",
  "motivo",
  "textoLivre",
] as const satisfies readonly CampoModelo[];

export function camposDe(texto: string): CampoModelo[] {
  const ok = new Set<string>(CAMPOS_MODELO);
  return texto
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is CampoModelo => ok.has(s));
}

export function modeloPorChave(chave: string): ModeloDocumento | undefined {
  return MODELOS.find((m) => m.chave === chave);
}

export function preencherModelo(texto: string, vars: Record<string, string>): string {
  return texto
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, chave: string) => vars[chave] ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
