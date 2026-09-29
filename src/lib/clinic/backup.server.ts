import type { Sql } from "@/lib/db";

type Json = null | string | number | boolean | Json[] | { [k: string]: Json };
type Linha = Record<string, Json>;

function comoJson(v: unknown): Json {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "bigint") return Number(v);
  if (Array.isArray(v)) return v.map(comoJson);
  if (typeof v === "object") {
    const o: Record<string, Json> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) o[k] = comoJson(val);
    return o;
  }
  return String(v);
}

export type BackupV1 = {
  versao: 1;
  app: "NutriCiclos";
  exportadoEm: string;
  clinica: Linha;
  pacientes: Linha[];
  avaliacoes: Linha[];
  prescricoes: Linha[];
  refeicoes: Linha[];
  itens: Linha[];
  agenda: Linha[];
  recordatorios: Linha[];
  exames: Linha[];
  documentos: Linha[];
  listas: Linha[];
  profissionais: Linha[];
  alimentosProprios: Linha[];
  modelosCardapio: Linha[];
  referencias: Linha[];
  modelosDocumento: Linha[];
  dietas: Linha[];
  catalogo: { nome: string; quantidade: number; itens: Json } | null;
};

function linha(r: Record<string, unknown>): Linha {
  const o: Linha = {};
  for (const [k, v] of Object.entries(r)) {
    if (k === "user_id") continue;
    o[k] = comoJson(v);
  }
  return o;
}

async function tabela(sql: Sql, userId: string, nome: string): Promise<Linha[]> {
  const rows = await sql.query<Record<string, unknown>>(`select * from ${nome} where user_id = $1`, [userId]);
  return rows.map(linha);
}

export async function montarBackup(sql: Sql, userId: string): Promise<BackupV1> {
  const clinicaRows = await sql<Record<string, unknown>>`select * from clinica where user_id = ${userId}`;
  if (!clinicaRows[0]) throw new Error("Clínica ainda não foi aberta.");
  const catalogoRows = await sql<Record<string, unknown>>`select nome, quantidade, itens from catalogo_alimento where user_id = ${userId}`;
  const cat = catalogoRows[0];
  return {
    versao: 1,
    app: "NutriCiclos",
    exportadoEm: new Date().toISOString(),
    clinica: linha(clinicaRows[0]),
    pacientes: await tabela(sql, userId, "pacientes"),
    avaliacoes: await tabela(sql, userId, "avaliacoes"),
    prescricoes: await tabela(sql, userId, "prescricoes"),
    refeicoes: await tabela(sql, userId, "refeicoes"),
    itens: await tabela(sql, userId, "itens"),
    agenda: await tabela(sql, userId, "agenda"),
    recordatorios: await tabela(sql, userId, "recordatorios"),
    exames: await tabela(sql, userId, "exames"),
    documentos: await tabela(sql, userId, "documentos"),
    listas: await tabela(sql, userId, "listas"),
    profissionais: await tabela(sql, userId, "profissionais"),
    alimentosProprios: await tabela(sql, userId, "alimentos_proprios"),
    modelosCardapio: await tabela(sql, userId, "modelos_cardapio"),
    referencias: await tabela(sql, userId, "referencias_exame"),
    modelosDocumento: await tabela(sql, userId, "modelos_documento"),
    dietas: await tabela(sql, userId, "dietas"),
    catalogo: cat
      ? { nome: String(cat.nome ?? "arquivo"), quantidade: Number(cat.quantidade ?? 0), itens: comoJson(cat.itens) }
      : null,
  };
}

function txt(v: unknown, max: number) {
  return v == null ? "" : String(v).slice(0, max);
}

