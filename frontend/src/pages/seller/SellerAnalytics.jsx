import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
} from 'recharts';
import { FiArrowUpRight, FiArrowDownRight, FiMinus, FiStar, FiTable, FiBarChart2 } from 'react-icons/fi';
import { sellerAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { useSellerStore } from '../../store/sellerStore';
import { useTheme } from '../../context/ThemeContext';
import { capsOf } from '../../utils/planFeatures';
import { PlanLockedCard } from '../../components/common/PlanLock';

// Today in India, as YYYY-MM-DD — the default / max for the date pickers.
const todayIST = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const FILTER_MODES = [
  { key: 'last12', label: 'Last 12 months' },
  { key: 'month', label: 'Month' },
  { key: 'dates', label: 'Custom dates' },
];

const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', packed: 'Packed', ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked up', shipped: 'Shipped', in_transit: 'In transit', out_for_delivery: 'Out for delivery',
  delivered: 'Delivered', failed_delivery: 'Failed delivery', cancelled: 'Cancelled', returned: 'Returned', refunded: 'Refunded',
};

// Chart tokens — one hue (series slot 1) for every single-series chart,
// recessive grid/axes, text in text ink. Light/dark are separate steps.
const TOKENS = {
  light: { series: '#2a78d6', fill: 'rgba(42,120,214,0.14)', grid: '#e5e7eb', axis: '#6b7280', text: '#111827', surface: '#ffffff', track: '#f1f5f9' },
  dark: { series: '#3987e5', fill: 'rgba(57,135,229,0.22)', grid: '#1f2937', axis: '#9ca3af', text: '#f3f4f6', surface: '#111827', track: '#1f2937' },
};

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const compactRupees = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${Math.round(n)}`);

// Change vs the previous period of the same length.
function Delta({ now, before }) {
  if (!before && !now) return <span className="text-xs text-gray-400 dark:text-gray-500">No sales in either period</span>;
  if (!before) return <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1"><FiArrowUpRight className="w-3.5 h-3.5" /> New vs previous period</span>;
  const pct = Math.round(((now - before) / before) * 100);
  const Icon = pct > 0 ? FiArrowUpRight : pct < 0 ? FiArrowDownRight : FiMinus;
  const tone = pct > 0 ? 'text-green-700 dark:text-green-400' : pct < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
  return (
    <span className={`text-xs font-medium inline-flex items-center gap-1 ${tone}`}>
      <Icon className="w-3.5 h-3.5" /> {pct > 0 ? '+' : ''}{pct}% vs previous period
    </span>
  );
}

function Tile({ label, value, children }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">{value}</p>
      <div className="mt-1.5 min-h-[1rem]">{children}</div>
    </div>
  );
}

function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-6 border border-gray-100 dark:border-gray-800 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, metric, t }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{label}</p>
      <p className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.series }} />
        {metric === 'revenue' ? `Revenue ${rupees(row.revenue)}` : `${row.orders} order${row.orders === 1 ? '' : 's'}`}
      </p>
      <p className="text-gray-500 dark:text-gray-400 mt-0.5">
        {metric === 'revenue' ? `${row.orders} order${row.orders === 1 ? '' : 's'}` : rupees(row.revenue)}
      </p>
    </div>
  );
}

// Horizontal bars: one hue, ≤ 20px thick, 4px rounded data-end, value at the end.
function HBarChart({ data, valueKey, labelKey, format, t, height }) {
  return (
    <ResponsiveContainer width="100%" height={height || Math.max(data.length * 40, 80)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap={10}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis type="category" dataKey={labelKey} width={120} tickLine={false} axisLine={false} tick={{ fill: t.axis, fontSize: 12 }} />
        <Tooltip cursor={{ fill: t.track }} content={({ active, payload }) => active && payload?.length ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-lg text-xs text-gray-800 dark:text-gray-100">
            <span className="font-semibold">{payload[0].payload[labelKey]}</span>: {format(payload[0].value)}
          </div>
        ) : null} />
        <Bar dataKey={valueKey} fill={t.series} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
          <LabelList dataKey={valueKey} position="right" formatter={format} style={{ fill: t.text, fontSize: 12, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function SellerAnalytics() {
  const { seller } = useSellerStore();
  const { isDark } = useTheme();
  const t = isDark ? TOKENS.dark : TOKENS.light;
  const analyticsAllowed = capsOf(seller?.planSnapshot).analytics;
  // Period filter: last 12 months, one calendar month, or custom dates.
  const [mode, setMode] = useState('last12');
  const [month, setMonth] = useState(() => todayIST().slice(0, 7));
  const [fromDate, setFromDate] = useState(() => `${todayIST().slice(0, 8)}01`);
  const [toDate, setToDate] = useState(() => todayIST());
  const datesValid = fromDate && toDate && fromDate <= toDate;
  const params = mode === 'month' ? { month }
    : mode === 'dates' ? (datesValid ? { from: fromDate, to: toDate } : null)
    : { range: '12m' };
  const paramsKey = JSON.stringify(params);
  const [metric, setMetric] = useState('revenue');
  const [showTable, setShowTable] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!analyticsAllowed) { setLoading(false); return; }
    if (!params) return; // custom dates not complete yet
    let cancelled = false;
    setLoading(true);
    sellerAPI.getAnalytics(params)
      .then(d => { if (!cancelled) setData(d); })
      .catch((err) => toast.error(err.message || 'Failed to load analytics'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsAllowed, paramsKey]);

  if (!analyticsAllowed) {
    return (
      <SellerLayout>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Growth & Analytics</h1>
        <PlanLockedCard title="Analytics is locked" planName={seller?.planSnapshot?.name}
          message={`Growth & Analytics is not included in your ${seller?.planSnapshot?.name || 'current'} plan.`} />
      </SellerLayout>
    );
  }

  const periodLabel = data?.period?.label || '';
  const periodText = mode === 'last12' ? `the ${periodLabel}` : periodLabel;
  const inputCls = 'px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-100 [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-blue-400';
  const s = data?.summary;
  const series = data?.series || [];
  const hasSales = (s?.orders || 0) > 0;
  const statusData = (data?.statusCounts || []).map(x => ({ ...x, label: STATUS_LABEL[x.status] || x.status }));
  const paymentData = (data?.payment || []).filter(p => p.orders > 0);
  const maxProductRevenue = Math.max(...(data?.topProducts || []).map(p => p.revenue), 1);
  const maxRatingCount = Math.max(...(data?.ratings?.distribution || []).map(r => r.count), 1);

  return (
    <SellerLayout>
      <div className="p-0 sm:p-2 lg:p-4 space-y-6">
        {/* Title + the one filter row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Growth & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{periodLabel ? `Your sales for ${periodText}` : 'Your sales'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={mode} onChange={e => setMode(e.target.value)} aria-label="Period" className={inputCls}>
              {FILTER_MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
            {mode === 'month' && (
              <input type="month" value={month} max={todayIST().slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)}
                aria-label="Month" className={inputCls} />
            )}
            {mode === 'dates' && (
              <>
                <input type="date" value={fromDate} max={toDate || todayIST()} onChange={e => setFromDate(e.target.value)} aria-label="From date" className={inputCls} />
                <span className="text-xs text-gray-500 dark:text-gray-400">to</span>
                <input type="date" value={toDate} min={fromDate || undefined} max={todayIST()} onChange={e => setToDate(e.target.value)} aria-label="To date" className={inputCls} />
              </>
            )}
          </div>
          {mode === 'dates' && !datesValid && (
            <p className="w-full text-xs text-red-600 dark:text-red-400 text-right">Choose a From date on or before the To date.</p>
          )}
        </div>

        {loading && !data ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : data && (
          <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <Tile label="Revenue" value={rupees(s.revenue)}><Delta now={s.revenue} before={s.previous.revenue} /></Tile>
              <Tile label="Orders" value={s.orders}><Delta now={s.orders} before={s.previous.orders} /></Tile>
              <Tile label="Units sold" value={s.units} />
              <Tile label="Avg. order value" value={rupees(s.avgOrderValue)} />
              <Tile label="Avg. rating" value={data.ratings.count ? data.ratings.avg.toFixed(1) : '—'}>
                <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                  <FiStar className="w-3.5 h-3.5" /> {data.ratings.count} review{data.ratings.count === 1 ? '' : 's'}
                </span>
              </Tile>
            </div>

            {/* Trend */}
            <Card
              title={metric === 'revenue' ? 'Revenue over time' : 'Orders over time'}
              subtitle={`${periodLabel}${data.period?.unit ? ` · by ${data.period.unit}` : ''} · cancelled, returned and refunded orders not counted`}
              action={
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5" role="group" aria-label="Metric">
                    {['revenue', 'orders'].map(m => (
                      <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize ${metric === m ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900' : 'text-gray-600 dark:text-gray-300'}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowTable(v => !v)} title={showTable ? 'Show chart' : 'Show as table'}
                    className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    {showTable ? <FiBarChart2 className="w-4 h-4" /> : <FiTable className="w-4 h-4" />}
                  </button>
                </div>
              }
            >
              {showTable ? (
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-gray-900">
                      <tr><th className="text-left py-2">Period</th><th className="text-right py-2">Orders</th><th className="text-right py-2">Revenue</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200 tabular-nums">
                      {series.map(row => (
                        <tr key={row.key}><td className="py-1.5">{row.label}</td><td className="text-right">{row.orders}</td><td className="text-right">{rupees(row.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !hasSales ? (
                <div className="h-64 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">No sales in {periodText}</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={t.grid} />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: t.grid }} tick={{ fill: t.axis, fontSize: 11 }} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={metric === 'revenue' ? 56 : 32} allowDecimals={false}
                      tick={{ fill: t.axis, fontSize: 11 }} tickFormatter={metric === 'revenue' ? compactRupees : undefined} />
                    <Tooltip content={<ChartTooltip metric={metric} t={t} />} cursor={{ stroke: t.axis, strokeWidth: 1 }} />
                    <Area type="monotone" dataKey={metric} stroke={t.series} strokeWidth={2} fill={t.fill} isAnimationActive={false}
                      dot={false} activeDot={{ r: 5, fill: t.series, stroke: t.surface, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Orders by status" subtitle={`All orders placed in ${periodText}`}>
                {statusData.length === 0
                  ? <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No orders yet</p>
                  : <HBarChart data={statusData} valueKey="count" labelKey="label" format={(v) => v} t={t} />}
              </Card>

              <Card title="Payment method" subtitle="Revenue by how customers paid">
                {paymentData.length === 0
                  ? <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No sales yet</p>
                  : <>
                      <HBarChart data={paymentData} valueKey="revenue" labelKey="method" format={rupees} t={t} />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {paymentData.map(p => `${p.method}: ${p.orders} order${p.orders === 1 ? '' : 's'} (${Math.round((p.revenue / (s.revenue || 1)) * 100)}%)`).join(' · ')}
                      </p>
                    </>}
              </Card>

              <Card title="Top selling products" subtitle="By revenue">
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">No product sales yet</p>
                ) : (
                  <ul className="space-y-3">
                    {data.topProducts.map((p, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4">{i + 1}</span>
                        {p.image ? <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" /> : <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">{rupees(p.revenue)}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: t.track }}>
                              <div className="h-full rounded-full" style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, background: t.series }} />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">{p.units} sold</span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="Ratings" subtitle={data.ratings.count ? `${data.ratings.avg.toFixed(1)} average from ${data.ratings.count} review${data.ratings.count === 1 ? '' : 's'} (all time)` : 'No reviews yet'}>
                <ul className="space-y-2.5">
                  {data.ratings.distribution.map(r => (
                    <li key={r.stars} className="flex items-center gap-3 text-sm">
                      <span className="w-8 text-gray-700 dark:text-gray-300 inline-flex items-center gap-0.5">{r.stars}<FiStar className="w-3 h-3" /></span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: t.track }}>
                        <div className="h-full rounded-full" style={{ width: `${(r.count / maxRatingCount) * 100}%`, background: t.series }} />
                      </div>
                      <span className="w-8 text-right text-gray-900 dark:text-gray-100 tabular-nums">{r.count}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Inventory health */}
            <Card title="Inventory health" subtitle="Right now">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Products', value: data.products.total },
                  { label: 'Active', value: data.products.active },
                  { label: 'Low stock (≤ 5)', value: data.products.lowStock, warn: data.products.lowStock > 0 },
                  { label: 'Out of stock', value: data.products.outOfStock, warn: data.products.outOfStock > 0 },
                ].map(x => (
                  <div key={x.label} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{x.value}</p>
                    <p className={`text-xs mt-0.5 ${x.warn ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {x.warn ? '⚠ ' : ''}{x.label}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
