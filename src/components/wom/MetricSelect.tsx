import { type Metric, METRIC_PROPS, type MetricType, metricName } from "@/wom/metrics";

const GROUPS: { type: MetricType; label: string }[] = [
  { type: "skill", label: "Skills" },
  { type: "boss", label: "Bosses" },
  { type: "activity", label: "Activities" },
  { type: "computed", label: "Computed" },
];

// Grouped metric <select> shared by the Hiscores and Gains boards. Controlled;
// the parent owns the selected metric. Only the metrics passed in `metrics` are
// offered (i.e. those the clan is actually ranked in), grouped by type.
export function MetricSelect({
  value,
  onChange,
  metrics,
  id,
}: {
  value: Metric;
  onChange: (metric: Metric) => void;
  metrics: Metric[];
  id?: string;
}) {
  const available = new Set(metrics);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as Metric)}
      className="rounded-lg border border-border bg-surface px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white outline-none transition-colors hover:border-accent focus:border-accent"
    >
      {GROUPS.map(({ type, label }) => {
        const options = metrics.filter((m) => METRIC_PROPS[m].type === type);
        if (options.length === 0) return null;
        return (
          <optgroup key={type} label={label}>
            {options.map((m) => (
              <option key={m} value={m} disabled={!available.has(m)}>
                {metricName(m)}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
