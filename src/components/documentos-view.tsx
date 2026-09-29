import { useMemo, useState } from "react";
import { preencherModelo, type CampoModelo } from "@/lib/clinic/catalogo";
import { emitirDocumento, excluirDocumento, salvarDocumento } from "@/lib/clinic/api";
import { fmtCpf, fmtData, fmtNum } from "@/lib/clinic/calc";
import type { Documento, Prontuario } from "@/lib/clinic/types";
import { FolhaPapel } from "./folha-papel";
import { Button, Campo, Cartao, Erro, Input, Select, Textarea } from "./ui";

const ROTULOS: Record<CampoModelo, string> = {
  horaInicio: "Horário de início",
  horaFim: "Horário de término",
  destinatario: "Destinatário",
  valor: "Valor em R$",
  referente: "Referente a",
  motivo: "Motivo",
  textoLivre: "Texto complementar",
};

function varsDe(
  prontuario: Prontuario,
  campos: { horaInicio: string; horaFim: string; destinatario: string; valor: string; referente: string; motivo: string; textoLivre: string; data: string },
): Record<string, string> {
  const p = prontuario.paciente;
  const c = prontuario.clinica;
  const aval = prontuario.avaliacoes[0];
  const antiga = prontuario.avaliacoes[prontuario.avaliacoes.length - 1];
  const plano = prontuario.prescricoes[0];
  return {
    nome: p.nome,
    cpf: p.cpf ? fmtCpf(p.cpf) : "",
    nascimento: fmtData(p.dataNascimento),
    nutricionista: c.nutricionista,
    crn: c.crn,
    clinica: c.nome,
    cidade: c.cidade,
    data: fmtData(campos.data),
    hora_inicio: campos.horaInicio,
    hora_fim: campos.horaFim,
    destinatario: campos.destinatario,
    valor: campos.valor,
    referente: campos.referente,
    motivo: campos.motivo,
    texto_livre: campos.textoLivre,
    documento_emissor: c.documentoEmissor,
    primeira_consulta: antiga ? fmtData(antiga.data) : "",
    diagnostico: aval?.diagnostico ?? "",
    resumo_avaliacao: aval ? `${fmtData(aval.data)} · ${fmtNum(aval.peso, 1)} kg · IMC ${fmtNum(aval.imc, 1)}` : "",
    prescricao_vigente: plano ? `${plano.titulo} (${plano.situacao})` : "sem cardápio",
  };
}

export function DocumentosPainel({
  prontuario,
  onMudou,
}: {
  prontuario: Prontuario;
  onMudou: () => Promise<void>;
}) {
  const lista = prontuario.documentos;
  const [sel, setSel] = useState<number | "novo">(lista[0]?.id ?? "novo");
  const atual = sel === "novo" ? null : lista.find((d) => d.id === sel) ?? null;

  return (
    <div>
      <div className="no-print flex flex-wrap gap-2">
        {lista.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setSel(d.id)}
            className={
              atual?.id === d.id
                ? "min-h-11 rounded-full bg-ink px-4 text-sm text-paper"
                : "min-h-11 rounded-full bg-sand px-4 text-sm text-ink"
            }
          >
            {fmtData(d.data)} · {d.situacao}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSel("novo")}
          className={
            sel === "novo"
              ? "min-h-11 rounded-full bg-copper px-4 text-sm text-paper"
              : "min-h-11 rounded-full bg-copper-soft px-4 text-sm text-copper-deep"
          }
        >
          Novo
        </button>
      </div>
      <FormDocumento
        key={atual ? atual.id : "novo"}
        prontuario={prontuario}
        registro={sel === "novo" ? null : atual}
        onSalvo={async (id) => {
          await onMudou();
          setSel(id);
        }}
        onMudou={onMudou}
      />
    </div>
  );
}

