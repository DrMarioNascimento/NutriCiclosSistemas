const BANCO = "nutriciclos-nuvem";
const CHAVE = "pasta";

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      pedido.result.createObjectStore("prefs");
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

export function nuvemDisponivel() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function diaLocal() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

async function lerHandle(): Promise<FileSystemDirectoryHandle | null> {
  const banco = await abrirBanco();
  return new Promise((resolve, reject) => {
    const pedido = banco.transaction("prefs", "readonly").objectStore("prefs").get(CHAVE);
    pedido.onsuccess = () => resolve((pedido.result as FileSystemDirectoryHandle | undefined) ?? null);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function guardarHandle(pasta: FileSystemDirectoryHandle) {
  const banco = await abrirBanco();
  await new Promise<void>((resolve, reject) => {
    const tx = banco.transaction("prefs", "readwrite");
    tx.objectStore("prefs").put(pasta, CHAVE);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

type PastaComPermissao = FileSystemDirectoryHandle & {
  queryPermission?: (opcoes: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (opcoes: { mode: "readwrite" }) => Promise<PermissionState>;
};

async function permitir(pasta: FileSystemDirectoryHandle, pedir: boolean) {
  const alvo = pasta as PastaComPermissao;
  const atual = alvo.queryPermission ? await alvo.queryPermission({ mode: "readwrite" }) : "granted";
  if (atual === "granted") return true;
  if (!pedir || !alvo.requestPermission) return false;
  return (await alvo.requestPermission({ mode: "readwrite" })) === "granted";
}

export async function estadoNuvem(): Promise<{ nome: string | null; pode: boolean }> {
  const pasta = await lerHandle();
  if (!pasta) return { nome: null, pode: false };
  return { nome: pasta.name, pode: await permitir(pasta, false) };
}

export async function escolherPasta() {
  const escolher = (window as Window & {
    showDirectoryPicker?: (opcoes: { mode: "readwrite"; id: string }) => Promise<FileSystemDirectoryHandle>;
  }).showDirectoryPicker;
  if (!escolher) throw new Error("Este navegador não escolhe pasta. Use Chrome ou Edge.");
  const pasta = await escolher({ mode: "readwrite", id: "nutriciclos-backup" });
  await guardarHandle(pasta);
  return pasta.name;
}

export async function desligarPasta() {
  const banco = await abrirBanco();
  await new Promise<void>((resolve, reject) => {
    const tx = banco.transaction("prefs", "readwrite");
    tx.objectStore("prefs").delete(CHAVE);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  localStorage.removeItem(`nutriciclos-nuvem-${diaLocal()}`);
}

async function apagarAntigos(pasta: FileSystemDirectoryHandle, hoje: string) {
  const nomes: string[] = [];
  const listar = pasta as FileSystemDirectoryHandle & {
    entries: () => AsyncIterable<[string, FileSystemHandle]>;
  };
  for await (const entrada of listar.entries()) {
    const nome = entrada[0];
    if (/^nutriciclos-backup-\d{4}-\d{2}-\d{2}\.json$/.test(nome)) nomes.push(nome);
  }
  nomes.sort();
  const ficar = new Set(nomes.slice(-14));
  ficar.add(`nutriciclos-backup-${hoje}.json`);
  for (const nome of nomes) {
    if (!ficar.has(nome)) await pasta.removeEntry(nome);
  }
}

export async function gravarNaNuvem(texto: string, pedirPermissao: boolean) {
  const pasta = await lerHandle();
  if (!pasta) throw new Error("Escolha a pasta da nuvem antes.");
  if (!(await permitir(pasta, pedirPermissao))) {
    throw new Error("A pasta precisa de permissão de novo. Escolha a pasta outra vez.");
  }
  const dia = diaLocal();
  const arquivo = `nutriciclos-backup-${dia}.json`;
  const handle = await pasta.getFileHandle(arquivo, { create: true });
  const escrita = await handle.createWritable();
  await escrita.write(texto);
  await escrita.close();
  await apagarAntigos(pasta, dia);
  localStorage.setItem(`nutriciclos-nuvem-${dia}`, "1");
  return { nome: pasta.name, arquivo };
}

export function jaEnviadoHoje() {
  return localStorage.getItem(`nutriciclos-nuvem-${diaLocal()}`) === "1";
}
