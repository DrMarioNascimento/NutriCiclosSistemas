export const ATIVIDADES = [
  { nome: "Sedentário", fator: 1.2 },
  { nome: "Levemente ativo", fator: 1.375 },
  { nome: "Moderadamente ativo", fator: 1.55 },
  { nome: "Muito ativo", fator: 1.725 },
  { nome: "Extremamente ativo", fator: 1.9 },
] as const;

export const OBJETIVOS = [
  "Emagrecer",
  "Manter peso / saúde",
  "Ganhar massa muscular",
  "Saúde da mulher",
  "Menopausa / climatério",
  "Gestação",
  "Lactação",
  "Performance esportiva",
  "Controle de doença crônica",
] as const;

export const EQUIPAMENTOS = [
  "Bodyscan Pro (Relaxmedic)",
  "Fita métrica",
  "Adipômetro",
  "Balança comum",
] as const;

export const GATILHOS: Array<[string, string[]]> = [
  ["Lactose", ["leite", "lactose", "queijo", "iogurte", "requeijao", "creme de leite", "manteiga", "nata", "doce de leite", "whey"]],
  ["Leite", ["leite", "queijo", "iogurte", "requeijao", "creme de leite", "manteiga", "caseina", "whey", "nata"]],
  ["Glúten", ["trigo", "farinha", "pao", "macarrao", "cevada", "centeio", "malte", "biscoito", "bolo", "gluten"]],
  ["Ovo", ["ovo", "gema", "clara", "maionese"]],
  ["Amendoim", ["amendoim"]],
  ["Castanha", ["castanha", "nozes", "noz", "amendoa", "avela", "pistache", "macadamia"]],
  ["Frutos do mar", ["camarao", "lagosta", "siri", "caranguejo", "marisco", "ostra", "mexilhao", "lula", "polvo"]],
  ["Soja", ["soja", "tofu", "shoyu", "edamame"]],
  ["Peixe", ["peixe", "atum", "sardinha", "salmao", "bacalhau", "tilapia", "merluza"]],
];

export function hojeISO(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(agora);
}

