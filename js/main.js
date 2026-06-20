document.addEventListener('DOMContentLoaded', () => {
    console.log("main.js (인증/로그아웃) 로컬 버전 가동");

    const logoutBtn = document.getElementById('logout-btn');

    // 로그아웃 버튼 클릭 이벤트 처리
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm('정말 로그아웃 하시겠습니까?')) {
                try {
                    // 💡 서버 통신 대신 StorageDB나 localStorage의 세션 데이터를 지웁니다.
                    if (typeof StorageDB !== 'undefined' && typeof StorageDB.logout === 'function') {
                        StorageDB.logout();
                    } else {
                        // 만약 StorageDB에 logout 함수가 없다면 직접 세션 키 삭제
                        localStorage.removeItem('current_session');
                        localStorage.removeItem('session_user');
                    }

                    alert('로그아웃 되었습니다.');
                    // 로그인 페이지(index.html 또는 login.html)로 이동
                    window.location.href = 'index.html'; 
                } catch (error) {
                    console.error('Logout Error:', error);
                    // 로컬이므로 만약의 에러가 나도 강제 이동 처리
                    window.location.href = 'index.html';
                }
            }
        });
    }
});
