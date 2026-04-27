import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ token: string }> };

function icsDate(d: Date, allDay?: boolean) {
  if (allDay) {
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
    return `${y}${m}${day}`;
  }
  return d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
}

function escICS(s: string) { return s.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const cal = await prisma.calendar.findUnique({
    where: { shareToken: token },
    include: { events: { orderBy: { startAt: "asc" } } },
  });
  if (!cal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SyncNest//KR",
    `X-WR-CALNAME:${escICS(cal.name)}`,
    "X-WR-TIMEZONE:Asia/Seoul",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const e of cal.events) {
    const start = new Date(e.startAt);
    const end = e.endAt ? new Date(e.endAt) : new Date(start.getTime() + 60*60*1000);
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@syncnest.app`);
    lines.push(`DTSTAMP:${icsDate(new Date())}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${icsDate(start, true)}`);
      lines.push(`DTEND;VALUE=DATE:${icsDate(end, true)}`);
    } else {
      lines.push(`DTSTART:${icsDate(start)}`);
      lines.push(`DTEND:${icsDate(end)}`);
    }
    lines.push(`SUMMARY:${escICS(e.title)}`);
    if (e.location) lines.push(`LOCATION:${escICS(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escICS(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(cal.name)}.ics"`,
    },
  });
}
