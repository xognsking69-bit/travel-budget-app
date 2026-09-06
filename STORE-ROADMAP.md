# App Store / Google Play 확장용 구조 메모

현재 버전은 GitHub Pages에서 동작하는 모바일 우선 PWA입니다. 사용자 데이터는 브라우저 localStorage에 저장됩니다.

## 현재 웹에서 완성된 핵심 기능
- 여행 설정 / 달력 / 날짜별 총지출
- 지출 추가·수정·삭제
- 표준 환율 입력(1 외화 = KRW)
- 체크리스트
- 테마·포인트색·글꼴·배경사진·스티커 꾸미기
- 공유용 PNG 생성, Web Share API 공유, 이미지 저장 fallback
- CSV 내보내기

## 네이티브 앱 전환 때 유지할 데이터 모델
- settings: 여행명, 여행지, 날짜, 인원, 예산, 통화, 환율
- expenses: 날짜, 카테고리, 내용, 결제수단, 통화, 금액, 환율 snapshot
- checklist: 그룹, 항목, 완료 여부
- appearance: theme, accent, font, backgroundPhoto, stickers

## 다음 네이티브 단계
1. Capacitor 또는 Expo/React Native로 포장
2. localStorage를 SQLite/AsyncStorage로 교체
3. 사진 선택/저장을 iOS Photos, Android MediaStore 권한으로 연결
4. 공유를 네이티브 Share Sheet로 연결
5. 사용자 로그인/클라우드 백업은 별도 단계로 추가
6. 스토어용 개인정보처리방침, 아이콘, 스크린샷, 설명문 준비

웹 판매(크몽 등)는 현재 PWA 링크 + 사용 가이드 조합으로 먼저 테스트할 수 있습니다.
