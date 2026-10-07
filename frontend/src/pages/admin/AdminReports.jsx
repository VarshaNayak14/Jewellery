import { useState, useEffect } from 'react';
import { FiFileText, FiDollarSign, FiPackage, FiShoppingBag, FiBox, FiUsers, FiRefreshCw } from 'react-icons/fi';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { AdminPageWrapper } from './AdminDashboard';
import Pagination from '../../components/common/Pagination';
import { usePagedList } from '../../hooks/usePagedList';

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales', icon: FiDollarSign, title: 'Sales Report', chartLabel: 'Revenue' },
  { value: 'orders', label: 'Orders', icon: FiPackage, title: 'Orders Report', chartLabel: 'Orders' },
  { value: 'sellers', label: 'Sellers', icon: FiShoppingBag, title: 'Seller Performance', chartLabel: 'New sellers' },
  { value: 'products', label: 'Products', icon: FiBox, title: 'Product Performance', chartLabel: 'New products' },
  { value: 'customers', label: 'Customers', icon: FiUsers, title: 'Customer Report', chartLabel: 'New customers' },
];

// Chart tokens: one series hue, recessive solid grid, light/dark steps.
const TOKENS = {
  light: { series: '#2a78d6', fill: 'rgba(42,120,214,0.14)', grid: '#e5e7eb', axis: '#6b7280', surface: '#ffffff' },
  dark: { series: '#3987e5', fill: 'rgba(57,135,229,0.22)', grid: '#1f2937', axis: '#9ca3af', surface: '#111827' },
};

