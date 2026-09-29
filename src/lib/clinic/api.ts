import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, withTransaction, type Sql } from "@/lib/db";
import {
  addDias,
  alertaAlergia,
  cpfValido,
  diagnosticoTexto,
  fatorDe,
  fmtCpf,
  hojeISO,
  idadeEm,
  imc,
  macrosDe,
  mifflin,
  arred,
  nutrientes,
  situacaoExame,
  semAcento,
  sugerirKcal,
} from "./calc";
import { CATALOGO_EXAMES, MODELOS, camposDe } from "./catalogo";
import type {
  AgendaItem,
  AlimentoBusca,
  Avaliacao,
  Clinica,
  CatalogoBase,
  Documento,
  Dieta,
  Exame,
  ItemPlano,
  ModeloCardapio,
  ModeloSalvo,
  Paciente,
  Painel,
  CapaPlano,
  PlanoAberto,
  Prescricao,
  Profissional,
  Prontuario,
  Recordatorio,
  ReferenciaExame,
  Refeicao,
  RefeicaoDieta,
  RefeicaoModelo,
  RelatoRefeicao,
  Sistema,
  AlimentoProprio,
  Listas,
} from "./types";
import { ATIVIDADES, EQUIPAMENTOS, GATILHOS, OBJETIVOS } from "./calc";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return 0;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = num(v);
  return Number.isFinite(n) ? n : null;
}

function dia(v: unknown): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

