# 모의고사 답 보내기

수업 중 학생이 휴대폰으로 모의고사 문항의 답을 보내는 페이지입니다.

- 학생 주소: https://chem-kim.github.io/mock-quiz/ (교사 화면의 QR로 들어옴, `?room=1234`)
- 교사 화면: 수업용 HTML 자료의 「📱 학생 연결」 버튼 (이 저장소에는 없음)

## 동작

- 교사가 문제 화면을 열면 그 문항이 학생 폰에 나온다.
- ㄱ·ㄴ·ㄷ(또는 학생 A·B·C) 문항은 보기마다 O/X, 나머지는 ①~⑤ 중 하나를 보낸다.
- 이 페이지에는 문제 이미지와 정답이 들어 있지 않다.

## 개발 메모

- 실시간 통신은 SCIENCE ARCADE와 같은 Firebase Realtime Database(`science-arcade-7388`)의 `mock-quiz/rooms` 경로를 쓴다.
- 보안 규칙은 `science-arcade` 저장소의 `database.rules.json`에서 관리한다.
- `qnet.js`는 수업 자료 쪽 `_작업데이터/src/qnet.js`와 같은 파일이다(고치면 둘 다 바꿀 것).
- Firebase 없이 테스트: 주소 끝에 `?net=local`을 붙이면 같은 브라우저의 탭끼리 통신한다.