export function addDias(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

export function idadeEm(nasc: string, ref = hojeISO()): number {
  const [y, m, d] = nasc.slice(0, 10).split("-").map(Number);
  const [Y, M, D] = ref.split("-").map(Number);
  let age = Y - y;
  if (M < m || (M === m && D < d)) age -= 1;
  return age;
}

export function arred(n: number, casas = 1): number {
  const p = 10 ** casas;
  return Math.round(n * p) / p;
}

export function imc(peso: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return peso / (m * m);
}

export function mifflin(sexo: string, peso: number, alturaCm: number, idade: number): number {
  const base = 10 * peso + 6.25 * alturaCm - 5 * idade;
  const mulher = sexo.toLowerCase().startsWith("f");
  return Math.round(mulher ? base - 161 : base + 5);
}

export function fatorDe(atividade: string): number {
  return ATIVIDADES.find((a) => a.nome === atividade)?.fator ?? 1.2;
}

export function sugerirKcal(
  objetivo: string,
  get: number,
  params: {
    deficit: number;
    superavit: number;
    gestanteT1?: number;
    gestanteT2?: number;
    gestanteT3?: number;
    lactanteKcal?: number;
  },
  situacao?: { gestante?: string; lactante?: string; trimestre?: string },
): number {
  const o = objetivo.toLowerCase();
  let kcal = get;
  if (o.includes("emagrec")) kcal = get - params.deficit;
  else if (o.includes("massa") || o.includes("performance")) kcal = get + params.superavit;
  if (situacao?.lactante === "Sim") kcal += params.lactanteKcal ?? 0;
  else if (situacao?.gestante === "Sim") {
    const t = situacao.trimestre;
    if (t === "1") kcal += params.gestanteT1 ?? 0;
    else if (t === "3") kcal += params.gestanteT3 ?? 0;
    else kcal += params.gestanteT2 ?? 0;
  }
  return Math.max(0, Math.round(kcal));
}

export function macrosDe(peso: number, kcal: number, protGKg: number, gordGKg: number) {
  const prot = Math.round(peso * protGKg);
  const lip = Math.round(peso * gordGKg);
  const usado = prot * 4 + lip * 9;
  const carb = Math.max(0, Math.round((kcal - usado) / 4));
  return { prot, lip, carb };
}

export function diagnosticoImc(valor: number): string {
  if (valor < 18.5) return "Baixo peso";
  if (valor < 25) return "Eutrofia";
  if (valor < 30) return "Sobrepeso";
  if (valor < 35) return "Obesidade grau I";
  if (valor < 40) return "Obesidade grau II";
  return "Obesidade grau III";
}

export function notaCintura(sexo: string, cintura: number): string | null {
  const fem = sexo.toLowerCase().startsWith("f");
  const muito = fem ? 88 : 102;
  const elevada = fem ? 80 : 94;
  if (cintura >= muito) return "Risco cardiometabólico (cintura muito elevada)";
  if (cintura >= elevada) return "Risco cardiometabólico (cintura elevada)";
  return null;
}

export function diagnosticoTexto(sexo: string, imcValor: number, cintura: number | null): string {
  const base = diagnosticoImc(imcValor);
  const extra = cintura && cintura > 0 ? notaCintura(sexo, cintura) : null;
  return extra ? `${base} · ${extra}` : base;
}

export type Perfil100 = { k: number; p: number; c: number; l: number; f: number };

export function nutrientes(perfil: Perfil100, gramas: number) {
  const fator = gramas / 100;
  return {
    kcal: arred(perfil.k * fator, 1),
    ptn: arred(perfil.p * fator, 1),
    cho: arred(perfil.c * fator, 1),
    lip: arred(perfil.l * fator, 1),
    fibra: arred(perfil.f * fator, 1),
  };
}

export function semAcento(s: string): string {
  const com = "áàâãäéèêëíìîïóòôõöúùûüç";
  const sem = "aaaaaeeeeiiiiooooouuuuc";
  let r = "";
  for (const ch of s.toLowerCase()) {
    const i = com.indexOf(ch);
    r += i >= 0 ? sem[i] : ch;
  }
  return r;
}

export function alertaAlergia(
  alergias: string,
  alimento: string,
  gatilhos: Array<[string, string[]]> = GATILHOS,
): string | null {
  const a = semAcento(alergias);
  const nome = semAcento(alimento);
  if (!a.trim()) return null;
  for (const [rotulo, palavras] of GATILHOS) {
    if (!a.includes(semAcento(rotulo))) continue;
    const achou = palavras.find((p) => nome.includes(p));
    if (achou) return `${rotulo}: “${alimento}” combina com a lista de alergias.`;
  }
  return null;
}

export function cpfValido(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const digito = (len: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += Number(d[i]) * (len + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

export function fmtCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function situacaoExame(resultado: string, referencia: string): "" | "Dentro" | "Abaixo" | "Acima" | "Conferir" {
  const bruto = resultado.trim();
  const faixa = referencia.trim();
  if (!bruto || !faixa) return "";
  const valor = Number(bruto.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(valor)) return "Conferir";
  const ref = faixa.replace(/\s/g, "").replace(/,/g, ".");
  let minimo: number | null = null;
  let maximo: number | null = null;
  if (ref.startsWith("<")) {
    maximo = Number(ref.slice(1));
  } else if (ref.startsWith(">")) {
    minimo = Number(ref.slice(1));
  } else {
    const corte = ref.indexOf("-", 1);
    if (corte < 0) return "Conferir";
    minimo = Number(ref.slice(0, corte));
    maximo = Number(ref.slice(corte + 1));
  }
  if ((minimo != null && !Number.isFinite(minimo)) || (maximo != null && !Number.isFinite(maximo))) return "Conferir";
  if (minimo != null && valor < minimo) return "Abaixo";
  if (maximo != null && valor > maximo) return "Acima";
  return "Dentro";
}

export function fmtNum(n: number, casas = 1): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function fmtData(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function saudacao(agora = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(agora),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
