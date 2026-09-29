import raw from "../../data/alimentos.json";
import { semAcento } from "./calc";
import type { AlimentoBusca } from "./types";

const lista = raw as AlimentoBusca[];
const porId = new Map(lista.map((a) => [a.id, a]));

export const QTD_BASE = lista.length;

export function alimentoPorId(id: string): AlimentoBusca | undefined {
  return porId.get(id);
}

export function alimentoNaLista(origem: readonly AlimentoBusca[], id: string): AlimentoBusca | undefined {
  return origem.find((a) => a.id === id);
}

export function buscarAlimentos(q: string, limite = 12): AlimentoBusca[] {
  return buscarNaLista(lista, q, limite);
}

export function buscarNaLista(origem: readonly AlimentoBusca[], q: string, limite = 12): AlimentoBusca[] {
  const t = semAcento(q).replace(/\s+/g, " ").trim();
  if (t.length < 2) return [];
  const pal = t.split(" ");
  const prefixo: AlimentoBusca[] = [];
  const resto: AlimentoBusca[] = [];
  for (const a of origem) {
    const n = semAcento(a.n);
    if (!pal.every((p) => n.includes(p))) continue;
    if (n.startsWith(pal[0] ?? "")) prefixo.push(a);
    else resto.push(a);
    if (prefixo.length >= limite) break;
  }
  return [...prefixo, ...resto].slice(0, limite);
}

export function gramasDe(alimento: AlimentoBusca, medida: string, qtd: number): number | null {
  if (!Number.isFinite(qtd) || qtd <= 0) return null;
  if (semAcento(medida) === "grama" || semAcento(medida) === "gramas") return Math.round(qtd * 10) / 10;
  const achou = alimento.m.find((m) => m[0] === medida);
  if (!achou) return null;
  return Math.round(achou[1] * qtd * 10) / 10;
}

const COLUNAS: Record<string, "id" | "n" | "g" | "k" | "p" | "c" | "l" | "f" | "m"> = {
  id: "id",
  codigo: "id",
  nome: "n",
  n: "n",
  alimento: "n",
  descricao: "n",
  grupo: "g",
  g: "g",
  categoria: "g",
  kcal: "k",
  k: "k",
  energia: "k",
  ptn: "p",
  p: "p",
  proteina: "p",
  proteinas: "p",
  cho: "c",
  c: "c",
  carboidrato: "c",
  carboidratos: "c",
  lip: "l",
  l: "l",
  lipidio: "l",
  lipidios: "l",
  gordura: "l",
  fibra: "f",
  f: "f",
  fibras: "f",
  medidas: "m",
  m: "m",
};