function txt(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function clinicaDe(r: Record<string, unknown>): Clinica {
  return {
    nome: txt(r.nome),
    slogan: txt(r.slogan),
    nutricionista: txt(r.nutricionista),
    crn: txt(r.crn),
    contato: txt(r.contato),
    cidade: txt(r.cidade),
    endereco: txt(r.endereco),
    documentoEmissor: txt(r.documento_emissor),
    logo: txt(r.logo),
    protGKg: num(r.prot_g_kg),
    gordGKg: num(r.gord_g_kg),
    deficitKcal: num(r.deficit_kcal),
    superavitKcal: num(r.superavit_kcal),
    diasReavaliacao: num(r.dias_reavaliacao),
    adicionalGestanteT1: num(r.adicional_gestante_t1),
    adicionalGestanteT2: num(r.adicional_gestante_t2),
    adicionalGestanteT3: num(r.adicional_gestante_t3),
    adicionalLactante: num(r.adicional_lactante),
    variacaoBia: num(r.variacao_bia),
    variacaoAgua: num(r.variacao_agua),
  };
}

function pacienteDe(r: Record<string, unknown>, hoje: string): Paciente {
  const nasc = dia(r.data_nascimento);
  return {
    id: num(r.id),
    nome: txt(r.nome),
    dataNascimento: nasc,
    sexo: txt(r.sexo),
    genero: txt(r.genero),
    cpf: txt(r.cpf),
    telefone: txt(r.telefone),
    email: txt(r.email),
    endereco: txt(r.endereco),
    alturaCm: numOrNull(r.altura_cm),
    objetivo: txt(r.objetivo),
    patologias: txt(r.patologias),
    alergias: txt(r.alergias),
    medicamentos: txt(r.medicamentos),
    antecedentes: txt(r.antecedentes),
    observacoes: txt(r.observacoes),
    status: txt(r.status),
    tipoAtendimento: txt(r.tipo_atendimento),
    profissionalId: numOrNull(r.profissional_id),
    profissionalNome: txt(r.profissional_nome),
    administrativoId: numOrNull(r.administrativo_id),
    administrativoNome: txt(r.administrativo_nome),
    temDieta: false,
    idade: nasc ? idadeEm(nasc, hoje) : null,
    plano: "nenhum",
  };
}

async function lerClinica(sql: Sql, userId: string): Promise<Clinica> {
  const rows = await sql<Record<string, unknown>>`select * from clinica where user_id = ${userId}`;
  if (!rows[0]) throw new Error("Clínica não encontrada.");
  return clinicaDe(rows[0]);
}

async function garantirRetorno(
  sql: Sql,
  userId: string,
  pacienteId: number,
  nome: string,
  diaRetorno: string,
) {
  const abertos = await sql<Record<string, unknown>>`
    select id from agenda
    where user_id = ${userId} and paciente_id = ${pacienteId} and tipo = 'retorno' and feito = false
    order by id desc limit 1
  `;
  if (abertos[0]) {
    await sql`
      update agenda set dia = ${diaRetorno}, titulo = ${"Retorno — " + nome}, atualizado_em = now()
      where id = ${num(abertos[0].id)} and user_id = ${userId}
    `;
    return;
  }
  await sql`
    insert into agenda (user_id, tipo, titulo, notas, paciente_id, dia, hora, origem)
    values (${userId}, 'retorno', ${"Retorno — " + nome}, 'Sugerido a partir da avaliação ou da prescrição.', ${pacienteId}, ${diaRetorno}, '09:00', 'avaliacao')
  `;
}

async function garantirCatalogo(sql: Sql, userId: string) {
  const refs = await sql`select id from referencias_exame where user_id = ${userId} limit 1`;
  if (!refs[0]) {
    for (let i = 0; i < CATALOGO_EXAMES.length; i++) {
      const item = CATALOGO_EXAMES[i];
      await sql`
        insert into referencias_exame (user_id, ordem, nome, unidade, referencia)
        values (${userId}, ${i + 1}, ${item.nome}, ${item.unidade}, ${item.referencia})
      `;
    }
  }
  const mods = await sql`select id from modelos_documento where user_id = ${userId} limit 1`;
  if (!mods[0]) {
    for (const modelo of MODELOS) {
      await sql`
        insert into modelos_documento (user_id, chave, titulo, campos, texto)
        values (${userId}, ${modelo.chave}, ${modelo.titulo}, ${modelo.campos.join(",")}, ${modelo.texto})
      `;
    }
  }
}

async function referenciasDe(sql: Sql, userId: string): Promise<ReferenciaExame[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from referencias_exame where user_id = ${userId} order by ordem, id
  `;
  return rows.map((r) => ({
    id: num(r.id),
    nome: txt(r.nome),
    unidade: txt(r.unidade),
    referencia: txt(r.referencia),
  }));
}

async function modelosDe(sql: Sql, userId: string): Promise<ModeloSalvo[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from modelos_documento where user_id = ${userId} order by id
  `;
  return rows.map((r) => ({
    id: num(r.id),
    chave: txt(r.chave),
    titulo: txt(r.titulo),
    campos: camposDe(txt(r.campos)),
    texto: txt(r.texto),
  }));
}

const REFEICOES_PADRAO = [
  ["Café da manhã", "07:00"],
  ["Lanche da manhã", "10:00"],
  ["Almoço", "12:30"],
  ["Lanche da tarde", "16:00"],
  ["Jantar", "19:30"],
  ["Ceia", "22:00"],
];

async function garantirListas(sql: Sql, userId: string) {
  const tem = await sql`select id from listas where user_id = ${userId} limit 1`;
  if (!tem[0]) {
    let ordem = 1;
    for (const valor of OBJETIVOS) {
      await sql`insert into listas (user_id, lista, ordem, valor) values (${userId}, 'objetivo', ${ordem++}, ${valor})`;
    }
    ordem = 1;
    for (const item of ATIVIDADES) {
      await sql`insert into listas (user_id, lista, ordem, valor, extra) values (${userId}, 'atividade', ${ordem++}, ${item.nome}, ${String(item.fator)})`;
    }
    ordem = 1;
    for (const valor of EQUIPAMENTOS) {
      await sql`insert into listas (user_id, lista, ordem, valor) values (${userId}, 'equipamento', ${ordem++}, ${valor})`;
    }
    ordem = 1;
    for (const [nome, hora] of REFEICOES_PADRAO) {
      await sql`insert into listas (user_id, lista, ordem, valor, extra) values (${userId}, 'refeicao', ${ordem++}, ${nome}, ${hora})`;
    }
    ordem = 1;
    for (const [nome, palavras] of GATILHOS) {
      await sql`insert into listas (user_id, lista, ordem, valor, extra) values (${userId}, 'alergia', ${ordem++}, ${nome}, ${palavras.join(";")})`;
    }
  }
  const prof = await sql`select id from profissionais where user_id = ${userId} limit 1`;
  if (!prof[0]) {
    const clinica = await lerClinica(sql, userId);
    await sql`
      insert into profissionais (user_id, nome, crn, ativo)
      values (${userId}, ${clinica.nutricionista}, ${clinica.crn}, true)
    `;
  }
}

async function listasDe(sql: Sql, userId: string): Promise<Listas> {
  const rows = await sql<Record<string, unknown>>`
    select * from listas where user_id = ${userId} order by lista, ordem, id
  `;
  const listas: Listas = { objetivos: [], atividades: [], equipamentos: [], refeicoes: [], alergias: [] };
  for (const r of rows) {
    const tipo = txt(r.lista);
    const valor = txt(r.valor);
    const extra = txt(r.extra);
    if (tipo === "objetivo") listas.objetivos.push(valor);
    else if (tipo === "atividade") listas.atividades.push({ nome: valor, fator: Number(extra.replace(",", ".")) || 1.2 });
    else if (tipo === "equipamento") listas.equipamentos.push(valor);
    else if (tipo === "refeicao") listas.refeicoes.push({ nome: valor, hora: extra });
    else if (tipo === "alergia") listas.alergias.push({ nome: valor, palavras: extra });
  }
  return listas;
}

function funcaoDe(valor: string): Profissional["funcao"] {
  if (valor === "outro" || valor === "administrativo") return valor;
  return "nutricionista";
}

async function profissionaisDe(sql: Sql, userId: string): Promise<Profissional[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from profissionais where user_id = ${userId} order by id
  `;
  return rows.map((r) => ({
    id: num(r.id),
    nome: txt(r.nome),
    funcao: funcaoDe(txt(r.funcao)),
    cargo: txt(r.cargo),
    crn: txt(r.crn),
    cpf: txt(r.cpf),
    ativo: marcado(r.ativo),
  }));
}

async function alimentosPropriosDe(sql: Sql, userId: string): Promise<AlimentoProprio[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from alimentos_proprios where user_id = ${userId} order by nome
  `;
  return rows.map((r) => ({
    id: num(r.id),
    nome: txt(r.nome),
    grupo: txt(r.grupo),
    kcal: num(r.kcal),
    ptn: num(r.ptn),
    cho: num(r.cho),
    lip: num(r.lip),
    fibra: num(r.fibra),
    medidas: txt(r.medidas),
  }));
}

function medidasProprias(texto: string): Array<[string, number]> {
  const lista: Array<[string, number]> = [["Grama", 1]];
  for (const linha of texto.split("\n")) {
    const corte = linha.indexOf("=");
    if (corte < 1) continue;
    const nome = linha.slice(0, corte).trim();
    const gramas = Number(linha.slice(corte + 1).trim().replace(",", "."));
    if (nome && Number.isFinite(gramas) && gramas > 0) lista.push([nome, gramas]);
  }
  return lista;
}

async function alimentoProprio(sql: Sql, userId: string, codigo: string) {
  const id = Number(codigo.slice(1));
  if (!Number.isInteger(id) || id <= 0) return null;
  const rows = await sql<Record<string, unknown>>`
    select * from alimentos_proprios where id = ${id} and user_id = ${userId}
  `;
  if (!rows[0]) return null;
  const a = rows[0];
  return {
    id: codigo,
    n: txt(a.nome),
    g: txt(a.grupo),
    k: num(a.kcal),
    p: num(a.ptn),
    c: num(a.cho),
    l: num(a.lip),
    f: num(a.fibra),
    m: medidasProprias(txt(a.medidas)),
  };
}

function refeicoesModelo(v: unknown): RefeicaoModelo[] {
  const lista = Array.isArray(v) ? v : typeof v === "string" ? JSON.parse(v) : [];
  if (!Array.isArray(lista)) return [];
  return lista.map((r) => {
    const ref = r as Record<string, unknown>;
    const itens = Array.isArray(ref.itens) ? ref.itens : [];
    return {
      nome: txt(ref.nome),
      hora: txt(ref.hora),
      orientacao: txt(ref.orientacao),
      itens: itens.map((item) => {
        const i = item as Record<string, unknown>;
        return {
          alimentoId: txt(i.alimentoId),
          alimentoNome: txt(i.alimentoNome),
          medida: txt(i.medida),
          qtd: num(i.qtd),
          gramas: num(i.gramas),
          kcal: num(i.kcal),
          ptn: num(i.ptn),
          cho: num(i.cho),
          lip: num(i.lip),
          fibra: num(i.fibra),
        };
      }),
    };
  });
}

async function prescricoesOutrasDe(sql: Sql, userId: string, pacienteId: number) {
  const rows = await sql<Record<string, unknown>>`
    select p.id, p.titulo, p.data, pac.nome as paciente_nome
    from prescricoes p
    join pacientes pac on pac.id = p.paciente_id and pac.user_id = p.user_id
    where p.user_id = ${userId} and p.paciente_id <> ${pacienteId}
    order by p.data desc, p.id desc
    limit 40
  `;
  return rows.map((r) => ({
    id: num(r.id),
    titulo: txt(r.titulo),
    data: dia(r.data) ?? "",
    pacienteNome: txt(r.paciente_nome),
  }));
}

async function modelosCardapioDe(sql: Sql, userId: string): Promise<ModeloCardapio[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from modelos_cardapio where user_id = ${userId} order by titulo
  `;
  return rows.map((r) => ({
    id: num(r.id),
    titulo: txt(r.titulo),
    tema: txt(r.tema),
    kcalMeta: num(r.kcal_meta),
    protMeta: num(r.prot_meta),
    carbMeta: num(r.carb_meta),
    lipMeta: num(r.lip_meta),
    hidratacao: txt(r.hidratacao),
    refeicoes: refeicoesModelo(r.refeicoes),
  }));
}

async function semear(sql: Sql, userId: string) {
  const hoje = hojeISO();
  await sql`
    insert into clinica (
      user_id, nome, slogan, nutricionista, crn, contato, cidade,
      prot_g_kg, gord_g_kg, deficit_kcal, superavit_kcal, dias_reavaliacao
    ) values (
      ${userId}, 'NutriCiclos', 'Nutrição em cada ciclo da vida', 'Osana Melo', 'CRN-10 6463',
      'contato@nutriciclos.com.br', 'Florianópolis/SC', 1.6, 1, 500, 400, 30
    )
    on conflict (user_id) do nothing
  `;
  await garantirCatalogo(sql, userId);
  await garantirListas(sql, userId);
  const ja = await sql`select id from pacientes where user_id = ${userId} limit 1`;
  if (ja.length > 0) {
    await garantirRelatoDemo(sql, userId);
    return;
  }

  const pac = await sql<Record<string, unknown>>`
    insert into pacientes (
      user_id, nome, data_nascimento, sexo, genero, cpf, telefone, altura_cm, objetivo,
      status, tipo_atendimento
    ) values (
      ${userId}, 'Mario Cesar Nascimento', '1972-11-28', 'Masculino', 'Prefere não informar',
      '823.333.609-25', '48999458013', 170, 'Ganhar massa muscular', 'Ativo', 'Presencial'
    )
    returning id
  `;
  const pacienteId = num(pac[0].id);
  const idade = idadeEm("1972-11-28", "2026-09-21");
  const tmb = mifflin("Masculino", 86, 170, idade);
  const get = Math.round(tmb * fatorDe("Levemente ativo"));
  const imcV = arred(imc(86, 170));
  const diag = diagnosticoTexto("Masculino", imcV, 101);
  await sql`
    insert into avaliacoes (
      user_id, paciente_id, data, peso, altura, cintura, quadril, atividade, equipamento,
      jejum, sem_exercicio, hidratacao, gestante, lactante, imc, tmb, get_kcal,
      kcal_meta, prot_meta, lip_meta, carb_meta, idade, diagnostico
    ) values (
      ${userId}, ${pacienteId}, '2026-09-21', 86, 170, 101, 104, 'Levemente ativo',
      'Bodyscan Pro (Relaxmedic)', 'Sim', 'Sim', 'Sim', 'Não', 'Não',
      ${imcV}, ${tmb}, ${get}, 1500, 138, 86, 44, ${idade}, ${diag}
    )
  `;
  const pres = await sql<Record<string, unknown>>`
    insert into prescricoes (
      user_id, paciente_id, titulo, data, situacao, retorno_em,
      kcal_meta, prot_meta, carb_meta, lip_meta, hidratacao
    ) values (
      ${userId}, ${pacienteId}, 'Plano alimentar 09/2026', '2026-09-21', 'Rascunho', '2026-10-21',
      1500, 138, 44, 86, 'Água ao longo do dia'
    )
    returning id
  `;
  const prescricaoId = num(pres[0].id);
  const refeicoes = [
    ["Café da manhã", "07:00"],
    ["Lanche da manhã", "10:00"],
    ["Almoço", "12:30"],
    ["Lanche da tarde", "16:00"],
    ["Jantar", "19:30"],
    ["Ceia", "22:00"],
  ];
  const ids = new Map<string, number>();
  for (let i = 0; i < refeicoes.length; i++) {
    const [nome, hora] = refeicoes[i];
    const row = await sql<Record<string, unknown>>`
      insert into refeicoes (user_id, prescricao_id, ordem, nome, hora)
      values (${userId}, ${prescricaoId}, ${i + 1}, ${nome}, ${hora})
      returning id
    `;
    ids.set(nome, num(row[0].id));
  }
  const { alimentoPorId, gramasDe } = await import("./food.server");
  const exemplos: Array<[string, string, string, number]> = [
    ["Café da manhã", "P1371", "Unidade", 2],
    ["Almoço", "T0410", "Grama", 150],
    ["Almoço", "P0311", "Colher de sopa", 8],
    ["Almoço", "P1785", "Grama", 8],
    ["Jantar", "T0410", "Grama", 120],
    ["Ceia", "P1420", "Copo americano", 1],
  ];
  let ordem = 1;
  for (const [ref, alimentoId, medida, qtd] of exemplos) {
    const al = alimentoPorId(alimentoId);
    if (!al) continue;
    const gramas = gramasDe(al, medida, qtd);
    if (!gramas) continue;
    const n = nutrientes(al, gramas);
    await sql`
      insert into itens (
        user_id, prescricao_id, refeicao_id, ordem, alimento_id, alimento_nome,
        medida, qtd, gramas, kcal, ptn, cho, lip, fibra
      ) values (
        ${userId}, ${prescricaoId}, ${ids.get(ref)}, ${ordem}, ${al.id}, ${al.n},
        ${medida}, ${qtd}, ${gramas}, ${n.kcal}, ${n.ptn}, ${n.cho}, ${n.lip}, ${n.fibra}
      )
    `;
    ordem += 1;
  }
  await garantirRetorno(sql, userId, pacienteId, "Mario Cesar Nascimento", "2026-10-21");
  await sql`
    insert into agenda (user_id, tipo, titulo, notas, paciente_id, dia, hora, origem)
    values (
      ${userId}, 'lembrete', 'Rever prontuário do Mario',
      'Olhar a meta de 1.500 kcal diante do objetivo de ganho de massa.',
      ${pacienteId}, ${hoje}, null, 'manual'
    )
  `;
  await sql`
    insert into agenda (user_id, tipo, titulo, notas, paciente_id, dia, hora, origem)
    values (
      ${userId}, 'lembrete', 'Enviar mensagem de feedback ao Mario',
      'Perguntar como foi a primeira semana do plano.',
      ${pacienteId}, ${addDias(hoje, 1)}, '11:00', 'manual'
    )
  `;
  await garantirRelatoDemo(sql, userId);
}

const RELATO_DEMO = JSON.stringify([
  { hora: "12:00", relato: "sopa", obs: "" },
  { hora: "", relato: "", obs: "" },
  { hora: "", relato: "", obs: "" },
  { hora: "", relato: "", obs: "" },
  { hora: "", relato: "", obs: "" },
  { hora: "", relato: "", obs: "" },
  { hora: "", relato: "", obs: "" },
]);

async function garantirRelatoDemo(sql: Sql, userId: string) {
  const pac = await sql<Record<string, unknown>>`
    select id from pacientes
    where user_id = ${userId} and nome = 'Mario Cesar Nascimento'
    order by id
    limit 1
  `;
  if (!pac[0]) return;
  const pacienteId = num(pac[0].id);
  const ja = await sql`
    select id from recordatorios
    where user_id = ${userId} and paciente_id = ${pacienteId}
    limit 1
  `;
  if (ja.length > 0) return;
  await sql`
    insert into recordatorios (user_id, paciente_id, data, tipo, refeicoes)
    values (${userId}, ${pacienteId}, '2026-09-21', 'Recordatório 24 horas', ${RELATO_DEMO}::jsonb)
  `;
}

async function agendaDe(sql: Sql, userId: string): Promise<AgendaItem[]> {
  const rows = await sql<Record<string, unknown>>`
    select a.*, p.nome as paciente_nome
    from agenda a
    left join pacientes p on p.id = a.paciente_id and p.user_id = a.user_id
    where a.user_id = ${userId}
    order by a.dia, a.hora nulls last, a.id
  `;
  return rows.map((r) => ({
    id: num(r.id),
    tipo: txt(r.tipo) as AgendaItem["tipo"],
    titulo: txt(r.titulo),
    notas: txt(r.notas),
    pacienteId: r.paciente_id == null ? null : num(r.paciente_id),
    pacienteNome: r.paciente_nome == null ? null : txt(r.paciente_nome),
    dia: dia(r.dia) ?? "",
    hora: r.hora ? txt(r.hora).slice(0, 5) : null,
    feito: r.feito === true || r.feito === "t" || r.feito === "true",
  }));
}

async function avaliacoesDe(sql: Sql, userId: string, pacienteId: number, objetivo: string, clinica: Clinica): Promise<Avaliacao[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from avaliacoes
    where user_id = ${userId} and paciente_id = ${pacienteId}
    order by data desc, id desc
  `;
  return rows.map((r) => {
    const get = num(r.get_kcal);
    return {
      id: num(r.id),
      data: dia(r.data) ?? "",
      peso: num(r.peso),
      altura: num(r.altura),
      cintura: numOrNull(r.cintura),
      quadril: numOrNull(r.quadril),
      atividade: txt(r.atividade),
      equipamento: txt(r.equipamento),
      jejum: txt(r.jejum),
      semExercicio: txt(r.sem_exercicio),
      hidratacao: txt(r.hidratacao),
      gestante: txt(r.gestante),
      lactante: txt(r.lactante),
      trimestre: txt(r.trimestre),
      imc: num(r.imc),
      tmb: num(r.tmb),
      get,
      kcalMeta: num(r.kcal_meta),
      protMeta: num(r.prot_meta),
      lipMeta: num(r.lip_meta),
      carbMeta: num(r.carb_meta),
      idade: num(r.idade),
      diagnostico: txt(r.diagnostico),
      observacoes: txt(r.observacoes),
      sugeridaKcal: sugerirKcal(
        objetivo,
        get,
        {
          deficit: clinica.deficitKcal,
          superavit: clinica.superavitKcal,
          gestanteT1: clinica.adicionalGestanteT1,
          gestanteT2: clinica.adicionalGestanteT2,
          gestanteT3: clinica.adicionalGestanteT3,
          lactanteKcal: clinica.adicionalLactante,
        },
        { gestante: txt(r.gestante), lactante: txt(r.lactante), trimestre: txt(r.trimestre) },
      ),
      gorduraPct: numOrNull(r.gordura_pct),
      massaMuscular: numOrNull(r.massa_muscular),
    };
  });
}

async function prescricoesDe(sql: Sql, userId: string, pacienteId: number): Promise<Prescricao[]> {
  const caps = await sql<Record<string, unknown>>`
    select * from prescricoes
    where user_id = ${userId} and paciente_id = ${pacienteId}
    order by data desc, id desc
  `;
  if (caps.length === 0) return [];
  const refs = await sql<Record<string, unknown>>`
    select r.* from refeicoes r
    join prescricoes p on p.id = r.prescricao_id and p.user_id = r.user_id
    where r.user_id = ${userId} and p.paciente_id = ${pacienteId}
    order by r.ordem, r.id
  `;
  const itens = await sql<Record<string, unknown>>`
    select i.* from itens i
    join prescricoes p on p.id = i.prescricao_id and p.user_id = i.user_id
    where i.user_id = ${userId} and p.paciente_id = ${pacienteId}
    order by i.ordem, i.id
  `;
  const itensPorRef = new Map<number, ItemPlano[]>();
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
    const lista = itensPorRef.get(item.refeicaoId) ?? [];
    lista.push(item);
    itensPorRef.set(item.refeicaoId, lista);
  }
  const refsPorPres = new Map<number, Refeicao[]>();
  for (const r of refs) {
    const ref: Refeicao = {
      id: num(r.id),
      ordem: num(r.ordem),
      nome: txt(r.nome),
      hora: txt(r.hora).slice(0, 5),
      orientacao: txt(r.orientacao),
      itens: itensPorRef.get(num(r.id)) ?? [],
    };
    const presId = num(r.prescricao_id);
    const lista = refsPorPres.get(presId) ?? [];
    lista.push(ref);
    refsPorPres.set(presId, lista);
  }
  return caps.map((r) => ({
    id: num(r.id),
    titulo: txt(r.titulo),
    data: dia(r.data) ?? "",
    situacao: txt(r.situacao),
    retornoEm: dia(r.retorno_em),
    kcalMeta: num(r.kcal_meta),
    protMeta: num(r.prot_meta),
    carbMeta: num(r.carb_meta),
    lipMeta: num(r.lip_meta),
    hidratacao: txt(r.hidratacao),
    emitidaEm: r.emitida_em ? String(r.emitida_em) : null,
    refeicoes: refsPorPres.get(num(r.id)) ?? [],
  }));
}

