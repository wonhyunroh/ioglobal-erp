// ──────────────────────────────────────────────
// postcss.config.js - PostCSS 설정 파일
//
// 이 파일의 역할:
//   - CSS를 처리할 때 사용할 플러그인을 등록해요
//   - webpack이 CSS 파일을 만날 때마다 이 설정대로 처리해요
//
// 플러그인 설명:
//   - tailwindcss  → @tailwind 문법을 실제 CSS로 변환해줘요
//                    예: bg-blue-500 → background-color: #3b82f6
//   - autoprefixer → 구형 브라우저 호환을 위해 CSS 앞에
//                    -webkit-, -moz- 같은 접두사를 자동으로 붙여줘요
//
// 쉽게 말하면:
//   - CSS 파일을 "세탁기"에 넣으면 이 설정대로 깨끗하게 처리돼요
// ──────────────────────────────────────────────

module.exports = {
  plugins: {
    tailwindcss: {},   // Tailwind CSS 활성화
    autoprefixer: {},  // 브라우저 호환성 자동 처리
  },
};