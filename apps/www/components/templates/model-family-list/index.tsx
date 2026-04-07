'use client';

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from 'react';

import ModelFamilyRow from './row';
import { ChevronsUpDown, Search } from 'lucide-react';
import { useQueryState } from 'nuqs';

import type { RankedModelFamily } from '@/lib/queries/model-families-ranked';
import { MODEL_FAMILY_SORT_OPTIONS, type ModelFamilySort } from '@/lib/queries/model-families-sort';

import StateInfo from '@/components/templates/state-info';
import { Button, Dropdown, Input } from '@/components/ui';

const SORT_LABELS: Record<ModelFamilySort, string> = {
  newest: 'Newest',
  'most-tested': 'Most tested',
  'least-tested': 'Least tested',
};

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

type ModelFamiliesListProps = {
  initialData: RankedModelFamily[];
  total: number;
  searchTotal: number;
  pageSize: number;
  orgSlug?: string;
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const ModelFamiliesList: React.FC<ModelFamiliesListProps> = ({
  initialData,
  total,
  searchTotal,
  pageSize,
  orgSlug,
}) => {
  const [q, setQ] = useQueryState('q', { shallow: false, throttleMs: 300 });
  const [sort, setSort] = useQueryState('sort', { shallow: false, defaultValue: 'newest' });
  const [localQuery, setLocalQuery] = useState(q ?? '');
  const [items, setItems] = useState<RankedModelFamily[]>(initialData);
  const [totalCount, setTotalCount] = useState(searchTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hasMore = items.length < totalCount;

  const sentinelRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

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
      if (orgSlug) params.set('orgSlug', orgSlug);
      if (sort) params.set('sort', sort);
      const res = await fetch(`/api/model-families?${params}`);
      return res.json();
    },
    [pageSize, orgSlug, sort],
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

  const Skeleton = (
    <Fragment>
      {Array.from({ length: 10 }).map((_, i) => (
        <ModelFamilyRow.Skeleton key={i} />
      ))}
    </Fragment>
  );
  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <div className="flex gap-2">
        <Input
          size="sm"
          className="flex-1"
          leftIcon={<Search />}
          placeholder={`Search ${total} model${total > 1 ? 's' : ''}…`}
          value={localQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          containerized={false}
        />
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button className="h-9" variant="outline" rightIcon={<ChevronsUpDown />}>
              {SORT_LABELS[(sort as ModelFamilySort) ?? 'newest']}
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            {MODEL_FAMILY_SORT_OPTIONS.map((option) => (
              <Dropdown.Item
                key={option}
                onSelect={() => setSort(option === 'newest' ? null : option)}
              >
                {SORT_LABELS[option]}
              </Dropdown.Item>
            ))}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <div>
        {items.map((item, i) => (
          <div key={i}>
            {i > 0 ? (
              <hr
                className="my-1 h-px w-full rounded-full border-0 bg-gray-6"
                role="separator"
                aria-hidden
              />
            ) : null}
            <ModelFamilyRow item={item} />
          </div>
        ))}
        {items.length === 0 && !isLoading && !isPending ? (
          <div className="flex w-full items-center justify-center rounded-xl border border-gray-6 bg-gray-2 px-4 py-6 md:py-6">
            <StateInfo
              size="sm"
              title="No models found"
              description="Try a different search term."
              icon={<Search />}
            />
          </div>
        ) : null}
        <div ref={sentinelRef} className="h-1" aria-hidden />
        {isLoading || isPending ? Skeleton : null}
      </div>
    </div>
  );
};

export default ModelFamiliesList;
