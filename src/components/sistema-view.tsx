import { useEffect, useState } from "react";
import { excluirDieta, excluirModeloCardapio, getSistema, salvarClinica, salvarModelo, salvarReferencias } from "@/lib/clinic/api";
import type { ModeloSalvo, ReferenciaExame, Sistema } from "@/lib/clinic/types";
import { srcLogo, useLogoEnquadrado } from "./folha-papel";
import { FormAlimentos, FormBackup, FormCalendario, FormCatalogo, FormEquipamentos, FormListas, FormParametros, FormProfissionais, Formulas } from "./sistema-paineis";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

function lerLogo(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const max = 320;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * escala));
      canvas.height = Math.max(1, Math.round(img.height * escala));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível ler a imagem."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const png = canvas.toDataURL("image/png");
      resolve(png.length > 350_000 ? canvas.toDataURL("image/jpeg", 0.85) : png);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem inválida."));
    };
    img.src = url;
  });
}

type Secao =
  | "clinica"
  | "parametros"
  | "listas"
  | "profissionais"
  | "modelos"
  | "cardapios"
  | "dietas"
  | "alimentos"
  | "catalogo"
  | "backup"
  | "calendario"
  | "equipamentos"
  | "referencias"
  | "formulas";

const CARDS: Array<[Secao, string, string]> = [
  ["calendario", "Agenda no calendário", "Inserir o link no Google e no Outlook"],
  ["alimentos", "Alimentos próprios", "Alimentos e suplementos da clínica"],
  ["backup", "Backup", "Exportar ou importar a clínica inteira"],
  ["catalogo", "Base de alimentos", "Carregar TACO, IBGE ou outra tabela"],
  ["clinica", "Dados da clínica", "Nome, logo, nutricionista e contato"],
  ["equipamentos", "Equipamentos", "Balanças e aparelhos da avaliação"],
  ["profissionais", "Equipe", "Nutrição, outros profissionais e administrativo"],
  ["formulas", "Fórmulas e referências", "O que o app calcula e a fonte"],
  ["listas", "Listas de opções", "Objetivos, atividade, refeições e alergias"],
  ["cardapios", "Modelos de cardápio", "Planos prontos, por tema"],
  ["dietas", "Modelos de dieta", "Metas e substituições, por indicação"],
  ["modelos", "Modelos de documentos", "TCLE, declaração, atestado, orientações"],
  ["parametros", "Parâmetros de cálculo", "Proteína, déficit, gestação e reavaliação"],
  ["referencias", "Referências de exames", "Unidade e faixa de cada exame"],
];

