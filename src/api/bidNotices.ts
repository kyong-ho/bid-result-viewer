import type { BidNoticeList } from "../../lib/g2b/types";

export interface BidNoticeQuery {
  from: string;
  to: string;
  keyword?: string;
  pageNo?: number;
  numOfRows?: number;
}

/** 백엔드(/api/bid-notices)를 호출해 용역 입찰공고 목록을 받아온다. */
export async function fetchBidNotices(
  query: BidNoticeQuery,
): Promise<BidNoticeList> {
  const params = new URLSearchParams({
    from: query.from,
    to: query.to,
    pageNo: String(query.pageNo ?? 1),
    numOfRows: String(query.numOfRows ?? 20),
  });
  if (query.keyword?.trim()) params.set("keyword", query.keyword.trim());

  const res = await fetch(`/api/bid-notices?${params.toString()}`);
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message ?? `목록 조회에 실패했습니다 (HTTP ${res.status})`);
  }
  return data as BidNoticeList;
}