async function pacienteDoUsuario(sql: Sql, userId: string, id: number, hoje: string): Promise<Paciente> {
  const rows = await sql<Record<string, unknown>>`
    select p.*, pr.nome as profissional_nome, ad.nome as administrativo_nome
    from pacientes p
    left join profissionais pr on pr.id = p.profissional_id and pr.user_id = p.user_id
    left join profissionais ad on ad.id = p.administrativo_id and ad.user_id = p.user_id
    where p.id = ${id} and p.user_id = ${userId}
  `;
  if (!rows[0]) throw new Error("Paciente não encontrado.");
  return pacienteDe(rows[0], hoje);
}

const horaSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida");

function refeicoesDe(v: unknown): RelatoRefeicao[] {
  let raw: unknown = v;
  if (typeof v === "string") {
    try {
      raw = JSON.parse(v);
    } catch {
      raw = [];
    }
  }
  const lista = Array.isArray(raw) ? raw : [];
  const out: RelatoRefeicao[] = lista.slice(0, 7).map((item) => {
    const o = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return { hora: txt(o.hora).slice(0, 5), relato: txt(o.relato), obs: txt(o.obs) };
  });
  while (out.length < 7) out.push({ hora: "", relato: "", obs: "" });
  return out;
}

async function recordatoriosDe(sql: Sql, userId: string, pacienteId: number): Promise<Recordatorio[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from recordatorios
    where user_id = ${userId} and paciente_id = ${pacienteId}
    order by data desc, id desc
  `;
  return rows.map((r) => ({
    id: num(r.id),
    data: dia(r.data) ?? "",
    tipo: txt(r.tipo),
    queixa: txt(r.queixa),
    refeicoes: refeicoesDe(r.refeicoes),
    gosta: txt(r.gosta),
    naoGosta: txt(r.nao_gosta),
    alergias: txt(r.alergias),
    restricoes: txt(r.restricoes),
    quemCozinha: txt(r.quem_cozinha),
    rotina: txt(r.rotina),
    agua: txt(r.agua),
    bebidas: txt(r.bebidas),
    sonoApetite: txt(r.sono_apetite),
    atividade: txt(r.atividade),
    suplementos: txt(r.suplementos),
    digestao: txt(r.digestao),
    orcamento: txt(r.orcamento),
    observacoes: txt(r.observacoes),
  }));
}

function marcado(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

async function examesDe(sql: Sql, userId: string, pacienteId: number): Promise<Exame[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from exames
    where user_id = ${userId} and paciente_id = ${pacienteId}
    order by data desc, id desc
  `;
  return rows.map((r) => ({
    id: num(r.id),
    data: dia(r.data) ?? "",
    exame: txt(r.exame),
    resultado: txt(r.resultado),
    unidade: txt(r.unidade),
    referencia: txt(r.referencia),
    foraFaixa: marcado(r.fora_faixa),
    situacao: txt(r.situacao),
    observacao: txt(r.observacao),
  }));
}

