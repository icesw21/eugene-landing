# Sangwoo Park — Connect the dots

개인 소개 랜딩 페이지. 스크롤 기반 인터랙션, anime.js 구동.

## 구성
- `index.html` — 페이지 마크업/콘텐츠
- `styles.css` — 스타일 (다크 테크 테마)
- `animations.js` — anime.js v4 (CDN) 기반 인터랙션

빌드 과정 없는 순수 정적 사이트입니다. 파일을 그대로 호스팅하면 됩니다.

## 로컬 확인
```bash
npx serve .
# 또는
python3 -m http.server 8000
```

## 배포 (Vercel)
프레임워크 없음(Other) / 정적 사이트로 자동 인식됩니다. 별도 빌드 명령 불필요.
