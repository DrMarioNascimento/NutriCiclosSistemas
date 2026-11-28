import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agruparAnalises, analisarMeta, avisoDados, estadoMacro, estadoNutriente, fmtValor, grupoDoNutriente,
  larguraBarra, listarMacros, maioresFontes, resumirEstados, somarMacros, POSICAO_MARCA,
} from "./apresentacao-micro.ts";
import { avisoPotassio, montarSugestaoMulti, perfisSugeridos, PERFIS_MICRO } from "./perfis-micro.ts";

test("valores sem casas inúteis", () => {
  assert.equal(fmtValor(2000), "2.000");
  assert.equal(fmtValor(1968.8), "1.969");
  assert.equal(fmtValor(12.88), "12,9");
  assert.equal(fmtValor(4.82), "4,82");
  assert.equal(fmtValor(8), "8");
  assert.equal(fmtValor(0.05), "0,05");
  assert.equal(fmtValor(2.4), "2,4");
  assert.equal(fmtValor(0), "0");
});

test("teto e mínimo têm estados diferentes para excesso e falta", () => {
  assert.equal(estadoNutriente(183, true).id, "acima");
  assert.equal(estadoNutriente(183, true).tom, "alerta");
  assert.equal(estadoNutriente(98, true).id, "perto");
  assert.equal(estadoNutriente(40, true).id, "ok");
  assert.equal(estadoNutriente(40, false).id, "baixo");
  assert.equal(estadoNutriente(40, false).tom, "aviso");
  assert.equal(estadoNutriente(110, false).id, "ok");
  assert.equal(estadoNutriente(75, false).id, "perto");
});

test("total parcial dentro do teto não passa falsa segurança", () => {
  assert.equal(estadoNutriente(50, true, true).rotulo, "Dentro, até agora");
  assert.equal(estadoNutriente(50, true, false).rotulo, "Dentro do limite");
});

test("grupos", () => {
  assert.equal(grupoDoNutriente("sodio_total", true), "limites");
  assert.equal(grupoDoNutriente("calcio", false), "minerais");
  assert.equal(grupoDoNutriente("vitamina_d", false), "vitaminas");
  assert.equal(grupoDoNutriente("folato_dfe", false), "vitaminas");
  assert.equal(grupoDoNutriente("ag_poliinsaturados", false), "gorduras");
});

const itens = [
  { alimentoNome: "Ovo", composicaoMicro: { colesterol: 397, calcio: 49 } },
  { alimentoNome: "Queijo", composicaoMicro: { colesterol: 25, calcio: 232 } },
  { alimentoNome: "Salada", composicaoMicro: {} },
  { alimentoNome: "Ovo", composicaoMicro: { colesterol: 100, calcio: "Tr" as const } },
];

test("análise soma, converte e aponta a maior fonte", () => {
  const a = analisarMeta({ nome: "Colesterol", unidade: "mg", meta: 300, tipo: "teto" }, itens);
  assert.equal(a.total, 522);
  assert.equal(Math.round(a.pct), 174);
  assert.equal(a.estado?.id, "acima");
  assert.equal(a.semDados, 1);
  assert.equal(a.fontes[0].nome, "Ovo");
  assert.equal(Math.round(a.fontes[0].pct), 95);
  assert.match(avisoDados(a) ?? "", /1 de 4 alimentos sem esse dado/);
});

test("conversão de unidade entre meta e tabela", () => {
  const a = analisarMeta({ nome: "Cálcio", unidade: "g", meta: 1, tipo: "minimo" }, itens);
  assert.ok(Math.abs(a.total - 0.281) < 1e-9);
});

test("nome não reconhecido é identificado em vez de ficar mudo", () => {
  const a = analisarMeta({ nome: "Vit C", unidade: "mg", meta: 75 }, itens);
  assert.equal(a.reconhecido, false);
  assert.equal(resumirEstados([a]).naoReconhecido, 1);
  assert.equal(agruparAnalises([a]).length, 0);
});

test("sem alimentos não há estado nem aviso de dado faltando", () => {
  const a = analisarMeta({ nome: "Cálcio", unidade: "mg", meta: 1000 }, []);
  assert.equal(a.estado, undefined);
  assert.equal(avisoDados(a), null);
});