function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function data(v: unknown): string | null {
  if (v == null || v === "") return null;
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function instante(v: unknown): string | null {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function flag(v: unknown) {
  return v === true || v === "true" || v === "t" || v === 1;
}

function json(v: unknown) {
  try {
    if (typeof v === "string") {
      JSON.parse(v);
      return v;
    }
    return JSON.stringify(v ?? []);
  } catch {
    throw new Error("Um trecho do backup não é JSON válido.");
  }
}

function idDe(v: unknown) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function lista(v: unknown, nome: string): Linha[] {
  if (!Array.isArray(v)) throw new Error(`O arquivo não tem a lista ${nome}.`);
  if (v.length > 20000) throw new Error(`A lista ${nome} passa do limite.`);
  return v.filter((item) => item && typeof item === "object") as Linha[];
}

function exigirBackup(bruto: unknown): BackupV1 {
  if (!bruto || typeof bruto !== "object") throw new Error("Arquivo inválido.");
  const o = bruto as Record<string, unknown>;
  if (o.versao !== 1 || o.app !== "NutriCiclos") throw new Error("Este arquivo não é um backup do NutriCiclos.");
  const clinica = o.clinica;
  if (!clinica || typeof clinica !== "object" || txt((clinica as Linha).nome, 80).length < 2) {
    throw new Error("O backup não traz os dados da clínica.");
  }
  return {
    versao: 1,
    app: "NutriCiclos",
    exportadoEm: txt(o.exportadoEm, 40),
    clinica: clinica as Linha,
    pacientes: lista(o.pacientes, "pacientes"),
    avaliacoes: lista(o.avaliacoes, "avaliações"),
    prescricoes: lista(o.prescricoes, "cardápios"),
    refeicoes: lista(o.refeicoes, "refeições"),
    itens: lista(o.itens, "alimentos do cardápio"),
    agenda: lista(o.agenda, "agenda"),
    recordatorios: lista(o.recordatorios, "recordatórios"),
    exames: lista(o.exames, "exames"),
    documentos: lista(o.documentos, "documentos"),
    listas: lista(o.listas, "listas"),
    profissionais: lista(o.profissionais, "equipe"),
    alimentosProprios: lista(o.alimentosProprios, "alimentos próprios"),
    modelosCardapio: lista(o.modelosCardapio, "modelos de cardápio"),
    referencias: lista(o.referencias, "referências"),
    modelosDocumento: lista(o.modelosDocumento, "modelos de documento"),
    dietas: lista(o.dietas, "dietas"),
    catalogo:
      o.catalogo && typeof o.catalogo === "object"
        ? {
            nome: txt((o.catalogo as Linha).nome, 120) || "arquivo",
            quantidade: num((o.catalogo as Linha).quantidade),
            itens: (o.catalogo as Linha).itens,
          }
        : null,
  };
}

function novoId(rows: Linha[]): number {
  const id = idDe(rows[0]?.id);
  if (!id) throw new Error("Não foi possível gravar um registro do backup.");
  return id;
}

export async function restaurarBackup(sql: Sql, userId: string, bruto: unknown) {
  const b = exigirBackup(bruto);
  const c = b.clinica;
  await sql`
    update clinica set
      nome = ${txt(c.nome, 80)}, slogan = ${txt(c.slogan, 120)}, nutricionista = ${txt(c.nutricionista, 80)},
      crn = ${txt(c.crn, 40)}, contato = ${txt(c.contato, 120)}, cidade = ${txt(c.cidade, 80)},
      endereco = ${txt(c.endereco, 200)}, documento_emissor = ${txt(c.documento_emissor, 40)},
      logo = ${txt(c.logo, 400_000)},
      prot_g_kg = ${num(c.prot_g_kg, 1.6)}, gord_g_kg = ${num(c.gord_g_kg, 1)},
      deficit_kcal = ${Math.round(num(c.deficit_kcal, 500))}, superavit_kcal = ${Math.round(num(c.superavit_kcal, 400))},
      dias_reavaliacao = ${Math.round(num(c.dias_reavaliacao, 30))},
      adicional_gestante_t1 = ${Math.round(num(c.adicional_gestante_t1))},
      adicional_gestante_t2 = ${Math.round(num(c.adicional_gestante_t2, 340))},
      adicional_gestante_t3 = ${Math.round(num(c.adicional_gestante_t3, 452))},
      adicional_lactante = ${Math.round(num(c.adicional_lactante, 500))},
      variacao_bia = ${num(c.variacao_bia, 3)}, variacao_agua = ${num(c.variacao_agua, 2)}
    where user_id = ${userId}
  `;

  for (const nome of [
    "itens",
    "refeicoes",
    "prescricoes",
    "avaliacoes",
    "recordatorios",
    "exames",
    "documentos",
    "dietas",
    "agenda",
    "pacientes",
    "listas",
    "profissionais",
    "alimentos_proprios",
    "modelos_cardapio",
    "referencias_exame",
    "modelos_documento",
    "catalogo_alimento",
  ]) {
    await sql.query(`delete from ${nome} where user_id = $1`, [userId]);
  }

  const prof = new Map<number, number>();
  for (const p of b.profissionais) {
    const antigo = idDe(p.id);
    const rows = await sql<Linha>`
      insert into profissionais (user_id, nome, crn, cpf, ativo, funcao, cargo)
      values (
        ${userId}, ${txt(p.nome, 80)}, ${txt(p.crn, 40)}, ${txt(p.cpf, 20)}, ${flag(p.ativo)},
        ${txt(p.funcao, 40) || "nutricionista"}, ${txt(p.cargo, 80)}
      )
      returning id
    `;
    if (antigo) prof.set(antigo, novoId(rows));
  }

  const pac = new Map<number, number>();
  for (const p of b.pacientes) {
    const antigo = idDe(p.id);
    const nasc = data(p.data_nascimento);
    const rows = await sql<Linha>`
      insert into pacientes (
        user_id, nome, data_nascimento, sexo, genero, cpf, telefone, email, endereco, altura_cm,
        objetivo, patologias, alergias, medicamentos, antecedentes, observacoes, status, tipo_atendimento,
        profissional_id, administrativo_id, atualizado_em
      ) values (
        ${userId}, ${txt(p.nome, 120)}, ${nasc}::date, ${txt(p.sexo, 20)}, ${txt(p.genero, 40)},
        ${txt(p.cpf, 20)}, ${txt(p.telefone, 40)}, ${txt(p.email, 120)}, ${txt(p.endereco, 200)},
        ${p.altura_cm == null || p.altura_cm === "" ? null : num(p.altura_cm)},
        ${txt(p.objetivo, 80)}, ${txt(p.patologias, 500)}, ${txt(p.alergias, 500)}, ${txt(p.medicamentos, 500)},
        ${txt(p.antecedentes, 500)}, ${txt(p.observacoes, 1000)}, ${txt(p.status, 20) || "Ativo"},
        ${txt(p.tipo_atendimento, 40) || "Presencial"},
        ${prof.get(idDe(p.profissional_id) ?? 0) ?? null}, ${prof.get(idDe(p.administrativo_id) ?? 0) ?? null},
        ${instante(p.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
      returning id
    `;
    if (antigo) pac.set(antigo, novoId(rows));
  }

  const paciente = (v: unknown) => {
    const id = pac.get(idDe(v) ?? 0);
    if (!id) throw new Error("O backup cita um paciente que não está no arquivo.");
    return id;
  };

  for (const a of b.avaliacoes) {
    await sql`
      insert into avaliacoes (
        user_id, paciente_id, data, peso, altura, cintura, quadril, atividade, equipamento,
        jejum, sem_exercicio, hidratacao, gestante, lactante, trimestre, imc, tmb, get_kcal,
        kcal_meta, prot_meta, lip_meta, carb_meta, idade, diagnostico, observacoes,
        gordura_pct, massa_muscular, atualizado_em
      ) values (
        ${userId}, ${paciente(a.paciente_id)}, ${data(a.data) ?? "1970-01-01"}::date,
        ${num(a.peso)}, ${num(a.altura)}, ${a.cintura == null || a.cintura === "" ? null : num(a.cintura)},
        ${a.quadril == null || a.quadril === "" ? null : num(a.quadril)},
        ${txt(a.atividade, 80)}, ${txt(a.equipamento, 80)}, ${txt(a.jejum, 20)}, ${txt(a.sem_exercicio, 20)},
        ${txt(a.hidratacao, 40)}, ${txt(a.gestante, 20) || "Não"}, ${txt(a.lactante, 20) || "Não"}, ${txt(a.trimestre, 20)},
        ${num(a.imc)}, ${num(a.tmb)}, ${num(a.get_kcal)}, ${num(a.kcal_meta)}, ${num(a.prot_meta)}, ${num(a.lip_meta)},
        ${num(a.carb_meta)}, ${Math.round(num(a.idade))}, ${txt(a.diagnostico, 200)}, ${txt(a.observacoes, 1000)},
        ${a.gordura_pct == null || a.gordura_pct === "" ? null : num(a.gordura_pct)},
        ${a.massa_muscular == null || a.massa_muscular === "" ? null : num(a.massa_muscular)},
        ${instante(a.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  const presc = new Map<number, number>();
  for (const p of b.prescricoes) {
    const antigo = idDe(p.id);
    const rows = await sql<Linha>`
      insert into prescricoes (
        user_id, paciente_id, titulo, data, situacao, retorno_em, kcal_meta, prot_meta, carb_meta, lip_meta,
        hidratacao, emitida_em, atualizado_em
      ) values (
        ${userId}, ${paciente(p.paciente_id)}, ${txt(p.titulo, 120)}, ${data(p.data) ?? "1970-01-01"}::date,
        ${txt(p.situacao, 20) || "Rascunho"}, ${data(p.retorno_em)}::date,
        ${num(p.kcal_meta)}, ${num(p.prot_meta)}, ${num(p.carb_meta)}, ${num(p.lip_meta)}, ${txt(p.hidratacao, 300)},
        ${instante(p.emitida_em)}::timestamptz, ${instante(p.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
      returning id
    `;
    if (antigo) presc.set(antigo, novoId(rows));
  }

  const refMap = new Map<number, number>();
  for (const r of b.refeicoes) {
    const antigo = idDe(r.id);
    const prescricaoId = presc.get(idDe(r.prescricao_id) ?? 0);
    if (!prescricaoId) throw new Error("O backup cita um cardápio que não está no arquivo.");
    const rows = await sql<Linha>`
      insert into refeicoes (user_id, prescricao_id, ordem, nome, hora, orientacao)
      values (${userId}, ${prescricaoId}, ${Math.round(num(r.ordem))}, ${txt(r.nome, 80)}, ${txt(r.hora, 8)}, ${txt(r.orientacao, 500)})
      returning id
    `;
    if (antigo) refMap.set(antigo, novoId(rows));
  }

  for (const item of b.itens) {
    const prescricaoId = presc.get(idDe(item.prescricao_id) ?? 0);
    const refeicaoId = refMap.get(idDe(item.refeicao_id) ?? 0);
    if (!prescricaoId || !refeicaoId) throw new Error("O backup cita um alimento de cardápio sem a refeição.");
    await sql`
      insert into itens (
        user_id, prescricao_id, refeicao_id, ordem, alimento_id, alimento_nome, medida, qtd, gramas,
        kcal, ptn, cho, lip, fibra
      ) values (
        ${userId}, ${prescricaoId}, ${refeicaoId}, ${Math.round(num(item.ordem))}, ${txt(item.alimento_id, 20)},
        ${txt(item.alimento_nome, 160)}, ${txt(item.medida, 40)}, ${num(item.qtd)}, ${num(item.gramas)},
        ${num(item.kcal)}, ${num(item.ptn)}, ${num(item.cho)}, ${num(item.lip)}, ${num(item.fibra)}
      )
    `;
  }

  for (const a of b.agenda) {
    const pid = idDe(a.paciente_id);
    await sql`
      insert into agenda (user_id, tipo, titulo, notas, paciente_id, dia, hora, feito, origem, atualizado_em)
      values (
        ${userId}, ${txt(a.tipo, 20)}, ${txt(a.titulo, 160)}, ${txt(a.notas, 500)},
        ${pid ? paciente(a.paciente_id) : null}, ${data(a.dia) ?? "1970-01-01"}::date, ${a.hora == null ? null : txt(a.hora, 8)},
        ${flag(a.feito)}, ${txt(a.origem, 40)}, ${instante(a.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const r of b.recordatorios) {
    await sql`
      insert into recordatorios (
        user_id, paciente_id, data, tipo, queixa, refeicoes, gosta, nao_gosta, alergias, restricoes,
        quem_cozinha, rotina, agua, bebidas, sono_apetite, atividade, suplementos, digestao, orcamento,
        observacoes, atualizado_em
      ) values (
        ${userId}, ${paciente(r.paciente_id)}, ${data(r.data) ?? "1970-01-01"}::date, ${txt(r.tipo, 40)},
        ${txt(r.queixa, 500)}, ${json(r.refeicoes)}::jsonb, ${txt(r.gosta, 500)}, ${txt(r.nao_gosta, 500)},
        ${txt(r.alergias, 500)}, ${txt(r.restricoes, 500)}, ${txt(r.quem_cozinha, 200)}, ${txt(r.rotina, 500)},
        ${txt(r.agua, 200)}, ${txt(r.bebidas, 200)}, ${txt(r.sono_apetite, 200)}, ${txt(r.atividade, 200)},
        ${txt(r.suplementos, 300)}, ${txt(r.digestao, 300)}, ${txt(r.orcamento, 200)}, ${txt(r.observacoes, 1000)},
        ${instante(r.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const e of b.exames) {
    await sql`
      insert into exames (
        user_id, paciente_id, data, exame, resultado, unidade, referencia, fora_faixa, situacao, observacao, atualizado_em
      ) values (
        ${userId}, ${paciente(e.paciente_id)}, ${data(e.data) ?? "1970-01-01"}::date, ${txt(e.exame, 80)},
        ${txt(e.resultado, 40)}, ${txt(e.unidade, 20)}, ${txt(e.referencia, 40)}, ${flag(e.fora_faixa)},
        ${txt(e.situacao, 20)}, ${txt(e.observacao, 300)}, ${instante(e.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const d of b.documentos) {
    await sql`
      insert into documentos (
        user_id, paciente_id, tipo, titulo, data, situacao, hora_inicio, hora_fim, destinatario, valor,
        referente, motivo, texto_livre, texto, emitido_em, atualizado_em
      ) values (
        ${userId}, ${paciente(d.paciente_id)}, ${txt(d.tipo, 40)}, ${txt(d.titulo, 160)},
        ${data(d.data) ?? "1970-01-01"}::date, ${txt(d.situacao, 20) || "Rascunho"}, ${txt(d.hora_inicio, 8)},
        ${txt(d.hora_fim, 8)}, ${txt(d.destinatario, 120)}, ${txt(d.valor, 40)}, ${txt(d.referente, 160)},
        ${txt(d.motivo, 1000)}, ${txt(d.texto_livre, 100_000)}, ${txt(d.texto, 100_000)},
        ${instante(d.emitido_em)}::timestamptz, ${instante(d.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const d of b.dietas) {
    const pid = idDe(d.paciente_id);
    await sql`
      insert into dietas (
        user_id, paciente_id, tipo, nome, data, indicacao, kcal_meta, prot_meta, carb_meta, lip_meta,
        observacoes, refeicoes, atualizado_em
      ) values (
        ${userId}, ${pid ? paciente(d.paciente_id) : null}, ${txt(d.tipo, 20) || "paciente"}, ${txt(d.nome, 120)},
        ${data(d.data)}::date, ${txt(d.indicacao, 160)}, ${num(d.kcal_meta)}, ${num(d.prot_meta)}, ${num(d.carb_meta)},
        ${num(d.lip_meta)}, ${txt(d.observacoes, 1000)}, ${json(d.refeicoes)}::jsonb,
        ${instante(d.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const l of b.listas) {
    await sql`
      insert into listas (user_id, lista, ordem, valor, extra)
      values (${userId}, ${txt(l.lista, 40)}, ${Math.round(num(l.ordem))}, ${txt(l.valor, 80)}, ${txt(l.extra, 40)})
    `;
  }

  for (const a of b.alimentosProprios) {
    await sql`
      insert into alimentos_proprios (user_id, nome, grupo, kcal, ptn, cho, lip, fibra, medidas)
      values (
        ${userId}, ${txt(a.nome, 120)}, ${txt(a.grupo, 80)}, ${num(a.kcal)}, ${num(a.ptn)}, ${num(a.cho)},
        ${num(a.lip)}, ${num(a.fibra)}, ${txt(a.medidas, 500)}
      )
    `;
  }

  for (const m of b.modelosCardapio) {
    await sql`
      insert into modelos_cardapio (
        user_id, titulo, tema, kcal_meta, prot_meta, carb_meta, lip_meta, hidratacao, refeicoes, atualizado_em
      ) values (
        ${userId}, ${txt(m.titulo, 120)}, ${txt(m.tema, 80)}, ${num(m.kcal_meta)}, ${num(m.prot_meta)},
        ${num(m.carb_meta)}, ${num(m.lip_meta)}, ${txt(m.hidratacao, 300)}, ${json(m.refeicoes)}::jsonb,
        ${instante(m.atualizado_em) ?? new Date().toISOString()}::timestamptz
      )
    `;
  }

  for (const r of b.referencias) {
    await sql`
      insert into referencias_exame (user_id, ordem, nome, unidade, referencia)
      values (${userId}, ${Math.round(num(r.ordem))}, ${txt(r.nome, 80)}, ${txt(r.unidade, 20)}, ${txt(r.referencia, 40)})
    `;
  }

  for (const m of b.modelosDocumento) {
    await sql`
      insert into modelos_documento (user_id, chave, titulo, campos, texto)
      values (${userId}, ${txt(m.chave, 40)}, ${txt(m.titulo, 120)}, ${txt(m.campos, 8000)}, ${txt(m.texto, 100_000)})
    `;
  }

  if (b.catalogo && Array.isArray(b.catalogo.itens)) {
    const jsonItens = JSON.stringify(b.catalogo.itens);
    await sql`
      insert into catalogo_alimento (user_id, nome, quantidade, atualizado_em, itens)
      values (${userId}, ${txt(b.catalogo.nome, 120)}, ${b.catalogo.itens.length}, now(), ${jsonItens}::jsonb)
    `;
  }

  return { pacientes: b.pacientes.length, avaliacoes: b.avaliacoes.length, prescricoes: b.prescricoes.length };
}
