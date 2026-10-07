import { FiLock } from 'react-icons/fi';

// Shown in the seller panel wherever a feature isn't part of the seller's
// current plan (the backend enforces the same rule).
export function PlanLockedCard({ title, message, planName }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-amber-300 dark:border-amber-500/40 p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
        <FiLock className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
        {message || `This feature is not included in your ${planName || 'current'} plan.`} Contact the admin to upgrade your plan.
      </p>
    </div>
  );
}

// Small inline pill, e.g. next to a locked option.
export function PlanLockBadge({ label = 'Upgrade' }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <FiLock className="w-3 h-3" /> {label}
    </span>
  );
}
