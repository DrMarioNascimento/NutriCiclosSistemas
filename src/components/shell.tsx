import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { exportarBackup, getMarca } from "@/lib/clinic/api";
import { estadoNuvem, gravarNaNuvem, jaEnviadoHoje } from "@/lib/clinic/nuvem-backup";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { srcLogo, useLogoEnquadrado } from "./folha-papel";
import { cx } from "./ui";

const links = [
  { to: "/", label: "Início", icon: "/nav-icons/Home.png" },
  { to: "/agenda", label: "Agenda", icon: "/nav-icons/Agenda.png" },
  { to: "/pacientes", label: "Pacientes", icon: "/nav-icons/Pacientes.png" },
  { to: "/sistema", label: "Sistema", icon: "/nav-icons/Configura.png" },
] as const;

function Marca({ nome = "NutriCiclos", linha = "Clínica de nutrição", logo = "", inicio = false }: { nome?: string; linha?: string; logo?: string; inicio?: boolean }) {
  const src = useLogoEnquadrado(srcLogo(logo));
  const corpo = (
    <span className="flex w-full flex-col px-1 pt-1 pb-2">
      <span className="flex items-center gap-3">
        <span className="selo grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fffdfb]">
          <img src={src} alt="" className="size-[88%] object-contain object-center" />
        </span>
        <span className="font-serif text-lg leading-none text-ink">{nome}</span>
      </span>
      <span className="mt-4 block w-full text-center text-[11.5px] leading-none tracking-wide text-muted">{linha}</span>
    </span>
  );
  if (!inicio) return corpo;
  return (
    <Link to="/" aria-label="Ir para a primeira página" className="flex w-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-copper">
      {corpo}
    </Link>
  );
}

export function Entrada() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6 py-16">
      <div className="painel w-full max-w-md">
        <Marca />
        <h1 className="mt-8 font-serif text-4xl text-ink">O consultório, sem a planilha.</h1>
        <p className="mt-3 text-ink-2">
          Prontuário, avaliação, cardápio e a agenda da nutricionista. Os dados ficam na conta de quem entra.
        </p>
        <div className="mt-8 flex flex-col gap-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              className="min-h-11 rounded-lg border border-line bg-cream px-4 text-sm font-semibold text-ink hover:bg-sand"
            >
              Continuar com {p.label}
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">Osana Melo · CRN-10 6463 · Florianópolis</p>
      </div>
    </main>
  );
}

function ItemNav({
  to,
  label,
  icon,
  ativo,
}: {
  to: "/" | "/agenda" | "/pacientes" | "/sistema";
  label: string;
  icon: string;
  ativo: boolean;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      aria-current={ativo ? "page" : undefined}
      className={cx(
        "nav-item flex min-h-[4.5rem] w-full items-center justify-center rounded-lg px-2",
        ativo ? "bg-copper-soft text-copper-deep" : "text-ink-2 hover:bg-sand",
      )}
    >
      <img className="nav-icone" src={icon} alt="" decoding="async" />
    </Link>
  );
}

function Abrindo() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-6">
      <div>
        <Marca />
        <p className="mt-6 text-sm text-muted">Abrindo o consultório…</p>
      </div>
    </main>
  );
}

function BackupDoDia() {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current || jaEnviadoHoje()) return;
    feito.current = true;
    void (async () => {
      const estado = await estadoNuvem();
      if (!estado.pode) return;
      const dados = await exportarBackup();
      await gravarNaNuvem(JSON.stringify(dados), false);
    })().catch(() => undefined);
  }, []);
  return null;
}

export function Shell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const ativo = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const [marca, setMarca] = useState<{ nome: string; slogan: string; logo: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    getMarca()
      .then((d) => {
        if (vivo) setMarca(d);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, [user, path]);

  if (isPending) return <Abrindo />;
  if (!user) return <Entrada />;

  return (
      <div className="consultorio min-h-screen text-ink md:grid md:grid-cols-[19rem_1fr]">
        <aside className="coluna no-print hidden border-r border-line md:flex md:flex-col md:px-5 md:py-6">
          <Marca nome={marca?.nome} linha={marca?.slogan || "Clínica de nutrição"} logo={marca?.logo} inicio />
          <nav className="mt-8 flex flex-col gap-1">
            {links.map((l) => (
              <ItemNav key={l.to} {...l} ativo={ativo(l.to)} />
            ))}
          </nav>
          <div className="mt-auto pt-6">
            <p className="mb-3 text-xs text-muted">Dados da clínica em Sistema</p>
            <UserButton />
          </div>
        </aside>
        <div>
          <header className="no-print flex items-center justify-between gap-3 border-b border-line px-3 py-2 md:hidden">
            <Marca nome={marca?.nome} linha={marca?.slogan || "Clínica de nutrição"} logo={marca?.logo} inicio />
            <UserButton />
          </header>
          <main className="px-4 py-6 pb-24 md:px-10 md:py-10 md:pb-10">
            <BackupDoDia />
            {children}
          </main>
        </div>
        <nav className="barra no-print fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              aria-current={ativo(l.to) ? "page" : undefined}
              className={cx(
                "nav-item flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                ativo(l.to) ? "text-copper-deep" : "text-muted",
              )}
            >
              <img className="nav-icone" src={l.icon} alt="" decoding="async" />
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
  );
}
