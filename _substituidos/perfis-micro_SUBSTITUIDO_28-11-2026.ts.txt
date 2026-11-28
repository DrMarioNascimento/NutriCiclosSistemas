import { CATALOGO_MICRO, tipoPadraoMeta, type CodigoMicro } from "./composicao-micro.ts";
import type { MetaMicronutriente } from "./types";

// Sugestões para a nutricionista revisar. Não substituem a avaliação clínica.
// Referências de adultos (19 anos ou mais): DRI (NASEM/IOM) — RDA ou AI; sódio pelo limite CDRR de 2019.
// Tetos de gordura saturada, gordura trans e açúcar de adição seguem a OMS (percentual das calorias do dia).

export type ContextoMicro = {
  sexo: string;
  idade: number | null;
  objetivo?: string;
  patologias?: string;
  medicamentos?: string;
  kcal?: number;
  gestanteOuLactante?: boolean;
};

export type PerfilMicro = {
  id: string;
  nome: string;
  porque: string;
  nutrientes: CodigoMicro[];
  palavras: string[];
  aviso?: string;
  // Valores que trocam a referência geral do adulto neste perfil (ex.: sódio pela OMS na hipertensão).
  ajustes?: Partial<Record<CodigoMicro, number>>;
};

export const PERFIS_MICRO: PerfilMicro[] = [
  {
    id: "base",
    nome: "Adulto saudável",
    porque: "Conjunto básico para qualquer adulto.",
    nutrientes: ["calcio", "ferro", "magnesio", "zinco", "potassio", "sodio_total", "vitamina_a", "vitamina_c", "vitamina_d", "vitamina_b12", "folato_dfe"],
    palavras: [],
  },
  {
    id: "climaterio",
    nome: "Climatério e menopausa",
    porque: "Saúde óssea e vitaminas do complexo B na transição hormonal.",
    nutrientes: ["calcio", "vitamina_d", "magnesio", "vitamina_b6", "vitamina_b12", "folato_dfe", "ag_saturados"],
    palavras: ["menopausa", "climaterio", "perimenopausa", "pos-menopausa"],
  },
  {
    id: "hipertensao",
    nome: "Hipertensão",
    porque: "Controle do sódio e minerais que ajudam a pressão.",
    nutrientes: ["sodio_total", "potassio", "magnesio", "calcio"],
    palavras: ["hipertens", "pressao alta", "has"],
    ajustes: { sodio_total: 2000 },
  },
  {
    id: "anemia",
    nome: "Anemia e ferropenia",
    porque: "Ferro e o que ajuda a absorver e a formar sangue.",
    nutrientes: ["ferro", "vitamina_c", "vitamina_b12", "folato_dfe", "vitamina_b6", "cobre", "zinco", "vitamina_a"],
    palavras: ["anemia", "ferropenia", "ferritina", "deficiencia de ferro"],
  },
  {
    id: "dislipidemia",
    nome: "Dislipidemia e risco cardiovascular",
    porque: "Gorduras que mais pesam no colesterol.",
    nutrientes: ["colesterol", "ag_saturados", "ag_trans", "ag_poliinsaturados", "sodio_total"],
    palavras: ["colesterol", "dislipidemia", "triglic", "cardiovascular", "ldl"],
  },
  {
    id: "diabetes",
    nome: "Diabetes e resistência à insulina",
    porque: "Açúcar de adição e minerais ligados ao controle da glicose.",
    nutrientes: ["acucar_adicao", "magnesio", "potassio", "sodio_total"],
    palavras: ["diabetes", "glicemia", "resistencia a insulina", "resistencia insulinica", "pre-diabetes", "sop"],
  },
  {
    id: "esportivo",
    nome: "Nutrição esportiva",
    porque: "Minerais e vitaminas mais exigidos por quem treina.",
    nutrientes: ["ferro", "magnesio", "zinco", "potassio", "calcio", "vitamina_d", "vitamina_c", "vitamina_b6", "vitamina_b12", "folato_dfe"],
    palavras: ["atleta", "esporte", "hipertrofia", "treino", "corrida", "desempenho"],
  },
  {
    id: "emagrecimento-medicacao",
    nome: "Emagrecimento com medicação",
    porque: "Comer pouco por causa do remédio aumenta o risco de faltar nutriente.",
    nutrientes: ["calcio", "vitamina_d", "ferro", "vitamina_b12", "magnesio", "potassio", "zinco", "folato_dfe"],
    palavras: ["semaglutida", "tirzepatida", "liraglutida", "ozempic", "mounjaro", "wegovy", "saxenda", "glp"],
  },
  {
    id: "tireoide",
    nome: "Tireoide",
    porque: "Nutrientes ligados à função da tireoide.",
    nutrientes: ["selenio", "zinco", "ferro", "vitamina_d", "vitamina_b12"],
    palavras: ["tireoide", "hipotireoid", "hashimoto", "hipertireoid", "tsh"],
    aviso: "O iodo não consta na TACO nem na tabela do IBGE e precisa ser avaliado por fora.",
  },
];

