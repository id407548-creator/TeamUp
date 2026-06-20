document.addEventListener('DOMContentLoaded', () => {
    console.log("dashboard.js 로드 완료");

    // 1. StorageDB 체크
    if (typeof StorageDB === 'undefined') {
        console.error("StorageDB를 찾을 수 없습니다. storage.js가 올바르게 로드되었는지 확인하세요.");
        return;
    }

    // 예외 처리 적용하여 세션 가져오기
    let session = null;
    try {
        session = StorageDB.getCurrentSession();
        console.log("가져온 세션 데이터:", session);
    } catch (e) {
        console.error("세션을 가져오는 중 에러 발생:", e);
    }

    // 로그인 안 되어 있으면 로그인 페이지로 (테스트 중 튕기는걸 방지하려면 잠시 주석 처리해도 됨)
    if (!session) {
        alert("로그인이 필요합니다.");
        window.location.href = "login.html";
        return;
    }

    // 2. 사용자 이름 표시 (데이터 필드 호환성 확보)
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        // displayName, name, username, userId 중 존재하는 값을 찾아서 '이다경'이 뜨도록 유도
        const currentUserName = session.displayName || session.name || session.username || session.userId || "사용자";
        userNameElement.textContent = currentUserName;
        console.log("화면에 표시된 이름:", currentUserName);
    }

    // DOM 엘리먼트 수집
    const openModalBtn = document.getElementById('open-create-team-modal');
    const closeModalBtn = document.getElementById('close-create-team-modal');
    const cancelModalBtn = document.getElementById('cancel-create-team');
    const createTeamModal = document.getElementById('create-team-modal');
    const createTeamForm = document.getElementById('create-team-form');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const teamListContainer = document.getElementById('team-list-container');
    const badge = document.getElementById('teams-count-badge');

    function showModalError(message) {
        if (modalErrorMessage) {
            modalErrorMessage.textContent = message;
            modalErrorMessage.style.display = 'block';
        }
    }

    function hideModalError() {
        if (modalErrorMessage) {
            modalErrorMessage.style.display = 'none';
        }
    }

    function openModal() {
        hideModalError();
        if (createTeamForm) createTeamForm.reset();
        if (createTeamModal) createTeamModal.classList.add('active');
    }

    function closeModal() {
        if (createTeamModal) createTeamModal.classList.remove('active');
    }

    // 이벤트 리스너 안전하게 바인딩
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    if (createTeamModal) {
        createTeamModal.addEventListener('click', (e) => {
            if (e.target === createTeamModal) closeModal();
        });
    }

    // 팀 생성 프로세스
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('team-name').value.trim();
            const subject = document.getElementById('team-subject').value.trim();
            const description = document.getElementById('team-description').value.trim();

            if (!name || !subject) {
                showModalError('팀 이름과 과목명을 입력해주세요.');
                return;
            }

            try {
                const result = StorageDB.createTeam(name, subject, description);
                console.log("팀 생성 결과:", result);

                if (result && result.success) {
                    closeModal();
                    loadTeams();
                } else {
                    showModalError(result ? result.message : "팀 생성에 실패했습니다.");
                }
            } catch (error) {
                console.error("팀 생성 중 에러 발생:", error);
                showModalError("서버/스토리지 오류가 발생했습니다.");
            }
        });
    }

    function loadTeams() {
        if (!teamListContainer) return;
        
        try {
            const result = StorageDB.getTeams();
            if (!result || !result.success) {
                teamListContainer.innerHTML = `
                    <div class="glass-panel" style="padding:40px;text-align:center;">
                        <p>${result ? result.message : "팀 목록을 불러오지 못했습니다."}</p>
                    </div>
                `;
                return;
            }
            renderTeams(result.teams);
            if (badge) badge.textContent = `${result.teams.length}개`;
        } catch (error) {
            console.error("팀 목록 로드 중 에러:", error);
        }
    }

    function renderTeams(teams) {
        if (!teams || teams.length === 0) {
            teamListContainer.innerHTML = `
                <div class="glass-panel" style="grid-column:1/-1;padding:60px;text-align:center;">
                    <i class="fa-solid fa-folder-open" style="font-size:3rem;margin-bottom:20px;"></i>
                    <h3>아직 생성된 프로젝트가 없습니다</h3>
                    <p style="margin-top:10px;color:var(--text-secondary);">
                        새 프로젝트를 만들어 협업을 시작해보세요.
                    </p>
                </div>
            `;
            return;
        }

        teamListContainer.innerHTML = '';

        teams.forEach(team => {
            const card = document.createElement('div');
            card.className = 'glass-panel';
            card.style.padding = '24px';
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <span style="display:inline-block; margin-bottom:10px; padding:4px 10px; border-radius:20px; background:#eef2ff; font-size:0.8rem;">
                    ${escapeHTML(team.subject)}
                </span>
                <h3 style="margin-bottom:10px;">${escapeHTML(team.name)}</h3>
                <p style="color:var(--text-secondary); margin-bottom:15px;">
                    ${escapeHTML(team.description || '설명 없음')}
                </p>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
                    <span>팀원 ${team.memberCount || 1}명</span>
                    <span>${team.role || '팀원'}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href = `team.html?id=${team.id}`;
            });

            teamListContainer.appendChild(card);
        });
    }

    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    loadTeams();
});
