import { useState } from "react";
import { fmtCpf, fmtData, fmtNum } from "@/lib/clinic/calc";
import type { Prontuario } from "@/lib/clinic/types";
import { FolhaPapel } from "./folha-papel";
import { Button, Cartao } from "./ui";

function soma(prontuario: Prontuario) {
  const emitido = prontuario.prescricoes.find((p) => p.situacao === "Emitida") ?? null;
  const rascunho = prontuario.prescricoes.find((p) => p.situacao !== "Emitida") ?? null;
  return {
    aval: prontuario.avaliacoes[0] ?? null,
    dieta: prontuario.dietas[0] ?? null,
    emitido,
    rascunho,
    retorno: prontuario.agenda.find((a) => a.tipo === "retorno" && !a.feito) ?? null,
  };
}

export function Fechamento({ prontuario }: { prontuario: Prontuario }) {
  const [aberto, setAberto] = useState(false);
  const p = prontuario.paciente;
  const { aval, dieta, emitido, rascunho, retorno } = soma(prontuario);
  const fora = prontuario.exames.filter((e) => e.foraFaixa);
  const itens: Array<{ ok: boolean; texto: string }> = [
    { ok: Boolean(aval), texto: aval ? `Avaliação de ${fmtData(aval.data)}` : "Falta a avaliação" },
    { ok: Boolean(dieta), texto: dieta ? `Dieta: ${dieta.nome}` : "Falta a dieta" },
    {
      ok: Boolean(emitido),
      texto: emitido ? `Cardápio emitido: ${emitido.titulo}` : rascunho ? "Cardápio ainda em rascunho" : "Falta o cardápio",
    },
    {
      ok: Boolean(retorno),
      texto: retorno ? `Retorno em ${fmtData(retorno.dia)}${retorno.hora ? ` às ${retorno.hora}` : ""}` : "Falta marcar o retorno",
    },
    { ok: Boolean(p.telefone.trim()), texto: p.telefone.trim() ? `Telefone ${p.telefone}` : "Sem telefone para o envio" },
  ];
  const faltam = itens.filter((i) => !i.ok).length;

  return (
    <>
      <Cartao className="mt-4">
        <h2 className="font-serif text-2xl">Fechamento da consulta</h2>
        <p className="mt-1 text-sm text-ink-2">
          {faltam === 0 ? "A consulta está completa para o prontuário." : faltam === 1 ? "Falta 1 item antes de arquivar." : `Faltam ${faltam} itens antes de arquivar.`} O dossiê é o documento da clínica. O paciente recebe só o link do cardápio.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {itens.map((item) => (
            <li key={item.texto} className="text-sm text-ink">
              <span className={item.ok ? "text-copper-deep" : "text-amber"}>{item.ok ? "Pronto" : "Pendente"}</span>
              <span className="text-ink-2"> · {item.texto}</span>
            </li>
          ))}
        </ul>
        {fora.length > 0 ? (
          <p className="mt-3 text-sm text-amber">
            {fora.length === 1 ? "1 exame fora da faixa entra no dossiê." : `${fora.length} exames fora da faixa entram no dossiê.`}
          </p>
        ) : null}
        <div className="mt-4">
          <Button type="button" onClick={() => setAberto(true)}>
            Abrir dossiê
          </Button>
        </div>
      </Cartao>
      {aberto ? (
        <FolhaPapel
          clinica={prontuario.clinica}
          titulo="Dossiê da consulta"
          subtitulo={`${p.nome}${p.cpf ? ` · CPF ${fmtCpf(p.cpf)}` : ""} · ${fmtData(prontuario.hoje)}`}
          onFechar={() => setAberto(false)}
        >
          <DossieCorpo prontuario={prontuario} />
        </FolhaPapel>
      ) : null}
    </>
  );
}

