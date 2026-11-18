// Minimal 5-field crontab matcher (minute hour day-of-month month day-of-week),
// evaluated in an IANA time zone. Numeric only — `*`, lists, ranges, steps — which
// covers event schedules without pulling a cron library into the worker bundle.
//
// Follows Vixie-cron semantics: when BOTH day-of-month and day-of-week are
// restricted (neither starts with `*`), a day matches if EITHER does. Day-of-week
// accepts 0–7, with 0 and 7 both meaning Sunday.

interface ParsedCron {
  minute: Set<number>;
  hour: Set<number>;
  dom: Set<number>;
  month: Set<number>;
  dow: Set<number>;
  domStar: boolean;
  dowStar: boolean;
}

const BOUNDS: [number, number][] = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 7], // day of week
];

function int(s: string, expr: string): number {
  if (!/^\d+$/.test(s)) throw new Error(`Invalid number "${s}" in cron "${expr}"`);
  return Number(s);
}

function parseField(field: string, [min, max]: [number, number], expr: string) {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepStr, extra] = part.split("/");
    if (extra !== undefined || range === "") {
      throw new Error(`Invalid field "${field}" in cron "${expr}"`);
    }
    const step = stepStr === undefined ? 1 : int(stepStr, expr);
    if (step < 1) throw new Error(`Step must be >= 1 in cron "${expr}"`);

    let lo: number;
    let hi: number;
    if (range === "*") {
      [lo, hi] = [min, max];
    } else if (range.includes("-")) {
      const [a, b] = range.split("-");
      [lo, hi] = [int(a, expr), int(b, expr)];
    } else {
      lo = int(range, expr);
      hi = stepStr === undefined ? lo : max; // "5/15" = from 5, every 15
    }
    if (lo < min || hi > max || lo > hi) {
      throw new Error(`Value out of range ${min}-${max} in cron "${expr}"`);
    }
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

export function parseCron(expr: string): ParsedCron {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Cron "${expr}" must have 5 fields, got ${fields.length}`);
  }
  const [minute, hour, dom, month, dow] = fields.map((f, i) =>
    parseField(f, BOUNDS[i], expr),
  );
  if (dow.has(7)) dow.add(0);
  return {
    minute,
    hour,
    dom,
    month,
    dow,
    domStar: fields[2].startsWith("*"),
    dowStar: fields[4].startsWith("*"),
  };
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

/** Wall-clock fields of `date` in `timeZone`. Throws on an unknown zone. */
function zonedFields(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    minute: Number(get("minute")),
    hour: Number(get("hour")),
    dom: Number(get("day")),
    month: Number(get("month")),
    dow: WEEKDAYS[get("weekday")],
  };
}

/** Does `date`'s minute match `expr` when read in `timeZone`? */
export function cronMatches(expr: string, date: Date, timeZone = "UTC"): boolean {
  const c = parseCron(expr);
  const t = zonedFields(date, timeZone);
  if (!c.minute.has(t.minute) || !c.hour.has(t.hour) || !c.month.has(t.month)) {
    return false;
  }
  const domOk = c.dom.has(t.dom);
  const dowOk = c.dow.has(t.dow);
  return c.domStar || c.dowStar ? domOk && dowOk : domOk || dowOk;
}
