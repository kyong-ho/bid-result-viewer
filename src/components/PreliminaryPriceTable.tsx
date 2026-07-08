import type { PreliminaryPrice } from "../../lib/g2b/types";
import { formatAmount } from "../utils/format";

export default function PreliminaryPriceTable({
  prices,
}: {
  prices: PreliminaryPrice[];
}) {
  const left = prices.filter((p) => p.sno % 2 === 1);
  const right = prices.filter((p) => p.sno % 2 === 0);

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-bold">2. 예가정보</h2>
      {prices.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          예비가격 정보가 없습니다. (개찰 전이거나 정보 미제공)
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          <HalfTable items={left} />
          <HalfTable items={right} />
        </div>
      )}
    </section>
  );
}

function HalfTable({ items }: { items: PreliminaryPrice[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-300 text-slate-500">
          <th className="py-2 text-left font-medium">구분</th>
          <th className="py-2 text-right font-medium">금액</th>
          <th className="py-2 text-center font-medium">추첨횟수</th>
        </tr>
      </thead>
      <tbody>
        {items.map((p) => (
          <tr
            key={p.sno}
            className={`border-b border-slate-100 ${p.drawn ? "bg-amber-50 font-semibold text-amber-900" : ""}`}
          >
            <td className="py-2">
              추첨가격 {p.sno}
              {p.drawn && (
                <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-xs">
                  추첨
                </span>
              )}
            </td>
            <td className="py-2 text-right tabular-nums">
              {formatAmount(p.price)}
            </td>
            <td className="py-2 text-center tabular-nums">{p.drawCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