async function documentosDe(sql: Sql, userId: string, pacienteId: number): Promise<Documento[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from documentos
    where user_id = ${userId} and paciente_id = ${pacienteId}
    order by data desc, id desc
  `;
  return rows.map((r) => ({
    id: num(r.id),
    tipo: txt(r.tipo),
    titulo: txt(r.titulo),
    data: dia(r.data) ?? "",
    situacao: txt(r.situacao),
    horaInicio: txt(r.hora_inicio).slice(0, 5),
    horaFim: txt(r.hora_fim).slice(0, 5),
    destinatario: txt(r.destinatario),
    valor: txt(r.valor),
    referente: txt(r.referente),
    motivo: txt(r.motivo),
    textoLivre: txt(r.texto_livre),
    texto: txt(r.texto),
    emitidoEm: r.emitido_em ? String(r.emitido_em) : null,
  }));
}

export const getPainel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Painel> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const hoje = hojeISO();
    const clinica = await lerClinica(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`
      select p.*, pr.nome as profissional_nome, ad.nome as administrativo_nome
      from pacientes p
      left join profissionais pr on pr.id = p.profissional_id and pr.user_id = p.user_id
      left join profissionais ad on ad.id = p.administrativo_id and ad.user_id = p.user_id
      where p.user_id = ${context.userId}
      order by p.status, p.nome
    `;
    const planos = await sql<Record<string, unknown>>`
      select paciente_id,
        case when bool_or(situacao = 'Emitida') then 'emitida' else 'rascunho' end as plano
      from prescricoes
      where user_id = ${context.userId}
      group by paciente_id
    `;
    const porPac = new Map(planos.map((r) => [num(r.paciente_id), txt(r.plano) as Paciente["plano"]]));
    const comDieta = new Set(
      (
        await sql<Record<string, unknown>>`
          select distinct paciente_id from dietas where user_id = ${context.userId} and tipo = 'paciente'
        `
      ).map((r) => num(r.paciente_id)),
    );
    return {
      hoje,
      clinica,
      pacientes: rows.map((r) => {
        const p = pacienteDe(r, hoje);
        p.plano = porPac.get(p.id) ?? "nenhum";
        p.temDieta = comDieta.has(p.id);
        return p;
      }),
      agenda: await agendaDe(sql, context.userId),
      listas: await listasDe(sql, context.userId),
      profissionais: await profissionaisDe(sql, context.userId),
    };
  });

export const getProntuario = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<Prontuario> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const hoje = hojeISO();
    const clinica = await lerClinica(sql, context.userId);
    const paciente = await pacienteDoUsuario(sql, context.userId, data.id, hoje);
    const prescricoes = await prescricoesDe(sql, context.userId, paciente.id);
    paciente.plano = prescricoes.some((p) => p.situacao === "Emitida")
      ? "emitida"
      : prescricoes.length
        ? "rascunho"
        : "nenhum";
    const todasDietas = await dietasDe(sql, context.userId);
    return {
      hoje,
      clinica,
      paciente,
      avaliacoes: await avaliacoesDe(sql, context.userId, paciente.id, paciente.objetivo, clinica),
      prescricoes,
      agenda: (await agendaDe(sql, context.userId)).filter((a) => a.pacienteId === paciente.id),
      recordatorios: await recordatoriosDe(sql, context.userId, paciente.id),
      exames: await examesDe(sql, context.userId, paciente.id),
      documentos: await documentosDe(sql, context.userId, paciente.id),
      referencias: await referenciasDe(sql, context.userId),
      modelos: await modelosDe(sql, context.userId),
      listas: await listasDe(sql, context.userId),
      profissionais: await profissionaisDe(sql, context.userId),
      dietas: todasDietas.filter((d) => d.tipo === "paciente" && d.pacienteId === paciente.id),
      modelosDieta: todasDietas.filter((d) => d.tipo === "modelo"),
      modelosCardapio: (await modelosCardapioDe(sql, context.userId)).map((m) => ({
        id: m.id,
        titulo: m.titulo,
        tema: m.tema,
      })),
      prescricoesOutras: await prescricoesOutrasDe(sql, context.userId, paciente.id),
    };
  });

const pacienteInput = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().trim().min(2).max(120),
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  sexo: z.enum(["Feminino", "Masculino"]),
  genero: z.string().trim().max(40).optional().default(""),
  cpf: z.string().trim().max(20).optional().default(""),
  telefone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  endereco: z.string().trim().max(200).optional().default(""),
  alturaCm: z.number().positive().max(250).nullable(),
  objetivo: z.string().trim().min(2).max(80),
  patologias: z.string().trim().max(500).optional().default(""),
  alergias: z.string().trim().max(500).optional().default(""),
  medicamentos: z.string().trim().max(500).optional().default(""),
  antecedentes: z.string().trim().max(500).optional().default(""),
  observacoes: z.string().trim().max(1000).optional().default(""),
  status: z.enum(["Ativo", "Inativo", "Alta"]),
  tipoAtendimento: z.enum(["Presencial", "Telenutrição"]),
  profissionalId: z.number().int().positive().nullable().optional().default(null),
  administrativoId: z.number().int().positive().nullable().optional().default(null),
});

async function pessoaDaEquipe(sql: Sql, userId: string, id: number | null, funcoes: string[]): Promise<number | null> {
  if (!id) return null;
  const rows = await sql<Record<string, unknown>>`
    select funcao from profissionais where id = ${id} and user_id = ${userId}
  `;
  if (!rows[0] || !funcoes.includes(txt(rows[0].funcao))) throw new Error("Escolha alguém da equipe com essa função.");
  return id;
}

export const salvarPaciente = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(pacienteInput)
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    if (data.cpf && !cpfValido(data.cpf)) throw new Error("CPF inválido.");
    const cpf = data.cpf ? fmtCpf(data.cpf) : "";
    const nasc = data.dataNascimento || null;
    const sql = await getSql();
    const profissionalId = await pessoaDaEquipe(sql, context.userId, data.profissionalId, ["nutricionista", "outro"]);
    const administrativoId = await pessoaDaEquipe(sql, context.userId, data.administrativoId, ["administrativo"]);
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update pacientes set
          nome = ${data.nome}, data_nascimento = ${nasc}, sexo = ${data.sexo}, genero = ${data.genero},
          cpf = ${cpf}, telefone = ${data.telefone}, email = ${data.email}, endereco = ${data.endereco},
          altura_cm = ${data.alturaCm}, objetivo = ${data.objetivo}, patologias = ${data.patologias},
          alergias = ${data.alergias}, medicamentos = ${data.medicamentos}, antecedentes = ${data.antecedentes},
          observacoes = ${data.observacoes}, status = ${data.status}, tipo_atendimento = ${data.tipoAtendimento},
          profissional_id = ${profissionalId}, administrativo_id = ${administrativoId},
          atualizado_em = now()
        where id = ${data.id} and user_id = ${context.userId}
        returning id
      `;
      if (!rows[0]) throw new Error("Paciente não encontrado.");
      return { id: num(rows[0].id) };
    }
    const rows = await sql<Record<string, unknown>>`
      insert into pacientes (
        user_id, nome, data_nascimento, sexo, genero, cpf, telefone, email, endereco, altura_cm,
        objetivo, patologias, alergias, medicamentos, antecedentes, observacoes, status, tipo_atendimento,
        profissional_id, administrativo_id
      ) values (
        ${context.userId}, ${data.nome}, ${nasc}, ${data.sexo}, ${data.genero}, ${cpf}, ${data.telefone},
        ${data.email}, ${data.endereco}, ${data.alturaCm}, ${data.objetivo}, ${data.patologias},
        ${data.alergias}, ${data.medicamentos}, ${data.antecedentes}, ${data.observacoes}, ${data.status},
        ${data.tipoAtendimento}, ${profissionalId}, ${administrativoId}
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

const avaliacaoInput = z.object({
  pacienteId: z.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  peso: z.number().positive().max(400),
  altura: z.number().positive().max(250),
  cintura: z.number().positive().max(250).nullable(),
  quadril: z.number().positive().max(250).nullable(),
  atividade: z.string().min(2).max(40),
  equipamento: z.string().max(80).optional().default(""),
  jejum: z.enum(["Sim", "Não"]),
  semExercicio: z.enum(["Sim", "Não"]),
  hidratacao: z.enum(["Sim", "Não"]),
  gestante: z.enum(["Sim", "Não"]),
  lactante: z.enum(["Sim", "Não"]),
  trimestre: z.enum(["", "1", "2", "3"]).optional().default(""),
  kcalMeta: z.number().min(500).max(6000),
  observacoes: z.string().max(1000).optional().default(""),
  gorduraPct: z.number().min(0).max(80).nullable(),
  massaMuscular: z.number().min(0).max(200).nullable(),
});

export const salvarAvaliacao = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(avaliacaoInput)
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    const hoje = hojeISO();
    const paciente = await pacienteDoUsuario(sql, context.userId, data.pacienteId, hoje);
    const clinica = await lerClinica(sql, context.userId);
    if (!paciente.dataNascimento) throw new Error("Informe a data de nascimento no cadastro antes de avaliar.");
    const idade = idadeEm(paciente.dataNascimento, data.data);
    if (idade < 0 || idade > 120) throw new Error("Data da avaliação incompatível com o nascimento.");
    const listas = await listasDe(sql, context.userId);
    const fator = listas.atividades.find((a) => a.nome === data.atividade)?.fator ?? fatorDe(data.atividade);
    const tmb = mifflin(paciente.sexo, data.peso, data.altura, idade);
    const get = Math.round(tmb * fator);
    const imcV = arred(imc(data.peso, data.altura));
    const macro = macrosDe(data.peso, data.kcalMeta, clinica.protGKg, clinica.gordGKg);
    const diag = diagnosticoTexto(paciente.sexo, imcV, data.cintura);
    const rows = await sql<Record<string, unknown>>`
      insert into avaliacoes (
        user_id, paciente_id, data, peso, altura, cintura, quadril, atividade, equipamento,
        jejum, sem_exercicio, hidratacao, gestante, lactante, trimestre, imc, tmb, get_kcal,
        kcal_meta, prot_meta, lip_meta, carb_meta, idade, diagnostico, observacoes,
        gordura_pct, massa_muscular
      ) values (
        ${context.userId}, ${paciente.id}, ${data.data}, ${data.peso}, ${data.altura}, ${data.cintura},
        ${data.quadril}, ${data.atividade}, ${data.equipamento}, ${data.jejum}, ${data.semExercicio},
        ${data.hidratacao}, ${data.gestante}, ${data.lactante}, ${data.trimestre}, ${imcV}, ${tmb}, ${get},
        ${Math.round(data.kcalMeta)}, ${macro.prot}, ${macro.lip}, ${macro.carb}, ${idade}, ${diag},
        ${data.observacoes}, ${data.gorduraPct}, ${data.massaMuscular}
      )
      returning id
    `;
    await sql`update pacientes set altura_cm = ${data.altura}, atualizado_em = now() where id = ${paciente.id} and user_id = ${context.userId}`;
    await garantirRetorno(sql, context.userId, paciente.id, paciente.nome, addDias(data.data, clinica.diasReavaliacao));
    return { id: num(rows[0].id) };
  });

export const buscarAlimentos = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ q: z.string().max(80) }))
  .handler(async ({ context, data }): Promise<AlimentoBusca[]> => {
    const { buscarNaLista, buscarAlimentos: buscar } = await import("./food.server");
    const sql = await getSql();
    const origem = await itensCatalogo(sql, context.userId);
    const base = origem ? buscarNaLista(origem, data.q) : buscar(data.q);
    const q = semAcento(data.q.trim());
    if (q.length < 2) return base;
    const proprios = await alimentosPropriosDe(sql, context.userId);
    const daClinica = proprios
      .filter((a) => semAcento(a.nome).includes(q) || semAcento(a.grupo).includes(q))
      .slice(0, 8)
      .map((a) => ({
        id: `C${a.id}`,
        n: a.nome,
        g: a.grupo || "Clínica",
        k: a.kcal,
        p: a.ptn,
        l: a.lip,
        c: a.cho,
        f: a.fibra,
        m: medidasProprias(a.medidas),
      }));
    return [...daClinica, ...base].slice(0, 20);
  });

export const adicionarItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      prescricaoId: z.number().int().positive(),
      refeicaoId: z.number().int().positive(),
      alimentoId: z.string().min(2).max(20),
      medida: z.string().min(1).max(40),
      qtd: z.number().positive().max(5000),
      confirmarAlergia: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ context, data }): Promise<{ alerta: string | null }> => {
    const sql = await getSql();
    const pres = await sql<Record<string, unknown>>`
      select p.id, p.situacao, p.paciente_id, pac.alergias
      from prescricoes p
      join pacientes pac on pac.id = p.paciente_id and pac.user_id = p.user_id
      where p.id = ${data.prescricaoId} and p.user_id = ${context.userId}
    `;
    if (!pres[0]) throw new Error("Prescrição não encontrada.");
    if (txt(pres[0].situacao) !== "Rascunho") throw new Error("Prescrição emitida não pode ser alterada. Abra uma nova versão.");
    const ref = await sql`
      select id from refeicoes
      where id = ${data.refeicaoId} and prescricao_id = ${data.prescricaoId} and user_id = ${context.userId}
    `;
    if (!ref[0]) throw new Error("Refeição não encontrada.");
    const { alimentoNaLista, alimentoPorId, gramasDe } = await import("./food.server");
    const proprio = data.alimentoId.startsWith("C") ? await alimentoProprio(sql, context.userId, data.alimentoId) : null;
    const tabela = proprio ? null : await itensCatalogo(sql, context.userId);
    const al = proprio ?? (tabela ? alimentoNaLista(tabela, data.alimentoId) : alimentoPorId(data.alimentoId));
    if (!al) throw new Error("Alimento não está na tabela.");
    const alerta = alertaAlergia(txt(pres[0].alergias), al.n, await gatilhosDoUsuario(sql, context.userId));
    if (alerta && !data.confirmarAlergia) return { alerta };
    const gramas = gramasDe(al, data.medida, data.qtd);
    if (!gramas) throw new Error("Medida não encontrada para este alimento.");
    const n = nutrientes({ k: al.k, p: al.p, c: al.c, l: al.l, f: al.f }, gramas);
    const ordemRows = await sql<Record<string, unknown>>`
      select coalesce(max(ordem), 0) as m from itens
      where user_id = ${context.userId} and refeicao_id = ${data.refeicaoId}
    `;
    await sql`
      insert into itens (
        user_id, prescricao_id, refeicao_id, ordem, alimento_id, alimento_nome,
        medida, qtd, gramas, kcal, ptn, cho, lip, fibra
      ) values (
        ${context.userId}, ${data.prescricaoId}, ${data.refeicaoId}, ${num(ordemRows[0].m) + 1},
        ${al.id}, ${al.n}, ${data.medida}, ${data.qtd}, ${gramas}, ${n.kcal}, ${n.ptn}, ${n.cho}, ${n.lip}, ${n.fibra}
      )
    `;
    await sql`update prescricoes set atualizado_em = now() where id = ${data.prescricaoId} and user_id = ${context.userId}`;
    return { alerta: null };
  });

export const removerItem = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      delete from itens
      where id = ${data.id} and user_id = ${context.userId}
        and prescricao_id in (
          select id from prescricoes where user_id = ${context.userId} and situacao = 'Rascunho'
        )
      returning id
    `;
    if (!rows[0]) throw new Error("Item não encontrado ou a prescrição já foi emitida.");
    return { ok: true };
  });

