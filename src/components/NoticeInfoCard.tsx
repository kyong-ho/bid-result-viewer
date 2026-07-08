import type { NoticeInfo } from "../../lib/g2b/types";
import { formatAmount, formatDateTime, textOrDash } from "../utils/format";

interface Row {
  label: string;
  value: string;
  span?: boolean; // 2칸 사용 (공고명 등 긴 값)
  emphasize?: boolean; // 예정가격·기초금액 강조
}

export default function NoticeInfoCard({ notice }: { notice: NoticeInfo }) {
  const rows: Row[] = [
    { label: "입찰공고번호", value: textOrDash(notice.bidNtceNo) },
    { label: "재입찰번호", value: formatRbidNo(notice.rbidNo) },
    { label: "공고명", value: textOrDash(notice.bidNtceNm), span: true },
    { label: "실제 개찰일시", value: formatDateTime(notice.realOpengDt) },
    { label: "기초금액기준", value: textOrDash(notice.basePriceStandard) },
    {
      label: "상위갯수",
      value: notice.upperCount == null ? "-" : String(notice.upperCount),
    },
    {
      label: "복수예비가격",
      value:
        notice.totalPrelimCount == null ? "-" : `${notice.totalPrelimCount}개`,
    },
    { label: "작성시각", value: formatDateTime(notice.prelimMadeAt) },
    {
      label: "예비가격 정보제공",
      value: notice.prelimProvided ? "제공" : "미제공",
    },
    {
      label: "예정가격",
      value: `${formatAmount(notice.plannedPrice)} 원`,
      emphasize: true,
    },
    {
      label: "기초금액",
      value: `${formatAmount(notice.baseAmount)} 원`,
      emphasize: true,
    },
  ];

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">1. 공고정보</h2>
      <dl className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex items-baseline gap-3 border-b border-slate-100 py-2 ${row.span ? "md:col-span-2" : ""}`}
          >
            <dt className="w-36 shrink-0 text-sm text-slate-500">
              {row.label}
            </dt>
            <dd
              className={`text-sm ${row.emphasize ? "font-bold text-blue-700" : ""}`}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** "000" → "0", 비어 있으면 "-" */
function formatRbidNo(rbidNo: string): string {
  const trimmed = rbidNo.trim();
  if (trimmed === "") return "-";
  const n = Number(trimmed);
  return Number.isNaN(n) ? trimmed : String(n);
}
