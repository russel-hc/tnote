const DEFAULT_PAGE_SIZE = 1000;

interface RangeableQuery<T> {
  range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
}

// Supabase REST 기본 max-rows(1000) 제한을 우회하기 위해 .range로 모든 페이지를 가져온다.
// build()는 반드시 안정적인 .order()가 적용된 쿼리를 반환해야 한다.
export const fetchAllRows = async <T>(build: () => RangeableQuery<T>, pageSize = DEFAULT_PAGE_SIZE): Promise<T[]> => {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
};
