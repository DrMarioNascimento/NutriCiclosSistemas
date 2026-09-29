import { getSql } from "@/lib/db";
import type { CapaPlano, ItemPlano, PlanoAberto, Prescricao, Refeicao, RefeicaoDieta } from "./types";

function txt(v: unknown) {
  return v == null ? "" : String(v);
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dia(v: unknown) {
  if (v == null) return null;
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function refeicoesDieta(v: unknown): RefeicaoDieta[] {
  let lista: unknown = v;
  if (typeof v === "string") {
    try {
      lista = JSON.parse(v);
    } catch {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const i = item as Record<string, unknown>;
    const nome = txt(i.nome).trim();
    if (!nome) return [];
    return [{ nome, hora: txt(i.hora).slice(0, 5), substituicoes: txt(i.substituicoes) }];
  });
}

const falhas = new Map<string, { n: number; ate: number }>();

function bloqueado(token: string) {
  const f = falhas.get(token);
  if (!f || f.n < 5) return false;
  if (Date.now() < f.ate) return true;
  falhas.delete(token);
  return false;
}

function registrarFalha(token: string) {
  const f = falhas.get(token) ?? { n: 0, ate: 0 };
  f.n += 1;
  if (f.n >= 5) f.ate = Date.now() + 15 * 60 * 1000;
  falhas.set(token, f);
}

export async function capaDoToken(token: string): Promise<CapaPlano | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const sql = await getSql();
  const rows = await sql<Record<string, unknown>>`
    select p.data_nascimento, p.cpf, p.plano_senha, c.nome as clinica_nome
    from pacientes p
    left join clinica c on c.user_id = p.user_id
    where p.plano_token = ${token}
  `;
  const row = rows[0];
  if (!row) return null;
  const cpf = txt(row.cpf).replace(/\D/g, "");
  return {
    nomeClinica: txt(row.clinica_nome) || "NutriCiclos",
    pedeCpf: cpf.length >= 3,
    temNascimento: Boolean(dia(row.data_nascimento)),
    temSenha: txt(row.plano_senha).length >= 4,
  };
}

export async function planoDoToken(token: string, confirmacao: { nascimento: string; cpf3: string; senha: string }): Promise<PlanoAberto | "data" | "cpf" | "senha" | "limite" | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  if (bloqueado(token)) return "limite";
  const sql = await getSql();
  const donos = await sql<Record<string, unknown>>`
    select id, user_id, nome, data_nascimento, cpf, plano_senha from pacientes where plano_token = ${token}
  `;
  const dono = donos[0];
  if (!dono) return null;
  const nascimento = dia(dono.data_nascimento);
  const cpf = txt(dono.cpf).replace(/\D/g, "");
  if (!nascimento || nascimento !== confirmacao.nascimento) {
    registrarFalha(token);
    return "data";
  }
  if (cpf.length >= 3 && cpf.slice(-3) !== confirmacao.cpf3.replace(/\D/g, "")) {
    registrarFalha(token);
    return "cpf";
  }
  const senha = txt(dono.plano_senha).replace(/\D/g, "");
  const digitada = confirmacao.senha.replace(/\D/g, "");
  if (!senha || digitada !== senha) {
    registrarFalha(token);
    return "senha";
  }
  falhas.delete(token);
  const userId = txt(dono.user_id);
  const pacienteId = num(dono.id);
  const clinicas = await sql<Record<string, unknown>>`
    select nome, slogan, nutricionista, crn, cidade, contato, logo
    from clinica where user_id = ${userId}
  `;
  const c = clinicas[0];
  const caps = await sql<Record<string, unknown>>`
    select * from prescricoes
    where user_id = ${userId} and paciente_id = ${pacienteId} and situacao = 'Emitida'
    order by data desc, id desc
    limit 1
  `;
  let cardapio: Prescricao | null = null;
  const cap = caps[0];
  if (cap) {
    const presId = num(cap.id);
    const refs = await sql<Record<string, unknown>>`
      select * from refeicoes where user_id = ${userId} and prescricao_id = ${presId} order by ordem, id
    `;
    const itens = await sql<Record<string, unknown>>`
      select * from itens where user_id = ${userId} and prescricao_id = ${presId} order by ordem, id
    `;
    const porRef = new Map<number, ItemPlano[]>();
    for (const r of itens) {
      const item: ItemPlano = {
        id: num(r.id),
        refeicaoId: num(r.refeicao_id),
        ordem: num(r.ordem),
        alimentoId: txt(r.alimento_id),
        alimentoNome: txt(r.alimento_nome),
        medida: txt(r.medida),
        qtd: num(r.qtd),
        gramas: num(r.gramas),
        kcal: num(r.kcal),
        ptn: num(r.ptn),
        cho: num(r.cho),
        lip: num(r.lip),
        fibra: num(r.fibra),
      };
      const lista = porRef.get(item.refeicaoId) ?? [];
      lista.push(item);
      porRef.set(item.refeicaoId, lista);
    }
    const refeicoes: Refeicao[] = refs.map((r) => ({
      id: num(r.id),
      ordem: num(r.ordem),
      nome: txt(r.nome),
      hora: txt(r.hora).slice(0, 5),
      orientacao: txt(r.orientacao),
      itens: porRef.get(num(r.id)) ?? [],
    }));
    cardapio = {
      id: presId,
      titulo: txt(cap.titulo),
      data: dia(cap.data) ?? "",
      situacao: txt(cap.situacao),
      retornoEm: dia(cap.retorno_em),
      kcalMeta: num(cap.kcal_meta),
      protMeta: num(cap.prot_meta),
      carbMeta: num(cap.carb_meta),
      lipMeta: num(cap.lip_meta),
      hidratacao: txt(cap.hidratacao),
      emitidaEm: cap.emitida_em ? String(cap.emitida_em) : null,
      refeicoes,
    };
  }
  const dietas = await sql<Record<string, unknown>>`
    select * from dietas
    where user_id = ${userId} and paciente_id = ${pacienteId} and tipo = 'paciente'
    order by data desc nulls last, id desc
    limit 1
  `;
  const d = dietas[0];
  return {
    clinica: {
      nome: txt(c?.nome) || "NutriCiclos",
      slogan: txt(c?.slogan),
      nutricionista: txt(c?.nutricionista),
      crn: txt(c?.crn),
      cidade: txt(c?.cidade),
      contato: txt(c?.contato),
      logo: txt(c?.logo),
    },
    pacienteNome: txt(dono.nome),
    cardapio,
    dieta: d
      ? {
          nome: txt(d.nome),
          indicacao: txt(d.indicacao),
          observacoes: txt(d.observacoes),
          kcalMeta: num(d.kcal_meta),
          protMeta: num(d.prot_meta),
          carbMeta: num(d.carb_meta),
          lipMeta: num(d.lip_meta),
          refeicoes: refeicoesDieta(d.refeicoes),
        }
      : null,
  };
}
