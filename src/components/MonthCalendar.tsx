// src/components/MonthCalendar.tsx
"use client";

import { useMemo, useState } from "react";

export type CalendarEvent = {
  id: string;
  title: string;
  type: "training" | "match" | "meeting";
  start_at: string;
  location: string | null;
  created_at: string;
};

type Props = {
  month: Date;
  selectedDay: string | null; // "YYYY-MM-DD"
  eventsByDay: Record<string, CalendarEvent[]>;
  onMonthChange: (m: Date) => void;
  onSelectDay: (k: string) => void; // "YYYY-MM-DD"
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonthGrid(view: Date) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const dow = first.getDay(); // 0=dom ... 6=sab
  const mondayIndex = dow === 0 ? 6 : dow - 1; // 0=lun ... 6=dom
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - mondayIndex);
  return gridStart;
}

function monthLabelIT(d: Date) {
  return new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" })
    .format(d)
    .replace(/^\w/, (c) => c.toUpperCase());
}

function dotClass(t: CalendarEvent["type"]) {
  if (t === "training") return "bg-emerald-500";
  if (t === "meeting") return "bg-amber-500";
  return "bg-rose-500";
}

function uniqTypes(evts: CalendarEvent[]) {
  const s = new Set<CalendarEvent["type"]>();
  for (const e of evts) s.add(e.type);
  const order: CalendarEvent["type"][] = ["training", "meeting", "match"];
  return order.filter((t) => s.has(t)).slice(0, 3);
}

export default function MonthCalendar({
  month,
  selectedDay,
  eventsByDay,
  onMonthChange,
  onSelectDay,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const weeks = useMemo(() => {
    const start = startOfMonthGrid(month);
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [month]);

  const today = new Date();

  const monthsIT = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 9 }, (_, i) => y - 4 + i);
  }, []);

  function goPrev() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  function goNext() {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  function goToday() {
    const now = new Date();
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDay(ymd(now));
  }

  return (
    <div className="rounded-xl border border-theme bg-panel-theme p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-left"
          onClick={() => setPickerOpen((v) => !v)}
          title="Seleziona mese/anno"
        >
          <div className="text-sm font-semibold text-base-theme">
            {monthLabelIT(month)}
          </div>
          <div className="text-xs text-muted-theme">
            Clicca per scegliere mese/anno
          </div>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 rounded-md border border-theme bg-panel-theme"
            onClick={goPrev}
            aria-label="Mese precedente"
          >
            ←
          </button>
          <button
            type="button"
            className="h-9 rounded-md border border-theme bg-panel-theme px-3"
            onClick={goToday}
          >
            Oggi
          </button>
          <button
            type="button"
            className="h-9 w-9 rounded-md border border-theme bg-panel-theme"
            onClick={goNext}
            aria-label="Mese successivo"
          >
            →
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <select
            className="h-11 rounded-md border border-theme bg-panel-theme px-3"
            value={month.getMonth()}
            onChange={(e) => {
              const m = Number(e.target.value);
              onMonthChange(new Date(month.getFullYear(), m, 1));
            }}
          >
            {monthsIT.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <select
            className="h-11 rounded-md border border-theme bg-panel-theme px-3"
            value={month.getFullYear()}
            onChange={(e) => {
              const y = Number(e.target.value);
              onMonthChange(new Date(y, month.getMonth(), 1));
            }}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}

        <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-muted-theme">
        {[
            { k: "L", l: "L" },
            { k: "Ma", l: "M" }, // Martedì
            { k: "Me", l: "M" }, // Mercoledì
            { k: "G", l: "G" },
            { k: "V", l: "V" },
            { k: "S", l: "S" },
            { k: "D", l: "D" },
        ].map((x) => (
            <div key={x.k} className="text-center">
            {x.l}
            </div>
        ))}
        </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {weeks.map((d) => {
          const key = ymd(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isSel = selectedDay === key;
          const isToday = sameDay(d, today);
          const isTodayCell = isToday;

          const dayEvents = eventsByDay[key] ?? [];
          const dots = uniqTypes(dayEvents);

          return (
            <button
                key={key}
                type="button"
                onClick={() => onSelectDay(key)}
                className={[
                    "h-12 rounded-xl border border-theme px-2",
                    "flex flex-col items-center justify-center transition-colors",
                    inMonth ? "" : "opacity-50",

                    // base
                    !isSel && !isTodayCell ? "bg-panel-theme hover:bg-cyan-500/10" : "",

                    // OGGI (soft highlight)
                    isTodayCell && !isSel ? "bg-cyan-500/15 ring-2 ring-cyan-500/40" : "",

                    // SELEZIONATO (forte)
                    isSel ? "bg-cyan-500/25 ring-2 ring-cyan-400" : "",
                  ].join(" ")}
                title={key}
                >
                <div
                    className={[
                    "text-sm",
                    isTodayCell ? "font-semibold" : "",
                    ].join(" ")}
                >
                    {d.getDate()}
                </div>

                <div className="mt-1 flex items-center gap-1">
                    {dots.map((t) => (
                    <span
                        key={t}
                        className={["h-1.5 w-1.5 rounded-full", dotClass(t)].join(" ")}
                        aria-label={t}
                        title={t}
                    />
                    ))}
                </div>
                </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-theme">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Allenamento
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Riunione
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-rose-500" /> Partita
        </span>
      </div>
    </div>
  );
}