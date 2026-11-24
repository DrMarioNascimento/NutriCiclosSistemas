import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { composicaoMicroPorPorcao, lerComposicaoMicro, somarMicronutriente } from "./composicao-micro.ts";

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
