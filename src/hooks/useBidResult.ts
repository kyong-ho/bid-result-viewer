import { useCallback, useState } from "react";
import type { BidOpeningResult } from "../../lib/g2b/types";
import { fetchBidResult } from "../api/bidResult";

interface BidResultState {
  status: "idle" | "loading" | "success" | "error";
  data: BidOpeningResult | null;
  error: string;
}

export function useBidResult() {
  const [state, setState] = useState<BidResultState>({
    status: "idle",
    data: null,
    error: "",
  });

  const search = useCallback(async (bidNtceNo: string, bidNtceOrd?: string) => {
    setState({ status: "loading", data: null, error: "" });
    try {
      const data = await fetchBidResult(bidNtceNo, bidNtceOrd);
      setState({ status: "success", data, error: "" });
    } catch (err) {
      setState({
        status: "error",
        data: null,
        error:
          err instanceof Error ? err.message : "조회 중 오류가 발생했습니다.",
      });
    }
  }, []);

  return { ...state, search };
}