// Local calendar date as YYYY-MM-DD (toISOString would shift to UTC).
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
const QUICK_RANGES = [
  { key: '7', label: '7D', range: () => ({ start: daysAgo(6), end: ymd(new Date()) }) },
  { key: '30', label: '30D', range: () => ({ start: daysAgo(29), end: ymd(new Date()) }) },
  { key: '90', label: '90D', range: () => ({ start: daysAgo(89), end: ymd(new Date()) }) },
  { key: 'month', label: 'This month', range: () => { const n = new Date(); return { start: ymd(new Date(n.getFullYear(), n.getMonth(), 1)), end: ymd(n) }; } },
];
const fmtDay = (s) => (s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
// Money columns (counts like totalPayments stay plain numbers).
const isMoneyKey = (k) => /revenue|amount|price|avgpayment|ordervalue|spent/i.test(k);
const labelOf = (k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const showValue = (k, v) => (typeof v === 'number' ? (isMoneyKey(k) ? `₹${v.toLocaleString('en-IN')}` : v.toLocaleString('en-IN')) : String(v ?? ''));

const inputCls = 'px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-400';

export default function AdminReports({ Wrapper = AdminPageWrapper }) {
  const { isDark } = useTheme();
  const t = isDark ? TOKENS.dark : TOKENS.light;
  const [reportType, setReportType] = useState('sales');
  const [quick, setQuick] = useState('30');
  const [dateRange, setDateRange] = useState(() => QUICK_RANGES[1].range());
  const [data, setData] = useState(null);
  // Table shows 20 rows per page.
  const tablePage = usePagedList(data);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const activeType = REPORT_TYPES.find(rt => rt.value === reportType);
  const rangeValid = dateRange.start && dateRange.end && dateRange.start <= dateRange.end;

  const fetchReport = async () => {
    if (!rangeValid) return;
    setLoading(true);
    try {
      const result = await adminAPI.getSalesReport({ type: reportType, ...dateRange });
      setData(result.data || []);
      setChartData(result.chartData || []);
      setSummary(result.summary || {});
    } catch (err) { toast.error(err.message || 'Could not load the report'); }
    finally { setLoading(false); }
  };

  // The report follows the selection — no separate "Generate" step.
  useEffect(() => { fetchReport(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reportType, dateRange.start, dateRange.end]);

  const fileBase = `${reportType}-report-${dateRange.start}-to-${dateRange.end}`;

  // Simple A4 report. The built-in PDF font has no "₹" glyph (it prints a
  // stray "¹" and spreads the letters of that line), so money is "Rs.".
  const downloadPDF = async () => {
    if (!data) return;
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
      const autoTable = autoTableModule.default;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const M = 14;
      const BLUE = [37, 99, 235];
      const INK = [17, 24, 39];
      const MUTED = [107, 114, 128];
      const LINE = [229, 231, 235];

      const isDateKey = (k) => /^(date|registered|joined|createdAt)$/i.test(k);
      const pdfValue = (k, v) => {
        if (typeof v === 'number') return isMoneyKey(k) ? `Rs. ${v.toLocaleString('en-IN')}` : v.toLocaleString('en-IN');
        if (isDateKey(k) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return fmtDay(String(v).slice(0, 10));
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        return String(v ?? '').replace(/₹/g, 'Rs. ');
      };

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...BLUE);
      doc.text('growthkarts', M, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(`Generated ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageW - M, 16, { align: 'right' });
      doc.setDrawColor(...LINE);
      doc.line(M, 20, pageW - M, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...INK);
      doc.text(activeType.title, M, 31);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text(`Period: ${fmtDay(dateRange.start)} to ${fmtDay(dateRange.end)}`, M, 38);
      let y = 46;

      // Summary boxes
      const entries = Object.entries(summary || {});
      if (entries.length) {
        const gap = 4;
        const cols = Math.min(entries.length, 4);
        const boxW = (pageW - M * 2 - gap * (cols - 1)) / cols;
        entries.forEach(([k, v], i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = M + col * (boxW + gap);
          const by = y + row * 22;
          doc.setDrawColor(...LINE);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(x, by, boxW, 18, 2, 2, 'FD');
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          doc.text(labelOf(k), x + 4, by + 6.5);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...INK);
          doc.text(pdfValue(k, v), x + 4, by + 14);
          doc.setFont('helvetica', 'normal');
        });
        y += Math.ceil(entries.length / cols) * 22 + 4;
      }

      // Table
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const numericCol = Object.fromEntries(keys.map((k, i) => [i, typeof data[0][k] === 'number' ? { halign: 'right' } : {}]));
        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M, bottom: 18 },
          head: [keys.map(labelOf)],
          body: data.map(row => keys.map(k => pdfValue(k, row[k]))),
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5, textColor: INK, lineColor: LINE, lineWidth: 0.2 },
          headStyles: { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: numericCol,
          didParseCell: (hook) => {
            if (hook.section === 'head' && numericCol[hook.column.index]?.halign) hook.cell.styles.halign = 'right';
          },
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(...MUTED);
        doc.text('No data for this period.', M, y + 6);
      }

      // Footer on every page
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        const h = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...LINE);
        doc.line(M, h - 12, pageW - M, h - 12);
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(`growthkarts · ${activeType.title}`, M, h - 7);
        doc.text(`Page ${i} of ${pages}`, pageW - M, h - 7, { align: 'right' });
      }

      doc.save(`${fileBase}.pdf`);
    } catch { toast.error('Could not generate PDF'); }
    finally { setExportingPdf(false); }
  };

  const pickQuick = (q) => { setQuick(q.key); setDateRange(q.range()); };
  const setDate = (key, value) => { setQuick(''); setDateRange(r => ({ ...r, [key]: value })); };

  return (
    <Wrapper title="Reports & Analytics" subtitle="Pick a report and a period — it updates straight away">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
        {/* Report type tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar px-3 sm:px-4 pt-3 border-b border-gray-100 dark:border-gray-800" role="tablist" aria-label="Report type">
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon;
            const active = reportType === rt.value;
            return (
              <button key={rt.value} role="tab" aria-selected={active} onClick={() => setReportType(rt.value)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}>
                <Icon className="w-4 h-4" /> {rt.label}
              </button>
            );
          })}
        </div>

        {/* Period */}
        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5" role="group" aria-label="Quick range">
            {QUICK_RANGES.map(q => (
              <button key={q.key} onClick={() => pickQuick(q)} aria-pressed={quick === q.key}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${quick === q.key ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={dateRange.start} max={dateRange.end || undefined} onChange={e => setDate('start', e.target.value)} aria-label="From date" className={inputCls} />
            <span className="text-xs text-gray-400 dark:text-gray-500">to</span>
            <input type="date" value={dateRange.end} min={dateRange.start || undefined} onChange={e => setDate('end', e.target.value)} aria-label="To date" className={inputCls} />
          </div>
          <button onClick={fetchReport} disabled={loading || !rangeValid} title="Refresh"
            className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {!rangeValid && <p className="text-xs text-red-600 dark:text-red-400">Choose a From date on or before the To date.</p>}
        </div>
      </div>

      {/* Report */}
      {!data && loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">{[0, 1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
          <div className="h-72 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        </div>
      ) : data && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {/* Report header + downloads */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{activeType.title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDay(dateRange.start)} – {fmtDay(dateRange.end)} · {data.length} row{data.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadPDF} disabled={!data.length || exportingPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
                <FiFileText className="w-4 h-4" /> {exportingPdf ? 'Building…' : 'PDF'}
              </button>
            </div>
          </div>

          {/* Summary */}
          {summary && Object.keys(summary).length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {Object.entries(summary).map(([key, val]) => (
                <div key={key} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{labelOf(key)}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 truncate tabular-nums">{showValue(key, val)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Trend */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{activeType.chartLabel} over time</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Per day, {fmtDay(dateRange.start)} – {fmtDay(dateRange.end)}</p>
            {chartData.length === 0 ? (
              <div className="h-56 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">Nothing in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={t.grid} />
                  <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: t.grid }} tick={{ fontSize: 11, fill: t.axis }} minTickGap={24}
                    tickFormatter={d => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} />
                  <YAxis tickLine={false} axisLine={false} width={reportType === 'sales' ? 64 : 36} allowDecimals={false} tick={{ fontSize: 11, fill: t.axis }}
                    tickFormatter={v => (reportType === 'sales' ? `₹${v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v}` : v)} />
                  <Tooltip cursor={{ stroke: t.axis, strokeWidth: 1 }} content={({ active, payload, label }) => (active && payload?.length ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-xs">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{fmtDay(label)}</p>
                      <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.series }} />
                        {activeType.chartLabel}: {reportType === 'sales' ? `₹${Number(payload[0].value).toLocaleString('en-IN')}` : payload[0].value}
                      </p>
                    </div>
                  ) : null)} />
                  <Area type="monotone" dataKey="value" stroke={t.series} strokeWidth={2} fill={t.fill} isAnimationActive={false}
                    dot={false} activeDot={{ r: 5, fill: t.series, stroke: t.surface, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            {data.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-400 dark:text-gray-500 px-4">No data for the selected period</div>
            ) : (
              <>
              <div className="overflow-x-auto max-h-[32rem]">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      {Object.keys(data[0]).map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{labelOf(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {tablePage.pageItems.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        {Object.entries(row).map(([k, val]) => (
                          <td key={k} className={`px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap ${typeof val === 'number' ? 'tabular-nums' : ''}`}>{showValue(k, val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={tablePage.page} limit={tablePage.limit} total={tablePage.total} onPageChange={tablePage.setPage} />
              </>
            )}
          </div>
        </div>
      )}
    </Wrapper>
  );
}
