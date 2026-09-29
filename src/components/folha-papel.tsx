import { useEffect, useState, type ReactNode } from "react";
import type { Clinica } from "@/lib/clinic/types";
import { Button } from "./ui";

export const LOGO_PADRAO = "/emblema.png";

export function srcLogo(logo: string) {
  return logo.startsWith("data:image/") ? logo : LOGO_PADRAO;
}

const enquadrados = new Map<string, string>();

/** Tira a faixa vazia ou preta e centraliza a marca, para caber inteira na moeda. */
export function useLogoEnquadrado(src: string) {
  const [url, setUrl] = useState(enquadrados.get(src) ?? src);

  useEffect(() => {
    const pronto = enquadrados.get(src);
    if (pronto) {
      setUrl(pronto);
      return;
    }
    if (!src) {
      setUrl(src);
      return;
    }
    let vivo = true;
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const base = document.createElement("canvas");
      base.width = w;
      base.height = h;
      const ctx = base.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const passo = Math.max(1, Math.floor(Math.max(w, h) / 200));
      let minX = w;
      let minY = h;
      let maxX = 0;
      let maxY = 0;
      for (let y = 0; y < h; y += passo) {
        for (let x = 0; x < w; x += passo) {
          const i = (y * w + x) * 4;
          const r = data[i] ?? 0;
          const g = data[i + 1] ?? 0;
          const b = data[i + 2] ?? 0;
          const a = data[i + 3] ?? 0;
          if (a < 24) continue;
          if (r < 28 && g < 28 && b < 28) continue;
          if (r > 242 && g > 242 && b > 242) continue;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
      if (maxX <= minX || maxY <= minY) {
        if (vivo) setUrl(src);
        return;
      }
      const margem = Math.round(Math.max(maxX - minX, maxY - minY) * 0.08);
      const sx = Math.max(0, minX - margem);
      const sy = Math.max(0, minY - margem);
      const sw = Math.min(w - sx, maxX - minX + margem * 2);
      const sh = Math.min(h - sy, maxY - minY + margem * 2);
      const lado = 256;
      const saida = document.createElement("canvas");
      saida.width = lado;
      saida.height = lado;
      const out = saida.getContext("2d");
      if (!out) return;
      out.fillStyle = "#fffdfb";
      out.fillRect(0, 0, lado, lado);
      const escala = Math.min((lado * 0.84) / sw, (lado * 0.84) / sh);
      const dw = sw * escala;
      const dh = sh * escala;
      out.drawImage(img, sx, sy, sw, sh, (lado - dw) / 2, (lado - dh) / 2, dw, dh);
      const gerada = saida.toDataURL("image/png");
      enquadrados.set(src, gerada);
      if (vivo) setUrl(gerada);
    };
    img.src = src;
    return () => {
      vivo = false;
    };
  }, [src]);

  return url;
}

export function Timbre({ clinica }: { clinica: Clinica }) {
  const src = useLogoEnquadrado(srcLogo(clinica.logo));
  return (
    <header className="flex items-center gap-4">
      <img src={src} alt="" className="h-20 w-auto max-w-40 object-contain" />
      <div>
        <p className="font-serif text-3xl text-copper-deep">{clinica.nome}</p>
        <p className="text-sm text-ink-2">{clinica.slogan}</p>
        <p className="mt-1 text-sm text-ink-2">
          {clinica.nutricionista} · {clinica.crn} · {clinica.cidade}
        </p>
      </div>
    </header>
  );
}

export function FolhaPapel({
  clinica,
  titulo,
  subtitulo,
  children,
  onFechar,
  acoes,
}: {
  clinica: Clinica;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  onFechar: () => void;
  acoes?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-30 overflow-auto bg-paper">
      <div className="no-print flex flex-wrap gap-2 border-b border-line px-4 py-3">
        <Button type="button" variant="ghost" onClick={onFechar}>
          Voltar
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Imprimir / PDF
        </Button>
        {acoes}
      </div>
      <article className="folha-print mx-auto max-w-3xl bg-paper px-6 py-8">
        <Timbre clinica={clinica} />
        <h2 className="mt-8 font-serif text-2xl">{titulo}</h2>
        {subtitulo ? <p className="mt-1 text-sm text-ink-2">{subtitulo}</p> : null}
        <div className="mt-6">{children}</div>
        <p className="mt-16 text-sm text-ink">{clinica.nutricionista}</p>
        <p className="text-sm text-ink-2">{clinica.crn}</p>
        <p className="text-sm text-muted">{clinica.cidade}</p>
      </article>
    </div>
  );
}
