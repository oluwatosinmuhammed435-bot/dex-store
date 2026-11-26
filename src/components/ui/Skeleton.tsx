import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`rounded-lg bg-[#EAF5EE]/80 motion-safe:animate-pulse ${className}`}
  />
);

export const ProductCardSkeleton: React.FC = () => (
  <div className="bg-[#FFFFFF] border border-[#E2EAE5] rounded-2xl overflow-hidden p-2.5 sm:p-3 space-y-3">
    <Skeleton className="aspect-square w-full rounded-xl" />
    <div className="space-y-2 px-1">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <div className="pt-1 flex gap-2 px-1">
      <Skeleton className="h-9 flex-1 rounded-xl" />
      <Skeleton className="h-9 w-9 rounded-xl" />
    </div>
  </div>
);
