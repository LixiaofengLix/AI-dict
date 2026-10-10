import { Skeleton } from '../../../components/Skeleton';
import { CARD } from '../../../components/styles';

/** 列表类 Tab 的骨架屏：单词簇、常见搭配共用，样子和 AI 词典的一致（样张 05） */
export function ListSkeleton() {
  return (
    <div className={`flex flex-col gap-[22px] ${CARD.plain}`}>
      <div className="flex flex-col gap-2">
        <Skeleton width="30%" />
        <Skeleton />
        <Skeleton width="80%" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton width="36%" />
        <Skeleton width="60%" />
      </div>
    </div>
  );
}
