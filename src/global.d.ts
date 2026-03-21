// ──────────────────────────────────────────────
// 📁 파일명: global.d.ts
// 📌 위치: src/global.d.ts
//
// 🎯 이 파일의 역할:
//   - TypeScript에게 window.electronAPI 가 존재한다고 알려줘요
//   - 이 파일이 없으면 React에서 window.electronAPI 사용 시
//     "Property 'electronAPI' does not exist on type 'Window'" 에러가 나요
//
// ⚠️ 수정할 때 주의사항:
//   - preload.ts에 새 함수 추가 시 여기에도 타입 추가해야 해요
//   - 현재 제공하는 함수 목록:
//     storeGet    → 데이터 불러오기
//     storeSet    → 데이터 저장하기
//     storeDelete → 데이터 삭제하기
//     saveFile    → 파일 저장 다이얼로그 (엑셀/백업 저장 시 사용)
//     openFile    → 파일 열기 다이얼로그 (백업 복원 시 사용)
// ──────────────────────────────────────────────

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

export {};

declare global {
  interface Window {
    electronAPI: {

      // ── 데이터 불러오기 ──
      // 반환값은 Promise<any> - 저장된 데이터 타입이 다양하기 때문이에요
      storeGet: (key: string) => Promise<any>;

      // ── 데이터 저장하기 ──
      // 성공 시 Promise<true> 반환
      storeSet: (key: string, value: unknown) => Promise<boolean>;

      // ── 데이터 삭제하기 ──
      // 성공 시 Promise<true> 반환
      storeDelete: (key: string) => Promise<boolean>;

      // ── 파일 저장 다이얼로그 ──
      // 엑셀/백업 저장 시 "다른 이름으로 저장" 창을 띄워요
      // filename: 기본 파일명 (예: 거래처목록_20260312.xlsx)
      // buffer: 저장할 파일 데이터 (바이트 배열)
      // 반환값: { success: true, filePath } 또는 { success: false }
      saveFile: (
        filename: string,
        buffer: number[]
      ) => Promise<{ success: boolean; filePath?: string }>;

      // ── 파일 열기 다이얼로그 ──
      // 백업 복원 시 JSON 파일을 불러올 때 사용해요
      // 반환값: { success: true, data: '파일내용' } 또는 { success: false }
      openFile: () => Promise<{
        success: boolean;
        data?: string;
        error?: string;
      }>;

    };
  }
}