export type G2bErrorCode =
  | "NOTICE_NOT_FOUND" // 해당 공고 없음
  | "AUTH_ERROR" // 서비스 키 미등록/오류
  | "QUOTA_EXCEEDED" // 일일 호출 한도 초과
  | "UPSTREAM_ERROR" // 조달청 API가 에러 코드를 반환
  | "BAD_RESPONSE"; // 응답을 해석할 수 없음

export class G2bApiError extends Error {
  readonly code: G2bErrorCode;

  constructor(code: G2bErrorCode, message: string) {
    super(message);
    this.name = "G2bApiError";
    this.code = code;
  }
}

export interface HttpErrorResponse {
  status: number;
  body: { error: string; code: string };
}

/** 에러를 HTTP 응답(상태코드 + JSON 본문)으로 변환한다. 컨트롤러/미들웨어에서 공용. */
export function toHttpError(err: unknown): HttpErrorResponse {
  if (err instanceof G2bApiError) {
    const status = err.code === "NOTICE_NOT_FOUND" ? 404 : 502;
    return { status, body: { error: err.message, code: err.code } };
  }
  return {
    status: 500,
    body: {
      error:
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.",
      code: "INTERNAL_ERROR",
    },
  };
}
