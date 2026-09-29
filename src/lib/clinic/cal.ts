import { addDias } from "./calc";
import type { AgendaItem } from "./types";

function stamp(dia: string, hora: string): string {
  return `${dia.replace(/-/g, "")}T${hora.replace(":", "")}00`;
}

function maisMinutos(dia: string, hora: string, min: number): { dia: string; hora: string } {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + min;
  const diaExtra = Math.floor(total / (24 * 60));
  const resto = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(resto / 60)).padStart(2, "0");
  const mm = String(resto % 60).padStart(2, "0");
  return { dia: addDias(dia, diaExtra), hora: `${hh}:${mm}` };
}

function texto(item: AgendaItem): string {
  const partes = [item.notas, item.pacienteNome ? `Paciente: ${item.pacienteNome}` : "", "NutriCiclos"];
  return partes.filter(Boolean).join("\n");
}

export function linkGoogle(item: AgendaItem): string {
  const detalhes = encodeURIComponent(texto(item));
  const titulo = encodeURIComponent(item.titulo);
  if (!item.hora) {
    const fim = addDias(item.dia, 1).replace(/-/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${item.dia.replace(/-/g, "")}/${fim}&details=${detalhes}`;
  }
  const fim = maisMinutos(item.dia, item.hora, 30);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${stamp(item.dia, item.hora)}/${stamp(fim.dia, fim.hora)}&details=${detalhes}`;
}

export function linkOutlook(item: AgendaItem): string {
  const subject = encodeURIComponent(item.titulo);
  const body = encodeURIComponent(texto(item));
  if (!item.hora) {
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${item.dia}&enddt=${addDias(item.dia, 1)}&allday=true&body=${body}`;
  }
  const fim = maisMinutos(item.dia, item.hora, 30);
  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${item.dia}T${item.hora}:00&enddt=${fim.dia}T${fim.hora}:00&body=${body}`;
}

/** Abre a tela de assinar um calendário por URL. Não é público nem incorporar. */
export function linkAssinarGoogle(url: string): string {
  return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(url)}`;
}

export function linkAssinarOutlook(url: string, trabalho = false): string {
  const base = trabalho ? "https://outlook.office.com/calendar/0/addfromweb" : "https://outlook.live.com/calendar/0/addfromweb";
  return `${base}?url=${encodeURIComponent(url)}&name=${encodeURIComponent("NutriCiclos")}`;
}

function icsEsc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function dobrar(linha: string): string {
  const partes: string[] = [];
  let resto = linha;
  let limite = 73;
  while (resto.length > limite) {
    partes.push(resto.slice(0, limite));
    resto = resto.slice(limite);
    limite = 72;
  }
  partes.push(resto);
  return partes.join("\r\n ");
}

function carimbo(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export type NiverCal = { id: number; nome: string; dia: string };

function vevent(item: AgendaItem): string {
  const uid = `nutriciclos-${item.id}@nutriciclos`;
  const fim = item.hora ? maisMinutos(item.dia, item.hora, 30) : null;
  const quando = fim
    ? `DTSTART;TZID=America/Sao_Paulo:${stamp(item.dia, item.hora!)}\r\nDTEND;TZID=America/Sao_Paulo:${stamp(fim.dia, fim.hora)}`
    : `DTSTART;VALUE=DATE:${item.dia.replace(/-/g, "")}\r\nDTEND;VALUE=DATE:${addDias(item.dia, 1).replace(/-/g, "")}`;
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${carimbo()}`,
    `SUMMARY:${icsEsc(item.titulo)}`,
    `DESCRIPTION:${icsEsc(texto(item))}`,
    quando,
    `STATUS:${item.feito ? "COMPLETED" : "CONFIRMED"}`,
    "END:VEVENT",
  ]
    .map(dobrar)
    .join("\r\n");
}

function vniver(n: NiverCal): string {
  return [
    "BEGIN:VEVENT",
    `UID:nutriciclos-niver-${n.id}@nutriciclos`,
    `DTSTAMP:${carimbo()}`,
    `SUMMARY:${icsEsc(`Aniversário — ${n.nome}`)}`,
    "DESCRIPTION:NutriCiclos",
    `DTSTART;VALUE=DATE:${n.dia.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${addDias(n.dia, 1).replace(/-/g, "")}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
  ]
    .map(dobrar)
    .join("\r\n");
}

const FUSO = [
  "BEGIN:VTIMEZONE",
  "TZID:America/Sao_Paulo",
  "BEGIN:STANDARD",
  "DTSTART:19700101T000000",
  "TZOFFSETFROM:-0300",
  "TZOFFSETTO:-0300",
  "TZNAME:-03",
  "END:STANDARD",
  "END:VTIMEZONE",
].join("\r\n");

export function icsDe(itens: AgendaItem[], nivers: NiverCal[] = []): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//NutriCiclos//Agenda//PT", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:NutriCiclos", "X-WR-TIMEZONE:America/Sao_Paulo", "REFRESH-INTERVAL;VALUE=DURATION:PT12H", FUSO, ...itens.map(vevent), ...nivers.map(vniver), "END:VCALENDAR"].join("\r\n") + "\r\n";
}

export function proximoAniversario(nasc: string, hoje: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc) || !/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return null;
  const ano = Number(hoje.slice(0, 4));
  const noAno = (y: number) => {
    const mes = nasc.slice(5, 7);
    const dia = nasc.slice(8, 10);
    const bissexto = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
    if (mes === "02" && dia === "29" && !bissexto) return `${y}-02-28`;
    return `${y}-${mes}-${dia}`;
  };
  const este = noAno(ano);
  return este >= hoje ? este : noAno(ano + 1);
}

export function baixarIcs(nome: string, itens: AgendaItem[], nivers: NiverCal[] = []) {
  const blob = new Blob([icsDe(itens, nivers)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
