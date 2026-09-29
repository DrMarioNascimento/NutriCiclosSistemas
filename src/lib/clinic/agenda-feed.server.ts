import { getSql } from "@/lib/db";
import { icsDe, proximoAniversario, type NiverCal } from "./cal";
import { addDias } from "./calc";
import type { AgendaItem } from "./types";

function txt(v: unknown) {
  return v == null ? "" : String(v);
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function dia(v: unknown) {
  if (v == null) return "";
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : "";
}

export async function icsDoToken(token: string): Promise<string | null> {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const sql = await getSql();
  const dono = await sql<Record<string, unknown>>`select user_id from clinica where agenda_token = ${token}`;
  const userId = dono[0] ? txt(dono[0].user_id) : "";
  if (!userId) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const recente = addDias(hoje, -14);
  const limiteNiver = addDias(hoje, 366);
  const rows = await sql<Record<string, unknown>>`
    select a.*, p.nome as paciente_nome
    from agenda a
    left join pacientes p on p.id = a.paciente_id and p.user_id = a.user_id
    where a.user_id = ${userId} and (a.feito = false or a.dia >= ${recente}::date)
    order by a.dia, a.hora nulls last, a.id
  `;
  const itens: AgendaItem[] = rows.map((r) => ({
    id: num(r.id),
    tipo: txt(r.tipo) as AgendaItem["tipo"],
    titulo: txt(r.titulo),
    notas: txt(r.notas),
    pacienteId: r.paciente_id == null ? null : num(r.paciente_id),
    pacienteNome: r.paciente_nome == null ? null : txt(r.paciente_nome),
    dia: dia(r.dia),
    hora: r.hora ? txt(r.hora).slice(0, 5) : null,
    feito: r.feito === true || r.feito === "t" || r.feito === "true",
  }));
  const nasc = await sql<Record<string, unknown>>`
    select id, nome, data_nascimento from pacientes
    where user_id = ${userId} and status = 'Ativo' and data_nascimento is not null
  `;
  const nivers: NiverCal[] = [];
  for (const p of nasc) {
    const quando = proximoAniversario(dia(p.data_nascimento), hoje);
    if (!quando || quando > limiteNiver) continue;
    nivers.push({ id: num(p.id), nome: txt(p.nome), dia: quando });
  }
  return icsDe(itens, nivers);
}
