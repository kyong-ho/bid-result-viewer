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
              <th className="px-4 py-3">기관</th>
              <th className="px-4 py-3">마감/개찰</th>
              <th className="px-4 py-3 text-right">추정가격</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3 text-right">동작</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {notices.map((notice) => (
              <tr key={`${notice.bidNtceNo}-${notice.bidNtceOrd}`} className="align-top hover:bg-slate-50">
                <td className="max-w-xl px-4 py-3">
                  <div className="font-semibold text-slate-800">{textOrDash(notice.bidNtceNm)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {notice.bidNtceNo} / {textOrDash(notice.bidNtceOrd)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {textOrDash(notice.cntrctCnclsMthdNm)}
                  </div>
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
                  {formatAmount(notice.presmptPrce)} 원
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                    {textOrDash(notice.bidNtceSttusNm || notice.ntceKindNm)}
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
