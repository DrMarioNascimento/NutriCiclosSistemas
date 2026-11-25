import assert from "node:assert/strict";
import { test } from "node:test";
import { montarSugestao, metaSugerida, perfilSugerido, PERFIS_MICRO } from "./perfis-micro.ts";
import { CATALOGO_MICRO } from "./composicao-micro.ts";

const mulher55 = { sexo: "Feminino", idade: 55, kcal: 1800 };

test("referências de adultos mudam com sexo e idade", () => {
  assert.equal(metaSugerida("ferro", { sexo: "Feminino", idade: 35 }), 18);
  assert.equal(metaSugerida("ferro", mulher55), 8);
  assert.equal(metaSugerida("calcio", mulher55), 1200);
  assert.equal(metaSugerida("calcio", { sexo: "Masculino", idade: 40 }), 1000);
  assert.equal(metaSugerida("vitamina_d", { sexo: "Feminino", idade: 75 }), 20);
  assert.equal(metaSugerida("vitamina_b6", mulher55), 1.5);
});

test("tetos da OMS usam as calorias do plano", () => {
  assert.equal(metaSugerida("acucar_adicao", mulher55), 45);
  assert.equal(metaSugerida("ag_saturados", mulher55), 20);
  assert.equal(metaSugerida("ag_trans", mulher55), 2);
  assert.equal(metaSugerida("acucar_adicao", { sexo: "Feminino", idade: 55 }), undefined);
});

test("sem referência segura a meta fica em branco", () => {
  assert.equal(metaSugerida("calcio", { sexo: "Feminino", idade: 16 }), undefined);
  assert.equal(metaSugerida("calcio", { sexo: "Feminino", idade: 30, gestanteOuLactante: true }), undefined);
  assert.equal(metaSugerida("calcio", { sexo: "", idade: 30 }), undefined);
  assert.equal(metaSugerida("calcio", { sexo: "Feminino", idade: null }), undefined);
});

test("perfil é sugerido pelo cadastro sem confundir palavras parecidas", () => {
  assert.equal(perfilSugerido({ sexo: "F", idade: 52, objetivo: "Controle na menopausa" })?.id, "climaterio");
  assert.equal(perfilSugerido({ sexo: "F", idade: 40, patologias: "Hipotireoidismo" })?.id, "tireoide");
  assert.equal(perfilSugerido({ sexo: "M", idade: 60, patologias: "HAS e dislipidemia" })?.id, "hipertensao");
  assert.equal(perfilSugerido({ sexo: "F", idade: 30, objetivo: "Fazer uma sopa leve" }), undefined);
  assert.equal(perfilSugerido({ sexo: "F", idade: 30, medicamentos: "Tirzepatida" })?.id, "emagrecimento-medicacao");
});

test("hipertensão usa teto de sódio da OMS e não repete nutriente já escolhido", () => {
  const perfil = PERFIS_MICRO.find((p) => p.id === "hipertensao")!;
  const novas = montarSugestao(perfil, mulher55, ["Potássio"]);
  assert.deepEqual(novas.map((n) => n.nome), ["Sódio", "Magnésio", "Cálcio"]);
  const sodio = novas[0];
  assert.equal(sodio.meta, "2000");
  assert.equal(sodio.tipo, "teto");
  assert.equal(novas[2].tipo, "minimo");
});

test("todo perfil usa só nutrientes do catálogo e unidade do catálogo", () => {
  for (const perfil of PERFIS_MICRO) {
    for (const codigo of perfil.nutrientes) assert.ok(codigo in CATALOGO_MICRO, `${perfil.id}:${codigo}`);
    for (const n of montarSugestao(perfil, mulher55, [])) {
      assert.ok(["mg", "µg", "g"].includes(n.unidade));
      if (n.meta !== "") assert.ok(Number(n.meta) > 0);
    }
  }
});
