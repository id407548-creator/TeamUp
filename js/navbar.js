/**
 * TeamUp Common Navigation Bar & Route Protector
 * 각 정적 페이지에 헤더 네비게이션 바를 동적으로 삽입하고 로그인 권한을 체크합니다.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. 세션 체크 및 페이지 보안 리다이렉션 (Route Protection)
    const session = window.StorageDB ? window.StorageDB.getCurrentSession() : null;
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    const guestPages = ['login.html', 'register.html'];
    const protectedPages = ['dashboard.html', 'team.html'];

    if (session) {
        // 로그인 상태로 로그인/회원가입 진입 시 대시보드로 이동
        if (guestPages.includes(page)) {
            window.location.href = 'dashboard.html';
            return;
        }
    } else {
        // 비로그인 상태로 대시보드/팀 상세 진입 시 로그인 페이지로 강제 이동
        if (protectedPages.includes(page)) {
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
        rightMenu = `
            <li><a href="dashboard.html" class="nav-item">대시보드</a></li>
            <li>
                <span class="nav-item" style="color: var(--text-secondary); cursor: default;">
                    <i class="fa-regular fa-user"></i> ${escapeHTML(session.displayName)}님
                </span>
            </li>
            <li><button id="logout-btn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;">로그아웃</button></li>
        `;
    } else {
        rightMenu = `
            <li><a href="login.html" class="nav-item">로그인</a></li>
            <li><a href="register.html" class="btn btn-primary" style="padding: 8px 16px;">시작하기</a></li>
        `;
    }

    return `
        <nav class="navbar">
            <div class="container">
                <a href="index.html" class="brand">
                    <i class="fa-solid fa-people-group"></i> TeamUp
                </a>
                <ul class="nav-links">
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
