import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  adicionarItem,
  buscarAlimentos,
  emitirPlano,
  criarCardapio,
  getProntuario,
  guardarComoModelo,
  novaVersao,
  removerItem,
  salvarAvaliacao,
  salvarPlano,
} from "@/lib/clinic/api";
import {
  ATIVIDADES,
  EQUIPAMENTOS,
  arred,
  diagnosticoTexto,
  fatorDe,
  fmtCpf,
  fmtData,
  fmtNum,
  imc,
  macrosDe,
  mifflin,
  sugerirKcal,
} from "@/lib/clinic/calc";
import type { AlimentoBusca, Avaliacao, Prescricao, Prontuario, Refeicao } from "@/lib/clinic/types";
import { EvolucaoPainel } from "./evolucao-view";
import { EntregaPlano } from "./entrega-view";
import { ExamesPainel } from "./exames-view";
import { FormPaciente } from "./form-paciente";
import { DietaPainel } from "./dieta-view";
import { Fechamento } from "./dossie-view";
import { HistoricoPainel } from "./historico-view";
import { Timbre } from "./folha-papel";
import { DocumentosPainel } from "./documentos-view";
import { RecordatorioPainel } from "./recordatorio-view";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea, cx } from "./ui";

export type Aba = "resumo" | "cadastro" | "avaliacao" | "dieta" | "cardapio" | "evolucao" | "historico" | "recordatorio" | "exames" | "documentos";

