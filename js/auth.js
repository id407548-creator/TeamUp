document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const errorMessage = document.getElementById('error-message');

    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    function hideError() {
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
    }

    // =========================
    // 로그인
    // =========================
    if (loginForm) {

        loginForm.addEventListener('submit', (e) => {

            e.preventDefault();
            hideError();

            const username = loginForm.username.value.trim();
            const password = loginForm.password.value;

            if (!username || !password) {
                showError('아이디와 비밀번호를 입력해주세요.');
                return;
            }

            const result = StorageDB.authLogin(
                username,
                password
            );

            if (result.success) {
                alert('로그인 성공!');
                window.location.href = 'dashboard.html';
            } else {
                showError(result.message);
            }
        });
    }

    // =========================
    // 회원가입
    // =========================
    if (registerForm) {

        registerForm.addEventListener('submit', (e) => {

            e.preventDefault();
            hideError();

            const username = registerForm.username.value.trim();
            const displayName = registerForm.display_name.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value;
            const passwordConfirm =
                document.getElementById('password_confirm').value;

            if (!username || !displayName || !email || !password) {
                showError('모든 항목을 입력해주세요.');
                return;
            }

            if (password.length < 6) {
                showError('비밀번호는 6자 이상이어야 합니다.');
                return;
            }

            if (password !== passwordConfirm) {
                showError('비밀번호가 일치하지 않습니다.');
                return;
            }

            const result = StorageDB.authRegister(
                username,
                password,
                displayName,
                email
            );

            if (result.success) {

                alert('회원가입이 완료되었습니다.');

                window.location.href = 'login.html';

            } else {

                showError(result.message);
            }
        });
    }
});
