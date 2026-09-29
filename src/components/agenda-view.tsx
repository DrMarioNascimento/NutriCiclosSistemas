import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { concluirAgenda, criarAgenda, desligarAssinaturaAgenda, excluirAgenda, getAssinaturaAgenda, getPainel, ligarAssinaturaAgenda } from "@/lib/clinic/api";
import { baixarIcs, linkAssinarGoogle, linkAssinarOutlook, linkGoogle, linkOutlook, proximoAniversario, type NiverCal } from "@/lib/clinic/cal";
import { addDias, fmtData, hojeISO } from "@/lib/clinic/calc";
import type { AgendaItem, Painel } from "@/lib/clinic/types";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function segunda(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wd = dt.getUTCDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function nomeMes(iso: string) {
  const [ano, mes] = iso.split("-");
  return `${MESES[Number(mes) - 1]} ${ano}`;
}

function addMeses(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const alvo = new Date(Date.UTC(y, m - 1 + n, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(d, ultimo));
  return alvo.toISOString().slice(0, 10);
}

function gradeDoMes(iso: string): string[] {
  const inicio = `${iso.slice(0, 7)}-01`;
  const [y, m] = inicio.split("-").map(Number);
  const fim = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const dias: string[] = [];
  let dia = segunda(inicio);
  while (dias.length < 42) {
    dias.push(dia);
    if (dia >= fim && (dias.length % 7 === 0)) break;
    dia = addDias(dia, 1);
  }
  return dias;
}

function rotuloTipo(tipo: AgendaItem["tipo"]) {
  if (tipo === "retorno") return "Retorno";
  if (tipo === "consulta") return "Consulta";
  return "Lembrete";
}

export function AgendaView() {
  const [painel, setPainel] = useState<Painel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ancora, setAncora] = useState<string | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<"semana" | "mes" | "aniversarios">("semana");
  const [ocupado, setOcupado] = useState(false);

  async function carregar() {
    const d = await getPainel();
    setPainel(d);
    setAncora((a) => a ?? segunda(d.hoje));
    setDiaSel((s) => s ?? d.hoje);
  }

  useEffect(() => {
    carregar().catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível abrir a agenda."));
  }, []);

  const semana = useMemo(() => {
    if (!ancora) return [];
    return Array.from({ length: 7 }, (_, i) => addDias(ancora, i));
  }, [ancora]);
  const mes = useMemo(() => (diaSel ? gradeDoMes(diaSel) : []), [diaSel]);

  if (erro) return <Erro>{erro}</Erro>;
  if (!painel || !diaSel || !ancora) return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;

  const doDia = painel.agenda.filter((a) => a.dia === diaSel);
  const abertos = painel.agenda.filter((a) => !a.feito);
  const atrasados = abertos.filter((a) => a.dia < painel.hoje);
  const recente = addDias(painel.hoje, -14);
  const doArquivo = painel.agenda.filter((a) => !a.feito || a.dia >= recente);
  const nivers = niversDoPainel(painel);

  async function alternar(item: AgendaItem) {
    setOcupado(true);
    try {
      await concluirAgenda({ data: { id: item.id, feito: !item.feito } });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível atualizar.");
    } finally {
      setOcupado(false);
    }
  }

  async function remover(item: AgendaItem) {
    setOcupado(true);
    try {
      await excluirAgenda({ data: { id: item.id } });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setOcupado(false);
    }
  }

  function escolherDia(dia: string) {
    setDiaSel(dia);
    setAncora(segunda(dia));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-copper-deep">Consultório</p>
          <h1 className="font-serif text-4xl">Agenda</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setAberto((v) => !v)}>
            Novo lembrete
          </Button>
        </div>
      </div>
      <p className="mt-3 max-w-xl text-sm text-ink-2">Consultas, retornos e lembretes.</p>

      {aberto ? (
        <FormAgenda
          hoje={painel.hoje}
          pacientes={painel.pacientes.filter((p) => p.status === "Ativo")}
          onCancelar={() => setAberto(false)}
          onCriado={async () => {
            setAberto(false);
            await carregar();
          }}
        />
      ) : null}

      {atrasados.length > 0 ? (
        <p className="mt-5 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
          {atrasados.length === 1 ? "1 compromisso atrasado" : `${atrasados.length} compromissos atrasados`}, desde {fmtData(atrasados[0].dia)} — {atrasados[0].titulo}.
        </p>
      ) : null}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setAba("semana")}
          className={aba === "semana" ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper" : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setAba("mes")}
          className={aba === "mes" ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper" : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"}
        >
          Mês
        </button>
        <button
          type="button"
          onClick={() => setAba("aniversarios")}
          className={aba === "aniversarios" ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper" : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"}
        >
          Aniversariantes
        </button>
      </div>

      {aba === "aniversarios" ? <Aniversariantes painel={painel} /> : null}

      {aba === "semana" ? (
      <>
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="ghost" type="button" onClick={() => setAncora(addDias(ancora, -7))}>
          Semana anterior
        </Button>
        <Button variant="ghost" type="button" onClick={() => { setAncora(segunda(painel.hoje)); setDiaSel(painel.hoje); }}>
          Hoje
        </Button>
        <Button variant="ghost" type="button" onClick={() => setAncora(addDias(ancora, 7))}>
          Próxima semana
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {semana.map((dia, i) => {
          const tem = painel.agenda.some((a) => a.dia === dia && !a.feito);
          const sel = dia === diaSel;
          return (
            <button
              key={dia}
              type="button"
              onClick={() => setDiaSel(dia)}
              className={
                sel
                  ? "min-h-16 rounded-xl bg-copper text-paper"
                  : "min-h-16 rounded-xl bg-cream text-ink hover:bg-sand"
              }
            >
              <span className="block text-xs uppercase">{DIAS[i]}</span>
              <span className="tabular-nums text-lg">{dia.slice(8)}</span>
              {tem ? <span className={sel ? "mx-auto mt-1 block size-1.5 rounded-full bg-paper" : "mx-auto mt-1 block size-1.5 rounded-full bg-copper"} /> : <span className="mt-1 block h-1.5" />}
            </button>
          );
        })}
      </div>

      <h2 className="mt-8 font-serif text-2xl">{diaSel === painel.hoje ? "Hoje" : fmtData(diaSel)}</h2>
      {doDia.length === 0 ? (
        <p className="mt-2 text-sm text-ink-2">Nenhum compromisso neste dia.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {doDia.map((item) => (
            <ItemCard key={item.id} item={item} ocupado={ocupado} onToggle={() => alternar(item)} onRemove={() => remover(item)} />
          ))}
        </ul>
      )}
      </>
      ) : null}

      {aba === "mes" ? (
        <>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Button variant="ghost" type="button" onClick={() => escolherDia(addMeses(diaSel, -1))}>
              Mês anterior
            </Button>
            <Button variant="ghost" type="button" onClick={() => escolherDia(painel.hoje)}>
              Hoje
            </Button>
            <Button variant="ghost" type="button" onClick={() => escolherDia(addMeses(diaSel, 1))}>
              Próximo mês
            </Button>
          </div>
          <p className="mt-4 text-center font-serif text-2xl capitalize">{nomeMes(diaSel)}</p>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {DIAS.map((nome) => (
              <span key={nome} className="pb-1 text-center text-xs uppercase text-muted">{nome}</span>
            ))}
            {mes.map((dia) => {
              const tem = painel.agenda.some((a) => a.dia === dia && !a.feito);
              const sel = dia === diaSel;
              const neste = dia.slice(0, 7) === diaSel.slice(0, 7);
              const hoje = dia === painel.hoje;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => escolherDia(dia)}
                  className={
                    sel
                      ? "min-h-14 rounded-xl bg-copper text-paper md:min-h-20"
                      : neste
                        ? "min-h-14 rounded-xl bg-cream text-ink hover:bg-sand md:min-h-20"
                        : "min-h-14 rounded-xl bg-cream/50 text-muted hover:bg-sand md:min-h-20"
                  }
                >
                  <span className={hoje && !sel ? "tabular-nums text-lg text-copper-deep" : "tabular-nums text-lg"}>{dia.slice(8)}</span>
                  {tem ? <span className={sel ? "mx-auto mt-1 block size-1.5 rounded-full bg-paper" : "mx-auto mt-1 block size-1.5 rounded-full bg-copper"} /> : <span className="mt-1 block h-1.5" />}
                </button>
              );
            })}
          </div>
          <h2 className="mt-8 font-serif text-2xl">{diaSel === painel.hoje ? "Hoje" : fmtData(diaSel)}</h2>
          {doDia.length === 0 ? (
            <p className="mt-2 text-sm text-ink-2">Nenhum compromisso neste dia.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {doDia.map((item) => (
                <ItemCard key={item.id} item={item} ocupado={ocupado} onToggle={() => alternar(item)} onRemove={() => remover(item)} />
              ))}
            </ul>
          )}
        </>
      ) : null}
      <Assinatura onBaixar={() => baixarIcs("nutriciclos-agenda.ics", doArquivo, nivers)} />
    </div>
  );
}

