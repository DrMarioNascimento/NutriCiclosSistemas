export const TIPOS_COMPROVANTE = [
  "declaracao_comparecimento",
  "declaracao_comparecimento_acompanhante",
  "atestado",
  "declaracao_acompanhamento",
] as const;

export type TipoComprovante = (typeof TIPOS_COMPROVANTE)[number];

export function eComprovante(tipo: string): tipo is TipoComprovante {
  return (TIPOS_COMPROVANTE as readonly string[]).includes(tipo);
}

export function eViaLeitura(tipo: string) {
  return tipo.startsWith("tcle_") || tipo.startsWith("lgpd_") || tipo.startsWith("uso_imagem");
}

export function rotuloCampoDocumento(tipo: string, campo: string) {
  if (tipo === "declaracao_comparecimento_acompanhante") {
    if (campo === "destinatario") return "Nome de quem acompanhou";
    if (campo === "referente") return "CPF de quem acompanhou";
    if (campo === "motivo") return "Vínculo (filha, pai, avó…)";
    if (campo === "horaInicio") return "Horário de início";
    if (campo === "horaFim") return "Horário de término";
  }
  const padrao: Record<string, string> = {
    horaInicio: "Horário de início",
    horaFim: "Horário de término",
    destinatario: "Destinatário",
    valor: "Valor em R$",
    referente: "Referente a",
    motivo: "Motivo",
    textoLivre: "Texto complementar",
  };
  return padrao[campo] ?? campo;
}
