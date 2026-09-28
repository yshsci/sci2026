
# Rabbits & Wolves 수업용 웹앱 설정

## 1) GitHub Pages
이 폴더의 아래 파일을 같은 저장소 최상위에 업로드합니다.

- `index.html`
- `game.html`
- `submit.html`
- `styles.css`
- `ecosystem.js`

GitHub 저장소 → **Settings → Pages → Deploy from a branch → main / root → Save**

생성 주소 예시:
`https://아이디.github.io/rabbits-wolves-lab/`

## 2) Apps Script + Google Sheets 제출 연결

### A. Google Sheet 만들기
새 스프레드시트를 만들고 URL에서 Sheet ID를 복사합니다.

`https://docs.google.com/spreadsheets/d/[여기가_SHEET_ID]/edit`

### B. Google Drive 폴더 만들기
학생 캡처를 저장할 Drive 폴더를 하나 만들고 URL의 Folder ID를 복사합니다.

`https://drive.google.com/drive/folders/[여기가_FOLDER_ID]`

### C. Apps Script
1. `script.google.com` → 새 프로젝트
2. `apps-script/Code.gs` 내용을 붙여넣기
3. `SHEET_ID`, `FOLDER_ID`를 실제 값으로 수정
4. **배포 → 새 배포 → 웹 앱**
5. 실행 사용자: 나
6. 액세스 권한: 학생이 접속할 수 있는 범위에 맞게 설정
7. 배포 후 웹 앱 URL 복사

### D. submit.html
`submit.html`에서 아래 줄을 찾습니다.

```js
const WEB_APP_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
```

따옴표 안을 Apps Script 웹 앱 URL로 바꿉니다.

## 3) 페이지 역할

- `index.html` : 모의실험
- `game.html` : 생존 게임
- `submit.html` : 캡처 + 해석 제출
- `ecosystem.js` : 시뮬레이션 엔진
- `styles.css` : 공통 디자인

## 현재 프로토타입의 생태 규칙

- 식생은 자동 회복
- 피식자는 식생을 섭식
- 포식자는 피식자를 섭식
- 3차 소비자는 포식자를 섭식
- 붉은여우는 피식자를 두고 포식자와 경쟁하는 독립 포식자
- 학생이 직접 조작하는 생태 변인은:
  - 피식자 출생률 / 사망률 / 초기 개체수
  - 포식자 출생률 / 사망률 / 초기 개체수

3차 소비자와 붉은여우의 출생·사망 조건은 고정값입니다.

## 공정한 게임 비교

`game.html`은 고정 seed `424242`를 사용합니다.
같은 초기 설계를 선택하면 같은 난수 순서로 진행되도록 만든 프로토타입입니다.
