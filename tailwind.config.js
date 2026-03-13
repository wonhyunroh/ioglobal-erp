// ──────────────────────────────────────────────
// tailwind.config.js - Tailwind CSS 설정 파일
//
// 이 파일의 역할:
//   - Tailwind CSS가 어떤 파일들을 스캔할지 알려줘요
//   - src 폴더 안의 모든 파일에서 Tailwind 클래스를 찾아요
//   - 실제로 사용된 클래스만 최종 CSS에 포함시켜요 (파일 크기 최적화)
//
// 쉽게 말하면:
//   - "이 폴더 안 파일들에서 Tailwind 문법 찾아줘!" 라고 알려주는 설정이에요
// ──────────────────────────────────────────────

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx}', // src 폴더 안 모든 파일 스캔
  ],
  theme: {
    extend: {
      // 나중에 IO Global 전용 색상 등을 여기 추가할 수 있어요
      // 예: colors: { 'io-blue': '#1E3A5F' }
    },
  },
  plugins: [],
};