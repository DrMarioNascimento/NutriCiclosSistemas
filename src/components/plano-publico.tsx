import { useEffect, useState, type FormEvent } from "react";
import { confirmarPlano, lerPlanoPublico } from "@/lib/clinic/api";
import { fmtData, fmtNum } from "@/lib/clinic/calc";
import type { CapaPlano, PlanoAberto } from "@/lib/clinic/types";
import { Timbre } from "./folha-papel";
import { Button, Campo, Erro, Input } from "./ui";

export function PlanoPublico({ token }: { token: string }) {
  const [capa, setCapa] = useState<CapaPlano | null | undefined>(undefined);
  const [plano, setPlano] = useState<PlanoAberto | null>(null);
  const [nascimento, setNascimento] = useState("");
  const [cpf3, setCpf3] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    lerPlanoPublico({ data: { token } })
      .then(setCapa)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível abrir o plano."));
  }, [token]);

  async function confirmar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    try {
      const res = await confirmarPlano({ data: { token, nascimento, cpf3, senha } });
      if (res === "data") setErro("A data de nascimento não confere.");
      else if (res === "cpf") setErro("Os 3 últimos dígitos do CPF não conferem.");
      else if (res === "senha") setErro("A senha da consulta não confere.");
      else if (res === "limite") setErro("Muitas tentativas. Espere 15 minutos e tente de novo.");
      else if (!res) setErro("Este link não está mais válido.");
      else setPlano(res);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível confirmar.");
    } finally {
      setOcupado(false);
    }
  }

  if (erro && capa === undefined) return <div className="mx-auto max-w-xl px-5 py-10"><Erro>{erro}</Erro></div>;
  if (capa === undefined) return <div className="mx-auto mt-10 h-40 max-w-xl animate-pulse rounded-2xl bg-sand" />;
  if (!capa) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <h1 className="font-serif text-3xl">Link encerrado</h1>
        <p className="mt-2 text-ink-2">Peça um novo endereço à nutricionista.</p>
      </div>
    );
  }
  if (!plano) {
    return (
      <div className="mx-auto max-w-xl px-5 py-16">
        <p className="text-sm text-copper-deep">{capa.nomeClinica}</p>
        <h1 className="mt-1 font-serif text-3xl">Confirme para abrir o plano</h1>
        <p className="mt-2 text-sm text-ink-2">O endereço sozinho não mostra a alimentação. Confirme os dados do cadastro e a senha passada na consulta.</p>
        {!capa.temNascimento ? (
          <p className="mt-4 text-sm text-ink-2">A data de nascimento ainda não está no cadastro. Peça à nutricionista para completar antes de abrir.</p>
        ) : !capa.temSenha ? (
          <p className="mt-4 text-sm text-ink-2">A senha desta consulta ainda não foi gerada. Peça à nutricionista.</p>
        ) : (
          <form className="mt-6 grid max-w-sm gap-3" onSubmit={confirmar}>
            <Campo label="Data de nascimento">
              <Input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} required />
            </Campo>
            {capa.pedeCpf ? (
              <Campo label="3 últimos dígitos do CPF">
                <Input value={cpf3} onChange={(e) => setCpf3(e.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" maxLength={3} required />
              </Campo>
            ) : null}
            <Campo label="Senha da consulta">
              <Input value={senha} onChange={(e) => setSenha(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="off" required />
            </Campo>
            <Erro>{erro}</Erro>
            <Button type="submit" disabled={ocupado}>
              Abrir plano
            </Button>
          </form>
        )}
      </div>
    );
  }

  const cardapio = plano.cardapio;
  const dieta = plano.dieta;
  const trocas = (dieta?.refeicoes ?? []).filter((r) => r.substituicoes.trim());
  const clinica = {
    nome: plano.clinica.nome,
    slogan: plano.clinica.slogan,
    nutricionista: plano.clinica.nutricionista,
    crn: plano.clinica.crn,
    contato: plano.clinica.contato,
    cidade: plano.clinica.cidade,
    endereco: "",
    documentoEmissor: "",
    logo: plano.clinica.logo,
    protGKg: 0,
    gordGKg: 0,
    deficitKcal: 0,
    superavitKcal: 0,
    diasReavaliacao: 0,
    adicionalGestanteT1: 0,
    adicionalGestanteT2: 0,
    adicionalGestanteT3: 0,
    adicionalLactante: 0,
    variacaoBia: 0,
    variacaoAgua: 0,
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <div className="no-print mb-6">
        <Button type="button" variant="sand" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
      <Timbre clinica={clinica} />
      <h1 className="mt-8 font-serif text-3xl">{plano.pacienteNome}</h1>
      {cardapio ? (
        <>
          <p className="mt-1 text-sm text-ink-2">
            {cardapio.titulo} · {fmtData(cardapio.data)}
            {cardapio.retornoEm ? ` · retorno ${fmtData(cardapio.retornoEm)}` : ""}
          </p>
          <p className="mt-4 text-sm tabular-nums">
            Meta {fmtNum(cardapio.kcalMeta, 0)} kcal · proteína {fmtNum(cardapio.protMeta, 0)} g · carboidrato {fmtNum(cardapio.carbMeta, 0)} g · gordura {fmtNum(cardapio.lipMeta, 0)} g
          </p>
          {cardapio.refeicoes.map((ref) => (
            <section key={ref.id} className="mt-6">
              <h2 className="font-serif text-xl">
                {ref.hora ? `${ref.hora} · ` : ""}
                {ref.nome}
              </h2>
              <ul className="mt-2 flex flex-col gap-1">
                {ref.itens.map((item) => (
                  <li key={item.id} className="text-sm">
                    {fmtNum(item.qtd, item.qtd % 1 === 0 ? 0 : 1)} {item.medida.toLowerCase()} de {item.alimentoNome}
                  </li>
                ))}
              </ul>
              {ref.orientacao ? <p className="mt-1 text-sm text-ink-2">{ref.orientacao}</p> : null}
            </section>
          ))}
          {cardapio.hidratacao ? <p className="mt-6 text-sm">Hidratação: {cardapio.hidratacao}</p> : null}
        </>
      ) : (
        <p className="mt-4 text-sm text-ink-2">O cardápio ainda não foi liberado.</p>
      )}
      {trocas.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-xl">Substituições</h2>
          {dieta?.indicacao ? <p className="mt-1 text-sm text-ink-2">{dieta.indicacao}</p> : null}
          <ul className="mt-3 flex flex-col gap-3">
            {trocas.map((r) => (
              <li key={`${r.nome}-${r.hora}`}>
                <p className="text-sm font-medium">{r.hora ? `${r.hora} · ` : ""}{r.nome}</p>
                <p className="text-sm text-ink-2">{r.substituicoes}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {dieta?.observacoes ? <p className="mt-6 text-sm text-ink-2">{dieta.observacoes}</p> : null}
      <p className="mt-10 text-xs text-muted">
        Orientação de {plano.clinica.nutricionista}
        {plano.clinica.crn ? `, ${plano.clinica.crn}` : ""}. Não substitui o acompanhamento.
        {plano.clinica.contato ? ` ${plano.clinica.contato}` : ""}
      </p>
    </div>
  );
}
