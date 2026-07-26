import khLogo from "./assets/kh_logo_simple.png";
import BidderResultTable from "./components/BidderResultTable";
import BidNoticeSearchPanel from "./components/BidNoticeSearchPanel";
import BidNoticeTable from "./components/BidNoticeTable";
import Footer from "./components/Footer";
import NoticeInfoCard from "./components/NoticeInfoCard";
import PreliminaryPriceTable from "./components/PreliminaryPriceTable";
import SearchBar from "./components/SearchBar";
import { useBidNotices } from "./hooks/useBidNotices";
import { useBidResult } from "./hooks/useBidResult";

function App() {
  const bidResult = useBidResult();
  const bidNotices = useBidNotices();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <header className="border-t-2 border-b border-brand border-b-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <img
            src={khLogo}
            alt="경호엔지니어링 종합건축사사무소 로고"
            className="h-9 w-9"
          />
          <div>
            <h1 className="text-xl font-bold">나라장터 용역 입찰 조회</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              공공데이터포털 조달청 API로 용역 입찰공고 목록과 개찰 결과를 조회합니다.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6">
        <BidNoticeSearchPanel
          loading={bidNotices.status === "loading"}
          onSearch={bidNotices.search}
        />

        {bidNotices.status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {bidNotices.error}
          </div>
        )}
        {bidNotices.status === "loading" && !bidNotices.data && (
          <p className="py-8 text-center text-slate-500">
            용역 입찰공고 목록을 불러오는 중…
          </p>
        )}
        {bidNotices.data && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
              <span>
                조회 결과 {bidNotices.data.totalCount.toLocaleString("ko-KR")}건
              </span>
              <span>
                현재 {bidNotices.data.items.length.toLocaleString("ko-KR")}건 표시
              </span>
            </div>
            <BidNoticeTable
              notices={bidNotices.data.items}
              loading={bidResult.status === "loading"}
              onSelect={bidResult.search}
            />
          </>
        )}

        <section className="space-y-4 pt-2">
          <div>
            <h2 className="text-lg font-bold">개찰결과 직접 조회</h2>
            <p className="mt-1 text-sm text-slate-500">
              목록에서 선택하거나 입찰공고번호를 직접 입력해 조회합니다.
            </p>
          </div>
          <SearchBar
            loading={bidResult.status === "loading"}
            onSearch={bidResult.search}
          />

          {bidResult.status === "idle" && (
            <p className="py-12 text-center text-slate-400">
              입찰공고번호를 입력하거나 목록에서 공고를 선택해 주세요.
            </p>
          )}
          {bidResult.status === "loading" && (
            <p className="py-12 text-center text-slate-500">
              개찰 결과를 불러오는 중…
            </p>
          )}
          {bidResult.status === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {bidResult.error}
            </div>
          )}
          {bidResult.status === "success" && bidResult.data && (
            <>
              <NoticeInfoCard notice={bidResult.data.notice} />
              <PreliminaryPriceTable prices={bidResult.data.prelimPrices} />
              <BidderResultTable bidders={bidResult.data.bidders} />
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
