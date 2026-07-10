# 엑셀 VBA 연동 안내

대상 파일: `입찰+의견서 서식(개조8)_v5.1(벌점).xls`
대상 시트: `입력용(개조)`

## API

로컬 개발 서버 기준:

```text
http://127.0.0.1:5173/api/bid-notice-detail?format=vba&bidNtceNo=공고번호
```

응답은 VBA에서 파싱하기 쉬운 `키=값` 텍스트입니다.

## VBA 설치

1. 엑셀에서 `Alt + F11`을 누릅니다.
2. VBA 편집기에서 `파일 > 파일 가져오기`를 선택합니다.
3. 이 파일을 가져옵니다: `docs/excel/BidNoticeImporter.bas`\n   - 파일 가져오기가 아니라 코드 창에 직접 붙여넣어도 됩니다. 현재 버전은 `Attribute VB_Name` 줄을 제거해 붙여넣기 구문 오류가 나지 않습니다.\n4. 엑셀로 돌아와 `Alt + F8`을 누르고 `공고상세불러오기`를 실행합니다.

## 동작 방식

- `D16`의 공고번호를 읽습니다.
- `D16`이 비어 있거나 오류이면 입력창으로 공고번호를 받습니다.
- API에서 가져온 값을 `입력용(개조)` 시트에 직접 씁니다.
  - `D12`: 발주처/공고기관
  - `D15`: 용역명/공고명
  - `D16`: 입찰공고번호
  - `D17`: 기초금액
  - `D18`: 투찰일/입찰서제출 마감
  - `D19`: 개찰일

실행하면 위 셀의 기존 수식은 API 응답값으로 대체됩니다. `D13` 등 API와 무관한 셀은 건드리지 않습니다.

## 자동 실행을 원할 때

`입력용(개조)` 시트 코드 영역에 아래 코드를 넣으면 `D16` 변경 시 자동으로 조회합니다.

```vb
Private Sub Worksheet_Change(ByVal Target As Range)
    If Intersect(Target, Me.Range("D16")) Is Nothing Then Exit Sub
    If Target.CountLarge > 1 Then Exit Sub
    If Trim$(CStr(Target.Value)) = "" Then Exit Sub

    On Error GoTo Done
    Application.EnableEvents = False
    공고상세불러오기
Done:
    Application.EnableEvents = True
End Sub
```