export function SistemaView() {
  const [sistema, setSistema] = useState<Sistema | null>(null);
  const [secao, setSecao] = useState<Secao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setSistema(await getSistema());
  }

  useEffect(() => {
    carregar().catch((e) => setErro(e instanceof Error ? e.message : "Não foi possível abrir o sistema."));
  }, []);

  if (erro && !sistema) return <Erro>{erro}</Erro>;
  if (!sistema) return <div className="h-40 animate-pulse rounded-2xl bg-sand" />;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl">Sistema</h1>
      <p className="mt-2 text-sm text-ink-2">Configuração da clínica. O que já foi emitido no prontuário não muda.</p>
      {secao ? (
        <button type="button" className="mt-4 min-h-11 text-sm text-copper-deep" onClick={() => setSecao(null)}>
          ← Sistema
        </button>
      ) : (
        <>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {CARDS.map(([chave, titulo, texto]) => (
              <button
                key={chave}
                type="button"
                onClick={() => setSecao(chave)}
                className="min-h-20 rounded-2xl border border-line bg-cream px-4 py-3 text-left hover:bg-sand"
              >
                <span className="block font-serif text-lg text-copper-deep">{titulo}</span>
                <span className="mt-1 block text-sm text-ink-2">{texto}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-6">
        {secao === "clinica" ? <FormClinica sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "parametros" ? <FormParametros sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "listas" ? <FormListas sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "profissionais" ? <FormProfissionais sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "modelos" ? <FormModelos modelos={sistema.modelos} onSalvo={carregar} /> : null}
        {secao === "cardapios" ? <ListaCardapios sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "dietas" ? <ListaDietas sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "alimentos" ? <FormAlimentos sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "catalogo" ? <FormCatalogo sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "backup" ? <FormBackup onSalvo={carregar} /> : null}
        {secao === "calendario" ? <FormCalendario /> : null}
        {secao === "equipamentos" ? <FormEquipamentos sistema={sistema} onSalvo={carregar} /> : null}
        {secao === "referencias" ? <FormReferencias itens={sistema.referencias} onSalvo={carregar} /> : null}
        {secao === "formulas" ? <Formulas sistema={sistema} /> : null}
      </div>
      <p className="mt-10 text-center text-sm text-muted">
        Sistema criado por Prof. Mário César Nascimento, PhD ©
        <br />
        NutriCiclos v5.0 · 2026-09-28
      </p>
    </div>
  );
}

function FormClinica({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const c = sistema.clinica;
  const [nome, setNome] = useState(c.nome);
  const [slogan, setSlogan] = useState(c.slogan);
  const [nutricionista, setNutricionista] = useState(c.nutricionista);
  const [crn, setCrn] = useState(c.crn);
  const [contato, setContato] = useState(c.contato);
  const [cidade, setCidade] = useState(c.cidade);
  const [endereco, setEndereco] = useState(c.endereco);
  const [emissor, setEmissor] = useState(c.documentoEmissor);
  const [logo, setLogo] = useState(c.logo);
  const previa = useLogoEnquadrado(srcLogo(logo));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function gravar() {
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarClinica({
        data: { nome, slogan, nutricionista, crn, contato, cidade, endereco, documentoEmissor: emissor, logo },
      });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Dados da clínica</h2>
      <p className="mt-1 text-sm text-ink-2">Saem no timbre do cardápio, da requisição e dos documentos. O logo também entra na moeda do sistema.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="selo grid size-28 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fffdfb]">
          <img src={previa} alt="" className="size-[88%] object-contain object-center" />
        </span>
        <div>
          <Campo label="Logo">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                e.target.value = "";
                if (!arquivo) return;
                void lerLogo(arquivo)
                  .then(setLogo)
                  .catch((err: unknown) => setErro(err instanceof Error ? err.message : "Não foi possível ler o logo."));
              }}
            />
          </Campo>
          {logo ? (
            <button type="button" className="mt-2 min-h-11 text-sm text-copper-deep" onClick={() => setLogo("")}>
              Voltar ao emblema NutriCiclos
            </button>
          ) : (
            <p className="mt-2 text-sm text-muted">Emblema NutriCiclos. Envie outro para trocar.</p>
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Campo label="Nome da clínica">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </Campo>
        <Campo label="Frase">
          <Input value={slogan} onChange={(e) => setSlogan(e.target.value)} />
        </Campo>
        <Campo label="Nutricionista">
          <Input value={nutricionista} onChange={(e) => setNutricionista(e.target.value)} />
        </Campo>
        <Campo label="CRN">
          <Input value={crn} onChange={(e) => setCrn(e.target.value)} />
        </Campo>
        <Campo label="Contato">
          <Input value={contato} onChange={(e) => setContato(e.target.value)} />
        </Campo>
        <Campo label="Cidade">
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
        </Campo>
        <Campo label="Endereço">
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </Campo>
        <Campo label="CPF ou CNPJ do recibo">
          <Input value={emissor} onChange={(e) => setEmissor(e.target.value)} />
        </Campo>
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado.</p> : null}
      </div>
      <div className="mt-4">
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar clínica
        </Button>
      </div>
    </Cartao>
  );
}

function FormReferencias({ itens, onSalvo }: { itens: ReferenciaExame[]; onSalvo: () => Promise<void> }) {
  const [linhas, setLinhas] = useState(itens.map((i) => ({ nome: i.nome, unidade: i.unidade, referencia: i.referencia })));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  function patch(i: number, campo: "nome" | "unidade" | "referencia", valor: string) {
    setLinhas((lista) => lista.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)));
  }

  async function gravar() {
    const validas = linhas.filter((l) => l.nome.trim());
    if (validas.length === 0) {
      setErro("Deixe ao menos um exame.");
      return;
    }
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarReferencias({ data: { itens: validas } });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar as referências.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Referências de exames</h2>
      <p className="mt-1 text-sm text-ink-2">
        Faixa no formato 70-99, 0,4-4,5, menor que 3 ou maior que 40. Entra na requisição e na situação do resultado novo. O resultado já gravado guarda a faixa da época.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {linhas.map((linha, i) => (
          <div key={i} className="grid gap-2 border-t border-line pt-3 md:grid-cols-[1fr_7rem_8rem_auto]">
            <Campo label="Exame">
              <Input value={linha.nome} onChange={(e) => patch(i, "nome", e.target.value)} />
            </Campo>
            <Campo label="Unidade">
              <Input value={linha.unidade} onChange={(e) => patch(i, "unidade", e.target.value)} />
            </Campo>
            <Campo label="Referência">
              <Input value={linha.referencia} onChange={(e) => patch(i, "referencia", e.target.value)} placeholder="70-99" />
            </Campo>
            <button
              type="button"
              className="min-h-11 self-end text-sm text-amber"
              onClick={() => setLinhas((lista) => lista.filter((_, idx) => idx !== i))}
            >
              Tirar
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado.</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="sand" onClick={() => setLinhas((lista) => [...lista, { nome: "", unidade: "", referencia: "" }])}>
          Outro exame
        </Button>
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar referências
        </Button>
      </div>
    </Cartao>
  );
}

function FormModelos({ modelos, onSalvo }: { modelos: ModeloSalvo[]; onSalvo: () => Promise<void> }) {
  const [id, setId] = useState(modelos[0]?.id ?? 0);
  const atual = modelos.find((m) => m.id === id) ?? modelos[0];
  const [titulo, setTitulo] = useState(atual?.titulo ?? "");
  const [texto, setTexto] = useState(atual?.texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  function abrir(proximo: number) {
    const modelo = modelos.find((m) => m.id === proximo);
    setId(proximo);
    setTitulo(modelo?.titulo ?? "");
    setTexto(modelo?.texto ?? "");
    setOk(false);
    setErro(null);
  }

  async function gravar() {
    if (!atual) return;
    setOcupado(true);
    setErro(null);
    setOk(false);
    try {
      await salvarModelo({ data: { id: atual.id, titulo, texto } });
      await onSalvo();
      setOk(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar o modelo.");
    } finally {
      setOcupado(false);
    }
  }

  if (!atual) {
    return (
      <Cartao>
        <p className="text-sm text-ink-2">Nenhum modelo.</p>
      </Cartao>
    );
  }

  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Modelos de documento</h2>
      <p className="mt-1 text-sm text-ink-2">
        Campos entre chaves são preenchidos no prontuário: {"{{nome}}"}, {"{{cpf}}"}, {"{{crn}}"}, {"{{data}}"}, {"{{texto_livre}}"}.
      </p>
      <div className="mt-4">
        <Campo label="Modelo">
          <Select value={String(atual.id)} onChange={(e) => abrir(Number(e.target.value))}>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.titulo}
              </option>
            ))}
          </Select>
        </Campo>
      </div>
      <div className="mt-3">
        <Campo label="Título">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
      </div>
      <div className="mt-3">
        <Campo label="Texto">
          <Textarea rows={14} value={texto} onChange={(e) => setTexto(e.target.value)} />
        </Campo>
      </div>
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {ok ? <p className="text-sm text-ink-2">Gravado. O próximo documento usa este texto.</p> : null}
      </div>
      <div className="mt-4">
        <Button type="button" disabled={ocupado} onClick={gravar}>
          Gravar modelo
        </Button>
      </div>
    </Cartao>
  );
}

function ListaCardapios({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Modelos de cardápio</h2>
      <p className="mt-1 text-sm text-ink-2">
        Monte uma vez no cardápio do paciente e guarde com o nome do grupo, por exemplo Pacientes hipertensos. No próximo, a origem “Modelo de cardápio” copia as refeições e os alimentos.
      </p>
      {sistema.modelosCardapio.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum modelo ainda.</p>
      ) : (
        <ul className="mt-4">
          {sistema.modelosCardapio.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm">
              <span>
                <span className="text-ink">{m.titulo}</span>
                {m.tema ? <span className="block text-muted">{m.tema}</span> : null}
                <span className="block text-muted">{m.refeicoes.reduce((n, r) => n + r.itens.length, 0)} alimentos</span>
              </span>
              <button
                type="button"
                className="min-h-11 text-amber"
                onClick={async () => {
                  setErro(null);
                  try {
                    await excluirModeloCardapio({ data: { id: m.id } });
                    await onSalvo();
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : "Não foi possível tirar o modelo.");
                  }
                }}
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Erro>{erro}</Erro>
      </div>
    </Cartao>
  );
}

function ListaDietas({ sistema, onSalvo }: { sistema: Sistema; onSalvo: () => Promise<void> }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Cartao>
      <h2 className="font-serif text-2xl">Modelos de dieta</h2>
      <p className="mt-1 text-sm text-ink-2">Metas e substituições reaproveitáveis. O modelo nasce na dieta de um paciente, em “Guardar como modelo”.</p>
      {sistema.modelosDieta.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Nenhum modelo ainda.</p>
      ) : (
        <ul className="mt-4">
          {sistema.modelosDieta.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 border-t border-line py-3 text-sm">
              <span>
                <span className="text-ink">{d.nome}</span>
                {d.indicacao ? <span className="block text-muted">{d.indicacao}</span> : null}
                <span className="block text-muted">
                  {d.kcalMeta} kcal · {d.refeicoes.length} refeições
                </span>
              </span>
              <button
                type="button"
                className="min-h-11 text-amber"
                onClick={async () => {
                  setErro(null);
                  try {
                    await excluirDieta({ data: { id: d.id } });
                    await onSalvo();
                  } catch (e) {
                    setErro(e instanceof Error ? e.message : "Não foi possível tirar o modelo.");
                  }
                }}
              >
                Tirar
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Erro>{erro}</Erro>
      </div>
    </Cartao>
  );
}
