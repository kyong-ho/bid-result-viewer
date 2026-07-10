import { fetchG2bItems, fetchG2bItemsPage } from "./client.js";
import { G2bApiError, toHttpError } from "./errors.js";
import {
  mapBidder,
  mapBidNoticeDetail,
  mapBidNoticeListItem,
  mapNotice,
  mapPreliminaryPrice,
} from "./mappers.js";
import type {
  RawBidNotice,
  RawOpengResult,
  RawPreliminaryPriceDetail,
} from "./rawTypes";
import type {
  BidNoticeExcelPayload,
  BidNoticeList,
  BidOpeningResult,
} from "./types";

export type { G2bErrorCode, HttpErrorResponse } from "./errors";
export type * from "./types";
export { G2bApiError, toHttpError };

export interface FetchBidOpeningResultParams {
  serviceKey: string;
  bidNtceNo: string; // 입찰공고번호
  bidNtceOrd?: string; // 공고 차수 (선택, "0"·"1"도 "000"·"001"로 정규화)
  baseUrl?: string;
}

export interface FetchBidNoticeListParams {
  serviceKey: string;
  inqryBgnDt: string; // YYYYMMDDHHMM
  inqryEndDt: string; // YYYYMMDDHHMM
  pageNo?: number;
  numOfRows?: number;
  keyword?: string;
  baseUrl?: string;
}

export interface FetchBidNoticeDetailParams {
  serviceKey: string;
  bidNtceNo: string;
  bidNtceOrd?: string;
  baseUrl?: string;
}

/** 공고번호 기준으로 조달청 API 3종을 병렬 호출해 개찰 결과 통합 객체를 만든다. */
export async function fetchBidOpeningResult(
  params: FetchBidOpeningResultParams,
): Promise<BidOpeningResult> {
  const { serviceKey, baseUrl } = params;
  const bidNtceNo = normalizeBidNtceNo(params.bidNtceNo);
  const bidNtceOrd = normalizeOrd(params.bidNtceOrd);
  const client = { serviceKey, baseUrl };
  const paging = { pageNo: 1, numOfRows: 300 };

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
    bidders: bidders.map(mapBidder).sort((a, b) => {
      const rankA = a.rank === 0 ? Infinity : a.rank;
      const rankB = b.rank === 0 ? Infinity : b.rank;
      return rankA - rankB;
    }),
  };
}

/** 공고일시 기준으로 용역 입찰공고 목록을 조회한다. */
export async function fetchBidNoticeList(
  params: FetchBidNoticeListParams,
): Promise<BidNoticeList> {
  const page = await fetchG2bItemsPage<RawBidNotice>(
    { serviceKey: params.serviceKey, baseUrl: params.baseUrl },
    "/ad/BidPublicInfoService/getBidPblancListInfoServc",
    {
      inqryDiv: 1,
      inqryBgnDt: params.inqryBgnDt,
      inqryEndDt: params.inqryEndDt,
      pageNo: params.pageNo ?? 1,
      numOfRows: params.numOfRows ?? 20,
    },
  );

  const keyword = params.keyword?.trim().toLocaleLowerCase() ?? "";
  const items = page.items
    .map(mapBidNoticeListItem)
    .filter((item) => {
      if (!keyword) return true;
      return [
        item.bidNtceNo,
        item.bidNtceNm,
        item.ntceInsttNm,
        item.dminsttNm,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(keyword);
    });

  return {
    items,
    pageNo: page.pageNo,
    numOfRows: page.numOfRows,
    totalCount: keyword ? items.length : page.totalCount,
  };
}

/** 엑셀 VBA 연동용 입찰공고 상세 정보를 조회한다. */
export async function fetchBidNoticeDetail(
  params: FetchBidNoticeDetailParams,
): Promise<BidNoticeExcelPayload> {
  const bidNtceNo = normalizeBidNtceNo(params.bidNtceNo);
  const bidNtceOrd = normalizeOrd(params.bidNtceOrd);
  const notices = await fetchG2bItems<RawBidNotice>(
    { serviceKey: params.serviceKey, baseUrl: params.baseUrl },
    "/ad/BidPublicInfoService/getBidPblancListInfoServc",
    {
      inqryDiv: 2,
      bidNtceNo,
      pageNo: 1,
      numOfRows: 10,
    },
  );

  const notice = pickNotice(notices, bidNtceOrd);
  if (!notice) {
    throw new G2bApiError(
      "NOTICE_NOT_FOUND",
      `공고번호 ${bidNtceNo}에 해당하는 입찰공고 상세 정보를 찾을 수 없습니다.`,
    );
  }

  const detail = mapBidNoticeDetail(notice);
  return {
    detail,
    excel: {
      bidNumberForSheet: formatBidNtceNoForSheet(detail.bidNtceNo),
      bidNumberRaw: detail.bidNtceNo,
      order: detail.bidNtceOrd,
      agency: detail.ntceInsttNm,
      title: detail.bidNtceNm,
      baseAmount: detail.baseAmount,
      bidSubmitText: detail.bidClseDt || detail.bidBeginDt,
      openDateText: detail.opengDt,
    },
  };
}

export function formatBidNoticeDetailForVba(payload: BidNoticeExcelPayload): string {
  const baseAmount = payload.excel.baseAmount == null ? "" : String(payload.excel.baseAmount);
  return [
    `공고기관=${payload.excel.agency}`,
    `공고명=${payload.excel.title}`,
    `입찰공고번호=${payload.excel.bidNumberRaw}`,
    `입찰공고번호표시=${payload.excel.bidNumberForSheet}`,
    `공고차수=${payload.excel.order}`,
    `기초금액=${baseAmount}`,
    `입찰서제출=${payload.excel.bidSubmitText}`,
    `개찰=${payload.excel.openDateText}`,
  ].join("\n");
}

/** 차수 입력 정규화: "0"→"000", "1"→"001", ""/undefined→undefined (미지정) */
export function normalizeOrd(ord: string | undefined): string | undefined {
  const trimmed = ord?.trim() ?? "";
  if (trimmed === "") return undefined;
  return /^\d+$/.test(trimmed) ? trimmed.padStart(3, "0") : trimmed;
}

export function normalizeBidNtceNo(value: string): string {
  return value.trim().replace(/-/g, "");
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

function formatBidNtceNoForSheet(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 11) return value;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 11)}`;
}