const planoInput = z.object({
  id: z.number().int().positive(),
  titulo: z.string().trim().min(2).max(120),
  kcalMeta: z.number().min(500).max(6000),
  protMeta: z.number().min(0).max(500),
  carbMeta: z.number().min(0).max(900),
  lipMeta: z.number().min(0).max(400),
  hidratacao: z.string().trim().max(300).optional().default(""),
  retornoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
  refeicoes: z
    .array(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().trim().min(2).max(40),
        hora: horaSchema.or(z.literal("")),
        orientacao: z.string().trim().max(500).optional().default(""),
      }),
    )
    .max(8),
});

export const salvarPlano = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(planoInput)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const retorno = data.retornoEm || null;
    const rows = await sql<Record<string, unknown>>`
      update prescricoes set
        titulo = ${data.titulo}, kcal_meta = ${data.kcalMeta}, prot_meta = ${data.protMeta},
        carb_meta = ${data.carbMeta}, lip_meta = ${data.lipMeta}, hidratacao = ${data.hidratacao},
        retorno_em = ${retorno}, atualizado_em = now()
      where id = ${data.id} and user_id = ${context.userId} and situacao = 'Rascunho'
      returning id, paciente_id
    `;
    if (!rows[0]) throw new Error("Só é possível alterar um rascunho.");
    for (const ref of data.refeicoes) {
      await sql`
        update refeicoes set nome = ${ref.nome}, hora = ${ref.hora}, orientacao = ${ref.orientacao}
        where id = ${ref.id} and prescricao_id = ${data.id} and user_id = ${context.userId}
      `;
    }
    if (retorno) {
      const hoje = hojeISO();
      const paciente = await pacienteDoUsuario(sql, context.userId, num(rows[0].paciente_id), hoje);
      await garantirRetorno(sql, context.userId, paciente.id, paciente.nome, retorno);
    }
    return { ok: true };
  });

export const emitirPlano = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const itens = await sql`select id from itens where prescricao_id = ${data.id} and user_id = ${context.userId} limit 1`;
    if (!itens[0]) throw new Error("Inclua ao menos um alimento antes de emitir.");
    const rows = await sql`
      update prescricoes set situacao = 'Emitida', emitida_em = now(), atualizado_em = now()
      where id = ${data.id} and user_id = ${context.userId} and situacao = 'Rascunho'
      returning id
    `;
    if (!rows[0]) throw new Error("Prescrição não encontrada ou já emitida.");
    return { ok: true };
  });

export const novaVersao = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    const hoje = hojeISO();
    const base = await sql<Record<string, unknown>>`
      select * from prescricoes where id = ${data.id} and user_id = ${context.userId}
    `;
    if (!base[0]) throw new Error("Prescrição não encontrada.");
    const copia = await sql<Record<string, unknown>>`
      insert into prescricoes (
        user_id, paciente_id, titulo, data, situacao, retorno_em,
        kcal_meta, prot_meta, carb_meta, lip_meta, hidratacao
      ) values (
        ${context.userId}, ${num(base[0].paciente_id)}, ${txt(base[0].titulo)}, ${hoje}, 'Rascunho',
        ${dia(base[0].retorno_em)}, ${num(base[0].kcal_meta)}, ${num(base[0].prot_meta)},
        ${num(base[0].carb_meta)}, ${num(base[0].lip_meta)}, ${txt(base[0].hidratacao)}
      )
      returning id
    `;
    const novoId = num(copia[0].id);
    const refs = await sql<Record<string, unknown>>`
      select * from refeicoes where prescricao_id = ${data.id} and user_id = ${context.userId} order by ordem
    `;
    for (const ref of refs) {
      const nova = await sql<Record<string, unknown>>`
        insert into refeicoes (user_id, prescricao_id, ordem, nome, hora, orientacao)
        values (${context.userId}, ${novoId}, ${num(ref.ordem)}, ${txt(ref.nome)}, ${txt(ref.hora)}, ${txt(ref.orientacao)})
        returning id
      `;
      const itens = await sql<Record<string, unknown>>`
        select * from itens where refeicao_id = ${num(ref.id)} and user_id = ${context.userId} order by ordem
      `;
      for (const item of itens) {
        await sql`
          insert into itens (
            user_id, prescricao_id, refeicao_id, ordem, alimento_id, alimento_nome,
            medida, qtd, gramas, kcal, ptn, cho, lip, fibra
          ) values (
            ${context.userId}, ${novoId}, ${num(nova[0].id)}, ${num(item.ordem)}, ${txt(item.alimento_id)},
            ${txt(item.alimento_nome)}, ${txt(item.medida)}, ${num(item.qtd)}, ${num(item.gramas)},
            ${num(item.kcal)}, ${num(item.ptn)}, ${num(item.cho)}, ${num(item.lip)}, ${num(item.fibra)}
          )
        `;
      }
    }
    return { id: novoId };
  });

const agendaInput = z.object({
  tipo: z.enum(["lembrete", "consulta", "retorno"]),
  titulo: z.string().trim().min(2).max(140),
  notas: z.string().trim().max(500).optional().default(""),
  pacienteId: z.number().int().positive().nullable(),
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hora: horaSchema.nullable(),
});

export const criarAgenda = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(agendaInput)
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    if (data.pacienteId) {
      await pacienteDoUsuario(sql, context.userId, data.pacienteId, hojeISO());
    }
    const rows = await sql<Record<string, unknown>>`
      insert into agenda (user_id, tipo, titulo, notas, paciente_id, dia, hora, origem)
      values (
        ${context.userId}, ${data.tipo}, ${data.titulo}, ${data.notas}, ${data.pacienteId},
        ${data.dia}, ${data.hora}, 'manual'
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const concluirAgenda = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive(), feito: z.boolean() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update agenda set feito = ${data.feito}, atualizado_em = now()
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("Lembrete não encontrado.");
    return { ok: true };
  });

export const excluirAgenda = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from agenda
      where id = ${data.id} and user_id = ${context.userId} and tipo <> 'retorno'
      returning id
    `;
    if (!rows[0]) throw new Error("Retorno não se apaga: remarque ou marque como feito.");
    return { ok: true };
  });

function tokenAgenda() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const getAssinaturaAgenda = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ token: string }> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const rows = await sql<Record<string, unknown>>`select agenda_token from clinica where user_id = ${context.userId}`;
    return { token: txt(rows[0]?.agenda_token) };
  });

export const ligarAssinaturaAgenda = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ trocar: z.boolean().optional().default(false) }))
  .handler(async ({ context, data }): Promise<{ token: string }> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const atual = await sql<Record<string, unknown>>`select agenda_token from clinica where user_id = ${context.userId}`;
    const ja = txt(atual[0]?.agenda_token);
    const token = !data.trocar && ja ? ja : tokenAgenda();
    if (token !== ja) await sql`update clinica set agenda_token = ${token} where user_id = ${context.userId}`;
    return { token };
  });

export const desligarAssinaturaAgenda = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`update clinica set agenda_token = '' where user_id = ${context.userId}`;
    return { ok: true as const };
  });

function senhaConsulta() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 1000000;
  return String(n).padStart(6, "0");
}

export const getEntrega = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ pacienteId: z.number().int().positive() }))
  .handler(async ({ context, data }): Promise<{ token: string; senha: string }> => {
    const sql = await getSql();
    const rows = await sql<Record<string, unknown>>`
      select plano_token, plano_senha from pacientes where id = ${data.pacienteId} and user_id = ${context.userId}
    `;
    if (!rows[0]) throw new Error("Paciente não encontrado.");
    return { token: txt(rows[0].plano_token), senha: txt(rows[0].plano_senha) };
  });

export const ligarEntrega = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    pacienteId: z.number().int().positive(),
    trocar: z.boolean().optional().default(false),
    novaSenha: z.boolean().optional().default(false),
  }))
  .handler(async ({ context, data }): Promise<{ token: string; senha: string }> => {
    const sql = await getSql();
    const atual = await sql<Record<string, unknown>>`
      select plano_token, plano_senha from pacientes where id = ${data.pacienteId} and user_id = ${context.userId}
    `;
    if (!atual[0]) throw new Error("Paciente não encontrado.");
    const ja = txt(atual[0].plano_token);
    const senhaJa = txt(atual[0].plano_senha);
    if (data.novaSenha && !ja) throw new Error("Crie o link antes da senha.");
    const token = data.trocar || !ja ? tokenAgenda() : ja;
    const senha = data.trocar || data.novaSenha || !senhaJa ? senhaConsulta() : senhaJa;
    if (token !== ja || senha !== senhaJa) {
      await sql`
        update pacientes set plano_token = ${token}, plano_senha = ${senha}
        where id = ${data.pacienteId} and user_id = ${context.userId}
      `;
    }
    return { token, senha };
  });

export const desligarEntrega = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ pacienteId: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update pacientes set plano_token = '', plano_senha = '' where id = ${data.pacienteId} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Paciente não encontrado.");
    return { ok: true as const };
  });

export const lerPlanoPublico = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().trim() }))
  .handler(async ({ data }): Promise<CapaPlano | null> => {
    const { capaDoToken } = await import("./entrega.server");
    return capaDoToken(data.token);
  });

export const confirmarPlano = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().trim(),
      nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      cpf3: z.string().trim().max(3).optional().default(""),
      senha: z.string().trim().max(12),
    }),
  )
  .handler(async ({ data }): Promise<PlanoAberto | "data" | "cpf" | "senha" | "limite" | null> => {
    const { planoDoToken } = await import("./entrega.server");
    return planoDoToken(data.token, { nascimento: data.nascimento, cpf3: data.cpf3, senha: data.senha });
  });

export const TIPOS_RELATO = [
  "Recordatório 24 horas",
  "Dia alimentar habitual",
  "Frequência alimentar",
  "Registro de 3 dias",
] as const;

function horaRelato(v: string): string {
  const t = v.trim();
  if (!t) return "";
  if (/^\d{1,2}$/.test(t)) {
    const h = Number(t);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  }
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h <= 23 && min <= 59) return `${String(h).padStart(2, "0")}:${m[2]}`;
  }
  throw new Error("Hora inválida no relato. Use 12 ou 12:30.");
}

const relatoSchema = z.object({
  hora: z.string().max(8),
  relato: z.string().max(500),
  obs: z.string().max(300),
});

const recordatorioInput = z.object({
  id: z.number().int().positive().optional(),
  pacienteId: z.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(TIPOS_RELATO),
  queixa: z.string().max(500).optional().default(""),
  refeicoes: z.array(relatoSchema).length(7),
  gosta: z.string().max(300).optional().default(""),
  naoGosta: z.string().max(300).optional().default(""),
  alergias: z.string().max(500).optional().default(""),
  restricoes: z.string().max(300).optional().default(""),
  quemCozinha: z.string().max(120).optional().default(""),
  rotina: z.string().max(500).optional().default(""),
  agua: z.string().max(40).optional().default(""),
  bebidas: z.string().max(300).optional().default(""),
  sonoApetite: z.string().max(300).optional().default(""),
  atividade: z.string().max(300).optional().default(""),
  suplementos: z.string().max(300).optional().default(""),
  digestao: z.string().max(300).optional().default(""),
  orcamento: z.string().max(120).optional().default(""),
  observacoes: z.string().max(1000).optional().default(""),
});

