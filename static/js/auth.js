document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    // 에러 메시지 표시 도우미 함수
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    // 에러 메시지 감추기 도우미 함수
    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // 1. 로그인 처리
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value;

            if (!username || !password) {
                showError('아이디와 비밀번호를 모두 입력해주세요.');
                return;
            }

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    // 로그인 성공 시 대시보드로 이동
                    window.location.href = '/dashboard';
                } else {
                    showError(result.message || '로그인에 실패했습니다.');
                }
            } catch (error) {
                console.error('Login Error:', error);
                showError('서버와의 통신 중 오류가 발생했습니다.');
            }
        });
    }

    // 2. 회원가입 처리
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError();

            const username = registerForm.username.value.trim();
            const displayName = registerForm.display_name.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const passwordConfirm = document.getElementById('password_confirm').value;

            // 유효성 검사
            if (!username || !displayName || !email || !password) {
                showError('모든 필수 입력 항목을 채워주세요.');
                return;
            }

            if (password.length < 6) {
                showError('비밀번호는 최소 6자 이상이어야 합니다.');
                return;
            }

            if (password !== passwordConfirm) {
                showError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
                return;
            }

            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        display_name: displayName,
                        email,
                        password
                    })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    alert('회원가입이 완료되었습니다. 로그인 해주세요.');
                    window.location.href = '/login';
                } else {
                    showError(result.message || '회원가입에 실패했습니다.');
                }
            } catch (error) {
                console.error('Registration Error:', error);
                showError('서버와의 통신 중 오류가 발생했습니다.');
            }
        });
    }
});
