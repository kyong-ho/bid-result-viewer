Option Explicit

' 로컬 개발 서버: http://127.0.0.1:5173
' 배포 후에는 아래 주소를 배포 도메인으로 바꾸면 됩니다.
Private Const BID_NOTICE_API_BASE As String = "http://127.0.0.1:5173/api/bid-notice-detail"
Private Const INPUT_SHEET_NAME As String = "입력용(개조)"

Public Sub 공고상세불러오기()
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Worksheets(INPUT_SHEET_NAME)

    Dim bidNo As String
    bidNo = Trim$(CStr(GetCellText(ws.Range("D16"))))
    If bidNo = "" Or bidNo = "#N/A" Or bidNo = "-" Then
        bidNo = Trim$(InputBox("입찰공고번호를 입력하세요.", "공고 상세 불러오기"))
    End If
    If bidNo = "" Then Exit Sub

    Dim bidOrd As String
    bidOrd = Trim$(InputBox("공고 차수를 입력하세요. 비워두면 최신 차수를 사용합니다.", "공고 차수", ""))

    Dim url As String
    url = BID_NOTICE_API_BASE & "?format=vba&bidNtceNo=" & UrlEncodeUtf8(bidNo)
    If bidOrd <> "" Then url = url & "&bidNtceOrd=" & UrlEncodeUtf8(bidOrd)

    On Error GoTo Fail
    Application.ScreenUpdating = False

    Dim responseText As String
    responseText = HttpGetText(url)

    If InStr(1, responseText, "error", vbTextCompare) > 0 And InStr(1, responseText, "code", vbTextCompare) > 0 Then
        Err.Raise vbObjectError + 1000, , responseText
    End If

    Dim data As Object
    Set data = ParseKeyValueText(responseText)

    WriteNoticeData ws, data
    Application.Calculate
    Application.ScreenUpdating = True

    MsgBox "공고 상세 정보를 불러왔습니다.", vbInformation
    Exit Sub

Fail:
    Application.ScreenUpdating = True
    MsgBox "공고 상세 정보를 불러오지 못했습니다." & vbCrLf & Err.Description, vbExclamation
End Sub

Private Sub WriteNoticeData(ByVal ws As Worksheet, ByVal data As Object)
    ' D12:D19의 기존 수식은 무시하고 API 응답값을 직접 입력합니다.
    ' D13(공동도급), D14 등 API와 무관한 기존 셀은 건드리지 않습니다.
    ws.Range("D12").Value = NzText(data, "공고기관")
    ws.Range("D15").Value = NzText(data, "공고명")
    ws.Range("D16").Value = FirstText(data, "입찰공고번호표시", "입찰공고번호")

    If NzText(data, "기초금액") <> "" Then
        ws.Range("D17").Value = CDbl(NzText(data, "기초금액"))
        ws.Range("D17").NumberFormat = "#,##0"
    Else
        ws.Range("D17").ClearContents
    End If

    ws.Range("D18").Value = NzText(data, "입찰서제출")
    ws.Range("D19").Value = NzText(data, "개찰")
End Sub

Private Function HttpGetText(ByVal url As String) As String
    Dim http As Object
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open "GET", url, False
    http.SetRequestHeader "Accept", "text/plain"
    http.Send

    If http.Status < 200 Or http.Status >= 300 Then
        Err.Raise vbObjectError + 1001, , "HTTP " & http.Status & ": " & http.ResponseText
    End If
    HttpGetText = CStr(http.ResponseText)
End Function

Private Function ParseKeyValueText(ByVal text As String) As Object
    Dim dict As Object
    Set dict = CreateObject("Scripting.Dictionary")

    Dim normalized As String
    normalized = Replace(text, vbCrLf, vbLf)
    normalized = Replace(normalized, vbCr, vbLf)

    Dim lines() As String
    lines = Split(normalized, vbLf)

    Dim i As Long
    For i = LBound(lines) To UBound(lines)
        Dim line As String
        line = lines(i)
        If Len(line) > 0 Then
            Dim p As Long
            p = InStr(1, line, "=", vbBinaryCompare)
            If p > 0 Then
                dict(Left$(line, p - 1)) = Mid$(line, p + 1)
            End If
        End If
    Next i

    Set ParseKeyValueText = dict
End Function

Private Function NzText(ByVal dict As Object, ByVal key As String) As String
    If dict.Exists(key) Then
        NzText = CStr(dict(key))
    Else
        NzText = ""
    End If
End Function

Private Function FirstText(ByVal dict As Object, ByVal primaryKey As String, ByVal fallbackKey As String) As String
    If NzText(dict, primaryKey) <> "" Then
        FirstText = NzText(dict, primaryKey)
    Else
        FirstText = NzText(dict, fallbackKey)
    End If
End Function

Private Function GetCellText(ByVal cell As Range) As String
    If IsError(cell.Value) Then
        GetCellText = cell.Text
    Else
        GetCellText = cell.Value
    End If
End Function

Private Function UrlEncodeUtf8(ByVal value As String) As String
    Dim i As Long
    Dim ch As String
    Dim code As Long
    Dim result As String

    For i = 1 To Len(value)
        ch = Mid$(value, i, 1)
        code = AscW(ch)
        Select Case code
            Case 48 To 57, 65 To 90, 97 To 122
                result = result & ch
            Case 45, 46, 95, 126
                result = result & ch
            Case Else
                result = result & "%" & Right$("0" & Hex$(code And &HFF), 2)
        End Select
    Next i

    UrlEncodeUtf8 = result
End Function
