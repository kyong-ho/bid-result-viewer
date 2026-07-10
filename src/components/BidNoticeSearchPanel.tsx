import { useMemo, useState } from "react";
import type { BidNoticeQuery } from "../api/bidNotices";

interface Props {
  loading: boolean;
  onSearch: (query: BidNoticeQuery) => void;
}

export default function BidNoticeSearchPanel({ loading, onSearch }: Props) {
  const defaults = useMemo(() => getDefaultDateRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [keyword, setKeyword] = useState("");

  const handleSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    if (!from || !to) return;
    onSearch({ from, to, keyword, pageNo: 1, numOfRows: 20 });
  };

  return (
    <section className="rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">용역 입찰공고 목록</h2>
          <p className="mt-1 text-sm text-slate-500">
            공고일 기준으로 나라장터 용역 공고를 조회합니다.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-2 md:grid-cols-[160px_160px_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">시작일</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">종료일</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">검색어</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="공고명, 공고기관, 수요기관"
            className="w-full rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !from || !to}
          className="self-end rounded-md bg-slate-800 px-5 py-2 font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "불러오는 중…" : "목록 조회"}
        </button>
      </form>
    </section>
  );
}

function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