export const salvarRecordatorio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(recordatorioInput)
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const temTexto = data.refeicoes.some((r) => r.relato.trim() || r.obs.trim()) || data.queixa.trim() || data.observacoes.trim();
    if (!temTexto) throw new Error("Descreva ao menos uma refeição ou a queixa.");
    const refeicoes = data.refeicoes.map((r) => ({
      hora: horaRelato(r.hora),
      relato: r.relato.trim(),
      obs: r.obs.trim(),
    }));
    const sql = await getSql();
    await pacienteDoUsuario(sql, context.userId, data.pacienteId, hojeISO());
    const json = JSON.stringify(refeicoes);
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update recordatorios set
          data = ${data.data}, tipo = ${data.tipo}, queixa = ${data.queixa}, refeicoes = ${json}::jsonb,
          gosta = ${data.gosta}, nao_gosta = ${data.naoGosta}, alergias = ${data.alergias},
          restricoes = ${data.restricoes}, quem_cozinha = ${data.quemCozinha}, rotina = ${data.rotina},
          agua = ${data.agua}, bebidas = ${data.bebidas}, sono_apetite = ${data.sonoApetite},
          atividade = ${data.atividade}, suplementos = ${data.suplementos}, digestao = ${data.digestao},
          orcamento = ${data.orcamento}, observacoes = ${data.observacoes}, atualizado_em = now()
        where id = ${data.id} and user_id = ${context.userId} and paciente_id = ${data.pacienteId}
        returning id
      `;
      if (!rows[0]) throw new Error("Recordatório não encontrado.");
      return { id: num(rows[0].id) };
    }
    const rows = await sql<Record<string, unknown>>`
      insert into recordatorios (
        user_id, paciente_id, data, tipo, queixa, refeicoes, gosta, nao_gosta, alergias, restricoes,
        quem_cozinha, rotina, agua, bebidas, sono_apetite, atividade, suplementos, digestao, orcamento, observacoes
      ) values (
        ${context.userId}, ${data.pacienteId}, ${data.data}, ${data.tipo}, ${data.queixa}, ${json}::jsonb,
        ${data.gosta}, ${data.naoGosta}, ${data.alergias}, ${data.restricoes}, ${data.quemCozinha},
        ${data.rotina}, ${data.agua}, ${data.bebidas}, ${data.sonoApetite}, ${data.atividade},
        ${data.suplementos}, ${data.digestao}, ${data.orcamento}, ${data.observacoes}
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const excluirRecordatorio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from recordatorios where id = ${data.id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Recordatório não encontrado.");
    return { ok: true };
  });

const exameItem = z.object({
  exame: z.string().trim().min(2).max(80),
  resultado: z.string().trim().min(1).max(40),
  unidade: z.string().trim().max(20).optional().default(""),
  referencia: z.string().trim().max(40).optional().default(""),
  observacao: z.string().trim().max(300).optional().default(""),
});

export const salvarExames = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      pacienteId: z.number().int().positive(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      itens: z.array(exameItem).min(1).max(20),
    }),
  )
  .handler(async ({ context, data }): Promise<{ quantidade: number }> => {
    const sql = await getSql();
    await pacienteDoUsuario(sql, context.userId, data.pacienteId, hojeISO());
    for (const item of data.itens) {
      const situacao = situacaoExame(item.resultado, item.referencia);
      const fora = situacao === "Abaixo" || situacao === "Acima";
      await sql`
        insert into exames (
          user_id, paciente_id, data, exame, resultado, unidade, referencia, fora_faixa, situacao, observacao
        ) values (
          ${context.userId}, ${data.pacienteId}, ${data.data}, ${item.exame}, ${item.resultado},
          ${item.unidade}, ${item.referencia}, ${fora}, ${situacao}, ${item.observacao}
        )
      `;
    }
    return { quantidade: data.itens.length };
  });

export const excluirExame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from exames where id = ${data.id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Exame não encontrado.");
    return { ok: true };
  });

const documentoInput = z.object({
  id: z.number().int().positive().optional(),
  pacienteId: z.number().int().positive(),
  tipo: z.string().trim().min(2).max(40),
  titulo: z.string().trim().min(2).max(160),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().max(8).optional().default(""),
  horaFim: z.string().max(8).optional().default(""),
  destinatario: z.string().max(160).optional().default(""),
  valor: z.string().max(40).optional().default(""),
  referente: z.string().max(160).optional().default(""),
  motivo: z.string().max(300).optional().default(""),
  textoLivre: z.string().max(2000).optional().default(""),
  texto: z.string().trim().min(2).max(8000),
});

export const salvarDocumento = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(documentoInput)
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    await pacienteDoUsuario(sql, context.userId, data.pacienteId, hojeISO());
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update documentos set
          tipo = ${data.tipo}, titulo = ${data.titulo}, data = ${data.data},
          hora_inicio = ${data.horaInicio}, hora_fim = ${data.horaFim}, destinatario = ${data.destinatario},
          valor = ${data.valor}, referente = ${data.referente}, motivo = ${data.motivo},
          texto_livre = ${data.textoLivre}, texto = ${data.texto}, atualizado_em = now()
        where id = ${data.id} and user_id = ${context.userId} and paciente_id = ${data.pacienteId}
          and situacao = 'Rascunho'
        returning id
      `;
      if (!rows[0]) throw new Error("Documento emitido não se altera. Abra um novo.");
      return { id: num(rows[0].id) };
    }
    const rows = await sql<Record<string, unknown>>`
      insert into documentos (
        user_id, paciente_id, tipo, titulo, data, situacao, hora_inicio, hora_fim, destinatario,
        valor, referente, motivo, texto_livre, texto
      ) values (
        ${context.userId}, ${data.pacienteId}, ${data.tipo}, ${data.titulo}, ${data.data}, 'Rascunho',
        ${data.horaInicio}, ${data.horaFim}, ${data.destinatario}, ${data.valor}, ${data.referente},
        ${data.motivo}, ${data.textoLivre}, ${data.texto}
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const emitirDocumento = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update documentos set situacao = 'Emitido', emitido_em = now(), atualizado_em = now()
      where id = ${data.id} and user_id = ${context.userId} and situacao = 'Rascunho'
      returning id
    `;
    if (!rows[0]) throw new Error("Só um rascunho pode ser emitido.");
    return { ok: true };
  });

export const excluirDocumento = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from documentos
      where id = ${data.id} and user_id = ${context.userId} and situacao = 'Rascunho'
      returning id
    `;
    if (!rows[0]) throw new Error("Documento emitido permanece no prontuário.");
    return { ok: true };
  });

export const guardarRequisicao = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      pacienteId: z.number().int().positive(),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      itens: z.array(z.object({ nome: z.string().trim().min(2).max(80), justificativa: z.string().trim().max(200).optional().default("") })).min(1).max(40),
    }),
  )
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    await pacienteDoUsuario(sql, context.userId, data.pacienteId, hojeISO());
    const texto = data.itens.map((item) => (item.justificativa ? `${item.nome} — ${item.justificativa}` : item.nome)).join("\n");
    const rows = await sql<Record<string, unknown>>`
      insert into documentos (
        user_id, paciente_id, tipo, titulo, data, situacao, texto, emitido_em
      ) values (
        ${context.userId}, ${data.pacienteId}, 'requisicao', 'Solicitação de exames laboratoriais',
        ${data.data}, 'Emitido', ${texto}, now()
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

const cacheCatalogo = new Map<string, { marca: string; itens: AlimentoBusca[] }>();

function itensJson(v: unknown): AlimentoBusca[] {
  const lista = Array.isArray(v) ? v : typeof v === "string" ? JSON.parse(v) : [];
  return Array.isArray(lista) ? (lista as AlimentoBusca[]) : [];
}

async function itensCatalogo(sql: Sql, userId: string): Promise<AlimentoBusca[] | null> {
  const rows = await sql<Record<string, unknown>>`
    select atualizado_em, itens from catalogo_alimento where user_id = ${userId}
  `;
  if (!rows[0]) return null;
  const marca = String(rows[0].atualizado_em ?? "");
  const pronto = cacheCatalogo.get(userId);
  if (pronto && pronto.marca === marca) return pronto.itens;
  const itens = itensJson(rows[0].itens);
  cacheCatalogo.set(userId, { marca, itens });
  return itens;
}

async function resumoCatalogo(sql: Sql, userId: string): Promise<CatalogoBase> {
  const { QTD_BASE } = await import("./food.server");
  const rows = await sql<Record<string, unknown>>`
    select nome, quantidade, atualizado_em from catalogo_alimento where user_id = ${userId}
  `;
  if (!rows[0]) return { origem: "fabrica", nome: "Base de fábrica", quantidade: QTD_BASE, atualizadoEm: null };
  return {
    origem: "arquivo",
    nome: txt(rows[0].nome),
    quantidade: num(rows[0].quantidade),
    atualizadoEm: dia(rows[0].atualizado_em),
  };
}

export const salvarCatalogo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ nome: z.string().trim().min(1).max(120), texto: z.string().min(2).max(2_000_000) }))
  .handler(async ({ context, data }) => {
    const { interpretarCatalogo } = await import("./food.server");
    let itens: AlimentoBusca[];
    try {
      itens = interpretarCatalogo(data.texto);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "Arquivo inválido.");
    }
    const sql = await getSql();
    const json = JSON.stringify(itens);
    await sql`
      insert into catalogo_alimento (user_id, nome, quantidade, atualizado_em, itens)
      values (${context.userId}, ${data.nome}, ${itens.length}, now(), ${json}::jsonb)
      on conflict (user_id) do update set
        nome = excluded.nome, quantidade = excluded.quantidade, atualizado_em = now(), itens = excluded.itens
    `;
    cacheCatalogo.delete(context.userId);
    return { quantidade: itens.length };
  });

export const restaurarCatalogo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`delete from catalogo_alimento where user_id = ${context.userId}`;
    cacheCatalogo.delete(context.userId);
    return { ok: true };
  });

export const exportarBackup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const { montarBackup } = await import("./backup.server");
    return montarBackup(sql, context.userId);
  });

export const importarBackup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ texto: z.string().min(2).max(12_000_000) }))
  .handler(async ({ context, data }) => {
    let bruto: unknown;
    try {
      bruto = JSON.parse(data.texto);
    } catch {
      throw new Error("JSON inválido.");
    }
    const sql = await getSql();
    await semear(sql, context.userId);
    const { restaurarBackup } = await import("./backup.server");
    const resumo = await withTransaction((tx) => restaurarBackup(tx, context.userId, bruto));
    cacheCatalogo.delete(context.userId);
    return resumo;
  });

export const getSistema = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Sistema> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    return {
      clinica: await lerClinica(sql, context.userId),
      referencias: await referenciasDe(sql, context.userId),
      modelos: await modelosDe(sql, context.userId),
      listas: await listasDe(sql, context.userId),
      profissionais: await profissionaisDe(sql, context.userId),
      alimentos: await alimentosPropriosDe(sql, context.userId),
      modelosCardapio: await modelosCardapioDe(sql, context.userId),
      modelosDieta: (await dietasDe(sql, context.userId)).filter((d) => d.tipo === "modelo"),
      catalogo: await resumoCatalogo(sql, context.userId),
    };
  });

export const salvarClinica = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      nome: z.string().trim().min(2).max(80),
      slogan: z.string().trim().max(120).optional().default(""),
      nutricionista: z.string().trim().min(2).max(80),
      crn: z.string().trim().min(2).max(40),
      contato: z.string().trim().max(120).optional().default(""),
      cidade: z.string().trim().min(2).max(80),
      endereco: z.string().trim().max(200).optional().default(""),
      documentoEmissor: z.string().trim().max(40).optional().default(""),
      logo: z
        .string()
        .max(400_000)
        .refine((v) => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), "Logo inválido.")
        .optional()
        .default(""),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await semear(sql, context.userId);
    await sql`
      update clinica set
        nome = ${data.nome}, slogan = ${data.slogan}, nutricionista = ${data.nutricionista},
        crn = ${data.crn}, contato = ${data.contato}, cidade = ${data.cidade},
        endereco = ${data.endereco}, documento_emissor = ${data.documentoEmissor},
        logo = ${data.logo}
      where user_id = ${context.userId}
    `;
    await sql`
      update profissionais set nome = ${data.nutricionista}, crn = ${data.crn}
      where user_id = ${context.userId} and ativo = true
    `;
    return { ok: true };
  });

export const getMarca = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ nome: string; slogan: string; logo: string }> => {
    const sql = await getSql();
    await semear(sql, context.userId);
    const clinica = await lerClinica(sql, context.userId);
    return { nome: clinica.nome, slogan: clinica.slogan, logo: clinica.logo };
  });

export const salvarParametros = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      protGKg: z.number().positive().max(5),
      gordGKg: z.number().positive().max(5),
      deficitKcal: z.number().int().min(0).max(2000),
      superavitKcal: z.number().int().min(0).max(2000),
      diasReavaliacao: z.number().int().min(7).max(365),
      adicionalGestanteT1: z.number().int().min(0).max(2000),
      adicionalGestanteT2: z.number().int().min(0).max(2000),
      adicionalGestanteT3: z.number().int().min(0).max(2000),
      adicionalLactante: z.number().int().min(0).max(2000),
      variacaoBia: z.number().min(0).max(30),
      variacaoAgua: z.number().min(0).max(30),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      update clinica set
        prot_g_kg = ${data.protGKg}, gord_g_kg = ${data.gordGKg},
        deficit_kcal = ${data.deficitKcal}, superavit_kcal = ${data.superavitKcal},
        dias_reavaliacao = ${data.diasReavaliacao},
        adicional_gestante_t1 = ${data.adicionalGestanteT1},
        adicional_gestante_t2 = ${data.adicionalGestanteT2},
        adicional_gestante_t3 = ${data.adicionalGestanteT3},
        adicional_lactante = ${data.adicionalLactante},
        variacao_bia = ${data.variacaoBia},
        variacao_agua = ${data.variacaoAgua}
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const salvarReferencias = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      itens: z
        .array(
          z.object({
            nome: z.string().trim().min(2).max(80),
            unidade: z.string().trim().max(20).optional().default(""),
            referencia: z.string().trim().max(40).optional().default(""),
          }),
        )
        .min(1)
        .max(60),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from referencias_exame where user_id = ${context.userId}`;
    for (let i = 0; i < data.itens.length; i++) {
      const item = data.itens[i];
      await sql`
        insert into referencias_exame (user_id, ordem, nome, unidade, referencia)
        values (${context.userId}, ${i + 1}, ${item.nome}, ${item.unidade}, ${item.referencia})
      `;
    }
    return { quantidade: data.itens.length };
  });

