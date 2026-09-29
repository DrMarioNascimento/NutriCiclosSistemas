import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { exportarBackup, getMarca } from "@/lib/clinic/api";
import { estadoNuvem, gravarNaNuvem, jaEnviadoHoje } from "@/lib/clinic/nuvem-backup";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { srcLogo, useLogoEnquadrado } from "./folha-papel";
import { cx } from "./ui";

function Vidro({ children }: { children: (id: string) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className="icone-nav size-7 shrink-0" aria-hidden>
      <defs>
        <linearGradient id={`${id}-c`} x1="8" y1="3" x2="24" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff4ea" stopOpacity="0.95" />
          <stop offset="0.38" stopColor="#d58b5c" stopOpacity="0.85" />
          <stop offset="1" stopColor="#8a4521" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-s`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1.8" stdDeviation="0.65" floodColor="#6a3418" floodOpacity="0.42" />
        </filter>
      </defs>
      <g filter={`url(#${id}-s)`}>{children(id)}</g>
    </svg>
  );
}

function IconeInicio() {
  return (
    <Vidro>
      {(id) => (
        <>
          <path fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.8)" strokeWidth="0.7" d="M16 4.4 5.4 13.1a1 1 0 0 0-.3.8V26.4c0 1 .8 1.8 1.8 1.8h6.2v-6.6h6v6.6h6.1c1 0 1.8-.8 1.8-1.8V13.9a1 1 0 0 0-.3-.8L16 4.4Z" />
          <path fill={`url(#${id}-b)`} d="M16 5.6 7.2 13v6.2c2.6-4.6 5.6-7.2 8.8-7.8 1.2 2.2 1.4 4.6.4 7.2-2.2-.8-4.6-.4-7.2 1.2V13.6L16 7.4l6.8 5.6v5.4c-2.4-1.2-4.6-1.4-6.6-.6 1.6-2.2 2-4.6.8-7.2-1 .8-2.4 1.2-4.2.8 1.6-.6 2.8-1.6 3.2-1.4Z" opacity="0.85" />
          <path fill="#fff7f1" fillOpacity="0.55" d="M16 7.2c.5 1.2.2 2.2-.7 2.8 1 .1 1.8.8 2.1 2-.9-.1-1.6.1-2.1.8.1-1.1-.1-2-.8-2.8.9-.3 1.4-1 1.5-2.8Z" />
        </>
      )}
    </Vidro>
  );
}

function IconeAgenda() {
  return (
    <Vidro>
      {(id) => (
        <>
          <rect x="6.2" y="6.8" width="19.6" height="19.2" rx="3.4" fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.8)" strokeWidth="0.7" />
          <path fill="#8a4521" fillOpacity="0.35" d="M6.2 11.4h19.6v2H6.2z" />
          <rect x="8" y="15" width="5" height="3.2" rx="0.8" fill="#fff7f1" fillOpacity="0.45" />
          <rect x="14.4" y="15" width="5" height="3.2" rx="0.8" fill="#fff7f1" fillOpacity="0.28" />
          <rect x="8" y="19.4" width="5" height="3.2" rx="0.8" fill="#fff7f1" fillOpacity="0.22" />
          <path fill={`url(#${id}-b)`} d="M7.2 8.2h17.6c.8 0 1.6.5 1.8 1.2H7c.2-.7.8-1.2 1.6-1.2.2 0 .4 0 .6.1Z" />
          <circle cx="11.2" cy="6.6" r="1.35" fill="#fff7f1" fillOpacity="0.9" />
          <circle cx="20.8" cy="6.6" r="1.35" fill="#fff7f1" fillOpacity="0.9" />
        </>
      )}
    </Vidro>
  );
}

