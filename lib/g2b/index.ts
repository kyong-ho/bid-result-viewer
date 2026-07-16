import { fetchG2bItems, fetchG2bItemsPage } from "./client.js";
import { G2bApiError, toHttpError } from "./errors.js";
import {
  mapBidder,
  mapBidNoticeDetail,
  mapBidNoticeListItem,
  mapNotice,
  mapPreliminaryPrice,
  toNumber,
} from "./mappers.js";
import type {
  RawBidNotice,
  RawBidNoticeBaseAmount,
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
  const keyword = params.keyword?.trim() ?? "";
  const keywordTerms = keyword.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const ranges = buildNoticeSearchRanges(params.inqryBgnDt, params.inqryEndDt);

  for (const [index, range] of ranges.entries()) {
    const onlyTechnicalService = index > 0;
    const page = await fetchG2bItemsPage<RawBidNotice>(
      { serviceKey: params.serviceKey, baseUrl: params.baseUrl },
      keyword
        ? "/ad/BidPublicInfoService/getBidPblancListInfoServcPPSSrch"
        : "/ad/BidPublicInfoService/getBidPblancListInfoServc",
      {
        inqryDiv: 1,
        inqryBgnDt: range.inqryBgnDt,
        inqryEndDt: range.inqryEndDt,
        bidNtceNm: keyword || undefined,
        pageNo: 1,
        numOfRows: 999,
      },
    );

    const filteredItems = page.items
      .map(mapBidNoticeListItem)
      .filter((item) => {
        if (onlyTechnicalService && !isTechnicalService(item.srvceDivNm)) return false;
        if (keywordTerms.length === 0) return true;
        const noticeName = item.bidNtceNm.toLocaleLowerCase();
        return keywordTerms.every((term) => noticeName.includes(term));
      })
      .sort(compareBidNoticeListItems);

    if (filteredItems.length > 0 || index === ranges.length - 1) {
      const items = await attachBidNoticeBaseAmounts(
        filteredItems.slice(0, 20),
        { serviceKey: params.serviceKey, baseUrl: params.baseUrl },
      );
      return {
        items,
        pageNo: page.pageNo,
        numOfRows: 20,
        totalCount: filteredItems.length,
      };
    }
  }

  return {
    items: [],
    pageNo: 1,
    numOfRows: 20,
    totalCount: 0,
  };
}

async function attachBidNoticeBaseAmounts(
  items: ReturnType<typeof mapBidNoticeListItem>[],
  client: { serviceKey: string; baseUrl?: string },
): Promise<ReturnType<typeof mapBidNoticeListItem>[]> {
  return Promise.all(
    items.map(async (item) => {
      const baseAmountRows = await fetchG2bItems<RawBidNoticeBaseAmount>(
        client,
        "/ad/BidPublicInfoService/getBidPblancListInfoServcBsisAmount",
        {
          inqryDiv: 2,
          bidNtceNo: item.bidNtceNo,
          bidNtceOrd: item.bidNtceOrd || undefined,
          pageNo: 1,
          numOfRows: 10,
        },
      );
      const baseAmountRow = pickNotice(baseAmountRows, normalizeOrd(item.bidNtceOrd));
      return {
        ...item,
        baseAmount: toNumber(baseAmountRow?.bssamt),
      };
    }),
  );
}
function compareBidNoticeListItems(
  a: ReturnType<typeof mapBidNoticeListItem>,
  b: ReturnType<typeof mapBidNoticeListItem>,
): number {
  const typePriority = getServiceTypePriority(a.srvceDivNm) - getServiceTypePriority(b.srvceDivNm);
  if (typePriority !== 0) return typePriority;
  return parseG2bDateTime(b.bidNtceDt) - parseG2bDateTime(a.bidNtceDt);
}

function buildNoticeSearchRanges(
  inqryBgnDt: string,
  inqryEndDt: string,
): { inqryBgnDt: string; inqryEndDt: string }[] {
  const firstStart = parseG2bDateTimeInput(inqryBgnDt);
  const firstEnd = parseG2bDateTimeInput(inqryEndDt);
  if (!firstStart || !firstEnd) {
    return [{ inqryBgnDt, inqryEndDt }];
  }

  const ranges = [{ inqryBgnDt, inqryEndDt }];
  const windowMs = firstEnd.getTime() - firstStart.getTime() + 60_000;
  const safeWindowMs = windowMs > 0 ? windowMs : 14 * 24 * 60 * 60 * 1000;
  let nextEnd = new Date(firstStart.getTime() - 60_000);

  while (ranges.length < 4) {
    const nextStart = new Date(nextEnd.getTime() - safeWindowMs + 60_000);
    ranges.push({
      inqryBgnDt: formatG2bDateTimeInput(nextStart),
      inqryEndDt: formatG2bDateTimeInput(nextEnd),
    });
    nextEnd = new Date(nextStart.getTime() - 60_000);
  }

  return ranges;
}

function parseG2bDateTimeInput(value: string): Date | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const date = new Date(year, month, day, hour, minute);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatG2bDateTimeInput(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}`;
}

function getServiceTypePriority(value: string): number {
  return isTechnicalService(value) ? 0 : 1;
}

function isTechnicalService(value: string): boolean {
  return value.includes("기술용역");
}

function parseG2bDateTime(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return 0;
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const time = new Date(year, month, day, hour, minute).getTime();
  return Number.isNaN(time) ? 0 : time;
}
/** 엑셀 VBA 연동용 입찰공고 상세 정보를 조회한다. */
export async function fetchBidNoticeDetail(
  params: FetchBidNoticeDetailParams,
): Promise<BidNoticeExcelPayload> {
  const bidNtceNo = normalizeBidNtceNo(params.bidNtceNo);
  const bidNtceOrd = normalizeOrd(params.bidNtceOrd);
  const client = { serviceKey: params.serviceKey, baseUrl: params.baseUrl };
  const [notices, baseAmountRows] = await Promise.all([
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
    fetchG2bItems<RawBidNoticeBaseAmount>(
      client,
      "/ad/BidPublicInfoService/getBidPblancListInfoServcBsisAmount",
      {
        inqryDiv: 2,
        bidNtceNo,
        bidNtceOrd,
        pageNo: 1,
        numOfRows: 10,
      },
    ),
  ]);

  const notice = pickNotice(notices, bidNtceOrd);
  if (!notice) {
    throw new G2bApiError(
      "NOTICE_NOT_FOUND",
      `공고번호 ${bidNtceNo}에 해당하는 입찰공고 상세 정보를 찾을 수 없습니다.`,
    );
  }

  const baseAmountRow = pickNotice(baseAmountRows, bidNtceOrd);
  const detail = mapBidNoticeDetail(notice, baseAmountRow);
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

