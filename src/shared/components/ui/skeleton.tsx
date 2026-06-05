interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-radius-200 bg-components-fill-standard-tertiary ${className}`} />;
}

interface SkeletonSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const spinnerSizeClasses = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
};

export function SkeletonSpinner({ className = "min-h-[50vh]", size = "lg" }: SkeletonSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-live="polite">
      <div
        className={`${spinnerSizeClasses[size]} animate-spin rounded-full border-2 border-core-accent border-t-transparent`}
      />
    </div>
  );
}

export type SkeletonColumnDef =
  | string // 단순 width class (예: "w-16")
  | { width: string; rounded?: boolean } // width + rounded badge 스타일
  | { width: string; stacked: [string, string] } // 두 줄 스택 (예: 이름 + 부제목)
  | { width: string; badges: string[] } // 여러 뱃지
  | { width: string; buttons: string[] } // 여러 버튼
  | "action"; // 마지막 액션 컬럼 (드롭다운 메뉴)

interface SkeletonTableProps {
  rows?: number;
  columns: SkeletonColumnDef[];
}

export function SkeletonTable({ rows = 5, columns }: SkeletonTableProps) {
  const renderHeaderCell = (col: SkeletonColumnDef, index: number) => {
    if (col === "action") {
      return <th key={index} className="w-24 whitespace-nowrap px-spacing-500 py-spacing-400" />;
    }
    const width = typeof col === "string" ? col : col.width;
    return (
      <th key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400 text-left">
        <Skeleton className={`h-6 ${width}`} />
      </th>
    );
  };

  const renderBodyCell = (col: SkeletonColumnDef, index: number) => {
    if (col === "action") {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <Skeleton className="ml-auto h-9 w-11 rounded-radius-200" />
        </td>
      );
    }

    if (typeof col === "string") {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <Skeleton className={`h-6 ${col}`} />
        </td>
      );
    }

    if ("rounded" in col && col.rounded) {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <Skeleton className={`h-7 ${col.width} rounded-radius-200`} />
        </td>
      );
    }

    if ("stacked" in col) {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <div className="flex flex-col gap-spacing-100">
            <Skeleton className={`h-6 ${col.stacked[0]}`} />
            <Skeleton className={`h-5 ${col.stacked[1]}`} />
          </div>
        </td>
      );
    }

    if ("badges" in col) {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <div className="flex gap-spacing-100">
            {col.badges.map((w, i) => (
              <Skeleton key={i} className={`h-6 ${w} rounded-radius-200`} />
            ))}
          </div>
        </td>
      );
    }

    if ("buttons" in col) {
      return (
        <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
          <div className="flex gap-spacing-200">
            {col.buttons.map((w, i) => (
              <Skeleton key={i} className={`h-9 ${w} rounded-radius-300`} />
            ))}
          </div>
        </td>
      );
    }

    return (
      <td key={index} className="whitespace-nowrap px-spacing-500 py-spacing-400">
        <Skeleton className={`h-6 ${col.width}`} />
      </td>
    );
  };

  return (
    <div className="overflow-x-auto rounded-radius-400 border border-line-outline bg-components-fill-standard-primary">
      <table className="w-full rounded-radius-400">
        <thead className="bg-components-fill-standard-secondary">
          <tr>{columns.map(renderHeaderCell)}</tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, rowIndex) => (
            <tr key={rowIndex} className="border-line-divider border-t">
              {columns.map(renderBodyCell)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
