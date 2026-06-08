export const LoadingSkeleton = ({ count = 3 }: { count?: number }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-charcoal-100 space-y-3">
          {/* Header skeleton */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="h-4 bg-charcoal-100 rounded-md w-3/4 mb-2 animate-pulse" />
              <div className="h-3 bg-charcoal-100 rounded-md w-1/2 animate-pulse" />
            </div>
          </div>

          {/* Content skeleton */}
          <div className="space-y-2">
            <div className="h-3 bg-charcoal-100 rounded-md w-full animate-pulse" />
            <div className="h-3 bg-charcoal-100 rounded-md w-5/6 animate-pulse" />
          </div>

          {/* Footer skeleton */}
          <div className="flex gap-2 pt-2">
            <div className="h-8 bg-charcoal-100 rounded-lg flex-1 animate-pulse" />
            <div className="h-8 bg-charcoal-100 rounded-lg flex-1 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
};
