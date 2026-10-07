// Small dependency-free SVG-less bar chart (plain divs) for dashboard cards.
// `data` is a generic [{ label, value }] array — reused for revenue-by-month,
// seller counts by plan/status, or any other simple breakdown.
export default function MiniBarChart({ data = [], color = 'bg-red-500', formatValue = (v) => v?.toLocaleString('en-IN') }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-16 w-full overflow-hidden">
      {data.slice(-12).map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-[6px]">
          <div
            className={`w-full rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity cursor-default`}
            style={{ height: `${Math.max(4, (d.value / max) * 56)}px` }}
            title={`${d.label}: ${formatValue(d.value)}`}
          />
        </div>
      ))}
    </div>
  );
}
