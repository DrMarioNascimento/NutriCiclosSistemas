import { useEffect, useState } from "react";

export function QrComprovante({ token }: { token: string }) {
  const [src, setSrc] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/verificar/${token}`;

  useEffect(() => {
    let vivo = true;
    import("qrcode")
      .then((mod) => mod.toDataURL(url, { margin: 1, width: 180 }))
      .then((data) => {
        if (vivo) setSrc(data);
      })
      .catch(() => {
        if (vivo) setSrc("");
      });
    return () => {
      vivo = false;
    };
  }, [url]);

  if (!url) return null;
  return (
    <div className="mt-8 flex items-end justify-between gap-4 border-t border-line pt-4">
      <div>
        <p className="text-xs tracking-wide text-muted">Via do paciente</p>
        <p className="mt-1 text-sm text-ink-2">Confira este comprovante em {url}</p>
      </div>
      {src ? <img src={src} alt="QR de verificação" className="h-28 w-28" /> : null}
    </div>
  );
}
