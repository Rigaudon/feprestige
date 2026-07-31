import { METRICS_BY_TYPE, type Metric, metricName } from "@/wom/metrics";

// Grouped metric <select> shared by the Hiscores and Gains boards. Controlled;
// the parent owns the selected metric state.
export function MetricSelect({
  value,
  onChange,
  id,
}: {
  value: Metric;
  onChange: (metric: Metric) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as Metric)}
      className="rounded-lg border border-border bg-surface px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-white outline-none transition-colors hover:border-accent focus:border-accent"
    >
      <optgroup label="Skills">
        {METRICS_BY_TYPE.skill.map((m) => (
          <option key={m} value={m}>
            {metricName(m)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Bosses">
        {METRICS_BY_TYPE.boss.map((m) => (
          <option key={m} value={m}>
            {metricName(m)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Activities">
        {METRICS_BY_TYPE.activity.map((m) => (
          <option key={m} value={m}>
            {metricName(m)}
          </option>
        ))}
      </optgroup>
      <optgroup label="Computed">
        {METRICS_BY_TYPE.computed.map((m) => (
          <option key={m} value={m}>
            {metricName(m)}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