export function perfilSugerido(contexto: ContextoMicro): PerfilMicro | undefined {
  const texto = semAcentoMinusculo(`${contexto.objetivo ?? ""} ${contexto.patologias ?? ""} ${contexto.medicamentos ?? ""} `);
  return PERFIS_MICRO.find((perfil) => perfil.palavras.some((p) => new RegExp(`\\b${p}${p.length <= 4 ? "\\b" : ""}`).test(texto)));
}

function semAcentoMinusculo(valor: string) {
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

type Faixa = { feminino: number; masculino: number };
const porSexo = (feminino: number, masculino: number): Faixa => ({ feminino, masculino });

// Valores de adultos. A idade ajusta cálcio, ferro, magnésio, vitamina B6 e vitamina D.
function referenciaAdulto(codigo: CodigoMicro, mulher: boolean, idade: number): number | undefined {
  const escolher = (f: Faixa) => (mulher ? f.feminino : f.masculino);
  switch (codigo) {
    case "calcio": return idade >= 71 || (mulher && idade >= 51) ? 1200 : 1000;
    case "ferro": return mulher && idade < 51 ? 18 : 8;
    case "magnesio": return escolher(porSexo(idade < 31 ? 310 : 320, idade < 31 ? 400 : 420));
    case "zinco": return escolher(porSexo(8, 11));
    case "potassio": return escolher(porSexo(2600, 3400));
    case "sodio_total": return 2300;
    case "vitamina_a": return escolher(porSexo(700, 900));
    case "vitamina_c": return escolher(porSexo(75, 90));
    case "vitamina_d": return idade > 70 ? 20 : 15;
    case "vitamina_b12": return 2.4;
    case "folato_dfe": return 400;
    case "vitamina_b6": return idade < 51 ? 1.3 : escolher(porSexo(1.5, 1.7));
    case "selenio": return 55;
    case "cobre": return 900;
    case "manganes": return escolher(porSexo(1.8, 2.3));
    case "fosforo": return 700;
    case "vitamina_b1": return escolher(porSexo(1.1, 1.2));
    case "vitamina_b2": return escolher(porSexo(1.1, 1.3));
    case "niacina_ne": return escolher(porSexo(14, 16));
    case "vitamina_e": return 15;
    case "colesterol": return 300;
    default: return undefined;
  }
}

function arredondar(valor: number) {
  return Math.round(valor * 10) / 10;
}

export function metaSugerida(codigo: CodigoMicro, contexto: ContextoMicro): number | undefined {
  if (contexto.gestanteOuLactante) return undefined;
  const idade = contexto.idade;
  const sexo = contexto.sexo.trim().toLowerCase();
  if (idade === null || idade < 19 || !(sexo.startsWith("f") || sexo.startsWith("m"))) return undefined;
  const kcal = contexto.kcal && contexto.kcal > 0 ? contexto.kcal : undefined;
  // Tetos da OMS: gordura saturada até 10% das calorias, trans até 1% e açúcar de adição até 10%.
  if (codigo === "ag_saturados") return kcal ? arredondar((kcal * 0.1) / 9) : undefined;
  if (codigo === "ag_trans") return kcal ? arredondar((kcal * 0.01) / 9) : undefined;
  if (codigo === "acucar_adicao") return kcal ? arredondar((kcal * 0.1) / 4) : undefined;
  return referenciaAdulto(codigo, sexo.startsWith("f"), idade);
}

export function montarSugestao(perfil: PerfilMicro, contexto: ContextoMicro, jaEscolhidos: readonly string[]) {
  const existentes = new Set(jaEscolhidos.map((nome) => semAcentoMinusculo(nome).trim()));
  const novas: Array<Omit<MetaMicronutriente, "meta"> & { meta: string }> = [];
  for (const codigo of perfil.nutrientes) {
    const [nome, unidade] = CATALOGO_MICRO[codigo];
    if (existentes.has(semAcentoMinusculo(nome).trim())) continue;
    const base = metaSugerida(codigo, contexto);
    const meta = base === undefined ? undefined : (perfil.ajustes?.[codigo] ?? base);
    novas.push({ nome, unidade, tipo: tipoPadraoMeta(codigo), meta: meta === undefined ? "" : String(meta) });
  }
  return novas;
}
