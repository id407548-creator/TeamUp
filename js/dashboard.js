document.addEventListener('DOMContentLoaded', () => {
    console.log("dashboard.js 로드 완료 (스타일 구조 일원화)");

    // 1. StorageDB 체크
    if (typeof StorageDB === 'undefined') {
        console.error("StorageDB를 찾을 수 없습니다. storage.js가 올바르게 로드되었는지 확인하세요.");
        return;
    }

    let session = null;
    try {
        session = StorageDB.getCurrentSession();
        console.log("가져온 세션 데이터:", session);
    } catch (e) {
        console.error("세션을 가져오는 중 에러 발생:", e);
    }

    // 로그인 안 되어 있으면 로그인 페이지로 안전하게 튕기기
    if (!session) {
        alert("로그인이 필요합니다.");
        window.location.href = "login.html";
        return;
    }

    // 2. 사용자 이름 표시
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        const currentUserName = session.displayName || session.name || session.username || session.userId || "사용자";
        userNameElement.textContent = currentUserName;
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

    // 💡 타 모달(tasks)과 일치하도록 style.display 속성 제어로 변경하여 클래스 누락에 의한 먹통 방지
    function openModal() {
        hideModalError();
        if (createTeamForm) createTeamForm.reset();
        if (createTeamModal) createTeamModal.style.display = 'flex';
    }

    function closeModal() {
        if (createTeamModal) createTeamModal.style.display = 'none';
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
                if (result && result.success) {
                    closeModal();
                    loadTeams(); // 리스트 즉시 리프레시
                } else {
                    showModalError(result ? result.message : "팀 생성에 실패했습니다.");
                }
            } catch (error) {
                console.error("팀 생성 중 에러 발생:", error);
                showModalError("스토리지 오류가 발생했습니다.");
            }
        });
    }

    // 팀 목록 로드
    function loadTeams() {
        if (!teamListContainer) return;
        
        try {
            const result = StorageDB.getTeams();
            if (!result || !result.success) {
                teamListContainer.innerHTML = `
                    <div class="glass-panel" style="padding:40px;text-align:center;grid-column:1/-1;">
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
                <div class="glass-panel" style="grid-column:1/-1;padding:60px;text-align:center;background:rgba(255,255,255,0.6);border-radius:16px;">
                    <i class="fa-solid fa-folder-open" style="font-size:3rem;margin-bottom:20px;color:#858efa;"></i>
                    <h3 style="color:#1e293b;">아직 생성된 프로젝트가 없습니다</h3>
                    <p style="margin-top:10px;color:#64748b;">
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
            card.style.transition = 'transform 0.2s, box-shadow 0.2s';

            // 💡 호환성 조율: 역할 이름 표기 필터링 보완
            const roleBadge = team.role === 'creator' ? '팀장' : '팀원';

            card.innerHTML = `
                <span style="display:inline-block; margin-bottom:12px; padding:4px 10px; border-radius:20px; background:#eef2ff; font-size:0.8rem; color:#4f46e5; font-weight:600;">
                    ${escapeHTML(team.subject)}
                </span>
                <h3 style="margin-bottom:10px; color:#1e293b; font-size:1.2rem;">${escapeHTML(team.name)}</h3>
                <p style="color:#64748b; margin-bottom:20px; font-size:0.9rem; line-height:1.4;">
                    ${escapeHTML(team.description || '프로젝트 설명이 없습니다.')}
                </p>
                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:12px;">
                    <span><i class="fa-solid fa-users"></i> 팀원 ${team.memberCount || 1}명</span>
                    <span style="color: ${team.role === 'creator' ? '#4f46e5' : '#64748b'}; font-weight:500;">${roleBadge}</span>
                </div>
            `;

            // 호버 이펙트 자바스크립트로 가볍게 지원
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
                card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            });

            card.addEventListener('click', () => {
                window.location.href = `team.html?id=${team.id}`;
            });

            teamListContainer.appendChild(card);
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    loadTeams();
});