export const salvarModelo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive(),
      titulo: z.string().trim().min(2).max(160),
      texto: z.string().trim().min(2).max(8000),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      update modelos_documento set titulo = ${data.titulo}, texto = ${data.texto}
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("Modelo não encontrado.");
    return { ok: true };
  });

async function inserirEstrutura(sql: Sql, userId: string, prescricaoId: number, refeicoes: RefeicaoModelo[]) {
  for (let i = 0; i < refeicoes.length; i++) {
    const ref = refeicoes[i];
    const nova = await sql<Record<string, unknown>>`
      insert into refeicoes (user_id, prescricao_id, ordem, nome, hora, orientacao)
      values (${userId}, ${prescricaoId}, ${i + 1}, ${ref.nome || "Refeição"}, ${ref.hora}, ${ref.orientacao})
      returning id
    `;
    const refeicaoId = num(nova[0].id);
    for (let j = 0; j < ref.itens.length; j++) {
      const item = ref.itens[j];
      await sql`
        insert into itens (
          user_id, prescricao_id, refeicao_id, ordem, alimento_id, alimento_nome,
          medida, qtd, gramas, kcal, ptn, cho, lip, fibra
        ) values (
          ${userId}, ${prescricaoId}, ${refeicaoId}, ${j + 1}, ${item.alimentoId}, ${item.alimentoNome},
          ${item.medida}, ${item.qtd}, ${item.gramas}, ${item.kcal}, ${item.ptn}, ${item.cho}, ${item.lip}, ${item.fibra}
        )
      `;
    }
  }
}

async function estruturaDaPrescricao(sql: Sql, userId: string, prescricaoId: number): Promise<RefeicaoModelo[]> {
  const refs = await sql<Record<string, unknown>>`
    select * from refeicoes where prescricao_id = ${prescricaoId} and user_id = ${userId} order by ordem
  `;
  const saida: RefeicaoModelo[] = [];
  for (const ref of refs) {
    const itens = await sql<Record<string, unknown>>`
      select * from itens where refeicao_id = ${num(ref.id)} and user_id = ${userId} order by ordem
    `;
    saida.push({
      nome: txt(ref.nome),
      hora: txt(ref.hora).slice(0, 5),
      orientacao: txt(ref.orientacao),
      itens: itens.map((item) => ({
        alimentoId: txt(item.alimento_id),
        alimentoNome: txt(item.alimento_nome),
        medida: txt(item.medida),
        qtd: num(item.qtd),
        gramas: num(item.gramas),
        kcal: num(item.kcal),
        ptn: num(item.ptn),
        cho: num(item.cho),
        lip: num(item.lip),
        fibra: num(item.fibra),
      })),
    });
  }
  return saida;
}

export const criarCardapio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      pacienteId: z.number().int().positive(),
      origem: z.enum(["branco", "calculo", "modelo", "prescricao", "dieta", "modeloDieta"]),
      origemId: z.number().int().positive().optional(),
    }),
  )
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    const hoje = hojeISO();
    const paciente = await pacienteDoUsuario(sql, context.userId, data.pacienteId, hoje);
    const clinica = await lerClinica(sql, context.userId);
    const aval = await sql<Record<string, unknown>>`
      select * from avaliacoes
      where user_id = ${context.userId} and paciente_id = ${paciente.id}
      order by data desc, id desc limit 1
    `;
    const listas = await listasDe(sql, context.userId);
    const vazias: RefeicaoModelo[] = (listas.refeicoes.length ? listas.refeicoes : REFEICOES_PADRAO.map(([nome, hora]) => ({ nome, hora }))).map(
      (r) => ({ nome: r.nome, hora: r.hora, orientacao: "", itens: [] }),
    );
    let titulo = "Cardápio em branco";
    let kcal = aval[0] ? num(aval[0].kcal_meta) : 1800;
    let prot = aval[0] ? num(aval[0].prot_meta) : 0;
    let carb = aval[0] ? num(aval[0].carb_meta) : 0;
    let lip = aval[0] ? num(aval[0].lip_meta) : 0;
    let hidratacao = "Água ao longo do dia";
    let refeicoes = vazias;

    if (data.origem === "calculo") {
      if (!aval[0]) throw new Error("Grave uma avaliação antes de puxar o cálculo.");
      titulo = `Plano da avaliação ${dia(aval[0].data) ?? hoje}`;
    } else if (data.origem === "modelo") {
      if (!data.origemId) throw new Error("Escolha o modelo.");
      const modelo = (await modelosCardapioDe(sql, context.userId)).find((m) => m.id === data.origemId);
      if (!modelo) throw new Error("Modelo não encontrado.");
      titulo = modelo.titulo;
      kcal = modelo.kcalMeta || kcal;
      prot = modelo.protMeta || prot;
      carb = modelo.carbMeta || carb;
      lip = modelo.lipMeta || lip;
      hidratacao = modelo.hidratacao || hidratacao;
      refeicoes = modelo.refeicoes.length ? modelo.refeicoes : vazias;
    } else if (data.origem === "prescricao") {
      if (!data.origemId) throw new Error("Escolha a prescrição.");
      const base = await sql<Record<string, unknown>>`
        select * from prescricoes where id = ${data.origemId} and user_id = ${context.userId}
      `;
      if (!base[0]) throw new Error("Prescrição não encontrada.");
      titulo = `Cópia — ${txt(base[0].titulo)}`;
      kcal = num(base[0].kcal_meta);
      prot = num(base[0].prot_meta);
      carb = num(base[0].carb_meta);
      lip = num(base[0].lip_meta);
      hidratacao = txt(base[0].hidratacao);
      refeicoes = await estruturaDaPrescricao(sql, context.userId, data.origemId);
    } else if (data.origem === "dieta" || data.origem === "modeloDieta") {
      if (!data.origemId) throw new Error("Escolha a dieta.");
      const base = await sql<Record<string, unknown>>`
        select * from dietas where id = ${data.origemId} and user_id = ${context.userId}
      `;
      if (!base[0]) throw new Error("Dieta não encontrada.");
      if (data.origem === "dieta" && num(base[0].paciente_id) !== paciente.id) throw new Error("Essa dieta é de outro paciente.");
      if (data.origem === "modeloDieta" && txt(base[0].tipo) !== "modelo") throw new Error("Escolha um modelo de dieta.");
      titulo = txt(base[0].nome);
      kcal = num(base[0].kcal_meta) || kcal;
      prot = num(base[0].prot_meta) || prot;
      carb = num(base[0].carb_meta) || carb;
      lip = num(base[0].lip_meta) || lip;
      hidratacao = txt(base[0].observacoes) || hidratacao;
      const plano = refeicoesDieta(base[0].refeicoes).map((r) => ({
        nome: r.nome,
        hora: r.hora,
        orientacao: r.substituicoes,
        itens: [],
      }));
      refeicoes = plano.length ? plano : vazias;
    }

    const retorno = addDias(hoje, clinica.diasReavaliacao);
    const criada = await sql<Record<string, unknown>>`
      insert into prescricoes (
        user_id, paciente_id, titulo, data, situacao, retorno_em,
        kcal_meta, prot_meta, carb_meta, lip_meta, hidratacao
      ) values (
        ${context.userId}, ${paciente.id}, ${titulo}, ${hoje}, 'Rascunho', ${retorno},
        ${kcal}, ${prot}, ${carb}, ${lip}, ${hidratacao}
      )
      returning id
    `;
    const id = num(criada[0].id);
    await inserirEstrutura(sql, context.userId, id, refeicoes);
    await garantirRetorno(sql, context.userId, paciente.id, paciente.nome, retorno);
    return { id };
  });

