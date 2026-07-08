import type {
  RawBidNotice,
  RawOpengResult,
  RawPreliminaryPriceDetail,
} from "./rawTypes";
import type { BidderResult, NoticeInfo, PreliminaryPrice } from "./types";

/** "1981548000" → 1981548000, ""/undefined → null */
export function toNumber(value: string | undefined | null): number | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/,/g, "");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** "3128111675" → "312-81-11675" (10자리가 아니면 원본 유지) */
export function formatBizNo(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length !== 10) return raw?.trim() ?? "";
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export function mapNotice(
  notice: RawBidNotice | null,
  prelim: RawPreliminaryPriceDetail | null,
  prelimCount: number,
): NoticeInfo {
  return {
    bidNtceNo: notice?.bidNtceNo ?? prelim?.bidNtceNo ?? "",
    bidNtceOrd: notice?.bidNtceOrd ?? prelim?.bidNtceOrd ?? "",
    bidNtceNm: notice?.bidNtceNm ?? prelim?.bidNtceNm ?? "",
    rbidNo: prelim?.rbidNo ?? "",
    realOpengDt: prelim?.rlOpengDt ?? "",
    basePriceStandard: prelim?.bidwinrSlctnAplBssCntnts ?? "",
    upperCount: toNumber(prelim?.bssamtBssUpNum),
    totalPrelimCount: toNumber(prelim?.totRsrvtnPrceNum),
    prelimMadeAt: prelim?.compnoRsrvtnPrceMkngDt ?? "",
    prelimProvided: prelimCount > 0,
    plannedPrice: toNumber(prelim?.plnprc),
    baseAmount: toNumber(prelim?.bssamt),
    ntceInsttNm: notice?.ntceInsttNm ?? "",
    dminsttNm: notice?.dminsttNm ?? "",
    presmptPrce: toNumber(notice?.presmptPrce),
    sucsfbidLwltRate: toNumber(notice?.sucsfbidLwltRate),
    opengDt: notice?.opengDt ?? "",
  };
}

export function mapPreliminaryPrice(
  raw: RawPreliminaryPriceDetail,
): PreliminaryPrice {
  return {
    sno: toNumber(raw.compnoRsrvtnPrceSno) ?? 0,
    price: toNumber(raw.bsisPlnprc) ?? 0,
    drawn: raw.drwtYn?.trim() === "Y",
    drawCount: toNumber(raw.drwtNum) ?? 0,
  };
}

export function mapBidder(raw: RawOpengResult): BidderResult {
  const drawNos = [raw.drwtNo1, raw.drwtNo2]
    .map((v) => v?.trim() ?? "")
    .filter((v) => v !== "")
    .join(" ");
  return {
    rank: toNumber(raw.opengRank) ?? 0,
    bizNo: formatBizNo(raw.prcbdrBizno),
    companyName: raw.prcbdrNm?.trim() ?? "",
    ceoName: raw.prcbdrCeoNm?.trim() ?? "",
    bidAmount: toNumber(raw.bidprcAmt) ?? 0,
    bidRate: toNumber(raw.bidprcrt),
    drawNos,
    bidAt: raw.bidprcDt ?? "",
    remark: raw.rmrk?.trim() ?? "",
    opengStatus: raw.opengRsltDivNm ?? "",
  };
}
