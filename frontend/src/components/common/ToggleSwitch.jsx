// Simple accessible on/off switch — used wherever a checkbox reads as a
// binary setting (e.g. "Cash on Delivery available?") rather than a list
// selection, so it's visually obvious at a glance.
export default function ToggleSwitch({ checked, onChange, label, color = 'bg-indigo-600' }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? color : 'bg-gray-300 dark:bg-gray-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      {label && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}