export function PacienteView({ id, aba }: { id: number; aba: Aba }) {
  const nav = useNavigate();
  const [prontuario, setProntuario] = useState<Prontuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const d = await getProntuario({ data: { id } });
    setProntuario(d);
  }

  useEffect(() => {
    carregar().catch((e: unknown) => setErro(e instanceof Error ? e.message : "Prontuário indisponível."));
  }, [id]);

  function ir(proxima: Aba) {
    void nav({
      to: "/pacientes/$pacienteId",
      params: { pacienteId: String(id) },
      search: { aba: proxima },
    });
  }

  if (erro) return <Erro>{erro}</Erro>;
  if (!prontuario) return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;

  const p = prontuario.paciente;
  const abas: Array<[Aba, string]> = [
    ["resumo", "Resumo"],
    ["cadastro", "Cadastro"],
    ["avaliacao", "Avaliação"],
    ["dieta", "Dieta"],
    ["cardapio", "Cardápio"],
    ["evolucao", "Evolução"],
    ["historico", "Histórico"],
    ["recordatorio", "Recordatório"],
    ["exames", "Exames"],
    ["documentos", "Documentos"],
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/pacientes" className="no-print text-sm text-copper-deep">
        Pacientes
      </Link>
      <h1 className="mt-2 font-serif text-4xl">{p.nome}</h1>
      <p className="mt-1 text-sm text-ink-2">
        {p.dataNascimento ? `nasc. ${fmtData(p.dataNascimento)} · ` : ""}
        {p.idade != null ? `${p.idade} anos · ` : ""}
        {p.sexo}
        {p.objetivo ? ` · ${p.objetivo}` : ""}
        {p.profissionalNome ? ` · ${p.profissionalNome}` : ""}
        {p.administrativoNome ? ` · adm. ${p.administrativoNome}` : ""}
        {` · ${p.status}`}
      </p>
      <div className="no-print mt-5 flex flex-wrap gap-x-2 gap-y-3 pb-2">
        {abas.map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => ir(chave)}
            className={cx(
              "min-h-11 shrink-0 rounded-full px-4 text-sm",
              aba === chave ? "bg-copper text-paper" : "bg-sand text-ink",
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {aba === "resumo" ? <Resumo prontuario={prontuario} ir={ir} /> : null}
        {aba === "cadastro" ? (
          <Cartao>
            <FormPaciente
              paciente={p}
              objetivos={prontuario.listas.objetivos}
              equipe={prontuario.profissionais}
              onSalvo={() => carregar()}
            />
          </Cartao>
        ) : null}
        {aba === "avaliacao" ? <PainelAvaliacao prontuario={prontuario} onMudou={carregar} /> : null}
        {aba === "dieta" ? <DietaPainel prontuario={prontuario} onMudou={carregar} onIr={ir} /> : null}
        {aba === "cardapio" ? <PainelCardapio prontuario={prontuario} onMudou={carregar} /> : null}
        {aba === "evolucao" ? <EvolucaoPainel prontuario={prontuario} /> : null}
        {aba === "historico" ? <HistoricoPainel prontuario={prontuario} ir={ir} /> : null}
        {aba === "recordatorio" ? <RecordatorioPainel prontuario={prontuario} onMudou={carregar} /> : null}
        {aba === "exames" ? <ExamesPainel prontuario={prontuario} onMudou={carregar} /> : null}
        {aba === "documentos" ? <DocumentosPainel prontuario={prontuario} onMudou={carregar} /> : null}
      </div>
    </div>
  );
}

function Resumo({ prontuario, ir }: { prontuario: Prontuario; ir: (aba: Aba) => void }) {
  const p = prontuario.paciente;
  const aval = prontuario.avaliacoes[0];
  const plano = prontuario.prescricoes[0];
  const retorno = prontuario.agenda.find((a) => a.tipo === "retorno" && !a.feito);
  return (
    <>
    <div className="grid gap-4 lg:grid-cols-2">
      <Cartao>
        <h2 className="font-serif text-2xl">Última avaliação</h2>
        {aval ? (
          <>
            <p className="mt-1 text-sm text-muted">{fmtData(aval.data)} · {aval.equipamento}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <Dado rotulo="Peso" valor={`${fmtNum(aval.peso, 1)} kg`} />
              <Dado rotulo="IMC" valor={fmtNum(aval.imc, 1)} />
              <Dado rotulo="Cintura" valor={aval.cintura ? `${fmtNum(aval.cintura, 0)} cm` : "—"} />
            </dl>
            <p className="mt-4 text-sm text-ink-2">{aval.diagnostico}</p>
            <p className="mt-3 text-sm text-ink">
              Meta gravada {fmtNum(aval.kcalMeta, 0)} kcal. Sugestão pelo objetivo: {fmtNum(aval.sugeridaKcal, 0)} kcal.
            </p>
            {prontuario.avaliacoes.length > 1 ? (
              <p className="mt-3 text-sm text-ink-2">
                Desde {fmtData(prontuario.avaliacoes[prontuario.avaliacoes.length - 1].data)}, o peso foi de{" "}
                {fmtNum(prontuario.avaliacoes[prontuario.avaliacoes.length - 1].peso, 1)} kg para {fmtNum(aval.peso, 1)} kg.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">Uma avaliação até aqui. A curva aparece na próxima consulta.</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-2">Ainda não há avaliação.</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="sand" onClick={() => ir("avaliacao")}>
            {aval ? "Ver avaliação" : "Registrar avaliação"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => ir("evolucao")}>
            Evolução
          </Button>
          <Button type="button" variant="ghost" onClick={() => ir("historico")}>
            Histórico
          </Button>
        </div>
      </Cartao>
      <Cartao>
        <h2 className="font-serif text-2xl">Conduta</h2>
        <p className="mt-2 text-sm text-ink-2">
          {plano ? `${plano.titulo} · ${plano.situacao}` : "Sem cardápio."}
          {prontuario.dietas[0] ? ` Dieta: ${prontuario.dietas[0].nome}.` : " Sem dieta calculada."}
        </p>
        {retorno ? (
          <p className="mt-2 text-sm text-ink">
            Retorno em {fmtData(retorno.dia)}
            {retorno.hora ? ` às ${retorno.hora}` : ""}.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhum retorno em aberto.</p>
        )}
        <p className="mt-3 text-sm text-ink-2">
          {p.telefone ? `Tel. ${p.telefone}` : "Sem telefone"}
          {p.cpf ? ` · CPF ${fmtCpf(p.cpf)}` : ""}
        </p>
        {p.alergias ? <p className="mt-2 text-sm text-amber">Alergias: {p.alergias}</p> : null}
        {prontuario.recordatorios[0] ? (
          <p className="mt-3 text-sm text-ink-2">
            Recordatório de {fmtData(prontuario.recordatorios[0].data)}
            {primeiroRelato(prontuario.recordatorios[0].refeicoes) ? `: ${primeiroRelato(prontuario.recordatorios[0].refeicoes)}` : ""}.
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Nenhum recordatório.</p>
        )}
        {prontuario.exames.some((e) => e.foraFaixa) ? (
          <p className="mt-2 text-sm text-amber">
            {prontuario.exames.filter((e) => e.foraFaixa).length === 1
              ? "1 exame fora da faixa."
              : `${prontuario.exames.filter((e) => e.foraFaixa).length} exames fora da faixa.`}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="sand" onClick={() => ir("dieta")}>
            Dieta
          </Button>
          <Button type="button" onClick={() => ir("cardapio")}>
            Abrir cardápio
          </Button>
          <Button type="button" variant="sand" onClick={() => ir("recordatorio")}>
            Recordatório
          </Button>
          <Button type="button" variant="ghost" onClick={() => ir("exames")}>
            Exames
          </Button>
          <Button type="button" variant="ghost" onClick={() => ir("documentos")}>
            Documentos
          </Button>
        </div>
      </Cartao>
    </div>
    <Fechamento prontuario={prontuario} />
    </>
  );
}

function primeiroRelato(refeicoes: Array<{ hora: string; relato: string }>): string {
  const item = refeicoes.find((r) => r.relato.trim());
  if (!item) return "";
  return item.hora ? `${item.hora} ${item.relato}` : item.relato;
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{rotulo}</dt>
      <dd className="tabular-nums text-lg text-ink">{valor}</dd>
    </div>
  );
}

function PainelAvaliacao({ prontuario, onMudou }: { prontuario: Prontuario; onMudou: () => Promise<void> }) {
  const [sel, setSel] = useState<number | "nova">(prontuario.avaliacoes[0]?.id ?? "nova");
  const atual = prontuario.avaliacoes.find((a) => a.id === sel);
  const irParaRecem = useRef(false);

  useEffect(() => {
    if (!irParaRecem.current) return;
    irParaRecem.current = false;
    const recente = prontuario.avaliacoes[0];
    if (recente) setSel(recente.id);
  }, [prontuario.avaliacoes]);

  return (
    <div>
      <div className="no-print flex flex-wrap gap-2">
        {prontuario.avaliacoes.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSel(a.id)}
            className={cx("min-h-11 rounded-full px-4 text-sm", sel === a.id ? "bg-ink text-paper" : "bg-sand")}
          >
            {fmtData(a.data)}
          </button>
        ))}
        <button type="button" onClick={() => setSel("nova")} className={cx("min-h-11 rounded-full px-4 text-sm", sel === "nova" ? "bg-copper text-paper" : "bg-copper-soft text-copper-deep")}>
          Nova
        </button>
      </div>
      {atual && sel !== "nova" ? <FichaAvaliacao aval={atual} objetivo={prontuario.paciente.objetivo} /> : null}
      {sel === "nova" ? (
        <FormAvaliacao
          prontuario={prontuario}
          onSalvo={async () => {
            irParaRecem.current = true;
            try {
              await onMudou();
            } catch (err) {
              irParaRecem.current = false;
              throw err;
            }
          }}
        />
      ) : null}
    </div>
  );
}

function FichaAvaliacao({ aval, objetivo }: { aval: Avaliacao; objetivo: string }) {
  const rcq = aval.cintura && aval.quadril ? aval.cintura / aval.quadril : null;
  return (
    <Cartao className="mt-4">
      <p className="text-sm text-muted">{fmtData(aval.data)} · {aval.idade} anos · {aval.atividade}</p>
      <h2 className="mt-1 font-serif text-2xl">{aval.diagnostico}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Dado rotulo="Peso" valor={`${fmtNum(aval.peso, 1)} kg`} />
        <Dado rotulo="Altura" valor={`${fmtNum(aval.altura, 0)} cm`} />
        <Dado rotulo="IMC" valor={fmtNum(aval.imc, 1)} />
        <Dado rotulo="Cintura" valor={aval.cintura ? `${fmtNum(aval.cintura, 1)} cm` : "—"} />
        <Dado rotulo="TMB Mifflin" valor={`${fmtNum(aval.tmb, 0)} kcal`} />
        <Dado rotulo="GET" valor={`${fmtNum(aval.get, 0)} kcal`} />
        <Dado rotulo="Meta gravada" valor={`${fmtNum(aval.kcalMeta, 0)} kcal`} />
        <Dado rotulo="Sugestão" valor={`${fmtNum(aval.sugeridaKcal, 0)} kcal`} />
        {aval.gorduraPct != null ? <Dado rotulo="Gordura" valor={`${fmtNum(aval.gorduraPct, 1)} %`} /> : null}
        {aval.massaMuscular != null ? <Dado rotulo="Massa muscular" valor={`${fmtNum(aval.massaMuscular, 1)} kg`} /> : null}
      </dl>
      <p className="mt-4 text-sm text-ink-2">
        Proteína {fmtNum(aval.protMeta, 0)} g · Gordura {fmtNum(aval.lipMeta, 0)} g · Carboidrato {fmtNum(aval.carbMeta, 0)} g
        {rcq ? ` · Cintura/quadril ${fmtNum(rcq, 2)}` : ""}
      </p>
      {aval.kcalMeta !== aval.sugeridaKcal ? (
        <p className="mt-4 rounded-lg bg-amber-soft px-4 py-3 text-sm text-amber">
          A meta gravada é {fmtNum(aval.kcalMeta, 0)} kcal. Para “{objetivo}”, a conta da clínica sugere {fmtNum(aval.sugeridaKcal, 0)} kcal.
          Os dois números ficam visíveis: o sugerido e o que a nutricionista aceitou.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-muted">
        Jejum {aval.jejum} · sem exercício 24 h {aval.semExercicio} · hidratação habitual {aval.hidratacao}
        {aval.equipamento ? ` · ${aval.equipamento}` : ""}
      </p>
    </Cartao>
  );
}

function FormAvaliacao({ prontuario, onSalvo }: { prontuario: Prontuario; onSalvo: () => Promise<void> }) {
  const ultima = prontuario.avaliacoes[0];
  const p = prontuario.paciente;
  const c = prontuario.clinica;
  const [data, setData] = useState(prontuario.hoje);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState(String(ultima?.altura ?? p.alturaCm ?? ""));
  const [cintura, setCintura] = useState("");
  const [quadril, setQuadril] = useState("");
  const [atividade, setAtividade] = useState(ultima?.atividade ?? prontuario.listas.atividades[0]?.nome ?? "Levemente ativo");
  const [equipamento, setEquipamento] = useState(ultima?.equipamento || prontuario.listas.equipamentos[0] || EQUIPAMENTOS[0]);
  const [jejum, setJejum] = useState<"Sim" | "Não">("Sim");
  const [semExercicio, setSemExercicio] = useState<"Sim" | "Não">("Sim");
  const [hidratacao, setHidratacao] = useState<"Sim" | "Não">("Sim");
  const [gestante, setGestante] = useState<"Sim" | "Não">("Não");
  const [lactante, setLactante] = useState<"Sim" | "Não">("Não");
  const [trimestre, setTrimestre] = useState<"" | "1" | "2" | "3">("");
  const [kcal, setKcal] = useState("");
  const [gordura, setGordura] = useState("");
  const [massa, setMassa] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const previa = useMemo(() => {
    if (!p.dataNascimento) return null;
    const kg = Number(peso.replace(",", "."));
    const cm = Number(altura.replace(",", "."));
    if (!kg || !cm) return null;
    const idade = idadeNaData(p.dataNascimento, data);
    const tmb = mifflin(p.sexo, kg, cm, idade);
    const fator = prontuario.listas.atividades.find((a) => a.nome === atividade)?.fator ?? fatorDe(atividade);
    const get = Math.round(tmb * fator);
    const imcV = arred(imc(kg, cm));
    const sug = sugerirKcal(
      p.objetivo,
      get,
      {
        deficit: c.deficitKcal,
        superavit: c.superavitKcal,
        gestanteT1: c.adicionalGestanteT1,
        gestanteT2: c.adicionalGestanteT2,
        gestanteT3: c.adicionalGestanteT3,
        lactanteKcal: c.adicionalLactante,
      },
      { gestante, lactante, trimestre: gestante === "Sim" ? trimestre || "2" : "" },
    );
    const meta = kcal.trim() ? Number(kcal.replace(",", ".")) : sug;
    const macro = macrosDe(kg, meta, c.protGKg, c.gordGKg);
    const cint = Number(cintura.replace(",", "."));
    return {
      idade,
      tmb,
      get,
      imc: imcV,
      sug,
      meta,
      macro,
      diag: diagnosticoTexto(p.sexo, imcV, Number.isFinite(cint) && cint > 0 ? cint : null),
    };
  }, [p, peso, altura, data, atividade, kcal, c, cintura, prontuario.listas.atividades, gestante, lactante, trimestre]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!previa) {
      setErro("Informe peso e altura.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      await salvarAvaliacao({
        data: {
          pacienteId: p.id,
          data,
          peso: Number(peso.replace(",", ".")),
          altura: Number(altura.replace(",", ".")),
          cintura: cintura.trim() ? Number(cintura.replace(",", ".")) : null,
          quadril: quadril.trim() ? Number(quadril.replace(",", ".")) : null,
          atividade,
          equipamento,
          jejum,
          semExercicio,
          hidratacao,
          gestante,
          lactante,
          trimestre: gestante === "Sim" ? trimestre || "2" : "",
          kcalMeta: previa.meta,
          observacoes: obs,
          gorduraPct: gordura.trim() ? Number(gordura.replace(",", ".")) : null,
          massaMuscular: massa.trim() ? Number(massa.replace(",", ".")) : null,
        },
      });
      await onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível gravar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao className="mt-4">
      <h2 className="font-serif text-2xl">Nova avaliação</h2>
      <p className="mt-1 text-sm text-ink-2">
        Mifflin-St Jeor, fator de atividade da clínica e macros em g/kg ({fmtNum(c.protGKg, 1)} g de proteína e {fmtNum(c.gordGKg, 1)} g de gordura). O carboidrato fecha a meta.
      </p>
      <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={enviar}>
        <Campo label="Data">
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
        </Campo>
        <Campo label="Peso (kg)">
          <Input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" required />
        </Campo>
        <Campo label="Altura (cm)">
          <Input value={altura} onChange={(e) => setAltura(e.target.value)} inputMode="decimal" required />
        </Campo>
        <Campo label="Cintura (cm)">
          <Input value={cintura} onChange={(e) => setCintura(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Quadril (cm)">
          <Input value={quadril} onChange={(e) => setQuadril(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Gordura corporal (%)">
          <Input value={gordura} onChange={(e) => setGordura(e.target.value)} inputMode="decimal" placeholder="Opcional" />
        </Campo>
        <Campo label="Massa muscular (kg)">
          <Input value={massa} onChange={(e) => setMassa(e.target.value)} inputMode="decimal" placeholder="Opcional" />
        </Campo>
        <Campo label="Atividade">
          <Select value={atividade} onChange={(e) => setAtividade(e.target.value)}>
            {(prontuario.listas.atividades.length ? prontuario.listas.atividades : ATIVIDADES.map((a) => ({ nome: a.nome, fator: a.fator }))).map((a) => (
              <option key={a.nome}>{a.nome}</option>
            ))}
          </Select>
        </Campo>
        <Campo label="Equipamento">
          <Select value={equipamento} onChange={(e) => setEquipamento(e.target.value)}>
            {(prontuario.listas.equipamentos.length ? prontuario.listas.equipamentos : [...EQUIPAMENTOS]).map((eq) => (
              <option key={eq}>{eq}</option>
            ))}
          </Select>
        </Campo>
        <SimNao label="Jejum (4 h)" value={jejum} onChange={setJejum} />
        <SimNao label="Sem exercício 24 h" value={semExercicio} onChange={setSemExercicio} />
        <SimNao label="Hidratação habitual" value={hidratacao} onChange={setHidratacao} />
        <SimNao label="Gestante" value={gestante} onChange={setGestante} />
        {gestante === "Sim" ? (
          <Campo label="Trimestre">
            <Select value={trimestre || "2"} onChange={(e) => setTrimestre(e.target.value as "1" | "2" | "3")}>
              <option value="1">1º</option>
              <option value="2">2º</option>
              <option value="3">3º</option>
            </Select>
          </Campo>
        ) : null}
        <SimNao label="Lactante" value={lactante} onChange={setLactante} />
        <Campo label="Meta calórica escolhida">
          <Input value={kcal} onChange={(e) => setKcal(e.target.value)} placeholder={previa ? String(previa.sug) : "kcal"} inputMode="numeric" />
        </Campo>
        <div className="md:col-span-3">
          <Campo label="Observações">
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
          </Campo>
        </div>
        {previa ? (
          <div className="rounded-xl bg-sand px-4 py-3 text-sm text-ink md:col-span-3">
            <p>{previa.diag} · {previa.idade} anos</p>
            <p className="mt-1 tabular-nums">
              IMC {fmtNum(previa.imc, 1)} · TMB {fmtNum(previa.tmb, 0)} · GET {fmtNum(previa.get, 0)} · sugestão {fmtNum(previa.sug, 0)} kcal
            </p>
            <p className="mt-1 tabular-nums">
              Se gravar {fmtNum(previa.meta, 0)} kcal: PTN {previa.macro.prot} g · LIP {previa.macro.lip} g · CHO {previa.macro.carb} g
            </p>
          </div>
        ) : null}
        <div className="md:col-span-3">
          <Erro>{erro}</Erro>
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={ocupado}>
            Gravar avaliação
          </Button>
        </div>
      </form>
    </Cartao>
  );
}

function idadeNaData(nasc: string, ref: string) {
  const [y, m, d] = nasc.split("-").map(Number);
  const [Y, M, D] = ref.split("-").map(Number);
  let age = Y - y;
  if (M < m || (M === m && D < d)) age -= 1;
  return age;
}

function SimNao({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "Sim" | "Não";
  onChange: (v: "Sim" | "Não") => void;
}) {
  return (
    <Campo label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value === "Não" ? "Não" : "Sim")}>
        <option>Sim</option>
        <option>Não</option>
      </Select>
    </Campo>
  );
}

function soma(presc: Prescricao) {
  return presc.refeicoes.reduce(
    (acc, ref) => {
      for (const item of ref.itens) {
        acc.kcal += item.kcal;
        acc.ptn += item.ptn;
        acc.cho += item.cho;
        acc.lip += item.lip;
        acc.fibra += item.fibra;
      }
      return acc;
    },
    { kcal: 0, ptn: 0, cho: 0, lip: 0, fibra: 0 },
  );
}

function PainelCardapio({ prontuario, onMudou }: { prontuario: Prontuario; onMudou: () => Promise<void> }) {
  const planos = prontuario.prescricoes;
  const [sel, setSel] = useState(planos[0]?.id ?? 0);
  const plano = planos.find((p) => p.id === sel) ?? planos[0];
  const [ver, setVer] = useState(false);

  async function criado(id: number) {
    await onMudou();
    setSel(id);
  }

  return (
    <div>
      <OrigemCardapio prontuario={prontuario} planoId={plano?.id} onCriou={criado} onMudou={onMudou} />
      <EntregaPlano
        pacienteId={prontuario.paciente.id}
        nome={prontuario.paciente.nome}
        telefone={prontuario.paciente.telefone}
        clinica={prontuario.clinica.nome}
        temEmitido={planos.some((p) => p.situacao === "Emitida")}
        temNascimento={Boolean(prontuario.paciente.dataNascimento)}
        temCpf={prontuario.paciente.cpf.replace(/\D/g, "").length >= 3}
      />
      {plano ? (
        <>
          <div className="no-print mt-4 flex flex-wrap items-center gap-2">
            {planos.map((p) => (
              <button key={p.id} type="button" onClick={() => setSel(p.id)} className={cx("min-h-11 rounded-full px-4 text-sm", p.id === plano.id ? "bg-ink text-paper" : "bg-sand")}>
                {fmtData(p.data)} · {p.situacao}
              </button>
            ))}
            <Button type="button" variant="ghost" onClick={() => setVer(true)}>
              Visualizar
            </Button>
          </div>
          <Editor plano={plano} onMudou={onMudou} onNova={setSel} />
          {ver ? <Folha prontuario={prontuario} plano={plano} onFechar={() => setVer(false)} /> : null}
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-2">Ainda não há cardápio. Escolha a origem e copie.</p>
      )}
    </div>
  );
}

function OrigemCardapio({
  prontuario,
  planoId,
  onCriou,
  onMudou,
}: {
  prontuario: Prontuario;
  planoId?: number;
  onCriou: (id: number) => Promise<void>;
  onMudou: () => Promise<void>;
}) {
  const [origem, setOrigem] = useState<"calculo" | "modelo" | "prescricao" | "branco" | "dieta" | "modeloDieta">("dieta");
  const [origemId, setOrigemId] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const registros =
    origem === "modelo"
      ? prontuario.modelosCardapio.map((m) => ({ id: m.id, rotulo: m.tema ? `${m.titulo} · ${m.tema}` : m.titulo }))
      : origem === "prescricao"
        ? [
            ...prontuario.prescricoes.map((p) => ({ id: p.id, rotulo: `${fmtData(p.data)} · ${p.titulo}` })),
            ...prontuario.prescricoesOutras.map((p) => ({ id: p.id, rotulo: `${p.pacienteNome} · ${p.titulo}` })),
          ]
        : origem === "dieta"
          ? prontuario.dietas.map((d) => ({ id: d.id, rotulo: d.data ? `${d.nome} · ${fmtData(d.data)}` : d.nome }))
          : origem === "modeloDieta"
            ? prontuario.modelosDieta.map((d) => ({ id: d.id, rotulo: d.indicacao ? `${d.nome} · ${d.indicacao}` : d.nome }))
            : [];

  async function copiar() {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const idEscolhido = origemId || registros[0]?.id;
      if ((origem === "modelo" || origem === "prescricao" || origem === "dieta" || origem === "modeloDieta") && !idEscolhido) {
        setErro("Escolha o registro de origem. Se a lista está vazia, grave a dieta ou o modelo antes.");
        return;
      }
      const res = await criarCardapio({
        data: {
          pacienteId: prontuario.paciente.id,
          origem,
          origemId: origem === "modelo" || origem === "prescricao" || origem === "dieta" || origem === "modeloDieta" ? idEscolhido : undefined,
        },
      });
      await onCriou(res.id);
      setOk("Cardápio novo, com o conteúdo copiado. Ajuste e emita.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível copiar.");
    } finally {
      setOcupado(false);
    }
  }

  async function guardarModelo() {
    if (!planoId) return;
    if (titulo.trim().length < 2) {
      setErro("Dê um nome ao modelo, por exemplo Pacientes hipertensos.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      await guardarComoModelo({ data: { prescricaoId: planoId, titulo: titulo.trim(), tema: tema.trim() } });
      await onMudou();
      setOk("Modelo guardado. No próximo paciente, escolha Modelo de cardápio.");
      setTitulo("");
      setTema("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível guardar o modelo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Origem</h2>
      <p className="mt-1 text-sm text-ink-2">
        O conteúdo é copiado para um cardápio novo. Um modelo, como “Pacientes hipertensos”, se monta uma vez e reaproveita.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo label="Origem">
          <Select
            value={origem}
            onChange={(e) => {
              setOrigem(e.target.value as typeof origem);
              setOrigemId(0);
            }}
          >
            <option value="dieta">Dieta do paciente</option>
            <option value="modeloDieta">Modelo de dieta</option>
            <option value="calculo">Cálculo da avaliação</option>
            <option value="modelo">Modelo de cardápio</option>
            <option value="prescricao">Outra prescrição</option>
            <option value="branco">Em branco</option>
          </Select>
        </Campo>
        {registros.length > 0 ? (
          <Campo label="Registro de origem">
            <Select value={String(origemId || registros[0].id)} onChange={(e) => setOrigemId(Number(e.target.value))}>
              {registros.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.rotulo}
                </option>
              ))}
            </Select>
          </Campo>
        ) : null}
      </div>
      <div className="mt-3">
        <Button type="button" disabled={ocupado} onClick={copiar}>
          Copiar para um cardápio novo
        </Button>
      </div>
      {planoId ? (
        <div className="mt-5 grid gap-3 border-t border-line pt-4 md:grid-cols-[1fr_1fr_auto]">
          <Campo label="Guardar este como modelo">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Pacientes hipertensos" />
          </Campo>
          <Campo label="Tema">
            <Input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Hipertensão" />
          </Campo>
          <Button type="button" variant="sand" disabled={ocupado} onClick={guardarModelo}>
            Guardar modelo
          </Button>
        </div>
      ) : null}
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">{ok}</p> : null}
      </div>
    </Cartao>
  );
}

function Editor({
  plano,
  onMudou,
  onNova,
}: {
  plano: Prescricao;
  onMudou: () => Promise<void>;
  onNova: (id: number) => void;
}) {
  const [titulo, setTitulo] = useState(plano.titulo);
  const [kcal, setKcal] = useState(String(plano.kcalMeta));
  const [prot, setProt] = useState(String(plano.protMeta));
  const [cho, setCho] = useState(String(plano.carbMeta));
  const [lip, setLip] = useState(String(plano.lipMeta));
  const [hidra, setHidra] = useState(plano.hidratacao);
  const [retorno, setRetorno] = useState(plano.retornoEm ?? "");
  const [refs, setRefs] = useState(plano.refeicoes);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const rascunho = plano.situacao === "Rascunho";
  const totais = soma({ ...plano, refeicoes: refs });

  const assinatura = plano.refeicoes.map((r) => r.itens.map((i) => i.id).join(",")).join("|");

  useEffect(() => {
    setTitulo(plano.titulo);
    setKcal(String(plano.kcalMeta));
    setProt(String(plano.protMeta));
    setCho(String(plano.carbMeta));
    setLip(String(plano.lipMeta));
    setHidra(plano.hidratacao);
    setRetorno(plano.retornoEm ?? "");
    setRefs(plano.refeicoes);
  }, [plano.id]);

  useEffect(() => {
    setRefs((atual) =>
      plano.refeicoes.map((ref) => {
        const local = atual.find((r) => r.id === ref.id);
        if (!local) return ref;
        return { ...ref, nome: local.nome, hora: local.hora, orientacao: local.orientacao };
      }),
    );
  }, [assinatura]);

  async function guardar(): Promise<boolean> {
    setErro(null);
    try {
      await salvarPlano({
        data: {
          id: plano.id,
          titulo,
          kcalMeta: Number(kcal),
          protMeta: Number(prot),
          carbMeta: Number(cho),
          lipMeta: Number(lip),
          hidratacao: hidra,
          retornoEm: retorno,
          refeicoes: refs.map((r) => ({ id: r.id, nome: r.nome, hora: r.hora, orientacao: r.orientacao })),
        },
      });
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar o plano.");
      return false;
    }
  }

  async function emitir() {
    setOcupado(true);
    setErro(null);
    try {
      const ok = await guardar();
      if (!ok) return;
      await emitirPlano({ data: { id: plano.id } });
      await onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível emitir.");
    } finally {
      setOcupado(false);
    }
  }

  async function versao() {
    setOcupado(true);
    try {
      const res = await novaVersao({ data: { id: plano.id } });
      await onMudou();
      onNova(res.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir nova versão.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <Campo label="Título">
            <Input value={titulo} disabled={!rascunho} onChange={(e) => setTitulo(e.target.value)} />
          </Campo>
        </div>
        <Campo label="Retorno">
          <Input type="date" value={retorno} disabled={!rascunho} onChange={(e) => setRetorno(e.target.value)} />
        </Campo>
        <Campo label="Hidratação">
          <Input value={hidra} disabled={!rascunho} onChange={(e) => setHidra(e.target.value)} />
        </Campo>
        <Campo label="kcal">
          <Input value={kcal} disabled={!rascunho} onChange={(e) => setKcal(e.target.value)} />
        </Campo>
        <Campo label="Proteína (g)">
          <Input value={prot} disabled={!rascunho} onChange={(e) => setProt(e.target.value)} />
        </Campo>
        <Campo label="Carboidrato (g)">
          <Input value={cho} disabled={!rascunho} onChange={(e) => setCho(e.target.value)} />
        </Campo>
        <Campo label="Gordura (g)">
          <Input value={lip} disabled={!rascunho} onChange={(e) => setLip(e.target.value)} />
        </Campo>
      </div>
      <div className="mt-4 grid gap-2">
        <Barra rotulo="Energia" valor={totais.kcal} meta={Number(kcal) || 0} unidade="kcal" />
        <Barra rotulo="Proteína" valor={totais.ptn} meta={Number(prot) || 0} unidade="g" />
        <Barra rotulo="Carboidrato" valor={totais.cho} meta={Number(cho) || 0} unidade="g" />
        <Barra rotulo="Gordura" valor={totais.lip} meta={Number(lip) || 0} unidade="g" />
      </div>
      <p className="mt-2 text-sm text-muted">Fibra somada: {fmtNum(totais.fibra, 1)} g. Itens de exemplo para o cálculo — ajuste antes de emitir.</p>
      <div className="mt-4 flex flex-col gap-3">
        {refs.map((ref, idx) => (
          <RefeicaoCard
            key={ref.id}
            refeicao={ref}
            prescricaoId={plano.id}
            rascunho={rascunho}
            onChange={(nova) => setRefs((lista) => lista.map((r, i) => (i === idx ? nova : r)))}
            onMudou={onMudou}
          />
        ))}
      </div>
      <Erro>{erro}</Erro>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        {rascunho ? (
          <>
            <Button type="button" variant="sand" disabled={ocupado} onClick={async () => { setOcupado(true); const ok = await guardar(); if (ok) await onMudou(); setOcupado(false); }}>
              Salvar horários e metas
            </Button>
            <Button type="button" disabled={ocupado} onClick={emitir}>
              Emitir prescrição
            </Button>
          </>
        ) : (
          <Button type="button" disabled={ocupado} onClick={versao}>
            Nova versão
          </Button>
        )}
      </div>
    </div>
  );
}

function Barra({ rotulo, valor, meta, unidade }: { rotulo: string; valor: number; meta: number; unidade: string }) {
  const pct = meta > 0 ? Math.min(100, (valor / meta) * 100) : 0;
  const estourou = meta > 0 && valor > meta * 1.05;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{rotulo}</span>
        <span className="tabular-nums text-ink-2">
          {fmtNum(valor, 0)} / {fmtNum(meta, 0)} {unidade}
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-sand">
        <div className={estourou ? "h-full rounded-full bg-amber" : "h-full rounded-full bg-copper"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RefeicaoCard({
  refeicao,
  prescricaoId,
  rascunho,
  onChange,
  onMudou,
}: {
  refeicao: Refeicao;
  prescricaoId: number;
  rascunho: boolean;
  onChange: (r: Refeicao) => void;
  onMudou: () => Promise<void>;
}) {
  return (
    <Cartao>
      <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
        <Input value={refeicao.hora} disabled={!rascunho} onChange={(e) => onChange({ ...refeicao, hora: e.target.value })} aria-label="Hora" />
        <Input value={refeicao.nome} disabled={!rascunho} onChange={(e) => onChange({ ...refeicao, nome: e.target.value })} aria-label="Refeição" />
      </div>
      <ul className="mt-3">
        {refeicao.itens.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 border-t border-line py-2 text-sm">
            <span>
              <span className="text-ink">
                {fmtNum(item.qtd, item.qtd % 1 === 0 ? 0 : 1)} {item.medida.toLowerCase()} — {item.alimentoNome}
              </span>
              <span className="block tabular-nums text-muted">
                {fmtNum(item.gramas, 0)} g · {fmtNum(item.kcal, 0)} kcal · PTN {fmtNum(item.ptn, 1)} · CHO {fmtNum(item.cho, 1)} · LIP {fmtNum(item.lip, 1)}
              </span>
            </span>
            {rascunho ? (
              <button
                type="button"
                className="min-h-11 shrink-0 text-amber"
                onClick={async () => {
                  await removerItem({ data: { id: item.id } });
                  await onMudou();
                }}
              >
                Tirar
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {rascunho ? (
        <BuscaAlimento prescricaoId={prescricaoId} refeicaoId={refeicao.id} onMudou={onMudou} />
      ) : null}
      <Textarea
        className="mt-3"
        placeholder="Orientação ou substituição"
        disabled={!rascunho}
        value={refeicao.orientacao}
        onChange={(e) => onChange({ ...refeicao, orientacao: e.target.value })}
      />
    </Cartao>
  );
}

function BuscaAlimento({
  prescricaoId,
  refeicaoId,
  onMudou,
}: {
  prescricaoId: number;
  refeicaoId: number;
  onMudou: () => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<AlimentoBusca[]>([]);
  const [escolhido, setEscolhido] = useState<AlimentoBusca | null>(null);
  const [medida, setMedida] = useState("Grama");
  const [qtd, setQtd] = useState("100");
  const [alerta, setAlerta] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setLista([]);
      return;
    }
    const t = setTimeout(() => {
      buscarAlimentos({ data: { q } })
        .then(setLista)
        .catch(() => setLista([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const medidas = escolhido ? [["Grama", 1] as [string, number], ...escolhido.m] : [["Grama", 1] as [string, number]];

  async function incluir(confirmar: boolean) {
    if (!escolhido) return;
    setErro(null);
    try {
      const res = await adicionarItem({
        data: {
          prescricaoId,
          refeicaoId,
          alimentoId: escolhido.id,
          medida,
          qtd: Number(qtd.replace(",", ".")),
          confirmarAlergia: confirmar,
        },
      });
      if (res.alerta) {
        setAlerta(res.alerta);
        return;
      }
      setAlerta(null);
      setEscolhido(null);
      setQ("");
      setLista([]);
      await onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível incluir.");
    }
  }

  return (
    <div className="mt-3">
      <Input value={q} onChange={(e) => { setQ(e.target.value); setEscolhido(null); }} placeholder="Buscar alimento (IBGE e TACO)" aria-label="Buscar alimento" />
      {lista.length > 0 && !escolhido ? (
        <ul className="mt-1 max-h-48 overflow-auto rounded-lg border border-line bg-paper">
          {lista.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-sand"
                onClick={() => {
                  setEscolhido(a);
                  setMedida(a.m[0]?.[0] ?? "Grama");
                  setQtd("1");
                  setLista([]);
                }}
              >
                {a.n}
                <span className="block text-muted">{a.g} · {fmtNum(a.k, 0)} kcal/100 g</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {escolhido ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <p className="w-full text-sm text-ink">{escolhido.n}</p>
          <Campo label="Quantidade">
            <Input className="w-28" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Campo>
          <Campo label="Medida">
            <Select className="w-52" value={medida} onChange={(e) => setMedida(e.target.value)}>
              {medidas.map(([nome]) => (
                <option key={nome}>{nome}</option>
              ))}
            </Select>
          </Campo>
          <Button type="button" onClick={() => incluir(false)}>
            Incluir
          </Button>
        </div>
      ) : null}
      {alerta ? (
        <div className="mt-2 rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
          <p>{alerta}</p>
          <button type="button" className="mt-1 font-semibold" onClick={() => incluir(true)}>
            Incluir mesmo assim
          </button>
        </div>
      ) : null}
      <Erro>{erro}</Erro>
    </div>
  );
}

function Folha({
  prontuario,
  plano,
  onFechar,
}: {
  prontuario: Prontuario;
  plano: Prescricao;
  onFechar: () => void;
}) {
  const p = prontuario.paciente;
  const c = prontuario.clinica;
  const totais = soma(plano);
  return (
    <div className="fixed inset-0 z-30 overflow-auto bg-paper">
      <div className="no-print flex gap-2 border-b border-line px-4 py-3">
        <Button type="button" variant="ghost" onClick={onFechar}>
          Voltar
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
      </div>
      <article className="folha-print mx-auto max-w-3xl px-6 py-8">
        <Timbre clinica={c} />
        <h2 className="mt-8 font-serif text-2xl">{plano.titulo}</h2>
        <p className="text-sm text-ink-2">
          {p.nome}
          {p.idade != null ? ` · ${p.idade} anos` : ""}
          {p.cpf ? ` · CPF ${fmtCpf(p.cpf)}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted">
          {fmtData(plano.data)} · {plano.situacao}
          {plano.situacao !== "Emitida" ? " — sem valor de documento" : ""}
        </p>
        <p className="mt-4 text-sm tabular-nums">
          Meta {fmtNum(plano.kcalMeta, 0)} kcal · PTN {fmtNum(plano.protMeta, 0)} g · CHO {fmtNum(plano.carbMeta, 0)} g · LIP {fmtNum(plano.lipMeta, 0)} g
        </p>
        {plano.refeicoes.map((ref) => (
          <section key={ref.id} className="mt-6">
            <h3 className="font-serif text-xl">
              {ref.hora ? `${ref.hora} · ` : ""}
              {ref.nome}
            </h3>
            <ul className="mt-2">
              {ref.itens.map((item) => (
                <li key={item.id} className="text-sm text-ink">
                  {fmtNum(item.qtd, item.qtd % 1 === 0 ? 0 : 1)} {item.medida.toLowerCase()} de {item.alimentoNome}
                  <span className="text-muted"> ({fmtNum(item.gramas, 0)} g)</span>
                </li>
              ))}
            </ul>
            {ref.orientacao ? <p className="mt-1 text-sm text-ink-2">{ref.orientacao}</p> : null}
          </section>
        ))}
        <p className="mt-6 text-sm tabular-nums text-ink-2">
          Calculado: {fmtNum(totais.kcal, 0)} kcal · PTN {fmtNum(totais.ptn, 1)} g · CHO {fmtNum(totais.cho, 1)} g · LIP {fmtNum(totais.lip, 1)} g · fibra {fmtNum(totais.fibra, 1)} g
        </p>
        {plano.hidratacao ? <p className="mt-2 text-sm">Hidratação: {plano.hidratacao}</p> : null}
        <p className="mt-8 text-xs text-muted">
          Orientação alimentar de {c.nutricionista}, {c.crn}. Não substitui o acompanhamento.
        </p>
      </article>
    </div>
  );
}