function chaveColuna(s: string) {
  return semAcento(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function numeroBr(v: unknown): number {
  if (typeof v === "number") return v;
  const t = String(v ?? "").trim();
  if (!t) return 0;
  if (t.includes(",") && t.includes(".")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (t.includes(",")) return Number(t.replace(",", "."));
  return Number(t);
}

function idEstavel(nome: string) {
  let h = 2166136261;
  const s = semAcento(nome).toLowerCase();
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return `N${(h >>> 0).toString(36).padStart(6, "0").slice(0, 7)}`;
}

function medidasDe(v: unknown): Array<[string, number]> {
  if (Array.isArray(v)) {
    const saida: Array<[string, number]> = [];
    for (const item of v) {
      if (Array.isArray(item) && item.length >= 2) {
        const nome = String(item[0] ?? "").trim();
        const g = numeroBr(item[1]);
        if (nome && Number.isFinite(g) && g > 0) saida.push([nome.slice(0, 40), Math.round(g * 10) / 10]);
      } else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const nome = String(o.nome ?? o.n ?? "").trim();
        const g = numeroBr(o.gramas ?? o.g ?? o.qtd);
        if (nome && Number.isFinite(g) && g > 0) saida.push([nome.slice(0, 40), Math.round(g * 10) / 10]);
      }
    }
    return saida.slice(0, 24);
  }
  const t = String(v ?? "").trim();
  if (!t) return [];
  if (t.startsWith("[")) {
    try {
      return medidasDe(JSON.parse(t));
    } catch {
      return [];
    }
  }
  const saida: Array<[string, number]> = [];
  for (const parte of t.split(/[;|]/)) {
    const pedaco = parte.trim();
    if (!pedaco) continue;
    const corte = pedaco.split(/[=:]/);
    if (corte.length < 2) continue;
    const nome = corte.slice(0, -1).join(":").trim();
    const g = numeroBr(corte[corte.length - 1]);
    if (nome && Number.isFinite(g) && g > 0) saida.push([nome.slice(0, 40), Math.round(g * 10) / 10]);
  }
  return saida.slice(0, 24);
}

function linhaAlimento(bruto: Record<string, unknown>, i: number, usados: Set<string>): AlimentoBusca | null {
  const nome = String(bruto.n ?? "").trim();
  if (nome.length < 2) return null;
  const k = numeroBr(bruto.k);
  const p = numeroBr(bruto.p);
  const c = numeroBr(bruto.c);
  const l = numeroBr(bruto.l);
  const f = numeroBr(bruto.f);
  if (![k, p, c, l, f].every((n) => Number.isFinite(n))) throw new Error(`Linha ${i + 1}: número inválido em ${nome}.`);
  if (k < 0 || k > 2000 || p < 0 || p > 100 || c < 0 || c > 100 || l < 0 || l > 100 || f < 0 || f > 100) {
    throw new Error(`Linha ${i + 1}: kcal ou macros fora da faixa em ${nome}. Use valores por 100 g.`);
  }
  let id = String(bruto.id ?? "").trim().replace(/\s+/g, "").slice(0, 16);
  if (!id) id = idEstavel(nome);
  if (usados.has(id)) id = `${id.slice(0, 14)}-${i + 1}`.slice(0, 20);
  usados.add(id);
  return {
    id,
    n: nome.slice(0, 160),
    g: String(bruto.g ?? "").trim().slice(0, 80),
    k: Math.round(k * 100) / 100,
    p: Math.round(p * 100) / 100,
    c: Math.round(c * 100) / 100,
    l: Math.round(l * 100) / 100,
    f: Math.round(f * 100) / 100,
    m: medidasDe(bruto.m),
  };
}

function deObjetos(linhas: unknown[]): AlimentoBusca[] {
  const usados = new Set<string>();
  const saida: AlimentoBusca[] = [];
  linhas.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const o = item as Record<string, unknown>;
    const bruto: Record<string, unknown> = {};
    for (const [chave, valor] of Object.entries(o)) {
      const col = COLUNAS[chaveColuna(chave)];
      if (col) bruto[col] = valor;
    }
    if (bruto.n == null && o.n != null) bruto.n = o.n;
    const alimento = linhaAlimento(bruto, i, usados);
    if (alimento) saida.push(alimento);
  });
  return saida;
}

function celulas(linha: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') {
          cur += '"';
          i++;
        } else aspas = false;
      } else cur += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function deCsv(texto: string): AlimentoBusca[] {
  const linhas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (linhas.length < 2) throw new Error("O CSV precisa de cabeçalho e ao menos um alimento.");
  const cabeca = linhas[0] ?? "";
  const sep = (cabeca.match(/;/g)?.length ?? 0) > (cabeca.match(/,/g)?.length ?? 0) ? ";" : ",";
  const colunas = celulas(cabeca, sep).map((c) => COLUNAS[chaveColuna(c)] ?? "");
  if (!colunas.includes("n")) throw new Error("Falta a coluna nome (ou alimento).");
  const usados = new Set<string>();
  const saida: AlimentoBusca[] = [];
  for (let i = 1; i < linhas.length; i++) {
    const vals = celulas(linhas[i] ?? "", sep);
    const bruto: Record<string, unknown> = {};
    colunas.forEach((col, idx) => {
      if (col) bruto[col] = vals[idx] ?? "";
    });
    const alimento = linhaAlimento(bruto, i - 1, usados);
    if (alimento) saida.push(alimento);
  }
  return saida;
}

/** Lê JSON (lista de alimentos) ou CSV com nome, kcal e macros por 100 g. */
export function interpretarCatalogo(texto: string): AlimentoBusca[] {
  const cru = texto.replace(/^\uFEFF/, "").trim();
  if (!cru) throw new Error("Arquivo vazio.");
  let itens: AlimentoBusca[];
  if (cru.startsWith("[") || cru.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(cru);
    } catch {
      throw new Error("JSON inválido.");
    }
    const listaJson = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? ((parsed as Record<string, unknown>).alimentos ?? (parsed as Record<string, unknown>).foods ?? (parsed as Record<string, unknown>).itens)
        : null;
    if (!Array.isArray(listaJson)) throw new Error("O JSON precisa ser uma lista de alimentos.");
    itens = deObjetos(listaJson);
  } else itens = deCsv(cru);
  if (itens.length === 0) throw new Error("Nenhum alimento válido. É preciso nome e números por 100 g.");
  if (itens.length > 8000) throw new Error("O arquivo passa de 8.000 alimentos.");
  return itens;
}