test("o que pede atenção sobe dentro do grupo e a ordem de escolha desempata", () => {
  const metas = [
    { nome: "Cálcio", unidade: "mg" as const, meta: 100 },
    { nome: "Ferro", unidade: "mg" as const, meta: 1000 },
    { nome: "Zinco", unidade: "mg" as const, meta: 1000 },
  ];
  const it = [{ alimentoNome: "X", composicaoMicro: { calcio: 500, ferro: 10, zinco: 10 } }];
  const grupos = agruparAnalises(metas.map((m) => analisarMeta(m, it)));
  assert.deepEqual(grupos[0].itens.map((a) => a.meta.nome), ["Ferro", "Zinco", "Cálcio"]);
});

test("resumo conta cada estado", () => {
  const analises = [
    analisarMeta({ nome: "Colesterol", unidade: "mg", meta: 300 }, itens),
    analisarMeta({ nome: "Cálcio", unidade: "mg", meta: 100 }, itens),
    analisarMeta({ nome: "Vit C", unidade: "mg", meta: 75 }, itens),
  ];
  assert.deepEqual(resumirEstados(analises), { ok: 1, atencao: 0, acima: 1, semDado: 0, naoReconhecido: 1 });
});

test("barra: marca de 100% fixa e largura limitada", () => {
  assert.equal(Math.round(POSICAO_MARCA * 100) / 100, 66.67);
  assert.equal(larguraBarra(300), 100);
  assert.equal(larguraBarra(-5), 0);
  assert.equal(larguraBarra(75), 50);
});

test("fontes agrupam o mesmo alimento", () => {
  const f = maioresFontes(itens, "colesterol", 2);
  assert.equal(f[0].nome, "Ovo");
  assert.equal(f[0].valor, 497);
  assert.equal(f.length, 2);
});

test("macros: alvo de 90 a 105% e fibra só com mínimo", () => {
  assert.equal(estadoMacro("kcal", 95).rotulo, "No alvo");
  assert.equal(estadoMacro("kcal", 106).tom, "alerta");
  assert.equal(estadoMacro("ptn", 80).rotulo, "Abaixo do alvo");
  assert.equal(estadoMacro("fibra", 150).rotulo, "Meta atingida");
  const t = somarMacros([{ itens: [{ kcal: 100, ptn: 10, cho: 10, lip: 1, fibra: 2 }] }, { itens: [{ kcal: 50, ptn: 5, cho: 5, lip: 1, fibra: 1 }] }]);
  assert.deepEqual(t, { kcal: 150, ptn: 15, cho: 15, lip: 2, fibra: 3 });
  const l = listarMacros(t, { kcal: 300, ptn: 30, cho: 30, lip: 4, fibra: null });
  assert.equal(l.length, 4);
  assert.equal(listarMacros(t, { kcal: 300, ptn: 30, cho: 30, lip: 4, fibra: 10 }).length, 5);
  assert.equal(Math.round(l[0].pct), 50);
});

test("vários perfis: hipertensa na menopausa recebe os dois conjuntos, sem repetir, com o teto mais rígido", () => {
  const ctx = { sexo: "Feminino", idade: 54, patologias: "Hipertensão", objetivo: "Menopausa", kcal: 1800 };
  const perfis = perfisSugeridos(ctx);
  assert.deepEqual(perfis.map((p) => p.id), ["climaterio", "hipertensao"]);
  const novas = montarSugestaoMulti(perfis, ctx, []);
  const nomes = novas.map((n) => n.nome);
  assert.equal(new Set(nomes).size, nomes.length);
  assert.ok(nomes.includes("Sódio") && nomes.includes("Vitamina D"));
  assert.equal(novas.find((n) => n.nome === "Sódio")?.meta, "2000");
  assert.equal(novas.find((n) => n.nome === "Cálcio")?.meta, "1200");
});

test("sem cadastro que combine, nenhum perfil é marcado", () => {
  assert.deepEqual(perfisSugeridos({ sexo: "F", idade: 30 }), []);
  assert.ok(PERFIS_MICRO.length >= 9);
});

test("aviso de potássio só aparece com risco renal ou remédio que retém potássio", () => {
  const pot = ["potassio"] as const;
  assert.match(avisoPotassio({ sexo: "M", idade: 60, medicamentos: "Losartana 50 mg" }, pot) ?? "", /potássio/);
  assert.match(avisoPotassio({ sexo: "M", idade: 60, patologias: "Doença renal crônica" }, pot) ?? "", /renal/);
  assert.equal(avisoPotassio({ sexo: "M", idade: 60, patologias: "Hipertensão" }, pot), null);
  assert.equal(avisoPotassio({ sexo: "M", idade: 60, medicamentos: "Losartana" }, ["calcio"]), null);
});
