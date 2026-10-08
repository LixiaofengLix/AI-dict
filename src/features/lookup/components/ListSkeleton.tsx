import { Skeleton } from '../../../components/Skeleton';

/** 列表类 Tab 的骨架屏：单词簇、常见搭配共用 */
export function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-1">
      <Skeleton width="30%" />
      <Skeleton />
      <Skeleton width="80%" />
      <Skeleton width="30%" className="mt-4" />
      <Skeleton />
      <Skeleton width="60%" />
    </div>
  );
}
