import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchBidOpeningResult, toHttpError } from "../lib/g2b/index.js";

/** GET /api/bid-result?bidNtceNo=R25BK01250632&bidNtceOrd=000 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const bidNtceNo = firstValue(req.query.bidNtceNo);
  const bidNtceOrd = firstValue(req.query.bidNtceOrd);

  if (!bidNtceNo) {
    res.status(400).json({
      error: "공고번호(bidNtceNo)를 입력해 주세요.",
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
    const result = await fetchBidOpeningResult({
      serviceKey,
      bidNtceNo,
      bidNtceOrd: bidNtceOrd || undefined,
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
