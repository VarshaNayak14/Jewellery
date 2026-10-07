export function Skeleton({ className = '', ...props }) {
  return <div className={`skeleton dark:bg-gray-700 ${className}`} {...props} />;
}

export function ProductCardSkeleton({ dark = false }) {
  return (
    <div className={`p-0 overflow-hidden rounded-2xl ${dark ? 'bg-white/5 border border-white/10' : 'card dark:bg-gray-900 dark:border-gray-800'}`}>
      <Skeleton className={`w-full h-72 ${dark ? '!bg-white/10' : ''}`} />
      <div className="p-4 space-y-3">
        <Skeleton className={`h-4 w-3/4 ${dark ? '!bg-white/10' : ''}`} />
        <Skeleton className={`h-3 w-1/2 ${dark ? '!bg-white/10' : ''}`} />
        <div className="flex gap-2">
          <Skeleton className={`h-6 w-16 ${dark ? '!bg-white/10' : ''}`} />
          <Skeleton className={`h-6 w-12 ${dark ? '!bg-white/10' : ''}`} />
        </div>
        <Skeleton className={`h-10 w-full rounded-xl ${dark ? '!bg-white/10' : ''}`} />
      </div>
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-24 rounded-lg" />
    </div>
  );
}

export default Skeleton;