function IconePacientes() {
  return (
    <Vidro>
      {(id) => (
        <>
          <circle cx="12.1" cy="11" r="3.5" fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.75)" strokeWidth="0.6" />
          <circle cx="20.5" cy="12.3" r="2.7" fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.7)" strokeWidth="0.55" />
          <path fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.7)" strokeWidth="0.6" d="M6.1 25.2c.5-4.2 3-6.6 6-6.6s5.5 2.4 6 6.6c.1.5-.3 1-1 1H7c-.6 0-1.1-.5-.9-1Z" />
          <path fill={`url(#${id}-c)`} stroke="rgba(255,247,241,0.65)" strokeWidth="0.5" d="M16.8 25.8c.2-3.1 1.9-5 4.1-5 2.1 0 3.6 1.7 3.9 4.6.1.5-.3 1-.9 1h-6.2c-.5 0-.9-.3-.9-.6Z" />
          <ellipse cx="11.2" cy="9.6" rx="1.8" ry="1" fill="#fff" fillOpacity="0.55" />
          <ellipse cx="19.8" cy="11.1" rx="1.3" ry="0.7" fill="#fff" fillOpacity="0.45" />
        </>
      )}
    </Vidro>
  );
}

function IconeSistema() {
  return (
    <Vidro>
      {(id) => (
        <>
          <path
            fill={`url(#${id}-c)`}
            stroke="rgba(255,247,241,0.8)"
            strokeWidth="0.6"
            strokeLinejoin="round"
            d="M14.2 4.6h3.6l.4 2.6c.8.2 1.5.6 2.1 1.1l2.4-1.1 2.6 2.6-1.1 2.4c.5.6.9 1.3 1.1 2.1l2.6.4v3.6l-2.6.4c-.2.8-.6 1.5-1.1 2.1l1.1 2.4-2.6 2.6-2.4-1.1c-.6.5-1.3.9-2.1 1.1l-.4 2.6h-3.6l-.4-2.6a7 7 0 0 1-2.1-1.1l-2.4 1.1-2.6-2.6 1.1-2.4a7 7 0 0 1-1.1-2.1l-2.6-.4v-3.6l2.6-.4c.2-.8.6-1.5 1.1-2.1L6.7 9.8l2.6-2.6 2.4 1.1c.6-.5 1.3-.9 2.1-1.1l.4-2.6Z"
          />
          <circle cx="16" cy="16.2" r="4.3" fill="#fffaf4" fillOpacity="0.35" stroke="rgba(255,247,241,0.7)" strokeWidth="0.6" />
          <path fill={`url(#${id}-b)`} d="M13.2 7.2c2.2-.8 5.4-.6 7.4.8 1.2-1.6.4-3.2-1.6-3.4h-2.2c-1.8.1-3 1.2-3.6 2.6Z" />
          <ellipse cx="13.4" cy="13.2" rx="2.2" ry="1.3" fill="#fff" fillOpacity="0.55" />
        </>
      )}
    </Vidro>
  );
}

const links = [
  { to: "/", label: "Início", Icone: IconeInicio },
  { to: "/agenda", label: "Agenda", Icone: IconeAgenda },
  { to: "/pacientes", label: "Pacientes", Icone: IconePacientes },
  { to: "/sistema", label: "Sistema", Icone: IconeSistema },
] as const;

function Marca({ nome = "NutriCiclos", linha = "Clínica de nutrição", logo = "", inicio = false }: { nome?: string; linha?: string; logo?: string; inicio?: boolean }) {
  const src = useLogoEnquadrado(srcLogo(logo));
  const corpo = (
    <span className="inline-flex max-w-full flex-col items-center px-3 py-2">
      <span className="flex items-center gap-3">
        <span className="selo grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fffdfb]">
          <img src={src} alt="" className="size-[88%] object-contain object-center" />
        </span>
        <span className="font-serif text-lg leading-none text-ink">{nome}</span>
      </span>
      <span className="mt-2 block whitespace-nowrap text-center text-[11.5px] leading-none tracking-wide text-muted">{linha}</span>
    </span>
  );
  if (!inicio) return corpo;
  return (
    <Link to="/" aria-label="Ir para a primeira página" className="inline-flex max-w-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-copper">
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
  Icone,
  ativo,
}: {
  to: "/" | "/agenda" | "/pacientes" | "/sistema";
  label: string;
  Icone: () => ReactNode;
  ativo: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={ativo ? "page" : undefined}
      className={cx(
        "nav-item flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-sm font-medium",
        ativo ? "bg-copper-soft text-copper-deep" : "text-ink-2 hover:bg-sand",
      )}
    >
      <Icone />
      {label}
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
              <l.Icone />
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
  );
}
