import { useEffect, useState } from "react";
import { desligarEntrega, getEntrega, ligarEntrega } from "@/lib/clinic/api";
import { Button, Cartao, Erro } from "./ui";

function whatsapp(telefone: string, texto: string) {
  const dig = telefone.replace(/\D/g, "");
  const comPais = dig.startsWith("55") ? dig : dig.length >= 10 ? `55${dig}` : "";
  const base = comPais ? `https://wa.me/${comPais}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(texto)}`;
}

export function EntregaPlano({
  pacienteId,
  nome,
  telefone,
  clinica,
  temEmitido,
  temNascimento,
  temCpf,
}: {
  pacienteId: number;
  nome: string;
  telefone: string;
  clinica: string;
  temEmitido: boolean;
  temNascimento: boolean;
  temCpf: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const url = token ? `${window.location.origin}/plano/${token}` : "";

  useEffect(() => {
    getEntrega({ data: { pacienteId } })
      .then((r) => {
        setToken(r.token);
        setSenha(r.senha);
      })
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : "Não foi possível ler o link."));
  }, [pacienteId]);

  async function ligar(trocar: boolean, novaSenha = false) {
    if (trocar && !window.confirm("O link e a senha antigos deixam de abrir o plano. Continuar?")) return;
    if (novaSenha && !window.confirm("A senha antiga deixa de valer. O link continua o mesmo. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const r = await ligarEntrega({ data: { pacienteId, trocar, novaSenha } });
      setToken(r.token);
      setSenha(r.senha);
      if (trocar) setAviso("Link e senha novos. Passe a senha na consulta e envie o link de novo.");
      else if (novaSenha) setAviso("Senha nova. Passe só a senha ao paciente. O link não mudou.");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar o link.");
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    if (!window.confirm("O paciente deixa de abrir este plano pelo link. Continuar?")) return;
    setOcupado(true);
    setErro(null);
    try {
      await desligarEntrega({ data: { pacienteId } });
      setToken("");
      setSenha("");
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

  const primeiro = nome.trim().split(/\s+/)[0] || nome;
  const texto = `Olá, ${primeiro}. Segue o seu plano alimentar${clinica ? `, da ${clinica}` : ""}:\n${url}\n\nO link não abre sozinho. Confirme sua data de nascimento${temCpf ? ", os 3 últimos dígitos do CPF" : ""} e a senha que recebeu na consulta.`;
  const senhaFalada = senha.length === 6 ? `${senha.slice(0, 3)} ${senha.slice(3)}` : senha;

  return (
    <Cartao className="mt-4">
      <h2 className="font-serif text-2xl">Link para o paciente</h2>
      <p className="mt-1 text-sm text-ink-2">
        Quem tem o endereço ainda não vê o plano. Na abertura, confirma a data de nascimento{temCpf ? ", os 3 últimos dígitos do CPF" : ""} e a senha desta consulta. A senha não vai no WhatsApp: passe em voz na consulta. Depois disso aparecem o cardápio emitido, a dieta e o retorno.
      </p>
      {!temNascimento ? <p className="mt-2 text-sm text-amber">Cadastre a data de nascimento antes de criar o link.</p> : null}
      {!temEmitido ? <p className="mt-2 text-sm text-amber">Emita o cardápio antes de enviar. Rascunho não aparece no link.</p> : null}
      {token ? (
        <>
          <p className="mt-3 break-all text-sm text-ink">{url}</p>
          {senhaFalada ? (
            <p className="mt-3 text-sm text-ink">
              Senha da consulta <span className="font-serif text-2xl tracking-widest text-copper-deep">{senhaFalada}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-amber">Este link ainda não tem senha.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" disabled={ocupado} onClick={() => void copiar()}>
              Copiar link
            </Button>
            <Button type="button" variant="sand" disabled={ocupado || !token} onClick={() => void ligar(false, true)}>
              Gerar nova senha
            </Button>
            <a className="inline-flex min-h-11 items-center rounded-lg bg-sand px-4 text-sm text-ink" href={whatsapp(telefone, texto)} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-ink-2" href={url} target="_blank" rel="noreferrer">
              Abrir
            </a>
            <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void ligar(true)}>
              Trocar o link
            </Button>
            <Button type="button" variant="ghost" disabled={ocupado} onClick={() => void desligar()}>
              Desligar
            </Button>
          </div>
        </>
      ) : (
        <div className="mt-3">
          <Button type="button" disabled={ocupado || token === null || !temEmitido || !temNascimento} onClick={() => void ligar(false)}>
            Criar link
          </Button>
        </div>
      )}
      <div className="mt-3">
        <Erro>{erro}</Erro>
        {aviso ? <p className="text-sm text-ink-2">{aviso}</p> : null}
      </div>
    </Cartao>
  );
}
