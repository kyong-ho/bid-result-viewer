import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  fetchBidNoticeDetail,
  formatBidNoticeDetailForVba,
  toHttpError,
} from "../lib/g2b/index.js";

/** GET /api/bid-notice-detail?bidNtceNo=20260709000&bidNtceOrd=000&format=vba */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bidNtceNo = firstValue(req.query.bidNtceNo);
  const bidNtceOrd = firstValue(req.query.bidNtceOrd);
  const format = firstValue(req.query.format).toLowerCase();

  if (!bidNtceNo) {
    send(res, 400, { error: "공고번호(bidNtceNo)를 입력해 주세요.", code: "BAD_REQUEST" });
    return;
  }

  const serviceKey = process.env.G2B_SERVICE_KEY;
  if (!serviceKey) {
    send(res, 500, {
      error: "서버에 G2B_SERVICE_KEY가 설정되지 않았습니다.",
      code: "MISSING_SERVICE_KEY",
    });
    return;
  }

  try {
    const result = await fetchBidNoticeDetail({
      serviceKey,
      bidNtceNo,
      bidNtceOrd: bidNtceOrd || undefined,
    });

    if (format === "vba") {
      res.setHeader("content-type", "text/plain; charset=utf-8");
      res.status(200).send(formatBidNoticeDetailForVba(result));
      return;
    }

    send(res, 200, result);
  } catch (err) {
    const { status, body } = toHttpError(err);
    send(res, status, body);
  }
}

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function send(res: VercelResponse, status: number, body: unknown) {
  res.status(status).json(body);
}
