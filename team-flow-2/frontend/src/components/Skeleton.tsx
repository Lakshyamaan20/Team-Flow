export function SkeletonRow({ cols = 8 }: { cols?: number }) {
  return (
    <tr className="border-b border-surface-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 rounded-md bg-surface-200 animate-pulse ${i === 0 ? "w-3/5" : i === 1 ? "w-2/5" : "w-3/5"}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-surface-200 animate-pulse" />
        <div className="w-16 h-5 rounded-full bg-surface-200 animate-pulse" />
      </div>
      <div className="h-5 w-3/4 rounded-md bg-surface-200 animate-pulse mb-2" />
      <div className="h-4 w-full rounded-md bg-surface-200 animate-pulse mb-1" />
      <div className="h-4 w-2/3 rounded-md bg-surface-200 animate-pulse mb-4" />
      <div className="h-4 w-full rounded-md bg-surface-200 animate-pulse mb-2" />
      <div className="flex items-center justify-between pt-3 border-t border-surface-100">
        <div className="h-4 w-16 rounded-md bg-surface-200 animate-pulse" />
        <div className="h-4 w-20 rounded-md bg-surface-200 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="flex items-end justify-around gap-2 h-48 px-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 bg-surface-200 animate-pulse rounded-t-md" style={{ height: `${30 + Math.random() * 70}%` }} />
      ))}
    </div>
  );
}
