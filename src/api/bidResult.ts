import type { BidOpeningResult } from "../../lib/g2b/types";

/** 백엔드(/api/bid-result)를 호출해 개찰 결과 통합 객체를 받아온다. */
export async function fetchBidResult(
  bidNtceNo: string,
  bidNtceOrd?: string,
): Promise<BidOpeningResult> {
  const query = new URLSearchParams({ bidNtceNo });
  if (bidNtceOrd) query.set("bidNtceOrd", bidNtceOrd);

  const res = await fetch(`/api/bid-result?${query.toString()}`);
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message ?? `조회에 실패했습니다 (HTTP ${res.status})`);
  }
  return data as BidOpeningResult;
}
