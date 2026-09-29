import { useEffect, useState, type ReactNode } from "react";
import { desligarAssinaturaAgenda, excluirAlimentoProprio, exportarBackup, getAssinaturaAgenda, importarBackup, ligarAssinaturaAgenda, restaurarCatalogo, salvarAlimentoProprio, salvarCatalogo, salvarListas, salvarParametros, salvarProfissionais } from "@/lib/clinic/api";
import { linkAssinarGoogle, linkAssinarOutlook } from "@/lib/clinic/cal";
import { fmtData } from "@/lib/clinic/calc";
import { desligarPasta, escolherPasta, estadoNuvem, gravarNaNuvem, nuvemDisponivel } from "@/lib/clinic/nuvem-backup";
import type { AlimentoProprio, Sistema } from "@/lib/clinic/types";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

function num(s: string) {
  return Number(s.replace(",", "."));
}

export function FormParametros({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const c = sistema.clinica;
  const [prot, setProt] = useState(String(c.protGKg));
  const [gord, setGord] = useState(String(c.gordGKg));
  const [deficit, setDeficit] = useState(String(c.deficitKcal));
  const [superavit, setSuperavit] = useState(String(c.superavitKcal));
  const [dias, setDias] = useState(String(c.diasReavaliacao));
  const [t1, setT1] = useState(String(c.adicionalGestanteT1));
  const [t2, setT2] = useState(String(c.adicionalGestanteT2));
  const [t3, setT3] = useState(String(c.adicionalGestanteT3));
  const [lact, setLact] = useState(String(c.adicionalLactante));
  const [bia, setBia] = useState(String(c.variacaoBia));
  const [agua, setAgua] = useState(String(c.variacaoAgua));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarParametros({
        data: {
          protGKg: num(prot),
          gordGKg: num(gord),
          deficitKcal: num(deficit),
          superavitKcal: num(superavit),
          diasReavaliacao: num(dias),
          adicionalGestanteT1: num(t1),
          adicionalGestanteT2: num(t2),
          adicionalGestanteT3: num(t3),
          adicionalLactante: num(lact),
          variacaoBia: num(bia),
          variacaoAgua: num(agua),
        },
      });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar os parâmetros.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Parâmetros de cálculo</h2>
      <p className="mt-1 text-sm text-ink-2">
        Entram na sugestão da avaliação. A meta gravada continua a que a nutricionista escolheu. O fator de atividade está em Listas de opções.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo label="Proteína, g/kg">
          <Input value={prot} onChange={(e) => setProt(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Gordura, g/kg">
          <Input value={gord} onChange={(e) => setGord(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Déficit para emagrecer, kcal">
          <Input value={deficit} onChange={(e) => setDeficit(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Superávit para ganho, kcal">
          <Input value={superavit} onChange={(e) => setSuperavit(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Reavaliação, dias">
          <Input value={dias} onChange={(e) => setDias(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Gestante, 1º trimestre, kcal">
          <Input value={t1} onChange={(e) => setT1(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Gestante, 2º trimestre, kcal">
          <Input value={t2} onChange={(e) => setT2(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Gestante, 3º trimestre, kcal">
          <Input value={t3} onChange={(e) => setT3(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Lactante, kcal">
          <Input value={lact} onChange={(e) => setLact(e.target.value)} inputMode="numeric" />
        </Campo>
        <Campo label="Variação da BIA, pontos de gordura">
          <Input value={bia} onChange={(e) => setBia(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Variação de água, pontos">
          <Input value={agua} onChange={(e) => setAgua(e.target.value)} inputMode="decimal" />
        </Campo>
      </div>
      <p className="mt-3 text-sm text-muted">
        A variação da gordura avisa na comparação de duas avaliações. A água fica guardada; a avaliação ainda não lança água corporal.
      </p>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado.</p> : null}
      </div>
      <div className="mt-4">
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar parâmetros
        </Button>
      </div>
    </Cartao>
  );
}

export function FormListas({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [listas, setListas] = useState(sistema.listas);
  const [fatores, setFatores] = useState(sistema.listas.atividades.map((a) => String(a.fator)));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    const objetivos = listas.objetivos.map((s) => s.trim()).filter(Boolean);
    const equipamentos = listas.equipamentos.map((s) => s.trim()).filter(Boolean);
    const atividades = listas.atividades
      .map((a, i) => ({ nome: a.nome.trim(), fator: num(fatores[i] ?? String(a.fator)) }))
      .filter((a) => a.nome);
    const refeicoes = listas.refeicoes.filter((r) => r.nome.trim());
    const alergias = listas.alergias.filter((a) => a.nome.trim());
    if (!objetivos.length || !atividades.length || !equipamentos.length || !refeicoes.length) {
      setErro("Deixe ao menos um objetivo, uma atividade, um equipamento e uma refeição.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarListas({
        data: {
          objetivos,
          atividades: atividades.map((a) => ({ nome: a.nome.trim(), fator: a.fator })),
          equipamentos,
          refeicoes: refeicoes.map((r) => ({ nome: r.nome.trim(), hora: r.hora.trim() })),
          alergias: alergias.map((a) => ({ nome: a.nome.trim(), palavras: a.palavras.trim() })),
        },
      });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar as listas.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Listas de opções</h2>
      <p className="mt-1 text-sm text-ink-2">
        Objetivo no cadastro, atividade e equipamento na avaliação, refeições do cardápio novo e palavras que disparam o alerta de alergia.
      </p>
      <Bloco titulo="Objetivos">
        {listas.objetivos.map((valor, i) => (
          <Linha key={i} onTirar={() => setListas((l) => ({ ...l, objetivos: l.objetivos.filter((_, n) => n !== i) }))}>
            <Input value={valor} onChange={(e) => setListas((l) => ({ ...l, objetivos: troca(l.objetivos, i, e.target.value) }))} />
          </Linha>
        ))}
        <Button type="button" variant="sand" onClick={() => setListas((l) => ({ ...l, objetivos: [...l.objetivos, ""] }))}>
          Outro objetivo
        </Button>
      </Bloco>
      <Bloco titulo="Atividade e fator do GET">
        {listas.atividades.map((item, i) => (
          <Linha
            key={i}
            onTirar={() => {
              setListas((l) => ({ ...l, atividades: l.atividades.filter((_, n) => n !== i) }));
              setFatores((lista) => lista.filter((_, n) => n !== i));
            }}
          >
            <Input
              value={item.nome}
              onChange={(e) =>
                setListas((l) => ({ ...l, atividades: l.atividades.map((a, n) => (n === i ? { ...a, nome: e.target.value } : a)) }))
              }
            />
            <Input
              className="md:max-w-28"
              value={fatores[i] ?? ""}
              inputMode="decimal"
              onChange={(e) => setFatores((lista) => lista.map((f, n) => (n === i ? e.target.value : f)))}
            />
          </Linha>
        ))}
        <Button
          type="button"
          variant="sand"
          onClick={() => {
            setListas((l) => ({ ...l, atividades: [...l.atividades, { nome: "", fator: 1.2 }] }));
            setFatores((lista) => [...lista, "1.2"]);
          }}
        >
          Outra atividade
        </Button>
      </Bloco>
      <Bloco titulo="Refeições do cardápio novo">
        {listas.refeicoes.map((item, i) => (
          <Linha key={i} onTirar={() => setListas((l) => ({ ...l, refeicoes: l.refeicoes.filter((_, n) => n !== i) }))}>
            <Input
              value={item.nome}
              onChange={(e) =>
                setListas((l) => ({ ...l, refeicoes: l.refeicoes.map((r, n) => (n === i ? { ...r, nome: e.target.value } : r)) }))
              }
            />
            <Input
              className="md:max-w-28"
              value={item.hora}
              placeholder="07:00"
              onChange={(e) =>
                setListas((l) => ({ ...l, refeicoes: l.refeicoes.map((r, n) => (n === i ? { ...r, hora: e.target.value } : r)) }))
              }
            />
          </Linha>
        ))}
        <Button type="button" variant="sand" onClick={() => setListas((l) => ({ ...l, refeicoes: [...l.refeicoes, { nome: "", hora: "" }] }))}>
          Outra refeição
        </Button>
      </Bloco>
      <Bloco titulo="Alergias e palavras no alimento">
        <p className="text-sm text-muted">Separe as palavras com ponto e vírgula. Ex.: leite; queijo; iogurte</p>
        {listas.alergias.map((item, i) => (
          <Linha key={i} onTirar={() => setListas((l) => ({ ...l, alergias: l.alergias.filter((_, n) => n !== i) }))}>
            <Input
              value={item.nome}
              onChange={(e) =>
                setListas((l) => ({ ...l, alergias: l.alergias.map((a, n) => (n === i ? { ...a, nome: e.target.value } : a)) }))
              }
            />
            <Input
              value={item.palavras}
              onChange={(e) =>
                setListas((l) => ({ ...l, alergias: l.alergias.map((a, n) => (n === i ? { ...a, palavras: e.target.value } : a)) }))
              }
            />
          </Linha>
        ))}
        <Button type="button" variant="sand" onClick={() => setListas((l) => ({ ...l, alergias: [...l.alergias, { nome: "", palavras: "" }] }))}>
          Outra alergia
        </Button>
      </Bloco>
      <div className="mt-4">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado. Cadastro, avaliação e cardápio passam a usar estas listas.</p> : null}
      </div>
      <div className="mt-4">
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar listas
        </Button>
      </div>
    </Cartao>
  );
}

export function FormEquipamentos({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [itens, setItens] = useState(sistema.listas.equipamentos);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    const equipamentos = itens.map((s) => s.trim()).filter(Boolean);
    if (!equipamentos.length) {
      setErro("Deixe ao menos um equipamento.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarListas({
        data: {
          objetivos: sistema.listas.objetivos,
          atividades: sistema.listas.atividades,
          equipamentos,
          refeicoes: sistema.listas.refeicoes,
          alergias: sistema.listas.alergias,
        },
      });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar os equipamentos.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Equipamentos</h2>
      <p className="mt-1 text-sm text-ink-2">Aparecem na avaliação, no campo do aparelho ou da fita.</p>
      <div className="mt-4 flex flex-col gap-2">
        {itens.map((valor, i) => (
          <Linha key={i} onTirar={() => setItens((lista) => lista.filter((_, n) => n !== i))}>
            <Input value={valor} onChange={(e) => setItens((lista) => troca(lista, i, e.target.value))} />
          </Linha>
        ))}
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="sand" onClick={() => setItens((lista) => [...lista, ""])}>
          Outro equipamento
        </Button>
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar equipamentos
        </Button>
      </div>
    </Cartao>
  );
}

type Pessoa = {
  id?: number;
  nome: string;
  funcao: "nutricionista" | "outro" | "administrativo";
  cargo: string;
  crn: string;
  cpf: string;
  ativo: boolean;
};

const FUNCOES: Array<[Pessoa["funcao"], string]> = [
  ["nutricionista", "Nutricionista"],
  ["outro", "Outro profissional"],
  ["administrativo", "Administrativo"],
];

function vazia(funcao: Pessoa["funcao"]): Pessoa {
  return { nome: "", funcao, cargo: "", crn: "", cpf: "", ativo: false };
}

export function FormProfissionais({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [itens, setItens] = useState<Pessoa[]>(
    sistema.profissionais.map((p) => ({
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      cargo: p.cargo,
      crn: p.crn,
      cpf: p.cpf,
      ativo: p.ativo,
    })),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  function patch(i: number, parcial: Partial<Pessoa>) {
    setItens((lista) => lista.map((p, n) => (n === i ? { ...p, ...parcial } : p)));
  }

  async function gravar() {
    const validos = itens.filter((p) => p.nome.trim());
    if (!validos.some((p) => p.funcao === "nutricionista")) {
      setErro("Inclua ao menos uma nutricionista. Ela assina o timbre.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarProfissionais({ data: { itens: validos } });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar a equipe.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Equipe</h2>
      <p className="mt-1 text-sm text-ink-2">
        A clínica é de nutrição, mas médico, psicólogo, educador físico e a recepção também entram aqui. Só a nutricionista marcada assina o cardápio e os documentos. Todos usam a conta da clínica.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {itens.map((p, i) => (
          <div key={p.id ?? `nova-${i}`} className="grid gap-2 border-t border-line pt-3 md:grid-cols-2">
            <Campo label="Nome">
              <Input value={p.nome} onChange={(e) => patch(i, { nome: e.target.value })} />
            </Campo>
            <Campo label="Função">
              <Select
                value={p.funcao}
                onChange={(e) => {
                  const funcao = e.target.value as Pessoa["funcao"];
                  patch(i, { funcao, ativo: funcao === "nutricionista" ? p.ativo : false });
                }}
              >
                {FUNCOES.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Cargo">
              <Input
                value={p.cargo}
                onChange={(e) => patch(i, { cargo: e.target.value })}
                placeholder={p.funcao === "administrativo" ? "Recepção, secretaria" : "Endocrinologia, psicologia"}
              />
            </Campo>
            <Campo label={p.funcao === "administrativo" ? "Registro, se houver" : "Registro no conselho"}>
              <Input value={p.crn} onChange={(e) => patch(i, { crn: e.target.value })} placeholder={p.funcao === "nutricionista" ? "CRN" : "CRM, CRP, CREF"} />
            </Campo>
            <Campo label="CPF">
              <Input value={p.cpf} onChange={(e) => patch(i, { cpf: e.target.value })} />
            </Campo>
            {p.funcao === "nutricionista" ? (
              <label className="flex min-h-11 items-end gap-2 pb-2 text-sm">
                <input type="checkbox" checked={p.ativo} onChange={(e) => patch(i, { ativo: e.target.checked })} />
                No timbre
              </label>
            ) : (
              <p className="self-end pb-2 text-sm text-muted">Não assina o timbre.</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado. O timbre usa a nutricionista marcada.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="sand" onClick={() => setItens((lista) => [...lista, vazia("nutricionista")])}>
          Nutricionista
        </Button>
        <Button type="button" variant="sand" onClick={() => setItens((lista) => [...lista, vazia("outro")])}>
          Outro profissional
        </Button>
        <Button type="button" variant="sand" onClick={() => setItens((lista) => [...lista, vazia("administrativo")])}>
          Administrativo
        </Button>
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar equipe
        </Button>
      </div>
    </Cartao>
  );
}

export function FormAlimentos({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [edit, setEdit] = useState<AlimentoProprio | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <Cartao>
        <h2 className="font-serif text-2xl">Alimentos próprios</h2>
        <p className="mt-1 text-sm text-ink-2">
          Suplementos e preparações da clínica. A busca do cardápio encontra estes nomes junto da tabela IBGE. Valores por 100 g.
        </p>
        {sistema.alimentos.length === 0 ? <p className="mt-4 text-sm text-muted">Nenhum alimento da clínica ainda.</p> : null}
        <ul className="mt-3">
          {sistema.alimentos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm">
              <span>
                <span className="text-ink">{a.nome}</span>
                <span className="block text-muted">
                  {a.kcal} kcal · P {a.ptn} · C {a.cho} · G {a.lip}
                </span>
              </span>
              <span className="flex gap-3">
                <button type="button" className="min-h-11 text-copper-deep" onClick={() => setEdit(a)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="min-h-11 text-amber"
                  onClick={async () => {
                    setErro(null);
                    try {
                      await excluirAlimentoProprio({ data: { id: a.id } });
                      await onSalvo();
                    } catch (e) {
                      setErro(e instanceof Error ? e.message : "Não foi possível tirar.");
                    }
                  }}
                >
                  Tirar
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <Erro>{erro}</Erro>
        </div>
        <div className="mt-4">
          <Button type="button" variant="sand" onClick={() => setEdit({ id: 0, nome: "", grupo: "", kcal: 0, ptn: 0, cho: 0, lip: 0, fibra: 0, medidas: "" })}>
            Novo alimento
          </Button>
        </div>
      </Cartao>
      {edit ? (
        <EditorAlimento
          alimento={edit}
          onFechar={() => setEdit(null)}
          onSalvo={async () => {
            setEdit(null);
            await onSalvo();
          }}
        />
      ) : null}
    </div>
  );
}

function EditorAlimento({
  alimento,
  onSalvo,
  onFechar,
}: {
  alimento: AlimentoProprio;
  onSalvo: () => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(alimento.nome);
  const [grupo, setGrupo] = useState(alimento.grupo);
  const [kcal, setKcal] = useState(String(alimento.kcal));
  const [ptn, setPtn] = useState(String(alimento.ptn));
  const [cho, setCho] = useState(String(alimento.cho));
  const [lip, setLip] = useState(String(alimento.lip));
  const [fibra, setFibra] = useState(String(alimento.fibra));
  const [medidas, setMedidas] = useState(alimento.medidas);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    setOcupado(true);
    setErro(null);
    try {
      await salvarAlimentoProprio({
        data: {
          id: alimento.id > 0 ? alimento.id : undefined,
          nome,
          grupo,
          kcal: num(kcal),
          ptn: num(ptn),
          cho: num(cho),
          lip: num(lip),
          fibra: num(fibra),
          medidas,
        },
      });
      await onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar o alimento.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h3 className="font-serif text-xl">{alimento.id ? "Editar alimento" : "Novo alimento"}</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo label="Nome">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo label="Grupo">
          <Input value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="Suplemento" />
        </Campo>
        <Campo label="kcal / 100 g">
          <Input value={kcal} onChange={(e) => setKcal(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Proteína">
          <Input value={ptn} onChange={(e) => setPtn(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Carboidrato">
          <Input value={cho} onChange={(e) => setCho(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Gordura">
          <Input value={lip} onChange={(e) => setLip(e.target.value)} inputMode="decimal" />
        </Campo>
        <Campo label="Fibra">
          <Input value={fibra} onChange={(e) => setFibra(e.target.value)} inputMode="decimal" />
        </Campo>
      </div>
      <div className="mt-3">
        <Campo label="Medidas caseiras">
          <Textarea rows={3} value={medidas} onChange={(e) => setMedidas(e.target.value)} placeholder={"Scoop=30\nColher de sopa=10"} />
        </Campo>
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar alimento
        </Button>
        <Button type="button" variant="ghost" onClick={onFechar}>
          Cancelar
        </Button>
      </div>
    </Cartao>
  );
}

export function FormCatalogo({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const base = sistema.catalogo;
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function carregar(arquivo: File) {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const texto = await arquivo.text();
      if (texto.length > 2_000_000) throw new Error("Arquivo grande demais. O máximo é 2 MB.");
      const r = await salvarCatalogo({ data: { nome: arquivo.name, texto } });
      await onSalvo();
      setOk(`${r.quantidade} alimentos em uso na busca.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    } finally {
      setOcupado(false);
    }
  }

  async function restaurar() {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      await restaurarCatalogo();
      await onSalvo();
      setOk("A busca voltou à base de fábrica.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível restaurar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Base de alimentos</h2>
      <p className="mt-1 text-sm text-ink-2">
        A busca do cardápio usa esta tabela. TACO e IBGE não atualizam sozinhas: quando sair arquivo novo, carregue aqui. Vale só para esta clínica. Cardápio já emitido guarda os números do dia em que foi feito. Alimentos próprios continuam à parte.
      </p>
      <p className="mt-3 text-sm text-ink">
        Em uso: {base.nome}
        {base.origem === "arquivo" && base.atualizadoEm ? ` · ${fmtData(base.atualizadoEm)}` : ""}
        {" · "}
        {base.quantidade} alimentos
      </p>
      <p className="mt-3 text-sm text-muted">
        CSV ou JSON. Colunas: id, nome, grupo, kcal, ptn, cho, lip, fibra, medidas. Valores por 100 g. Medidas: Colher de sopa=25|Xícara=80. No CSV separado por ponto e vírgula, use a barra ou coloque essa célula entre aspas. Sem id, o código sai do nome e se mantém no próximo carregamento do mesmo alimento.
      </p>
      <div className="mt-4">
        <Campo label="Arquivo">
          <Input
            type="file"
            accept=".csv,.txt,.json,.tsv,text/csv,application/json"
            disabled={ocupado}
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = "";
              if (arquivo) void carregar(arquivo);
            }}
          />
        </Campo>
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">{ok}</p> : null}
      </div>
      {base.origem === "arquivo" ? (
        <div className="mt-4">
          <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void restaurar()}>
            Voltar à base de fábrica
          </Button>
        </div>
      ) : null}
    </Cartao>
  );
}

export function FormBackup({ onSalvo }: { onSalvo: () => Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [arquivo, setArquivo] = useState<{ nome: string; texto: string; resumo: string } | null>(null);
  const [pasta, setPasta] = useState<string | null>(null);
  const [pode, setPode] = useState(false);

  useEffect(() => {
    estadoNuvem()
      .then((e) => {
        setPasta(e.nome);
        setPode(e.pode);
      })
      .catch(() => undefined);
  }, []);

  async function enviarNuvem(pedir: boolean) {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const dados = await exportarBackup();
      const r = await gravarNaNuvem(JSON.stringify(dados), pedir);
      setPasta(r.nome);
      setPode(true);
      setOk(`Arquivo ${r.arquivo} na pasta ${r.nome}. O Drive, o OneDrive ou o Dropbox sobe daí.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar para a pasta.");
    } finally {
      setOcupado(false);
    }
  }

  async function ligarNuvem() {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const nome = await escolherPasta();
      setPasta(nome);
      setPode(true);
      await enviarNuvem(true);
    } catch (e) {
      setOcupado(false);
      if (e instanceof DOMException && e.name === "AbortError") return;
      setErro(e instanceof Error ? e.message : "Não foi possível escolher a pasta.");
    }
  }

  async function desligarNuvem() {
    await desligarPasta();
    setPasta(null);
    setPode(false);
    setOk("A pasta da nuvem foi desligada. Nenhum arquivo novo será gravado.");
  }

  async function exportar() {
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const dados = await exportarBackup();
      const texto = JSON.stringify(dados);
      const blob = new Blob([texto], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nutriciclos-backup-${dados.exportadoEm.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setOk(`Arquivo com ${dados.pacientes.length} pacientes, ${dados.avaliacoes.length} avaliações e ${dados.prescricoes.length} cardápios.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setOcupado(false);
    }
  }

  async function ler(file: File) {
    setErro(null);
    setOk(null);
    try {
      const texto = await file.text();
      if (texto.length > 12_000_000) throw new Error("Arquivo grande demais.");
      const dados = JSON.parse(texto) as {
        versao?: number;
        app?: string;
        pacientes?: unknown[];
        avaliacoes?: unknown[];
        prescricoes?: unknown[];
      };
      if (dados.versao !== 1 || dados.app !== "NutriCiclos") throw new Error("Este arquivo não é um backup do NutriCiclos.");
      setArquivo({
        nome: file.name,
        texto,
        resumo: `${dados.pacientes?.length ?? 0} pacientes · ${dados.avaliacoes?.length ?? 0} avaliações · ${dados.prescricoes?.length ?? 0} cardápios`,
      });
    } catch (e) {
      setArquivo(null);
      setErro(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");
    }
  }

  async function importar() {
    if (!arquivo) return;
    if (!window.confirm("Isto apaga os dados atuais desta conta e coloca os do arquivo. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    setOk(null);
    try {
      const r = await importarBackup({ data: { texto: arquivo.texto } });
      setArquivo(null);
      await onSalvo();
      setOk(`Conta restaurada: ${r.pacientes} pacientes, ${r.avaliacoes} avaliações, ${r.prescricoes} cardápios.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível importar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Backup</h2>
      <p className="mt-1 text-sm text-ink-2">
        Exporta a clínica inteira: pacientes, prontuário, agenda, modelos e a base de alimentos carregada. A importação substitui os dados desta conta. Não é a planilha do Excel.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado} onClick={() => void exportar()}>
          Exportar backup
        </Button>
      </div>
      <div className="mt-6 border-t border-line pt-4">
        <h3 className="font-serif text-xl">Nuvem</h3>
        <p className="mt-1 text-sm text-ink-2">
          Escolha uma pasta que o Google Drive, o OneDrive ou o Dropbox sincroniza neste computador. Com a permissão ativa, um arquivo por dia é gravado quando você abre o consultório. Ficam os 14 mais recentes.
        </p>
        {pasta ? (
          <p className="mt-2 text-sm text-ink">
            Pasta {pasta}
            {pode ? "" : " · permissão pendente"}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Nenhuma pasta escolhida.</p>
        )}
        {!nuvemDisponivel() ? <p className="mt-2 text-sm text-amber">Este navegador não escolhe pasta. Use Chrome ou Edge.</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={ocupado || !nuvemDisponivel()} onClick={() => void ligarNuvem()}>
            {pasta ? "Trocar pasta" : "Escolher pasta da nuvem"}
          </Button>
          {pasta ? (
            <Button type="button" variant="sand" disabled={ocupado} onClick={() => void enviarNuvem(true)}>
              Enviar agora
            </Button>
          ) : null}
          {pasta ? (
            <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void desligarNuvem()}>
              Desligar
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-6">
        <Campo label="Arquivo de backup">
          <Input
            type="file"
            accept=".json,application/json"
            disabled={ocupado}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void ler(file);
            }}
          />
        </Campo>
        {arquivo ? <p className="mt-2 text-sm text-ink">{arquivo.nome} · {arquivo.resumo}</p> : null}
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">{ok}</p> : null}
      </div>
      {arquivo ? (
        <div className="mt-4">
          <Button type="button" disabled={ocupado} onClick={() => void importar()}>
            Importar e substituir
          </Button>
        </div>
      ) : null}
    </Cartao>
  );
}

export function FormCalendario() {
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const url = token ? `${window.location.origin}/api/agenda/${token}` : "";

  useEffect(() => {
    getAssinaturaAgenda()
      .then((r) => setToken(r.token))
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível ler o link."));
  }, []);

  async function endereco() {
    if (token) return `${window.location.origin}/api/agenda/${token}`;
    const r = await ligarAssinaturaAgenda({ data: { trocar: false } });
    setToken(r.token);
    return `${window.location.origin}/api/agenda/${r.token}`;
  }

  async function abrir(destino: "google" | "outlook" | "trabalho") {
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const ics = await endereco();
      const href =
        destino === "google" ? linkAssinarGoogle(ics) : linkAssinarOutlook(ics, destino === "trabalho");
      window.open(href, "_blank", "noopener,noreferrer");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível abrir o calendário.");
    } finally {
      setOcupado(false);
    }
  }

  async function trocar() {
    if (!window.confirm("O link antigo deixa de funcionar no Google e no Outlook. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await ligarAssinaturaAgenda({ data: { trocar: true } });
      setToken(r.token);
      setAviso("Link novo. Insira de novo no Google e no Outlook.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível trocar o link.");
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

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Agenda no calendário</h2>
      <p className="mt-1 text-sm text-ink-2">
        Os botões abrem a tela de assinar por URL, já com o endereço da agenda. Não é calendário público nem código para incorporar num site.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" disabled={ocupado || token === null} onClick={() => void abrir("google")}>
          Inserir no Google
        </Button>
        <Button type="button" variant="sand" disabled={ocupado || token === null} onClick={() => void abrir("outlook")}>
          Inserir no Outlook
        </Button>
        <Button type="button" variant="sand" disabled={ocupado || token === null} onClick={() => void abrir("trabalho")}>
          Inserir no Outlook trabalho
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted">
        Outlook pessoal é outlook.com. Outlook trabalho é a conta da clínica no Microsoft 365. O primeiro clique cria o link. Neste preview o endereço é local e os dois só atualizam sozinhos quando o NutriCiclos estiver publicado.
      </p>
      {url ? <p className="mt-3 break-all text-sm text-ink">{url}</p> : null}
      {token ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void trocar()}>
            Trocar o link
          </Button>
          <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void desligar()}>
            Desligar
          </Button>
        </div>
      ) : null}
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {aviso ? <p className="text-sm text-ink-2">{aviso}</p> : null}
      </div>
    </Cartao>
  );
}

export function Formulas({ sistema }: { sistema: Sistema }) {
  const c = sistema.clinica;
  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Fórmulas e referências</h2>
      <p className="mt-1 text-sm text-ink-2">O que o consultório calcula hoje, e de onde veio o número.</p>
      <Artigo titulo="Idade">
        Anos completos entre o nascimento e a data da avaliação. Aparece no cadastro, na avaliação e no início.
      </Artigo>
      <Artigo titulo="IMC">
        Peso (kg) ÷ altura (m)². Adultos, OMS: baixo peso abaixo de 18,5; eutrofia 18,5–24,9; sobrepeso 25–29,9; obesidade I 30–34,9; II 35–39,9; III a partir de 40. Cintura elevada: mulher a partir de 80 cm, homem a partir de 94; muito elevada: 88 e 102.
        Referência: WHO, 2000. A curva IMC/idade para menores de 19 anos ainda não entra neste app.
      </Artigo>
      <Artigo titulo="TMB e GET">
        Mifflin-St Jeor. Homem: 10 × peso + 6,25 × altura − 5 × idade + 5. Mulher: a mesma conta − 161. GET = TMB × fator. Os fatores desta clínica: {sistema.listas.atividades.map((a) => `${a.nome} ${a.fator}`).join("; ") || "não cadastrados"}.
        Referência: Mifflin et al., Am J Clin Nutr. 1990;51:241-7.
      </Artigo>
      <Artigo titulo="Meta de energia e macros">
        Emagrecer: GET − {c.deficitKcal} kcal. Ganhar massa ou performance: GET + {c.superavitKcal} kcal. Gestante: +{c.adicionalGestanteT1} no 1º trimestre, +{c.adicionalGestanteT2} no 2º, +{c.adicionalGestanteT3} no 3º. Lactante: +{c.adicionalLactante} kcal. Proteína {c.protGKg} g/kg e gordura {c.gordGKg} g/kg. Carboidrato fecha a meta (4 kcal/g de proteína e carboidrato, 9 kcal/g de gordura).
        Referência dos adicionais de gestação: IOM, DRI, 2005. Os g/kg são da clínica.
      </Artigo>
      <Artigo titulo="Cardápio">
        Nutrientes do alimento por 100 g × gramas ÷ 100. A busca usa a tabela IBGE e os alimentos próprios da clínica. A medida caseira vem da tabela, ou da linha nome=gramas no alimento da clínica.
        Referência: IBGE, POF 2008–2009.
      </Artigo>
      <Artigo titulo="Exames">
        O resultado se compara à referência cadastrada: faixa 70-99, menor que ou maior que. Fora da faixa fica marcado. A lista está em Referências de exames.
      </Artigo>
      <Artigo titulo="Comparar">
        Delta = B − A. Gordura com diferença acima de {c.variacaoBia} pontos percentuais pede cautela com o método da bioimpedância.
        Referência do limite de método: Kyle et al., Clin Nutr. 2004;23:1430-53. O ponto de corte é o parâmetro da clínica.
      </Artigo>
    </Cartao>
  );
}

function Artigo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="font-serif text-xl">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-2">{children}</p>
    </section>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="font-serif text-xl">{titulo}</h3>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Linha({ children, onTirar }: { children: ReactNode; onTirar: () => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_auto]">
      <div className="grid gap-2 md:grid-cols-[1fr_auto]">{children}</div>
      <button type="button" className="min-h-11 text-sm text-amber md:self-center" onClick={onTirar}>
        Tirar
      </button>
    </div>
  );
}

function troca(lista: string[], i: number, valor: string) {
  return lista.map((item, n) => (n === i ? valor : item));
}
