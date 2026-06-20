document.addEventListener('DOMContentLoaded', () => {
    const session = window.StorageDB ? window.StorageDB.getCurrentSession() : null;
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    // 💡 주소창에 아래 단어가 포함되어 있는지 아주 직관적으로 체크
    const isLoginPage = page.includes('login.html') || page.includes('register.html');
    const isProtectedPage = page.includes('dashboard.html') || page.includes('team.html');

    if (session) {
        // 로그인된 상태에서 로그인/회원가입창 가려고 하면 대시보드로 보냄
        if (isLoginPage) {
            window.location.href = 'dashboard.html';
            return;
        }
    } else {
        // 로그인 안 된 상태에서 대시보드나 팀 상세페이지 가려고 하면 무조건 로그인으로
        if (isProtectedPage) {
            window.location.href = 'login.html';
            return;
        }
    }

    const navbarPlaceholder = document.getElementById('navbar-placeholder');
    if (navbarPlaceholder) {
        navbarPlaceholder.innerHTML = renderNavbar(session);
        bindLogoutEvent();
    }
});

function renderNavbar(session) {
    let rightMenu = '';
    if (session) {
        const name = session.displayName || session.username || '사용자';
        rightMenu = `
            <li><a href="dashboard.html" class="nav-item">대시보드</a></li>
            <li><span class="nav-item" style="color: #64748b; cursor: default;"><i class="fa-regular fa-user"></i> ${escapeHTML(name)}님</span></li>
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
            <div class="container" style="display:flex; justify-content:space-between; align-items:center; height:60px;">
                <a href="index.html" class="brand" style="font-weight:700; color:#4f46e5; text-decoration:none;">
                    <i class="fa-solid fa-people-group"></i> TeamUp
                </a>
                <ul class="nav-links" style="display:flex; align-items:center; gap:16px; list-style:none; margin:0; padding:0;">
                    ${rightMenu}
                </ul>
            </div>
        </nav>
    `;
}

function bindLogoutEvent() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('로그아웃 하시겠습니까?')) {
                if (window.StorageDB) window.StorageDB.authLogout();
                window.location.href = 'index.html';
            }
        });
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
