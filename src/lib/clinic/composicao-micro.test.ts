import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  CATALOGO_MICRO, CODIGOS_MICRO, SO_NO_IBGE, codigoMicronutriente, codigosNecessarios, composicaoMicroPorPorcao,
  converterUnidade, lerComposicaoMicro, lerMetasMicro, somarMicronutriente, tipoPadraoMeta, valorMicro,
} from "./composicao-micro.ts";

const taco = JSON.parse(readFileSync(new URL("../../data/taco-micronutrientes.json", import.meta.url), "utf8"));

test("converte a porção de arroz integral cozido com os dados do código 1 da TACO", () => {
  const arroz = composicaoMicroPorPorcao(lerComposicaoMicro(taco.T0001), 150);
  assert.ok(Math.abs(Number(arroz.calcio) - 7.806) < 1e-9);
  assert.ok(Math.abs(Number(arroz.magnesio) - 88.053) < 1e-9);
  assert.equal(arroz.vitamina_b2, "Tr");
  assert.equal(arroz.vitamina_c, undefined);
  assert.equal(Object.keys(taco).length, 597);
});

test("preserva zero medido e distingue traços e ausência em totais parciais", () => {
  const itens = [{ composicaoMicro: { zinco: 0 } }, { composicaoMicro: { zinco: 1.5 } },
    { composicaoMicro: { zinco: "Tr" as const } }, {}];
  assert.deepEqual(somarMicronutriente(itens, "zinco"), { total: 1.5, medidos: 2, tracos: 1, semDados: 1 });
});

test("IBGE preserva a composição da preparação e mantém sódio de adição separado", () => {
  const ibge = Object.assign({}, ...[1, 2, 3, 4].map((parte) =>
    JSON.parse(readFileSync(new URL(`../../data/ibge-micronutrientes-${parte}.json`, import.meta.url), "utf8")),
  ));
  assert.equal(Object.keys(ibge).length, 1971);
  const milhoCozido = composicaoMicroPorPorcao(lerComposicaoMicro(ibge.P0004), 50);
  const milhoRefogado = composicaoMicroPorPorcao(lerComposicaoMicro(ibge.P0007), 50);
  assert.equal(milhoCozido.folato_dfe, 23);
  assert.ok(Math.abs(Number(milhoCozido.sodio) - 122.482) < 1e-9);
  assert.equal(milhoCozido.sodio_adicao, 122.5);
  assert.equal(milhoRefogado.sodio, undefined);
  assert.equal(milhoRefogado.sodio_adicao, 122.5);
  assert.equal(milhoCozido.vitamina_d, undefined);
  assert.equal(milhoCozido.vitamina_c, 3.1);
});

test("sódio total soma o sódio do alimento e o sódio de adição do IBGE", () => {
  assert.equal(valorMicro({ sodio: 1.5, sodio_adicao: 380 }, "sodio_total"), 381.5);
  assert.equal(valorMicro({ sodio: 120 }, "sodio_total"), 120);
  assert.equal(valorMicro({ sodio_adicao: 245 }, "sodio_total"), 245);
  assert.equal(valorMicro({ sodio: "Tr" }, "sodio_total"), "Tr");
  assert.equal(valorMicro({}, "sodio_total"), undefined);
  const itens = [{ composicaoMicro: { sodio: 1, sodio_adicao: 100 } }, { composicaoMicro: { sodio: 50 } }, {}];
  assert.deepEqual(somarMicronutriente(itens, "sodio_total"), { total: 151, medidos: 2, tracos: 0, semDados: 1 });
});

test("o sódio total do cardápio carrega as colunas de que depende", () => {
  const codigos = codigosNecessarios([codigoMicronutriente("Sódio")]);
  assert.ok(codigos.has("sodio_total") && codigos.has("sodio") && codigos.has("sodio_adicao"));
});

test("converte unidades entre g, mg e µg", () => {
  assert.equal(converterUnidade(2, "g", "mg"), 2000);
  assert.equal(converterUnidade(1500, "µg", "mg"), 1.5);
  assert.equal(converterUnidade(7, "mg", "mg"), 7);
});

test("metas guardam o tipo mínimo ou teto e ignoram valores inválidos", () => {
  const metas = lerMetasMicro([
    { nome: "Cálcio", unidade: "mg", meta: 1000, tipo: "minimo" },
    { nome: "Sódio", unidade: "mg", meta: 2000, tipo: "teto" },
    { nome: "Ferro", unidade: "mg", meta: 18, tipo: "qualquer" },
  ]);
  assert.deepEqual(metas.map((m) => m.tipo), ["minimo", "teto", undefined]);
  assert.equal(tipoPadraoMeta("sodio_total"), "teto");
  assert.equal(tipoPadraoMeta("calcio"), "minimo");
});

test("gorduras, colesterol e açúcar entram no catálogo e na junção por alimento", () => {
  const ibge = JSON.parse(readFileSync(new URL("../../data/ibge-lipidios-acucar.json", import.meta.url), "utf8"));
  const tacoGordura = JSON.parse(readFileSync(new URL("../../data/taco-lipidios.json", import.meta.url), "utf8"));
  assert.equal(Object.keys(ibge).length, 1971);
  for (const dado of [...Object.values(ibge), ...Object.values(tacoGordura)] as Record<string, unknown>[]) {
    for (const [codigo, valor] of Object.entries(dado)) {
      assert.ok(codigo in CATALOGO_MICRO, codigo);
      assert.ok(valor === "Tr" || (typeof valor === "number" && valor >= 0), `${codigo}=${valor}`);
    }
  }
  assert.equal(ibge.P0001.ag_saturados, 0.350665);
  assert.ok(Object.keys(tacoGordura).length > 400);
});

test("a TACO não tem os nutrientes marcados como só do IBGE", () => {
  const tacoMicro = JSON.parse(readFileSync(new URL("../../data/taco-micronutrientes.json", import.meta.url), "utf8"));
  const tacoGordura = JSON.parse(readFileSync(new URL("../../data/taco-lipidios.json", import.meta.url), "utf8"));
  const presentes = new Set([...Object.values(tacoMicro), ...Object.values(tacoGordura)].flatMap((d) => Object.keys(d as object)));
  for (const codigo of SO_NO_IBGE) assert.ok(!presentes.has(codigo), `${codigo} existe na TACO`);
  for (const codigo of CODIGOS_MICRO) {
    if (codigo === "sodio_total" || SO_NO_IBGE.includes(codigo)) continue;
    assert.ok(presentes.has(codigo), `${codigo} sumiu da TACO`);
  }
});
