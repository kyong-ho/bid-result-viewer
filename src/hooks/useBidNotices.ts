import { useCallback, useState } from "react";
import type { BidNoticeList } from "../../lib/g2b/types";
import { fetchBidNotices, type BidNoticeQuery } from "../api/bidNotices";

interface BidNoticesState {
  status: "idle" | "loading" | "success" | "error";
  data: BidNoticeList | null;
  error: string;
  query: BidNoticeQuery | null;
}

export function useBidNotices() {
  const [state, setState] = useState<BidNoticesState>({
    status: "idle",
    data: null,
    error: "",
    query: null,
  });

  const search = useCallback(async (query: BidNoticeQuery) => {
    setState((prev) => ({
      status: "loading",
      data: prev.data,
      error: "",
      query,
    }));
    try {
      const data = await fetchBidNotices(query);
      setState({ status: "success", data, error: "", query });
    } catch (err) {
      setState({
        status: "error",
        data: null,
        error:
          err instanceof Error ? err.message : "목록 조회 중 오류가 발생했습니다.",
        query,
      });
    }
  }, []);

  return { ...state, search };
}
