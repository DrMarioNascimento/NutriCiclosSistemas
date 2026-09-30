import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getPainel } from "@/lib/clinic/api";
import { fmtData, saudacao, semAcento } from "@/lib/clinic/calc";
import type { AgendaItem, Paciente, Painel } from "@/lib/clinic/types";
import { srcLogo } from "./folha-papel";
import { Cartao, Erro, Input } from "./ui";

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

function bate(p: Paciente, q: string) {
  if (!q) return false;
  const blob = semAcento([p.nome, p.cpf, p.telefone].join(" "));
  return blob.includes(q);
}

export function InicioView() {
  const nav = useNavigate();
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

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

  const q = semAcento(busca.trim());
  const achados = useMemo(() => {
    if (!painel || !q) return [];
    return painel.pacientes.filter((p) => p.status === "Ativo" && bate(p, q)).slice(0, 8);
  }, [painel, q]);

  if (erro) return <Erro>{erro}</Erro>;
  if (!painel) {
    return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;
  }

  const hoje = painel.agenda.filter((a) => a.dia === painel.hoje && !a.feito);
  const atrasados = painel.agenda.filter((a) => a.dia < painel.hoje && !a.feito);
  const aFrente = painel.agenda.filter((a) => a.dia > painel.hoje && !a.feito).slice(0, 3);

  return (
    <div className="-mx-4 -mt-6 md:-mx-10 md:-mt-10">
      <section className="relative overflow-hidden px-5 pb-10 pt-10 md:px-10 md:pb-12 md:pt-12">
        <img
          src="/mural-inicio.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,252,248,0.92)_0%,rgba(255,252,248,0.55)_48%,rgba(255,252,248,0.12)_78%)]" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
          <img src={srcLogo(painel.clinica.logo)} alt="" className="h-16 w-16 object-contain md:h-20 md:w-20" />
          <p className="mt-5 font-serif text-4xl tracking-wide text-[#8a4521] md:text-5xl">{painel.clinica.nome || "NutriCiclos"}</p>
          <p className="mt-2 text-[11px] tracking-[0.28em] text-ink-2">{painel.clinica.slogan || "CLÍNICA DE NUTRIÇÃO"}</p>
          <p className="mt-6 text-sm text-ink-2">
            {saudacao()} · {painel.clinica.nutricionista}
            {painel.clinica.crn ? ` · ${painel.clinica.crn}` : ""}
          </p>
          <label className="mt-8 w-full text-left">
            <span className="mb-1 block text-sm text-ink-2">Quem você atende agora?</span>
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, CPF ou telefone"
              aria-label="Buscar paciente"
              autoComplete="off"
            />
          </label>
          {q && achados.length === 0 ? (
            <p className="mt-3 w-full text-left text-sm text-ink-2">Nenhum paciente com esse nome.</p>
          ) : null}
          {achados.length > 0 ? (
            <ul className="mt-3 w-full text-left">
              {achados.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() =>
                      void nav({
                        to: "/pacientes/$pacienteId",
                        params: { pacienteId: String(p.id) },
                        search: { aba: "resumo" },
                      })
                    }
                    className="mt-2 flex w-full items-center justify-between rounded-2xl border border-line bg-paper/90 px-4 py-3 text-left"
                  >
                    <span>
                      <span className="block font-medium text-ink">{p.nome}</span>
                      <span className="text-sm text-muted">
                        {p.idade != null ? `${p.idade} anos` : "Idade não informada"}
                        {p.objetivo ? ` · ${p.objetivo}` : ""}
                      </span>
                    </span>
                    <span className="text-sm text-copper-deep">Abrir</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/pacientes" className="text-copper-deep">
              Ver a lista
            </Link>
            <Link to="/pacientes" className="text-copper-deep">
              Novo cadastro
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-6 md:px-10">
        <div className="grid gap-4 lg:grid-cols-5">
          <Cartao className="lg:col-span-3">
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
          <Cartao className="lg:col-span-2">
            <h2 className="font-serif text-xl">A clínica</h2>
            <p className="mt-2 text-sm text-ink-2">{painel.clinica.cidade || "Florianópolis/SC"}</p>
            <p className="mt-1 text-sm text-muted">Ninguém abre sozinho. Busque o paciente no mural.</p>
          </Cartao>
        </div>

        {aFrente.length > 0 ? (
          <Cartao className="mt-4">
            <h2 className="font-serif text-xl">Mais à frente</h2>
            <ul>
              {aFrente.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3 border-t border-line py-3 first:mt-2 first:border-t-0">
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
    </div>
  );
}
