import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchBidNoticeList, toHttpError } from "../lib/g2b/index.js";

/** GET /api/bid-notices?from=20260701&to=20260709&pageNo=1&numOfRows=20&keyword=청소 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const from = firstValue(req.query.from);
  const to = firstValue(req.query.to);
  const keyword = firstValue(req.query.keyword);
  const pageNo = toPositiveInt(firstValue(req.query.pageNo), 1);
  const numOfRows = toPositiveInt(firstValue(req.query.numOfRows), 20);

  const range = buildDateTimeRange(from, to);
  if (!range) {
    res.status(400).json({
      error: "조회 시작일과 종료일을 YYYY-MM-DD 형식으로 입력해 주세요.",
      code: "BAD_REQUEST",
    });
    return;
  }

  const serviceKey = process.env.G2B_SERVICE_KEY;
  if (!serviceKey) {
    res.status(500).json({
      error: "서버에 G2B_SERVICE_KEY가 설정되지 않았습니다.",
      code: "MISSING_SERVICE_KEY",
    });
    return;
  }

  try {
    const result = await fetchBidNoticeList({
      serviceKey,
      inqryBgnDt: range.inqryBgnDt,
      inqryEndDt: range.inqryEndDt,
      pageNo,
      numOfRows,
      keyword: keyword || undefined,
    });
    res.status(200).json(result);
  } catch (err) {
    const { status, body } = toHttpError(err);
    res.status(status).json(body);
  }
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function toPositiveInt(value: string, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function buildDateTimeRange(
  from: string,
  to: string,
): { inqryBgnDt: string; inqryEndDt: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return null;
  }
  return {
    inqryBgnDt: `${from.replace(/-/g, "")}0000`,
    inqryEndDt: `${to.replace(/-/g, "")}2359`,
  };
}
