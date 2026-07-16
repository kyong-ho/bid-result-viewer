import type { BidNoticeListItem } from "../../lib/g2b/types";
import { formatAmount, formatDateTime, textOrDash } from "../utils/format";

interface Props {
  notices: BidNoticeListItem[];
  loading: boolean;
  onSelect: (bidNtceNo: string, bidNtceOrd: string) => void;
}

export default function BidNoticeTable({ notices, loading, onSelect }: Props) {
  if (notices.length === 0) {
    return (
      <section className="rounded-lg bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        조회된 용역 입찰공고가 없습니다.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">공고</th>
              <th className="px-4 py-3">분류</th>
              <th className="px-4 py-3">기관</th>
              <th className="px-4 py-3">마감/개찰</th>
              <th className="px-4 py-3 text-right">금액</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3 text-right">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notices.map((notice) => {
              const status = getBidProgressStatus(notice);
              return (
                <tr key={`${notice.bidNtceNo}-${notice.bidNtceOrd}`} className="align-top hover:bg-slate-50">
                  <td className="max-w-xl px-4 py-3">
                    <div className="font-semibold text-slate-800">{textOrDash(notice.bidNtceNm)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {notice.bidNtceNo} / {textOrDash(notice.bidNtceOrd)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-slate-500">
                      <span>{textOrDash(notice.srvceDivNm)}</span>
                      <span>{textOrDash(notice.cntrctCnclsMthdNm)}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {textOrDash(notice.ntceKindNm)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{textOrDash(notice.ntceInsttNm)}</div>
                    <div className="mt-1 text-xs text-slate-500">{textOrDash(notice.dminsttNm)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    <div>마감 {formatDateTime(notice.bidClseDt)}</div>
                    <div className="mt-1 text-xs text-slate-500">개찰 {formatDateTime(notice.opengDt)}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                    <div>
                      <span className="text-xs text-slate-500">기초금액 </span>
                      <span>{formatAmountBlank(notice.baseAmount)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      추정가격 {formatAmount(notice.presmptPrce)} 원
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClassName(status)}`}>
                      {status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => onSelect(notice.bidNtceNo, notice.bidNtceOrd)}
                      className="rounded-md border border-blue-200 px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      개찰결과
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatAmountBlank(value: number | null): string {
  return value == null ? "" : `${formatAmount(value)} 원`;
}

function getBidProgressStatus(notice: BidNoticeListItem): string {
  const now = Date.now();
  const openAt = parseG2bDateTime(notice.opengDt);
  if (openAt !== null && openAt <= now) return "개찰완료";

  const closeAt = parseG2bDateTime(notice.bidClseDt);
  if (closeAt !== null && closeAt <= now) return "투찰마감";

  const beginAt = parseG2bDateTime(notice.bidBeginDt);
  if (beginAt !== null && beginAt <= now) return "투찰중";

  return notice.bidNtceSttusNm.trim() || "공고중";
}

function getStatusClassName(status: string): string {
  if (status === "개찰완료") return "bg-emerald-50 text-emerald-700";
  if (status === "투찰마감") return "bg-amber-50 text-amber-700";
  if (status === "투찰중") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

function parseG2bDateTime(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;

  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;
  const time = new Date(year, month, day, hour, minute).getTime();
  return Number.isNaN(time) ? null : time;
}