function FormDocumento({
  prontuario,
  registro,
  onSalvo,
  onMudou,
}: {
  prontuario: Prontuario;
  registro: Documento | null;
  onSalvo: (id: number) => Promise<void>;
  onMudou: () => Promise<void>;
}) {
  const modelos = prontuario.modelos;
  const emitido = registro?.situacao === "Emitido";
  const [chave, setChave] = useState(
    registro?.tipo && registro.tipo !== "requisicao" ? registro.tipo : modelos[0]?.chave ?? "",
  );
  const modelo = modelos.find((m) => m.chave === chave) ?? modelos[0];
  const [data, setData] = useState(registro?.data ?? prontuario.hoje);
  const [horaInicio, setHoraInicio] = useState(registro?.horaInicio ?? "");
  const [horaFim, setHoraFim] = useState(registro?.horaFim ?? "");
  const [destinatario, setDestinatario] = useState(registro?.destinatario ?? "");
  const [valor, setValor] = useState(registro?.valor ?? "");
  const [referente, setReferente] = useState(registro?.referente ?? "");
  const [motivo, setMotivo] = useState(registro?.motivo ?? "");
  const [textoLivre, setTextoLivre] = useState(registro?.textoLivre ?? "");
  const [texto, setTexto] = useState(
    registro?.texto ??
      (modelos[0]
        ? preencherModelo(
            modelos[0].texto,
            varsDe(prontuario, {
              horaInicio: "",
              horaFim: "",
              destinatario: "",
              valor: "",
              referente: "",
              motivo: "",
              textoLivre: "",
              data: prontuario.hoje,
            }),
          )
        : ""),
  );
  const [tocado, setTocado] = useState(Boolean(registro?.texto));
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [ver, setVer] = useState(false);
  const requisicao = registro?.tipo === "requisicao";

  const campos = useMemo(
    () => ({ horaInicio, horaFim, destinatario, valor, referente, motivo, textoLivre, data }),
    [horaInicio, horaFim, destinatario, valor, referente, motivo, textoLivre, data],
  );

  function montar(proxima = chave) {
    const mod = modelos.find((m) => m.chave === proxima) ?? modelos[0];
    if (!mod) return;
    setTexto(preencherModelo(mod.texto, varsDe(prontuario, campos)));
    setTocado(false);
  }

  function definirCampo(campo: CampoModelo, valorCampo: string) {
    if (campo === "horaInicio") setHoraInicio(valorCampo);
    if (campo === "horaFim") setHoraFim(valorCampo);
    if (campo === "destinatario") setDestinatario(valorCampo);
    if (campo === "valor") setValor(valorCampo);
    if (campo === "referente") setReferente(valorCampo);
    if (campo === "motivo") setMotivo(valorCampo);
    if (campo === "textoLivre") setTextoLivre(valorCampo);
  }

  function lerCampo(campo: CampoModelo): string {
    if (campo === "horaInicio") return horaInicio;
    if (campo === "horaFim") return horaFim;
    if (campo === "destinatario") return destinatario;
    if (campo === "valor") return valor;
    if (campo === "referente") return referente;
    if (campo === "motivo") return motivo;
    return textoLivre;
  }

  async function gravar() {
    const corpo = texto.trim();
    if (!corpo) {
      setErro("Monte ou escreva o texto antes de gravar.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      const res = await salvarDocumento({
        data: {
          id: registro && !requisicao ? registro.id : undefined,
          pacienteId: prontuario.paciente.id,
          tipo: registro?.tipo === "requisicao" ? "requisicao" : modelo?.chave ?? "documento",
          titulo: registro?.tipo === "requisicao" ? registro.titulo : modelo?.titulo ?? "Documento",
          data,
          horaInicio,
          horaFim,
          destinatario,
          valor,
          referente,
          motivo,
          textoLivre,
          texto: corpo,
        },
      });
      await onSalvo(res.id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gravar.");
    } finally {
      setOcupado(false);
    }
  }

  async function emitir() {
    if (!registro) {
      setErro("Grave o rascunho antes de emitir.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      if (!requisicao && !emitido && modelo) {
        await salvarDocumento({
          data: {
            id: registro.id,
            pacienteId: prontuario.paciente.id,
            tipo: modelo.chave,
            titulo: modelo.titulo,
            data,
            horaInicio,
            horaFim,
            destinatario,
            valor,
            referente,
            motivo,
            textoLivre,
            texto: texto.trim(),
          },
        });
      }
      await emitirDocumento({ data: { id: registro.id } });
      await onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível emitir.");
    } finally {
      setOcupado(false);
    }
  }

  const titulo = registro?.tipo === "requisicao" ? registro.titulo : modelo?.titulo ?? "Documento";

  if (!modelo && !requisicao) {
    return (
      <Cartao className="mt-4">
        <p className="text-sm text-ink-2">Nenhum modelo. Cadastre o texto em Sistema.</p>
      </Cartao>
    );
  }

  return (
    <>
      <Cartao className="mt-4">
        <h2 className="font-serif text-2xl">{registro ? titulo : "Novo documento"}</h2>
        <p className="mt-1 text-sm text-ink-2">
          {requisicao
            ? "Requisição já emitida. O texto não volta a rascunho."
            : "O texto nasce do modelo em Sistema. Ajuste antes de emitir. Emitido, fica como saiu."}
        </p>
        {requisicao ? null : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Campo label="Tipo">
              <Select
                value={modelo?.chave ?? ""}
                disabled={emitido}
                onChange={(e) => {
                  const proxima = e.target.value;
                  setChave(proxima);
                  if (!tocado) {
                    const mod = modelos.find((m) => m.chave === proxima) ?? modelos[0];
                    if (mod) setTexto(preencherModelo(mod.texto, varsDe(prontuario, campos)));
                  }
                }}
              >
                {modelos.map((m) => (
                  <option key={m.chave} value={m.chave}>
                    {m.titulo}
                  </option>
                ))}
              </Select>
            </Campo>
            <Campo label="Data">
              <Input type="date" value={data} disabled={emitido} onChange={(e) => setData(e.target.value)} />
            </Campo>
            {modelo?.campos.map((campo) => (
              <Campo key={campo} label={ROTULOS[campo]}>
                {campo === "textoLivre" || campo === "motivo" ? (
                  <Textarea value={lerCampo(campo)} disabled={emitido} onChange={(e) => definirCampo(campo, e.target.value)} />
                ) : (
                  <Input value={lerCampo(campo)} disabled={emitido} onChange={(e) => definirCampo(campo, e.target.value)} />
                )}
              </Campo>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Campo label="Texto">
            <Textarea
              rows={12}
              value={texto}
              disabled={emitido || requisicao}
              onChange={(e) => {
                setTexto(e.target.value);
                setTocado(true);
              }}
            />
          </Campo>
        </div>
        <p className="mt-2 text-sm text-muted">{registro ? registro.situacao : "Ainda não gravado"}</p>
        <div className="mt-3">
          <Erro>{erro}</Erro>
        </div>
        <div className="no-print mt-4 flex flex-wrap gap-2">
          {!emitido && !requisicao ? (
            <Button type="button" variant="sand" disabled={ocupado} onClick={() => montar()}>
              Montar texto
            </Button>
          ) : null}
          {!emitido && !requisicao ? (
            <Button type="button" disabled={ocupado} onClick={gravar}>
              Gravar rascunho
            </Button>
          ) : null}
          {registro && !emitido ? (
            <Button type="button" disabled={ocupado} onClick={emitir}>
              Emitir
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => (texto.trim() ? setVer(true) : setErro("Não há texto para visualizar."))}>
            Visualizar
          </Button>
          {registro && !emitido ? (
            <Button
              type="button"
              variant="ghost"
              disabled={ocupado}
              onClick={async () => {
                if (!window.confirm("Apagar este rascunho?")) return;
                await excluirDocumento({ data: { id: registro.id } });
                await onMudou();
              }}
            >
              Apagar
            </Button>
          ) : null}
        </div>
      </Cartao>
      {ver ? (
        <FolhaPapel
          clinica={prontuario.clinica}
          titulo={titulo}
          subtitulo={`${prontuario.paciente.nome}${prontuario.paciente.cpf ? ` · CPF ${fmtCpf(prontuario.paciente.cpf)}` : ""} · ${fmtData(data)}`}
          onFechar={() => setVer(false)}
        >
          {texto.split("\n").map((linha, i) => (
            <p key={i} className={linha.trim() ? "mt-3 text-sm text-ink" : "mt-3"}>
              {linha || "\u00a0"}
            </p>
          ))}
          {!emitido ? <p className="mt-6 text-sm text-muted">Rascunho. Ainda não emitido.</p> : null}
        </FolhaPapel>
      ) : null}
    </>
  );
}
