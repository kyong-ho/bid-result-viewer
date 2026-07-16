import { G2bApiError } from "./errors.js";
import type { G2bResponseEnvelope } from "./rawTypes";

export const DEFAULT_BASE_URL = "https://apis.data.go.kr/1230000";

export interface G2bClientOptions {
  serviceKey: string;
  baseUrl?: string;
}

type ParamValue = string | number | undefined;

export interface G2bItemsPage<T> {
  items: T[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
}

/**
 * 조달청 오픈 API를 호출해 body.items 배열을 반환한다.
 * 결과 0건이면 빈 배열. (items가 ""로 내려오는 경우 포함)
 */
export async function fetchG2bItems<T>(
  options: G2bClientOptions,
  path: string,
  params: Record<string, ParamValue>,
): Promise<T[]> {
  const page = await fetchG2bItemsPage<T>(options, path, params);
  return page.items;
}

/** 조달청 오픈 API를 호출해 body.items와 페이지 정보를 반환한다. */
export async function fetchG2bItemsPage<T>(
  options: G2bClientOptions,
  path: string,
  params: Record<string, ParamValue>,
): Promise<G2bItemsPage<T>> {
  const { serviceKey, baseUrl = DEFAULT_BASE_URL } = options;
  // 공공데이터포털 키가 이미 URL 인코딩된 형태(%가 포함)면 그대로 사용
  const encodedKey = serviceKey.includes("%")
    ? serviceKey
    : encodeURIComponent(serviceKey);
  const parts = [`serviceKey=${encodedKey}`, "type=json"];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    parts.push(`${key}=${encodeURIComponent(String(value))}`);
  }

  const res = await fetch(`${baseUrl}${path}?${parts.join("&")}`);
  const text = await res.text();

  // 키 오류·한도 초과 시 게이트웨이가 type=json을 무시하고 XML로 응답한다
  if (text.trimStart().startsWith("<")) {
    const authMsg = /<returnAuthMsg>([^<]*)<\/returnAuthMsg>/.exec(text)?.[1];
    if (authMsg) {
      const code = authMsg.includes("LIMITED")
        ? "QUOTA_EXCEEDED"
        : "AUTH_ERROR";
      throw new G2bApiError(code, `공공데이터포털 인증 오류: ${authMsg}`);
    }
    throw new G2bApiError(
      "BAD_RESPONSE",
      `API가 예상하지 못한 XML 응답을 반환했습니다 (HTTP ${res.status})`,
    );
  }

  let envelope: G2bResponseEnvelope<T>;
  try {
    envelope = JSON.parse(text) as G2bResponseEnvelope<T>;
  } catch {
    throw new G2bApiError(
      "BAD_RESPONSE",
      `API 응답을 해석할 수 없습니다 (HTTP ${res.status})`,
    );
  }

  const header = envelope.response?.header;
  if (header?.resultCode !== "00") {
    const resultCode = header?.resultCode ?? "응답구조오류";
    const resultMsg = header?.resultMsg?.trim();
    const fallbackMsg = summarizeUnexpectedResponse(text);
    throw new G2bApiError(
      "UPSTREAM_ERROR",
      `조달청 API 오류 (${path}) [${resultCode}]: ${resultMsg || fallbackMsg}`,
    );
  }

  const body = envelope.response?.body;
  const items = body?.items;
  return {
    items: Array.isArray(items) ? items : [],
    pageNo: Number(body?.pageNo ?? params.pageNo ?? 1),
    numOfRows: Number(body?.numOfRows ?? params.numOfRows ?? 0),
    totalCount: Number(body?.totalCount ?? 0),
  };
}

function summarizeUnexpectedResponse(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact === "") return "빈 응답을 반환했습니다.";
  return `예상한 response.header가 없습니다. 응답 일부: ${compact.slice(0, 300)}`;
}
