import { fetchG2bItems } from "./client";
import { G2bApiError, toHttpError } from "./errors";
import { mapBidder, mapNotice, mapPreliminaryPrice } from "./mappers";
import type {
  RawBidNotice,
  RawOpengResult,
  RawPreliminaryPriceDetail,
} from "./rawTypes";
import type { BidOpeningResult } from "./types";

export type { G2bErrorCode, HttpErrorResponse } from "./errors";
export type * from "./types";
export { G2bApiError, toHttpError };

export interface FetchBidOpeningResultParams {
  serviceKey: string;
  bidNtceNo: string; // 입찰공고번호
  bidNtceOrd?: string; // 공고 차수 (선택, "0"·"1"도 "000"·"001"로 정규화)
  baseUrl?: string;
}

/** 공고번호 기준으로 조달청 API 3종을 병렬 호출해 개찰 결과 통합 객체를 만든다. */
export async function fetchBidOpeningResult(
  params: FetchBidOpeningResultParams,
): Promise<BidOpeningResult> {
  const { serviceKey, bidNtceNo, baseUrl } = params;
  const bidNtceOrd = normalizeOrd(params.bidNtceOrd);
  const client = { serviceKey, baseUrl };
  const paging = { pageNo: 1, numOfRows: 100 };

  const [notices, prelimRows, bidderRows] = await Promise.all([
    fetchG2bItems<RawBidNotice>(
      client,
      "/ad/BidPublicInfoService/getBidPblancListInfoServc",
      {
        inqryDiv: 2,
        bidNtceNo,
        pageNo: 1,
        numOfRows: 10,
      },
    ),
    fetchG2bItems<RawPreliminaryPriceDetail>(
      client,
      "/as/ScsbidInfoService/getOpengResultListInfoServcPreparPcDetail",
      { inqryDiv: 2, bidNtceNo, ...paging },
    ),
    fetchG2bItems<RawOpengResult>(
      client,
      "/as/ScsbidInfoService/getOpengResultListInfoOpengCompt",
      {
        bidNtceNo,
        bidNtceOrd,
        ...paging,
      },
    ),
  ]);

  const notice = pickNotice(notices, bidNtceOrd);
  if (!notice) {
    // 공고 목록은 있는데 지정한 차수만 없는 경우 — 다른 차수 데이터를 보여주지 않고 안내
    if (bidNtceOrd && notices.length > 0) {
      const existingOrds = notices.map((n) => n.bidNtceOrd || "?").join(", ");
      throw new G2bApiError(
        "NOTICE_NOT_FOUND",
        `공고번호 ${bidNtceNo}의 차수 ${bidNtceOrd} 공고를 찾을 수 없습니다. (존재하는 차수: ${existingOrds})`,
      );
    }
    if (prelimRows.length === 0 && bidderRows.length === 0) {
      throw new G2bApiError(
        "NOTICE_NOT_FOUND",
        `공고번호 ${bidNtceNo}에 해당하는 입찰공고를 찾을 수 없습니다.`,
      );
    }
  }

  // 차수를 지정한 경우 다른 차수의 행이 섞이지 않도록 필터
  // (②는 차수 파라미터가 없고, ③은 서버 필터와 중복이지만 방어적으로 적용)
  const matchesOrd = (rowOrd: string | undefined) =>
    bidNtceOrd === undefined || normalizeOrd(rowOrd) === bidNtceOrd;
  const prelims = prelimRows.filter((row) => matchesOrd(row.bidNtceOrd));
  const bidders = bidderRows.filter((row) => matchesOrd(row.bidNtceOrd));

  return {
    notice: mapNotice(notice, prelims[0] ?? null, prelims.length),
    prelimPrices: prelims
      .map(mapPreliminaryPrice)
      .sort((a, b) => a.sno - b.sno),
    bidders: bidders.map(mapBidder).sort((a, b) => a.rank - b.rank),
  };
}

/** 차수 입력 정규화: "0"→"000", "1"→"001", ""/undefined→undefined (미지정) */
export function normalizeOrd(ord: string | undefined): string | undefined {
  const trimmed = ord?.trim() ?? "";
  if (trimmed === "") return undefined;
  return /^\d+$/.test(trimmed) ? trimmed.padStart(3, "0") : trimmed;
}

/**
 * 차수가 지정되면 해당 차수만 인정하고(없으면 null), 미지정이면 마지막(최신 차수) 공고를 고른다.
 */
function pickNotice(
  items: RawBidNotice[],
  bidNtceOrd: string | undefined,
): RawBidNotice | null {
  if (items.length === 0) return null;
  if (!bidNtceOrd) return items[items.length - 1];
  return (
    items.find((item) => normalizeOrd(item.bidNtceOrd) === bidNtceOrd) ?? null
  );
}
