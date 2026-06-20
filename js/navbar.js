/**
 * TeamUp Common Navigation Bar & Route Protector
 * 각 정적 페이지에 헤더 네비게이션 바를 동적으로 삽입하고 로그인 권한을 체크합니다.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. 세션 체크 및 페이지 보안 리다이렉션 (Route Protection)
    const session = window.StorageDB ? window.StorageDB.getCurrentSession() : null;
    
    // 💡 파일 경로 이슈 방지를 위해 URL 객체 또는 쿼리스트링 제거 후 순수 파일명만 정확히 추출
    const path = window.location.pathname;
    let page = path.split('/').pop() || 'index.html';
    if (page === '') page = 'index.html'; // 주소가 / 로 끝날 경우 처리

    const guestPages = ['login.html', 'register.html', 'index.html']; // index.html도 게스트 허용군에 명시
    const protectedPages = ['dashboard.html', 'team.html'];

    if (session) {
        // 로그인 상태로 로그인/회원가입/메인 진입 시 대시보드로 안전하게 이동
        if (page === 'login.html' || page === 'register.html') {
            window.location.href = 'dashboard.html';
            return;
        }
    } else {
        // 비로그인 상태로 대시보드/팀 상세 진입 시 로그인 페이지로 강제 이동
        // 💡 page 변수가 완전히 맵핑되지 않더라도 protectedPages에 포함되는 단어가 있으면 확실히 잡아내도록 보완
        const isProtected = protectedPages.some(p => page.includes(p));
        if (isProtected) {
            window.location.href = 'login.html';
            return;
        }
    }

    // 2. 공통 내비게이션 바 마크업 주입
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = renderNavbar(session);
        bindLogoutEvent();
    }
});

// 세션 여부에 따라 네비게이션 마크업 렌더링
function renderNavbar(session) {
    let rightMenu = '';
    
    if (session) {
        // session.displayName이 없을 경우를 대비해 fallback 데이터 추가
        const userName = session.displayName || session.username || '사용자';
        rightMenu = `
            <li><a href="dashboard.html" class="nav-item">대시보드</a></li>
            <li>
                <span class="nav-item" style="color: #64748b; cursor: default; font-size: 0.9rem; padding: 0 8px;">
                    <i class="fa-regular fa-user"></i> ${escapeHTML(userName)}님
                </span>
            </li>
            <li><button id="logout-btn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem; cursor: pointer;">로그아웃</button></li>
        `;
    } else {
        rightMenu = `
            <li><a href="login.html" class="nav-item">로그인</a></li>
            <li><a href="register.html" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.9rem; font-weight: 500;">시작하기</a></li>
        `;
    }

    return `
        <nav class="navbar" style="border-bottom: 1px solid #e2e8f0; background: #ffffff;">
            <div class="container" style="display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; padding: 0 20px; height: 60px;">
                <a href="index.html" class="brand" style="font-weight: 700; font-size: 1.25rem; color: #4f46e5; text-decoration: none; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-people-group"></i> TeamUp
                </a>
                <ul class="nav-links" style="display: flex; align-items: center; gap: 16px; list-style: none; margin: 0; padding: 0;">
                    ${rightMenu}
                </ul>
            </div>
        </nav>
    `;
}

// 로그아웃 버튼 이벤트 바인딩
function bindLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃 하시겠습니까?')) {
                if (window.StorageDB) {
                    window.StorageDB.authLogout();
                }
                window.location.href = 'index.html';
            }
        });
    }
}

// HTML 이스케이프 헬퍼
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
