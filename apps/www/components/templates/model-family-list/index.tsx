'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import ModelFamilyRow from './row';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { useQueryState } from 'nuqs';

import type { RankedModelFamily } from '@/lib/queries/model-families-ranked';

import { Input } from '@/components/ui';

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelFamiliesListProps = {
  initialData: RankedModelFamily[];
  total: number;
  searchTotal: number;
  pageSize: number;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelFamiliesList: React.FC<ModelFamiliesListProps> = ({
  initialData,
  total,
  searchTotal,
  pageSize,
}) => {
  const [q, setQ] = useQueryState('q', { shallow: false, throttleMs: 300 });
  const [localQuery, setLocalQuery] = useState(q ?? '');
  const [items, setItems] = useState<RankedModelFamily[]>(initialData);
  const [totalCount, setTotalCount] = useState(searchTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasMore = items.length < totalCount;

  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const virtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 88,
    overscan: 10,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  // Sync server data when `initialData`/`searchTotal` change (after URL-driven
  // navigation).
  useEffect(() => {
    setItems(initialData);
    setTotalCount(searchTotal);
  }, [initialData, searchTotal]);

  const fetchPage = useCallback(
    async (offset: number, query: string) => {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(pageSize),
      });
      if (query) params.set('q', query);
      const res = await fetch(`/api/v0/model-families?${params}`);
      return res.json();
    },
    [pageSize],
  );

  // Debounce local input → URL param
  const handleSearchChange = (value: string) => {
    setLocalQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        setQ(value || null);
      });
    }, 300);
  };

  // Infinite scroll: load more
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const json = await fetchPage(items.length, q ?? '');
      setItems((prev) => [...prev, ...json.data]);
      setTotalCount(json.total);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, items.length, q, fetchPage]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="flex flex-col gap-4">
      <Input
        leftIcon={<Search />}
        placeholder={`Search ${total} model${total > 1 ? 's' : ''}…`}
        value={localQuery}
        onChange={(e) => handleSearchChange(e.target.value)}
        containerized={false}
      />
      <div ref={listRef}>
        <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
          <div
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${(virtualItems[0]?.start ?? 0) - virtualizer.options.scrollMargin}px)`,
            }}
          >
            {virtualItems.map((virtualRow, i) => {
              const item = items[virtualRow.index];
              return (
                <div
                  key={item.familyId}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                >
                  <hr
                    className={clsx(
                      'h-px w-full rounded-full border-0 bg-gray-6',
                      i > 0 ? 'my-1' : 'mb-1',
                    )}
                    role="separator"
                    aria-hidden
                  />
                  <ModelFamilyRow item={item} />
                </div>
              );
            })}
            {virtualItems.length > 0 ? (
              <hr
                className="mt-1 h-px w-full rounded-full border-0 bg-gray-6"
                role="separator"
                aria-hidden
              />
            ) : null}
          </div>
        </div>
        {items.length === 0 && !isLoading && !isPending ? (
          <p className="py-8 text-center text-sm text-gray-11">No models found.</p>
        ) : null}
        <div ref={sentinelRef} className="h-1" />
        {isLoading || isPending ? (
          <p className="py-4 text-center text-sm text-gray-11">Loading...</p>
        ) : null}
      </div>
    </div>
  );
};

export default ModelFamiliesList;
