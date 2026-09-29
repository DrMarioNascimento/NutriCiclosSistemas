import { useState, type FormEvent } from "react";
import { salvarPaciente } from "@/lib/clinic/api";
import { OBJETIVOS } from "@/lib/clinic/calc";
import type { Paciente, Profissional } from "@/lib/clinic/types";
import { Button, Campo, Erro, Input, Select, Textarea } from "./ui";

export function FormPaciente({
  paciente,
  objetivos,
  equipe = [],
  onSalvo,
  onCancelar,
}: {
  paciente?: Paciente;
  objetivos?: string[];
  equipe?: Profissional[];
  onSalvo: (id: number) => void;
  onCancelar?: () => void;
}) {
  const [nome, setNome] = useState(paciente?.nome ?? "");
  const [nasc, setNasc] = useState(paciente?.dataNascimento ?? "");
  const [sexo, setSexo] = useState(paciente?.sexo || "Feminino");
  const [genero, setGenero] = useState(paciente?.genero ?? "");
  const [cpf, setCpf] = useState(paciente?.cpf ?? "");
  const [telefone, setTelefone] = useState(paciente?.telefone ?? "");
  const [email, setEmail] = useState(paciente?.email ?? "");
  const [endereco, setEndereco] = useState(paciente?.endereco ?? "");
  const [altura, setAltura] = useState(paciente?.alturaCm ? String(paciente.alturaCm) : "");
  const opcoes = objetivos?.length ? objetivos : [...OBJETIVOS];
  const [objetivo, setObjetivo] = useState(paciente?.objetivo || opcoes[0]);
  const [patologias, setPatologias] = useState(paciente?.patologias ?? "");
  const [alergias, setAlergias] = useState(paciente?.alergias ?? "");
  const [medicamentos, setMedicamentos] = useState(paciente?.medicamentos ?? "");
  const [antecedentes, setAntecedentes] = useState(paciente?.antecedentes ?? "");
  const [observacoes, setObservacoes] = useState(paciente?.observacoes ?? "");
  const [status, setStatus] = useState(paciente?.status || "Ativo");
  const [tipo, setTipo] = useState(paciente?.tipoAtendimento || "Presencial");
  const [profissionalId, setProfissionalId] = useState(paciente?.profissionalId ? String(paciente.profissionalId) : "");
  const [administrativoId, setAdministrativoId] = useState(paciente?.administrativoId ? String(paciente.administrativoId) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const alturaCm = altura.trim() ? Number(altura.replace(",", ".")) : null;
    if (altura.trim() && (!alturaCm || alturaCm <= 0)) {
      setErro("Altura inválida.");
      return;
    }
    setOcupado(true);
    setErro(null);
    try {
      const res = await salvarPaciente({
        data: {
          id: paciente?.id,
          nome,
          dataNascimento: nasc,
          sexo: sexo === "Masculino" ? "Masculino" : "Feminino",
          genero,
          cpf,
          telefone,
          email,
          endereco,
          alturaCm,
          objetivo,
          patologias,
          alergias,
          medicamentos,
          antecedentes,
          observacoes,
          status: status === "Inativo" || status === "Alta" ? status : "Ativo",
          tipoAtendimento: tipo === "Telenutrição" ? "Telenutrição" : "Presencial",
          profissionalId: profissionalId ? Number(profissionalId) : null,
          administrativoId: administrativoId ? Number(administrativoId) : null,
        },
      });
      onSalvo(res.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível guardar o cadastro.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={enviar}>
      <div className="md:col-span-2">
        <Campo label="Nome completo">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </Campo>
      </div>
      <Campo label="Data de nascimento">
        <Input type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} required />
      </Campo>
      <Campo label="Sexo biológico">
        <Select value={sexo} onChange={(e) => setSexo(e.target.value)}>
          <option>Feminino</option>
          <option>Masculino</option>
        </Select>
      </Campo>
      <Campo label="Gênero">
        <Input value={genero} onChange={(e) => setGenero(e.target.value)} />
      </Campo>
      <Campo label="CPF">
        <Input value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" />
      </Campo>
      <Campo label="Telefone">
        <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
      </Campo>
      <Campo label="E-mail">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      <Campo label="Altura (cm)">
        <Input value={altura} onChange={(e) => setAltura(e.target.value)} inputMode="decimal" />
      </Campo>
      <Campo label="Objetivo">
        <Select value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
          {(paciente?.objetivo && !opcoes.includes(paciente.objetivo) ? [paciente.objetivo, ...opcoes] : opcoes).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </Select>
      </Campo>
      <Campo label="Atendimento">
        <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option>Presencial</option>
          <option>Telenutrição</option>
        </Select>
      </Campo>
      <Campo label="Situação">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>Ativo</option>
          <option>Inativo</option>
          <option>Alta</option>
        </Select>
      </Campo>
      <Campo label="Profissional que acompanha">
        <Select value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)}>
          <option value="">Não definido</option>
          {equipe
            .filter((p) => p.funcao !== "administrativo")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {p.cargo ? ` · ${p.cargo}` : p.funcao === "nutricionista" ? " · nutrição" : ""}
              </option>
            ))}
        </Select>
      </Campo>
      <Campo label="Administrativo">
        <Select value={administrativoId} onChange={(e) => setAdministrativoId(e.target.value)}>
          <option value="">Não definido</option>
          {equipe
            .filter((p) => p.funcao === "administrativo")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
                {p.cargo ? ` · ${p.cargo}` : ""}
              </option>
            ))}
        </Select>
      </Campo>
      <div className="md:col-span-2">
        <Campo label="Endereço">
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
        </Campo>
      </div>
      <Campo label="Alergias e intolerâncias">
        <Input value={alergias} onChange={(e) => setAlergias(e.target.value)} placeholder="Lactose, glúten…" />
      </Campo>
      <Campo label="Patologias">
        <Input value={patologias} onChange={(e) => setPatologias(e.target.value)} />
      </Campo>
      <Campo label="Medicamentos">
        <Input value={medicamentos} onChange={(e) => setMedicamentos(e.target.value)} />
      </Campo>
      <Campo label="Antecedentes familiares">
        <Input value={antecedentes} onChange={(e) => setAntecedentes(e.target.value)} />
      </Campo>
      <div className="md:col-span-2">
        <Campo label="Observações">
          <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </Campo>
      </div>
      <div className="md:col-span-2">
        <Erro>{erro}</Erro>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" disabled={ocupado}>
          {paciente ? "Guardar cadastro" : "Criar paciente"}
        </Button>
        {onCancelar ? (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted md:col-span-2">Nada é apagado. Para encerrar, marque Inativo.</p>
    </form>
  );
}
