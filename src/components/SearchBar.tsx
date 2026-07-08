import { useState } from "react";

interface Props {
  loading: boolean;
  onSearch: (bidNtceNo: string, bidNtceOrd?: string) => void;
}

export default function SearchBar({ loading, onSearch }: Props) {
  const [bidNtceNo, setBidNtceNo] = useState("");
  const [bidNtceOrd, setBidNtceOrd] = useState("");

  const handleSubmit = (event: { preventDefault(): void }) => {
    event.preventDefault();
    const no = bidNtceNo.trim();
    if (no === "") return;
    onSearch(no, bidNtceOrd.trim() || undefined);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow-sm"
    >
      <input
        value={bidNtceNo}
        onChange={(e) => setBidNtceNo(e.target.value)}
        placeholder="입찰공고번호 (예: R25BK01250632)"
        className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
      <input
        value={bidNtceOrd}
        onChange={(e) => setBidNtceOrd(e.target.value)}
        placeholder="차수 (선택, 예: 000)"
        className="w-28 rounded-md border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || bidNtceNo.trim() === ""}
        className="rounded-md bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "조회 중…" : "조회"}
      </button>
    </form>
  );
}
