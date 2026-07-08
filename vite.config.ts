import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { ServerResponse } from "node:http";
import { defineConfig, loadEnv } from "vite";
import type { Connect, Plugin } from "vite";
import { fetchBidOpeningResult, toHttpError } from "./lib/g2b";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      tailwindcss(),
      bidResultDevApi(env.G2B_SERVICE_KEY),
      apiDocsDevRewrite(),
    ],
  };
});

/**
 * 로컬 개발용 /api/bid-result 엔드포인트.
 * 운영(Vercel)에서는 api/bid-result.ts 서버리스 함수가 같은 역할을 한다.
 */
function bidResultDevApi(serviceKey: string | undefined): Plugin {
  return {
    name: "bid-result-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/bid-result", (req, res) => {
        void handleBidResult(req, res, serviceKey);
      });
    },
  };
}

/**
 * 로컬 개발용 /api-docs 경로 재작성.
 * Vite dev의 public 정적 서빙은 디렉토리 index를 해석하지 않아 /api-docs/가
 * SPA 폴백(React 앱)으로 넘어가므로, public/api-docs/index.html로 직접 연결한다.
 * 운영(Vercel)에서는 정적 호스팅이 디렉토리 index를 기본 서빙하므로 불필요.
 */
function apiDocsDevRewrite(): Plugin {
  return {
    name: "api-docs-dev-rewrite",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split("?")[0];
        if (path === "/api-docs" || path === "/api-docs/") {
          req.url = "/api-docs/index.html";
        }
        next();
      });
    },
  };
}

async function handleBidResult(
  req: Connect.IncomingMessage,
  res: ServerResponse,
  serviceKey: string | undefined,
) {
  const sendJson = (status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };

  const query = new URL(req.originalUrl ?? req.url ?? "", "http://localhost")
    .searchParams;
  const bidNtceNo = query.get("bidNtceNo")?.trim() ?? "";
  const bidNtceOrd = query.get("bidNtceOrd")?.trim() ?? "";

  if (!bidNtceNo) {
    sendJson(400, {
      error: "공고번호(bidNtceNo)를 입력해 주세요.",
      code: "BAD_REQUEST",
    });
    return;
  }
  if (!serviceKey) {
    sendJson(500, {
      error: ".env.local에 G2B_SERVICE_KEY를 설정해 주세요.",
      code: "MISSING_SERVICE_KEY",
    });
    return;
  }

  try {
    const result = await fetchBidOpeningResult({
      serviceKey,
      bidNtceNo,
      bidNtceOrd: bidNtceOrd || undefined,
    });
    sendJson(200, result);
  } catch (err) {
    const { status, body } = toHttpError(err);
    sendJson(status, body);
  }
}
