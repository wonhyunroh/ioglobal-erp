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
// ──────────────────────────────────────────────

export {};

declare global {
  interface Window {
    electronAPI: {
      // 데이터 불러오기
      // 반환값은 Promise<any> - 저장된 데이터 타입이 다양하기 때문이에요
      storeGet: (key: string) => Promise<any>;

      // 데이터 저장하기
      // 성공 시 Promise<true> 반환
      storeSet: (key: string, value: unknown) => Promise<boolean>;

      // 데이터 삭제하기
      storeDelete: (key: string) => Promise<boolean>;
    };
  }
}