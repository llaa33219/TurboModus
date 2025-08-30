// Entry Turbo Mode Extension - Content Script
// 단순히 injected.js를 페이지에 주입하고 상태만 관리

class EntryTurboInjector {
  constructor() {
    this.isInjected = false;
    this.init();
  }

  async init() {
    // 저장된 상태 로드
    const result = await this.loadTurboState();
    
    // injected.js 주입
    this.injectScript();
    
    // injected.js가 로드된 후 초기 상태 전송
    setTimeout(() => {
      this.sendStateToPage(result.isTurbo || false);
    }, 100);

    // 페이지로부터 메시지 수신
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'ENTRY_TURBO_TOGGLE') {
        this.saveTurboState(event.data.isTurbo);
      }
    });
  }

  // injected.js 파일 주입
  injectScript() {
    if (this.isInjected) return;

    const scriptElement = document.createElement('script');
    scriptElement.src = chrome.runtime.getURL('injected.js');
    scriptElement.onload = () => {
      this.isInjected = true;
    };
    (document.head || document.documentElement).appendChild(scriptElement);
  }

  // 저장된 터보 상태 로드
  async loadTurboState() {
    try {
      const result = await chrome.storage.local.get(['isTurbo']);
      return { isTurbo: result.isTurbo || false };
    } catch (error) {
      return { isTurbo: false };
    }
  }

  // 터보 상태 저장
  async saveTurboState(isTurbo) {
    try {
      await chrome.storage.local.set({ isTurbo });
    } catch (error) {
      // 저장 실패 시 조용히 넘어감
    }
  }

  // 페이지에 상태 전송
  sendStateToPage(isTurbo) {
    window.postMessage({
      type: 'ENTRY_TURBO_STATE',
      isTurbo: isTurbo
    }, '*');
  }
}

// 페이지 로드 완료 후 인젝터 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EntryTurboInjector();
  });
} else {
  new EntryTurboInjector();
}