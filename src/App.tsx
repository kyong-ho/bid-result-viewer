import BidderResultTable from "./components/BidderResultTable";
import NoticeInfoCard from "./components/NoticeInfoCard";
import PreliminaryPriceTable from "./components/PreliminaryPriceTable";
import SearchBar from "./components/SearchBar";
import { useBidResult } from "./hooks/useBidResult";

function App() {
  const { status, data, error, search } = useBidResult();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold">나라장터 개찰결과 조회</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            입찰공고번호로 용역 입찰의 개찰 결과를 조회합니다.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <SearchBar loading={status === "loading"} onSearch={search} />

        {status === "idle" && (
          <p className="py-16 text-center text-slate-400">
            입찰공고번호를 입력하고 조회 버튼을 눌러 주세요.
          </p>
        )}
        {status === "loading" && (
          <p className="py-16 text-center text-slate-500">
            개찰 결과를 불러오는 중…
          </p>
        )}
        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {status === "success" && data && (
          <>
            <NoticeInfoCard notice={data.notice} />
            <PreliminaryPriceTable prices={data.prelimPrices} />
            <BidderResultTable bidders={data.bidders} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
