document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');

    // 로그아웃 버튼 클릭 이벤트 처리
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('정말 로그아웃 하시겠습니까?')) {
                try {
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        window.location.href = '/';
                    } else {
                        alert(result.message || '로그아웃 실패');
                    }
                } catch (error) {
                    console.error('Logout Error:', error);
                    alert('서버와의 통신 오류로 로그아웃을 진행할 수 없습니다.');
                }
            }
        });
    }
});
