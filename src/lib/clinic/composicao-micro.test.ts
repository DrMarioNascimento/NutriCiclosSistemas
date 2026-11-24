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
