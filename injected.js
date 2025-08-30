// Entry Turbo Mode - Injected Script
// 페이지의 전역 스코프에서 실행되는 스크립트

class EntryTurboController {
  constructor() {
    this.isTurbo = false;
    this.turboButton = null;
    this.intervalId = null;
    this.mainObserver = null;
    this.iframeObserver = null;
    this.init();
  }

  async init() {
    // 저장된 상태는 content script에서 전달받음
    // 0.5초마다 버튼 체크 (대상 버튼과 iframe이 지연 로딩될 수 있으므로 지속적으로 확인)
    this.intervalId = setInterval(() => {
      this.checkAndAddButton();
    }, 500);

    // DOM 변화 실시간 감시 시작
    this.startDOMObserver();

    // content script로부터 메시지 수신
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      if (event.data.type === 'ENTRY_TURBO_STATE') {
        this.isTurbo = event.data.isTurbo;
        this.updateButtonAppearance();
        this.applyTurboSetting();
      }
    });

    // Entry Turbo Controller 초기화 완료
  }

  // DOM 변화 실시간 감시 시작
  startDOMObserver() {
    this.startMainPageObserver();
    this.startIframeObserver();
  }

  // 메인 페이지 DOM 변화 감시
  startMainPageObserver() {
    if (this.mainObserver) {
      this.mainObserver.disconnect();
    }

    this.mainObserver = new MutationObserver((mutations) => {
      this.handleDOMChanges(mutations);
    });

    this.mainObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  // iframe 내부 DOM 변화 감시
  startIframeObserver() {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument) return;

    try {
      if (this.iframeObserver) {
        this.iframeObserver.disconnect();
      }

      this.iframeObserver = new MutationObserver((mutations) => {
        this.handleDOMChanges(mutations);
      });

      this.iframeObserver.observe(iframe.contentDocument.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    } catch (error) {
      // iframe 접근 권한 문제 시 조용히 넘어감
    }
  }

  // DOM 변화 처리 - 터보 버튼 이동 및 entryPopup 클래스 변화 감지
  handleDOMChanges(mutations) {
    let shouldCheckButton = false;

    mutations.forEach(mutation => {
      // 터보 버튼이 추가/제거/이동되었는지 확인
      if (mutation.type === 'childList') {
        const addedNodes = Array.from(mutation.addedNodes);
        const removedNodes = Array.from(mutation.removedNodes);
        
        addedNodes.concat(removedNodes).forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList?.contains('isTurboButtonON') || 
                node.classList?.contains('isTurboButtonOFF') ||
                node.querySelector?.('.isTurboButtonON, .isTurboButtonOFF')) {
              shouldCheckButton = true;
            }
            
            // entryPopup 클래스가 있는 요소의 변화도 감지
            if (node.classList?.contains('entryPopup') ||
                node.querySelector?.('.entryPopup')) {
              shouldCheckButton = true;
            }
          }
        });
      }
      
      // 클래스 속성 변화 감지 (entryPopup 클래스 추가/제거)
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList?.contains('entryPopup')) {
          shouldCheckButton = true;
        }
      }
    });

    if (shouldCheckButton) {
      // 터보 버튼 위치 확인 및 스타일 업데이트
      setTimeout(() => this.updateTurboButtonPosition(), 50);
    }
  }

  // 터보 버튼 위치 확인 및 스타일 업데이트
  updateTurboButtonPosition() {
    if (!this.turboButton) return;

    const url = window.location.href;
    
    if (url.includes('/ws/')) {
      // ws 페이지는 iframe 체크 불필요, 바로 ws 스타일 적용
      this.applyButtonPositionStyle(false);
    } else {
      // project/iframe 페이지는 iframe 위치 체크
      const isInIframe = this.isButtonInIframe();
      this.applyButtonPositionStyle(isInIframe);
    }
  }

  // 버튼이 iframe 안에 있는지 확인
  isButtonInIframe() {
    if (!this.turboButton) return false;

    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument) return false;

    try {
      return this.turboButton.ownerDocument === iframe.contentDocument;
    } catch (error) {
      return false;
    }
  }

  // 버튼 위치에 따른 스타일 적용
  applyButtonPositionStyle(isInIframe) {
    if (!this.turboButton) return;

    const url = window.location.href;
    
    // ws 페이지인 경우 특별 처리
    if (url.includes('/ws/')) {
      this.applyWSPageStyle();
    } else {
      // project/iframe 페이지인 경우
      if (isInIframe) {
        // iframe 안에 있을 때
        this.turboButton.style.position = '';
        this.turboButton.style.right = '';
        this.turboButton.style.bottom = '';
        this.turboButton.style.margin = '';
        this.turboButton.style.marginRight = '150px';
        this.turboButton.style.marginTop = '12px';
        this.turboButton.style.marginBottom = '12px';
        this.turboButton.style.float = 'right';
      } else {
        // iframe 밖에 있을 때
        this.turboButton.style.position = '';
        this.turboButton.style.right = '';
        this.turboButton.style.bottom = '';
        this.turboButton.style.margin = '';
        this.turboButton.style.marginRight = '10px';
        this.turboButton.style.marginTop = '12px';
        this.turboButton.style.marginBottom = '12px';
        this.turboButton.style.float = 'right';
      }
    }
  }

  // ws 페이지 전용 스타일 적용
  applyWSPageStyle() {
    const hasPopupAncestor = this.hasPopupAncestor();
    
    if (hasPopupAncestor) {
      // entryPopup 클래스가 있는 경우 - absolute positioning
      this.turboButton.style.position = 'absolute';
      this.turboButton.style.right = '100px';
      this.turboButton.style.bottom = '9.5px';
      this.turboButton.style.margin = '0';
      this.turboButton.style.marginRight = '';
      this.turboButton.style.marginTop = '';
      this.turboButton.style.marginBottom = '';
      this.turboButton.style.float = 'right';
    } else {
      // 일반 ws 페이지 스타일
      this.turboButton.style.position = '';
      this.turboButton.style.right = '';
      this.turboButton.style.bottom = '';
      this.turboButton.style.margin = '';
      this.turboButton.style.marginRight = '';
      this.turboButton.style.marginTop = '2.5px';
      this.turboButton.style.marginBottom = '';
      this.turboButton.style.float = 'right';
    }
  }

  // 버튼의 조상 요소에 entryPopup 클래스가 있는지 확인
  hasPopupAncestor() {
    if (!this.turboButton) return false;
    
    try {
      // 버튼의 부모의 부모의 부모 요소 확인
      let ancestor = this.turboButton.parentNode?.parentNode?.parentNode;
      if (ancestor && ancestor.classList?.contains('entryPopup')) {
        return true;
      }
      
      // 좀 더 넓게 조상 요소들 확인 (혹시 구조가 다를 수 있으니)
      let currentElement = this.turboButton.parentNode;
      let depth = 0;
      while (currentElement && depth < 10) {
        if (currentElement.classList?.contains('entryPopup')) {
          return true;
        }
        currentElement = currentElement.parentNode;
        depth++;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  // 현재 URL에 따른 타겟 버튼 선택자 반환
  getTargetButtonSelector() {
    const url = window.location.href;
    
    if (url.includes('/project/') || url.includes('/iframe/')) {
      return '.entryEngineButtonMinimize.entryCoordinateButtonMinimize';
    } else if (url.includes('/ws/')) {
      return '.entryEngineButtonWorkspace_w.entryEngineTopWorkspace.entryCoordinateButtonWorkspace_w';
    }
    
    return null;
  }

  // 버튼 존재 여부 체크 및 추가 - URL에 따라 메인 페이지 또는 iframe 내부에서
  checkAndAddButton() {
    const selector = this.getTargetButtonSelector();
    if (!selector) return;

    const url = window.location.href;
    
    // project나 iframe 페이지는 iframe 내부에서 버튼 찾기
    if (url.includes('/project/') || url.includes('/iframe/')) {
      this.checkAndAddButtonInIframe(selector);
      // iframe이 새로 로드되었을 수도 있으니 observer 재시작
      this.startIframeObserver();
    } else {
      // 다른 페이지는 메인 페이지에서 버튼 찾기
      this.checkAndAddButtonInMainPage(selector);
    }
  }

  // iframe 내부에서 버튼 찾기 및 추가
  checkAndAddButtonInIframe(selector) {
    const iframe = document.querySelector('iframe');
    if (!iframe || !iframe.contentDocument) return; // iframe이 아직 로드되지 않음

    try {
      const targetButton = iframe.contentDocument.querySelector(selector);
      if (!targetButton) return; // iframe 내부에 대상 버튼이 아직 없음

      // 이미 터보 버튼이 있는지 체크
      const existingTurboButton = targetButton.parentNode.querySelector('.isTurboButtonON, .isTurboButtonOFF');
      if (existingTurboButton) {
        this.turboButton = existingTurboButton;
        this.updateTurboButtonPosition(); // 위치 변경 시 스타일 업데이트
        return;
      }

      // iframe 내부에 터보 버튼 생성 및 추가
      this.createTurboButtonInIframe(targetButton, iframe);
    } catch (error) {
      // iframe 권한 문제 시 조용히 넘어감
    }
  }

  // 메인 페이지에서 버튼 찾기 및 추가
  checkAndAddButtonInMainPage(selector) {
    const targetButton = document.querySelector(selector);
    if (!targetButton) return; // 대상 버튼이 아직 로드되지 않음

    // 이미 터보 버튼이 있는지 체크
    const existingTurboButton = targetButton.parentNode.querySelector('.isTurboButtonON, .isTurboButtonOFF');
    if (existingTurboButton) {
      this.turboButton = existingTurboButton;
      this.updateTurboButtonPosition(); // 위치 변경 시 스타일 업데이트
      return;
    }

    // 메인 페이지에 터보 버튼 생성 및 추가
    this.createTurboButton(targetButton);
  }

  // 메인 페이지에 터보 버튼 생성
  createTurboButton(targetButton) {
    const turboButton = document.createElement('button');
    turboButton.className = this.isTurbo ? 'isTurboButtonON' : 'isTurboButtonOFF';
    turboButton.textContent = this.isTurbo ? '터보모드 켜짐' : '터보모드 꺼짐';
    turboButton.style.cssText = `
      padding: 5px 10px;
      float: right;
      font-size: 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: ${this.isTurbo ? 'rgb(22, 216, 163)' : 'rgb(226, 226, 226)'};
      color: white;
      font-weight: bold;
    `;

    // 클릭 이벤트 추가
    turboButton.addEventListener('click', () => {
      this.toggleTurbo();
    });

    // 타겟 버튼 다음에 추가
    targetButton.parentNode.insertBefore(turboButton, targetButton.nextSibling);
    this.turboButton = turboButton;

    // 버튼 위치에 따른 스타일 적용
    this.applyButtonPositionStyle(false); // 메인 페이지에서 생성

    // 버튼 추가 시 Entry.isTurbo 설정
    this.applyTurboSetting();
  }

  // iframe 내부에 터보 버튼 생성
  createTurboButtonInIframe(targetButton, iframe) {
    const iframeDoc = iframe.contentDocument;
    const turboButton = iframeDoc.createElement('button');
    turboButton.className = this.isTurbo ? 'isTurboButtonON' : 'isTurboButtonOFF';
    turboButton.textContent = this.isTurbo ? '터보모드 켜짐' : '터보모드 꺼짐';
    turboButton.style.cssText = `
      padding: 5px 10px;
      float: right;
      font-size: 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      background-color: ${this.isTurbo ? 'rgb(22, 216, 163)' : 'rgb(226, 226, 226)'};
      color: white;
      font-weight: bold;
    `;

    // 클릭 이벤트 추가
    turboButton.addEventListener('click', () => {
      this.toggleTurbo();
    });

    // 타겟 버튼 다음에 추가
    targetButton.parentNode.insertBefore(turboButton, targetButton.nextSibling);
    this.turboButton = turboButton;

    // 버튼 위치에 따른 스타일 적용
    this.applyButtonPositionStyle(true); // iframe 내부에서 생성

    // 버튼 추가 시 Entry.isTurbo 설정
    this.applyTurboSetting();
  }

  // 터보 모드 토글
  toggleTurbo() {
    this.isTurbo = !this.isTurbo;
    
    // content script에 상태 변경 알림
    window.postMessage({
      type: 'ENTRY_TURBO_TOGGLE',
      isTurbo: this.isTurbo
    }, '*');

    this.updateButtonAppearance();
    this.applyTurboSetting();
  }

  // 버튼 외관 업데이트
  updateButtonAppearance() {
    if (!this.turboButton) return;

    this.turboButton.className = this.isTurbo ? 'isTurboButtonON' : 'isTurboButtonOFF';
    this.turboButton.textContent = this.isTurbo ? '터보모드 켜짐' : '터보모드 꺼짐';
    this.turboButton.style.backgroundColor = this.isTurbo ? 'rgb(22, 216, 163)' : 'rgb(226, 226, 226)';
    
    // 위치에 따른 스타일도 업데이트
    this.updateTurboButtonPosition();
  }

  // Entry.isTurbo 설정 적용 - URL에 따라 동작 방식 분기
  applyTurboSetting() {
    const url = window.location.href;
    
    // project나 iframe 페이지는 iframe을 기다림
    if (url.includes('/project/') || url.includes('/iframe/')) {
      this.applyTurboInProjectPage();
    } else {
      // 다른 페이지(ws 등)는 메인 페이지에서 바로 동작
      this.setEntryInMainPage();
    }
  }

  // project 페이지에서 iframe을 기다리며 설정
  applyTurboInProjectPage() {
    const iframe = document.querySelector('iframe');
    
    if (iframe && iframe.contentWindow) {
      try {
        // iframe 내부에 Entry 객체가 있는지 확인
        const iframeWindow = iframe.contentWindow;
        if (typeof iframeWindow.Entry !== 'undefined') {
          iframeWindow.Entry.isTurbo = this.isTurbo;
        }
        // Entry가 아직 없으면 조용히 대기
      } catch (error) {
        // 권한 문제 시 조용히 대기
      }
    }
    // iframe이 없으면 조용히 대기
  }

  // 메인 페이지의 Entry 객체에 설정
  setEntryInMainPage() {
    if (typeof Entry !== 'undefined') {
      Entry.isTurbo = this.isTurbo;
    }
    // Entry 객체가 없으면 조용히 대기
  }

  // 정리
  destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    if (this.mainObserver) {
      this.mainObserver.disconnect();
      this.mainObserver = null;
    }
    
    if (this.iframeObserver) {
      this.iframeObserver.disconnect();
      this.iframeObserver = null;
    }
  }
}

// 전역 변수로 컨트롤러 저장
window.entryTurboController = new EntryTurboController();

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  if (window.entryTurboController) {
    window.entryTurboController.destroy();
  }
});
