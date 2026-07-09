import { useMemo, useState } from "react";
import type { BidderResult } from "../../lib/g2b/types";
import {
  formatAmount,
  formatDateTime,
  formatRate,
  textOrDash,
} from "../utils/format";

type SortKey = "rank" | "bidAmount" | "bidRate" | "bidAt";

interface Column {
  label: string;
  sortKey?: SortKey;
  align: "left" | "right" | "center";
}

const COLUMNS: Column[] = [
  { label: "순위", sortKey: "rank", align: "center" },
  { label: "사업자등록번호", align: "center" },
  { label: "상호명", align: "left" },
  { label: "대표자명", align: "center" },
  { label: "입찰금액", sortKey: "bidAmount", align: "right" },
  { label: "투찰율(%)", sortKey: "bidRate", align: "right" },
  { label: "추첨번호", align: "center" },
  { label: "투찰일시", sortKey: "bidAt", align: "center" },
  { label: "비고", align: "left" },
];

const ALIGN_CLASS = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export default function BidderResultTable({
  bidders,
}: {
  bidders: BidderResult[];
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    if (sortKey === null) return bidders;
    const copy = [...bidders];
    copy.sort((a, b) => {
      const cmp =
        sortKey === "bidAt"
          ? a.bidAt.localeCompare(b.bidAt)
          : (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [bidders, sortKey, asc]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  };

  const opengStatus = bidders[0]?.opengStatus ?? "";

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold">3. 입찰결과</h2>
        {opengStatus !== "" && (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            {opengStatus}
          </span>
        )}
        <span className="ml-auto text-sm text-slate-400">
          총 {bidders.length}개 업체
        </span>
      </div>
      {bidders.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          업체별 입찰 정보가 없습니다. (개찰 전이거나 결과 미공개)
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500">
                {COLUMNS.map((col) => (
                  <th
                    key={col.label}
                    className={`px-2 py-2 font-medium ${ALIGN_CLASS[col.align]} ${col.sortKey ? "cursor-pointer select-none hover:text-slate-800" : ""}`}
                    onClick={
                      col.sortKey ? () => handleSort(col.sortKey!) : undefined
                    }
                  >
                    {col.label}
                    {col.sortKey === sortKey && (
                      <span className="ml-1 text-xs">{asc ? "▲" : "▼"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr
                  key={`${b.bizNo}-${b.rank}`}
                  className={`border-b border-slate-100 ${b.rank === 1 ? "bg-blue-50 font-medium" : ""}`}
                >
                  <td className="px-2 py-2 text-center tabular-nums">
                    {b.rank}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {textOrDash(b.bizNo)}
                  </td>
                  <td className="px-2 py-2">{textOrDash(b.companyName)}</td>
                  <td className="px-2 py-2 text-center">
                    {textOrDash(b.ceoName)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatAmount(b.bidAmount)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {formatRate(b.bidRate)}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {textOrDash(b.drawNos)}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {formatDateTime(b.bidAt)}
                  </td>
                  <td className="px-2 py-2">{textOrDash(b.remark)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