export const guardarComoModelo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      prescricaoId: z.number().int().positive(),
      titulo: z.string().trim().min(2).max(120),
      tema: z.string().trim().max(80).optional().default(""),
    }),
  )
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    const base = await sql<Record<string, unknown>>`
      select * from prescricoes where id = ${data.prescricaoId} and user_id = ${context.userId}
    `;
    if (!base[0]) throw new Error("Prescrição não encontrada.");
    const refeicoes = await estruturaDaPrescricao(sql, context.userId, data.prescricaoId);
    const rows = await sql<Record<string, unknown>>`
      insert into modelos_cardapio (
        user_id, titulo, tema, kcal_meta, prot_meta, carb_meta, lip_meta, hidratacao, refeicoes
      ) values (
        ${context.userId}, ${data.titulo}, ${data.tema},
        ${num(base[0].kcal_meta)}, ${num(base[0].prot_meta)}, ${num(base[0].carb_meta)}, ${num(base[0].lip_meta)},
        ${txt(base[0].hidratacao)}, ${JSON.stringify(refeicoes)}::jsonb
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const excluirModeloCardapio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from modelos_cardapio where id = ${data.id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Modelo não encontrado.");
    return { ok: true };
  });

async function gatilhosDoUsuario(sql: Sql, userId: string): Promise<Array<[string, string[]]>> {
  const listas = await listasDe(sql, userId);
  const pares = listas.alergias
    .map((a) => [a.nome, a.palavras.split(/[;,]/).map((p) => p.trim()).filter(Boolean)] as [string, string[]])
    .filter((par) => par[1].length > 0);
  return pares.length ? pares : GATILHOS;
}

async function gravarListas(sql: Sql, userId: string, lista: string, itens: Array<{ valor: string; extra: string }>) {
  await sql`delete from listas where user_id = ${userId} and lista = ${lista}`;
  for (let i = 0; i < itens.length; i++) {
    await sql`
      insert into listas (user_id, lista, ordem, valor, extra)
      values (${userId}, ${lista}, ${i + 1}, ${itens[i].valor}, ${itens[i].extra})
    `;
  }
}

export const salvarListas = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      objetivos: z.array(z.string().trim().min(2).max(80)).min(1).max(40),
      atividades: z.array(z.object({ nome: z.string().trim().min(2).max(40), fator: z.number().positive().max(5) })).min(1).max(20),
      equipamentos: z.array(z.string().trim().min(2).max(80)).min(1).max(30),
      refeicoes: z.array(z.object({ nome: z.string().trim().min(2).max(40), hora: z.string().trim().max(5) })).min(1).max(12),
      alergias: z.array(z.object({ nome: z.string().trim().min(2).max(40), palavras: z.string().trim().max(400) })).max(30),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await gravarListas(sql, context.userId, "objetivo", data.objetivos.map((valor) => ({ valor, extra: "" })));
    await gravarListas(sql, context.userId, "atividade", data.atividades.map((a) => ({ valor: a.nome, extra: String(a.fator) })));
    await gravarListas(sql, context.userId, "equipamento", data.equipamentos.map((valor) => ({ valor, extra: "" })));
    await gravarListas(sql, context.userId, "refeicao", data.refeicoes.map((r) => ({ valor: r.nome, extra: r.hora })));
    await gravarListas(sql, context.userId, "alergia", data.alergias.map((a) => ({ valor: a.nome, extra: a.palavras })));
    return { ok: true };
  });

export const salvarProfissionais = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      itens: z
        .array(
          z.object({
            id: z.number().int().positive().optional(),
            nome: z.string().trim().min(2).max(80),
            funcao: z.enum(["nutricionista", "outro", "administrativo"]),
            cargo: z.string().trim().max(60).optional().default(""),
            crn: z.string().trim().max(40).optional().default(""),
            cpf: z.string().trim().max(20).optional().default(""),
            ativo: z.boolean(),
          }),
        )
        .min(1)
        .max(20),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const nutricionistas = data.itens.filter((p) => p.funcao === "nutricionista");
    if (!nutricionistas.length) throw new Error("Inclua ao menos uma nutricionista. Ela assina o timbre.");
    const marcado = nutricionistas.find((p) => p.ativo) ?? nutricionistas[0];
    const mantidos: number[] = [];
    for (const p of data.itens) {
      const noTimbre = p === marcado;
      if (p.id) {
        const rows = await sql`
          update profissionais set
            nome = ${p.nome}, funcao = ${p.funcao}, cargo = ${p.cargo}, crn = ${p.crn}, cpf = ${p.cpf}, ativo = ${noTimbre}
          where id = ${p.id} and user_id = ${context.userId}
          returning id
        `;
        if (rows[0]) {
          mantidos.push(p.id);
          continue;
        }
      }
      const criado = await sql<Record<string, unknown>>`
        insert into profissionais (user_id, nome, funcao, cargo, crn, cpf, ativo)
        values (${context.userId}, ${p.nome}, ${p.funcao}, ${p.cargo}, ${p.crn}, ${p.cpf}, ${noTimbre})
        returning id
      `;
      mantidos.push(num(criado[0].id));
    }
    const atuais = await sql<Record<string, unknown>>`select id from profissionais where user_id = ${context.userId}`;
    for (const row of atuais) {
      const id = num(row.id);
      if (mantidos.includes(id)) continue;
      await sql`update pacientes set profissional_id = null where user_id = ${context.userId} and profissional_id = ${id}`;
      await sql`update pacientes set administrativo_id = null where user_id = ${context.userId} and administrativo_id = ${id}`;
      await sql`delete from profissionais where id = ${id} and user_id = ${context.userId}`;
    }
    await sql`
      update clinica set nutricionista = ${marcado.nome}, crn = ${marcado.crn}
      where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const salvarAlimentoProprio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive().optional(),
      nome: z.string().trim().min(2).max(120),
      grupo: z.string().trim().max(60).optional().default(""),
      kcal: z.number().min(0).max(900),
      ptn: z.number().min(0).max(100),
      cho: z.number().min(0).max(100),
      lip: z.number().min(0).max(100),
      fibra: z.number().min(0).max(100),
      medidas: z.string().trim().max(500).optional().default(""),
    }),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    if (data.id) {
      const rows = await sql`
        update alimentos_proprios set
          nome = ${data.nome}, grupo = ${data.grupo}, kcal = ${data.kcal}, ptn = ${data.ptn},
          cho = ${data.cho}, lip = ${data.lip}, fibra = ${data.fibra}, medidas = ${data.medidas}
        where id = ${data.id} and user_id = ${context.userId}
        returning id
      `;
      if (!rows[0]) throw new Error("Alimento não encontrado.");
      return { id: data.id };
    }
    const rows = await sql<Record<string, unknown>>`
      insert into alimentos_proprios (user_id, nome, grupo, kcal, ptn, cho, lip, fibra, medidas)
      values (
        ${context.userId}, ${data.nome}, ${data.grupo}, ${data.kcal}, ${data.ptn},
        ${data.cho}, ${data.lip}, ${data.fibra}, ${data.medidas}
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const excluirAlimentoProprio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from alimentos_proprios where id = ${data.id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Alimento não encontrado.");
    return { ok: true };
  });

function refeicoesDieta(v: unknown): RefeicaoDieta[] {
  let lista: unknown = v;
  if (typeof v === "string") {
    try {
      lista = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => {
      const r = item as Record<string, unknown>;
      return { nome: txt(r.nome), hora: txt(r.hora).slice(0, 5), substituicoes: txt(r.substituicoes) };
    })
    .filter((r) => r.nome);
}

async function dietasDe(sql: Sql, userId: string): Promise<Dieta[]> {
  const rows = await sql<Record<string, unknown>>`
    select * from dietas where user_id = ${userId} order by data desc nulls last, id desc
  `;
  return rows.map((r) => ({
    id: num(r.id),
    tipo: txt(r.tipo) === "modelo" ? "modelo" : "paciente",
    pacienteId: numOrNull(r.paciente_id),
    nome: txt(r.nome),
    data: dia(r.data) ?? "",
    indicacao: txt(r.indicacao),
    kcalMeta: num(r.kcal_meta),
    protMeta: num(r.prot_meta),
    carbMeta: num(r.carb_meta),
    lipMeta: num(r.lip_meta),
    observacoes: txt(r.observacoes),
    refeicoes: refeicoesDieta(r.refeicoes),
  }));
}

const refeicaoDietaInput = z.object({
  nome: z.string().trim().min(2).max(40),
  hora: z.string().trim().max(5).optional().default(""),
  substituicoes: z.string().trim().max(500).optional().default(""),
});

export const salvarDieta = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.number().int().positive().optional(),
      pacienteId: z.number().int().positive().nullable().optional(),
      tipo: z.enum(["paciente", "modelo"]),
      nome: z.string().trim().min(2).max(120),
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
      indicacao: z.string().trim().max(120).optional().default(""),
      kcalMeta: z.number().min(0).max(8000),
      protMeta: z.number().min(0).max(500),
      carbMeta: z.number().min(0).max(1000),
      lipMeta: z.number().min(0).max(500),
      observacoes: z.string().trim().max(1000).optional().default(""),
      refeicoes: z.array(refeicaoDietaInput).min(1).max(12),
    }),
  )
  .handler(async ({ context, data }): Promise<{ id: number }> => {
    const sql = await getSql();
    const pacienteId = data.tipo === "paciente" ? data.pacienteId ?? null : null;
    if (data.tipo === "paciente") {
      if (!pacienteId) throw new Error("A dieta do paciente precisa do prontuário.");
      await pacienteDoUsuario(sql, context.userId, pacienteId, hojeISO());
    }
    const quando = data.data || null;
    const refeicoes = JSON.stringify(data.refeicoes);
    if (data.id) {
      const rows = await sql<Record<string, unknown>>`
        update dietas set
          paciente_id = ${pacienteId}, tipo = ${data.tipo}, nome = ${data.nome}, data = ${quando},
          indicacao = ${data.indicacao}, kcal_meta = ${data.kcalMeta}, prot_meta = ${data.protMeta},
          carb_meta = ${data.carbMeta}, lip_meta = ${data.lipMeta}, observacoes = ${data.observacoes},
          refeicoes = ${refeicoes}::jsonb, atualizado_em = now()
        where id = ${data.id} and user_id = ${context.userId}
        returning id
      `;
      if (!rows[0]) throw new Error("Dieta não encontrada.");
      return { id: data.id };
    }
    const rows = await sql<Record<string, unknown>>`
      insert into dietas (
        user_id, paciente_id, tipo, nome, data, indicacao,
        kcal_meta, prot_meta, carb_meta, lip_meta, observacoes, refeicoes
      ) values (
        ${context.userId}, ${pacienteId}, ${data.tipo}, ${data.nome}, ${quando}, ${data.indicacao},
        ${data.kcalMeta}, ${data.protMeta}, ${data.carbMeta}, ${data.lipMeta}, ${data.observacoes},
        ${refeicoes}::jsonb
      )
      returning id
    `;
    return { id: num(rows[0].id) };
  });

export const excluirDieta = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql`
      delete from dietas where id = ${data.id} and user_id = ${context.userId} returning id
    `;
    if (!rows[0]) throw new Error("Dieta não encontrada.");
    return { ok: true };
  });






