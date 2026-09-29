import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPainel } from "@/lib/clinic/api";
import { fmtData, saudacao } from "@/lib/clinic/calc";
import type { AgendaItem, Paciente, Painel } from "@/lib/clinic/types";
import { Cartao, Erro } from "./ui";

function passo(p: Paciente): { texto: string; aba: "avaliacao" | "dieta" | "cardapio" | "resumo" } {
  if (p.plano === "rascunho") return { texto: "Cardápio em rascunho — revisar e emitir", aba: "cardapio" };
  if (p.plano === "emitida") return { texto: "Prescrição emitida. Acompanhar o retorno.", aba: "resumo" };
  if (!p.temDieta) return { texto: "Calcular a dieta: metas e substituições, antes dos alimentos", aba: "dieta" };
  return { texto: "Dieta pronta. Montar o cardápio a partir dela", aba: "cardapio" };
}

function LinhaAgenda({ item }: { item: AgendaItem }) {
  return (
    <li className="flex items-baseline justify-between gap-3 border-t border-line py-3 first:border-t-0">
      <span>
        <span className="block text-sm font-medium text-ink">{item.titulo}</span>
        <span className="text-sm text-muted">
          {item.hora ? `${item.hora} · ` : ""}
          {item.tipo === "retorno" ? "Retorno" : item.tipo === "consulta" ? "Consulta" : "Lembrete"}
        </span>
      </span>
      {item.pacienteId ? (
        <Link
          to="/pacientes/$pacienteId"
          params={{ pacienteId: String(item.pacienteId) }}
          search={{ aba: "resumo" }}
          className="shrink-0 text-sm text-copper-deep"
        >
          Abrir
        </Link>
      ) : null}
    </li>
  );
}

export function InicioView() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    getPainel()
      .then((d) => {
        if (vivo) setPainel(d);
      })
      .catch((e: unknown) => {
        if (vivo) setErro(e instanceof Error ? e.message : "Não foi possível abrir o consultório.");
      });
    return () => {
      vivo = false;
    };
  }, []);

  if (erro) return <Erro>{erro}</Erro>;
  if (!painel) {
    return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;
  }

  const ativos = painel.pacientes.filter((p) => p.status === "Ativo");
  const destaque = ativos[0] ?? painel.pacientes[0];
  const hoje = painel.agenda.filter((a) => a.dia === painel.hoje && !a.feito);
  const atrasados = painel.agenda.filter((a) => a.dia < painel.hoje && !a.feito);
  const aFrente = painel.agenda.filter((a) => a.dia > painel.hoje && !a.feito).slice(0, 3);
  const proximo = destaque ? passo(destaque) : null;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-copper-deep">{painel.clinica.cidade}</p>
      <h1 className="mt-1 font-serif text-4xl text-ink">{saudacao()}</h1>
      <p className="mt-2 text-ink-2">
        {painel.clinica.nutricionista} · {painel.clinica.crn}
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-5">
        {destaque && proximo ? (
          <Cartao className="lg:col-span-3">
            <p className="text-xs tracking-wide text-muted">Paciente em atendimento</p>
            <h2 className="mt-2 font-serif text-3xl text-ink">{destaque.nome}</h2>
            <p className="mt-1 text-sm text-ink-2">
              {destaque.idade != null ? `${destaque.idade} anos` : "Idade não informada"}
              {" · "}
              {destaque.sexo}
              {" · "}
              {destaque.objetivo}
            </p>
            <p className="mt-5 text-sm text-ink">{proximo.texto}</p>
            <Link
              to="/pacientes/$pacienteId"
              params={{ pacienteId: String(destaque.id) }}
              search={{ aba: proximo.aba }}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-copper px-4 text-sm font-semibold text-paper"
            >
              Abrir prontuário
            </Link>
          </Cartao>
        ) : (
          <Cartao className="lg:col-span-3">
            <h2 className="font-serif text-2xl">Nenhum paciente ainda</h2>
            <Link to="/pacientes" className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-copper-deep">
              Cadastrar o primeiro
            </Link>
          </Cartao>
        )}

        <Cartao className="lg:col-span-2">
          <p className="text-xs tracking-wide text-muted">Hoje · {fmtData(painel.hoje)}</p>
          {atrasados.length > 0 ? (
            <p className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
              {atrasados.length === 1 ? "1 lembrete atrasado" : `${atrasados.length} lembretes atrasados`}
            </p>
          ) : null}
          {hoje.length === 0 ? (
            <p className="mt-3 text-sm text-ink-2">Nada marcado para hoje.</p>
          ) : (
            <ul className="mt-2">
              {hoje.map((item) => (
                <LinhaAgenda key={item.id} item={item} />
              ))}
            </ul>
          )}
          <Link to="/agenda" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-copper-deep">
            Ver a agenda
          </Link>
        </Cartao>
      </div>

      {aFrente.length > 0 ? (
        <Cartao className="mt-4">
          <h2 className="font-serif text-xl">Mais à frente</h2>
          <ul>
            {aFrente.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-3 border-t border-line py-3 first:border-t-0 first:mt-2">
                <span className="text-sm text-ink">{item.titulo}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted">
                  {fmtData(item.dia)}
                  {item.hora ? ` · ${item.hora}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Cartao>
      ) : null}
    </div>
  );
}