function niversDoPainel(painel: Painel): NiverCal[] {
  const limite = addDias(painel.hoje, 366);
  return painel.pacientes.flatMap((p) => {
    if (p.status !== "Ativo" || !p.dataNascimento) return [];
    const dia = proximoAniversario(p.dataNascimento, painel.hoje);
    if (!dia || dia > limite) return [];
    return [{ id: p.id, nome: p.nome, dia }];
  });
}

function Assinatura({ onBaixar }: { onBaixar: () => void }) {
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/api/agenda/${token}` : "";

  useEffect(() => {
    getAssinaturaAgenda()
      .then((r) => setToken(r.token))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível ler o link."));
  }, []);

  async function ligar(trocar: boolean) {
    if (trocar && !window.confirm("O link antigo deixa de funcionar no Google e no Outlook. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const r = await ligarAssinaturaAgenda({ data: { trocar } });
      setToken(r.token);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o link.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    if (!window.confirm("O Google e o Outlook deixam de receber esta agenda. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    try {
      await desligarAssinaturaAgenda();
      setToken("");
      setAviso(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível desligar.");
    } finally {
      setOcupado(false);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setAviso("Link copiado.");
    } catch {
      setAviso("Não foi possível copiar. Selecione o endereço.");
    }
  }

  return (
    <Cartao className="mt-10">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={painelAberto}
        onClick={() => setPainelAberto((v) => !v)}
      >
        <span>
          <span className="block font-serif text-2xl text-ink">Google e Outlook</span>
          <span className="mt-1 block text-sm text-ink-2">Enviar a agenda para o calendário.</span>
        </span>
        <span className="text-sm text-copper-deep">{painelAberto ? "Fechar" : "Abrir"}</span>
      </button>
      {painelAberto ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="max-w-2xl text-sm text-ink-2">
            O link leva consultas, retornos, lembretes em aberto e os aniversários do próximo ano.
          </p>
          {token ? (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 truncate rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" title={url}>
                  {url}
                </p>
                <Button type="button" variant="sand" disabled={ocupado} onClick={() => void copiar()}>
                  Copiar link
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void ligar(true)}>
                    Trocar o link
                  </Button>
                  <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void desligar()}>
                    Desligar
                  </Button>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <a className="acao inline-flex min-h-11 items-center rounded-lg bg-sand px-4 text-sm text-ink" href={linkAssinarOutlook(url, true)} target="_blank" rel="noreferrer">
                    Outlook trabalho
                  </a>
                  <a className="acao inline-flex min-h-11 items-center rounded-lg bg-sand px-4 text-sm text-ink" href={linkAssinarOutlook(url)} target="_blank" rel="noreferrer">
                    Inserir no Outlook
                  </a>
                  <Button type="button" variant="sand" onClick={onBaixar}>
                    Baixar .ics
                  </Button>
                  <a className="acao inline-flex min-h-11 items-center rounded-lg bg-copper px-4 text-sm text-paper" href={linkAssinarGoogle(url)} target="_blank" rel="noreferrer">
                    Inserir no Google
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 flex justify-end">
              <Button type="button" disabled={ocupado || token === null} onClick={() => void ligar(false)}>
                Criar link
              </Button>
            </div>
          )}
          <div className="mt-3">
            <Erro>{erro}</Erro>
            {aviso ? <p className="text-sm text-ink-2">{aviso}</p> : null}
          </div>
        </div>
      ) : null}
    </Cartao>
  );
}

function aniversarioNoAno(nasc: string, ano: number): string {
  const [, mes, dia] = nasc.split("-");
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  if (mes === "02" && dia === "29" && !bissexto) return `${ano}-02-28`;
  return `${ano}-${mes}-${dia}`;
}

function diasAte(de: string, ate: string): number {
  const [ay, am, ad] = de.split("-").map(Number);
  const [by, bm, bd] = ate.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

function Aniversariantes({ painel }: { painel: Painel }) {
  const lista = painel.pacientes
    .flatMap((p) => {
      if (!p.dataNascimento) return [];
      const ano = Number(painel.hoje.slice(0, 4));
      let dia = aniversarioNoAno(p.dataNascimento, ano);
      if (dia < painel.hoje) dia = aniversarioNoAno(p.dataNascimento, ano + 1);
      const falta = diasAte(painel.hoje, dia);
      if (falta > 60) return [];
      const idade = Number(dia.slice(0, 4)) - Number(p.dataNascimento.slice(0, 4));
      return [{ p, dia, falta, idade }];
    })
    .sort((a, b) => a.dia.localeCompare(b.dia) || a.p.nome.localeCompare(b.p.nome, "pt"));
  const semData = painel.pacientes.filter((p) => !p.dataNascimento && p.status === "Ativo");

  return (
    <section className="mt-6">
      <h2 className="font-serif text-2xl">Próximos 60 dias</h2>
      <p className="mt-1 text-sm text-ink-2">Aniversários neste prazo.</p>
      {lista.length === 0 ? <p className="mt-4 text-sm text-ink-2">Nenhum aniversário neste período.</p> : null}
      <ul className="mt-4 flex flex-col gap-3">
        {lista.map(({ p, dia, falta, idade }) => (
          <li key={p.id} className="rounded-2xl border border-line bg-cream p-4">
            <p className="text-xs text-copper-deep">
              {falta === 0 ? "Hoje" : falta === 1 ? "Amanhã" : `Em ${falta} dias`}
              {p.status !== "Ativo" ? ` · ${p.status}` : ""}
            </p>
            <p className="mt-1 font-medium">{p.nome}</p>
            <p className="mt-1 text-sm text-ink-2">
              {fmtData(dia)} · faz {idade} {idade === 1 ? "ano" : "anos"}
            </p>
            <Link
              to="/pacientes/$pacienteId"
              params={{ pacienteId: String(p.id) }}
              search={{ aba: "cadastro" }}
              className="mt-2 inline-flex min-h-11 items-center text-sm text-copper-deep"
            >
              Abrir cadastro
            </Link>
          </li>
        ))}
      </ul>
      {semData.length > 0 ? (
        <p className="mt-4 text-sm text-muted">
          {semData.length === 1
            ? "Falta a data de nascimento de 1 paciente ativo."
            : `Falta a data de nascimento de ${semData.length} pacientes ativos.`}
        </p>
      ) : null}
    </section>
  );
}

function ItemCard({
  item,
  ocupado,
  onToggle,
  onRemove,
}: {
  item: AgendaItem;
  ocupado: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="rounded-2xl border border-line bg-cream p-4">
      <p className="text-xs text-copper-deep">
        {rotuloTipo(item.tipo)}
        {item.hora ? ` · ${item.hora}` : " · dia inteiro"}
      </p>
      <p className={item.feito ? "mt-1 text-ink-2 line-through" : "mt-1 font-medium text-ink"}>{item.titulo}</p>
      {item.notas ? <p className="mt-1 text-sm text-ink-2">{item.notas}</p> : null}
      {item.pacienteId && item.pacienteNome ? (
        <Link
          to="/pacientes/$pacienteId"
          params={{ pacienteId: String(item.pacienteId) }}
          search={{ aba: "resumo" }}
          className="mt-2 inline-flex min-h-11 items-center text-sm text-copper-deep"
        >
          {item.pacienteNome}
        </Link>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
        <Button variant="sand" type="button" disabled={ocupado} onClick={onToggle}>
          {item.feito ? "Reabrir" : "Feito"}
        </Button>
        <a className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-2 hover:bg-sand" href={linkGoogle(item)} target="_blank" rel="noreferrer">
          Google
        </a>
        <a className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-2 hover:bg-sand" href={linkOutlook(item)} target="_blank" rel="noreferrer">
          Outlook
        </a>
        <button type="button" className="min-h-11 px-3 text-sm text-ink-2" onClick={() => baixarIcs(`nutriciclos-${item.id}.ics`, [item])}>
          .ics
        </button>
        {item.tipo !== "retorno" ? (
          <button type="button" className="min-h-11 px-3 text-sm text-amber" disabled={ocupado} onClick={onRemove}>
            Apagar
          </button>
        ) : null}
      </div>
    </li>
  );
}

function FormAgenda({
  hoje,
  pacientes,
  onCancelar,
  onCriado,
}: {
  hoje: string;
  pacientes: Painel["pacientes"];
  onCancelar: () => void;
  onCriado: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<"lembrete" | "consulta" | "retorno">("lembrete");
  const [titulo, setTitulo] = useState("");
  const [notas, setNotas] = useState("");
  const [pacienteId, setPacienteId] = useState<string>("");
  const [dia, setDia] = useState(hoje || hojeISO());
  const [hora, setHora] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    try {
      await criarAgenda({
        data: {
          tipo,
          titulo,
          notas,
          pacienteId: pacienteId ? Number(pacienteId) : null,
          dia,
          hora: hora || null,
        },
      });
      await onCriado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível guardar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao className="mt-5">
      <form className="grid gap-3 md:grid-cols-2" onSubmit={salvar}>
        <Campo label="Tipo">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            <option value="lembrete">Lembrete</option>
            <option value="consulta">Consulta</option>
            <option value="retorno">Retorno</option>
          </Select>
        </Campo>
        <Campo label="Paciente">
          <Select value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
            <option value="">Sem paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </Campo>
        <div className="md:col-span-2">
          <Campo label="Assunto">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Rever o prontuário" required />
          </Campo>
        </div>
        <Campo label="Dia">
          <Input type="date" value={dia} onChange={(e) => setDia(e.target.value)} required />
        </Campo>
        <Campo label="Hora">
          <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Campo>
        <div className="md:col-span-2">
          <Campo label="Observação">
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </Campo>
        </div>
        <Erro>{erro}</Erro>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit" disabled={ocupado}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Cartao>
  );
}