function DossieCorpo({ prontuario }: { prontuario: Prontuario }) {
  const p = prontuario.paciente;
  const { aval, dieta, emitido, retorno } = soma(prontuario);
  const antiga = prontuario.avaliacoes[prontuario.avaliacoes.length - 1];
  const fora = prontuario.exames.filter((e) => e.foraFaixa);
  const trocas = (dieta?.refeicoes ?? []).filter((r) => r.substituicoes.trim());
  return (
    <div className="flex flex-col gap-5 text-sm">
      <p>
        {p.sexo}
        {p.dataNascimento ? ` · nasc. ${fmtData(p.dataNascimento)}` : ""}
        {p.idade != null ? ` · ${p.idade} anos` : ""}
        {p.objetivo ? ` · ${p.objetivo}` : ""}
      </p>
      <p>
        {p.telefone ? `Tel. ${p.telefone}` : "Sem telefone"}
        {p.email ? ` · ${p.email}` : ""}
      </p>
      {p.alergias ? <p>Alergias: {p.alergias}</p> : <p>Alergias: não referidas no cadastro.</p>}
      {p.patologias ? <p>Patologias: {p.patologias}</p> : null}
      {p.medicamentos ? <p>Medicamentos: {p.medicamentos}</p> : null}
      {aval ? (
        <section>
          <h3 className="font-serif text-xl">Avaliação · {fmtData(aval.data)}</h3>
          <p className="mt-1">{aval.diagnostico}</p>
          <p className="mt-1 tabular-nums">
            {fmtNum(aval.peso, 1)} kg · {fmtNum(aval.altura, 0)} cm · IMC {fmtNum(aval.imc, 1)}
            {aval.cintura ? ` · cintura ${fmtNum(aval.cintura, 1)} cm` : ""}
            {aval.gorduraPct != null ? ` · gordura ${fmtNum(aval.gorduraPct, 1)}%` : ""}
          </p>
          <p className="mt-1 tabular-nums">
            TMB {fmtNum(aval.tmb, 0)} · GET {fmtNum(aval.get, 0)} · meta {fmtNum(aval.kcalMeta, 0)} kcal · sugestão {fmtNum(aval.sugeridaKcal, 0)} kcal
          </p>
          <p className="mt-1">
            PTN {fmtNum(aval.protMeta, 0)} g · CHO {fmtNum(aval.carbMeta, 0)} g · LIP {fmtNum(aval.lipMeta, 0)} g · {aval.atividade}
            {aval.equipamento ? ` · ${aval.equipamento}` : ""}
          </p>
          {antiga && antiga.id !== aval.id ? (
            <p className="mt-1">
              Desde {fmtData(antiga.data)}, o peso foi de {fmtNum(antiga.peso, 1)} kg para {fmtNum(aval.peso, 1)} kg.
            </p>
          ) : null}
          {aval.observacoes ? <p className="mt-1">{aval.observacoes}</p> : null}
        </section>
      ) : (
        <p>Sem avaliação registrada.</p>
      )}
      {dieta ? (
        <section>
          <h3 className="font-serif text-xl">Dieta · {dieta.nome}</h3>
          {dieta.indicacao ? <p className="mt-1">{dieta.indicacao}</p> : null}
          <p className="mt-1 tabular-nums">
            {fmtNum(dieta.kcalMeta, 0)} kcal · PTN {fmtNum(dieta.protMeta, 0)} g · CHO {fmtNum(dieta.carbMeta, 0)} g · LIP {fmtNum(dieta.lipMeta, 0)} g
          </p>
          {trocas.map((r) => (
            <p key={`${r.nome}-${r.hora}`} className="mt-1">
              {r.hora ? `${r.hora} · ` : ""}
              {r.nome}: {r.substituicoes}
            </p>
          ))}
          {dieta.observacoes ? <p className="mt-1">{dieta.observacoes}</p> : null}
        </section>
      ) : (
        <p>Sem dieta calculada.</p>
      )}
      {emitido ? (
        <section>
          <h3 className="font-serif text-xl">Cardápio emitido · {emitido.titulo}</h3>
          <p className="mt-1">
            {fmtData(emitido.data)}
            {emitido.hidratacao ? ` · hidratação: ${emitido.hidratacao}` : ""}
          </p>
          {emitido.refeicoes.map((ref) => (
            <p key={ref.id} className="mt-1">
              {ref.hora ? `${ref.hora} ` : ""}
              {ref.nome}: {ref.itens.map((i) => i.alimentoNome).join(", ") || "sem alimentos"}
            </p>
          ))}
        </section>
      ) : (
        <p>Nenhum cardápio emitido. Rascunho não entra no dossiê como prescrição.</p>
      )}
      {fora.length > 0 ? (
        <section>
          <h3 className="font-serif text-xl">Exames fora da faixa</h3>
          {fora.map((e) => (
            <p key={e.id} className="mt-1">
              {fmtData(e.data)} · {e.exame}: {e.resultado}
              {e.unidade ? ` ${e.unidade}` : ""}
              {e.referencia ? ` (ref. ${e.referencia})` : ""}
            </p>
          ))}
        </section>
      ) : null}
      <p>{retorno ? `Retorno marcado para ${fmtData(retorno.dia)}${retorno.hora ? ` às ${retorno.hora}` : ""}.` : "Retorno ainda não marcado."}</p>
      <p className="text-xs text-muted">Documento interno da clínica. O paciente não recebe este dossiê pelo link do cardápio.</p>
    </div>
  );
}
