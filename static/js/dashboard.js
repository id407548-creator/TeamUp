document.addEventListener('DOMContentLoaded', () => {
    const openModalBtn = document.getElementById('open-create-team-modal');
    const closeModalBtn = document.getElementById('close-create-team-modal');
    const cancelModalBtn = document.getElementById('cancel-create-team');
    const createTeamModal = document.getElementById('create-team-modal');
    const createTeamForm = document.getElementById('create-team-form');
    const modalErrorMessage = document.getElementById('modal-error-message');
    const teamListContainer = document.getElementById('team-list-container');

    // 모달 에러 노출
    function showModalError(message) {
        if (modalErrorMessage) {
            modalErrorMessage.textContent = message;
            modalErrorMessage.style.display = 'block';
        }
    }

    // 모달 에러 숨김
    function hideModalError() {
        if (modalErrorMessage) {
            modalErrorMessage.style.display = 'none';
        }
    }

    // 모달 열기
    if (openModalBtn) {
        openModalBtn.addEventListener('click', () => {
            hideModalError();
            createTeamForm.reset();
            createTeamModal.classList.add('active');
        });
    }

    // 모달 닫기
    function closeModal() {
        createTeamModal.classList.remove('active');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    // 모달 바깥쪽 클릭 시 닫기
    if (createTeamModal) {
        createTeamModal.addEventListener('click', (e) => {
            if (e.target === createTeamModal) {
                closeModal();
            }
        });
    }

    // 팀 생성 폼 제출 처리
    if (createTeamForm) {
        createTeamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideModalError();

            const name = createTeamForm.name.value.trim();
            const subject = createTeamForm.subject.value.trim();
            const description = createTeamForm.description.value.trim();

            if (!name || !subject) {
                showModalError('팀 이름과 과목명을 모두 입력해 주세요.');
                return;
            }

            try {
                const response = await fetch('/api/teams/create', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name, subject, description })
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    closeModal();
                    // 팀 페이지로 바로 이동
                    window.location.href = `/team/${result.team_id}`;
                } else {
                    showModalError(result.message || '팀 생성에 실패했습니다.');
                }
            } catch (error) {
                console.error('Create Team Error:', error);
                showModalError('서버 통신 중 오류가 발생했습니다.');
            }
        });
    }

    // 참여 중인 팀 목록 조회 및 화면 렌더링
    async function loadTeams() {
        try {
            const response = await fetch('/api/teams');
            const result = await response.json();

            if (response.ok && result.success) {
                renderTeams(result.teams);
            } else {
                teamListContainer.innerHTML = `
                    <div class="glass-panel" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">
                        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--danger);"></i>
                        <p>${result.message || '팀 목록을 가져오지 못했습니다.'}</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Load Teams Error:', error);
            teamListContainer.innerHTML = `
                <div class="glass-panel" style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-secondary);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--danger);"></i>
                    <p>서버와 통신하는 중 오류가 발생했습니다.</p>
                </div>
            `;
        }
    }

    // 팀 목록 동적 렌더링
    function renderTeams(teams) {
        if (!teams || teams.length === 0) {
            teamListContainer.innerHTML = `
                <div class="glass-panel" style="grid-column: 1 / -1; padding: 50px 30px; text-align: center;">
                    <i class="fa-solid fa-people-roof" style="font-size: 3.5rem; margin-bottom: 16px; color: var(--text-muted);"></i>
                    <h3 style="font-size: 1.3rem; margin-bottom: 8px;">아직 소속된 팀이 없습니다</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 24px; font-size: 0.95rem;">
                        새로운 프로젝트 팀을 만들어 팀원들을 초대하고 협업을 시작해보세요!
                    </p>
                    <button onclick="document.getElementById('open-create-team-modal').click()" class="btn btn-primary">
                        <i class="fa-solid fa-plus"></i> 첫 팀 프로젝트 만들기
                    </button>
                </div>
            `;
            return;
        }

        teamListContainer.innerHTML = '';
        teams.forEach(team => {
            const teamCard = document.createElement('div');
            teamCard.className = 'glass-panel';
            teamCard.style.padding = '24px';
            teamCard.style.display = 'flex';
            teamCard.style.flexDirection = 'column';
            teamCard.style.justifyContent = 'space-between';
            teamCard.style.cursor = 'pointer';

            // 클릭 시 해당 팀 상세 페이지로 이동
            teamCard.addEventListener('click', (e) => {
                // 카드 내의 다른 링크나 버튼을 클릭한 게 아니라면
                if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') {
                    window.location.href = `/team/${team.id}`;
                }
            });

            // 과목 및 팀명 노출
            teamCard.innerHTML = `
                <div>
                    <span style="font-size: 0.8rem; background: var(--border-color); color: var(--secondary); padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                        ${escapeHTML(team.subject)}
                    </span>
                    <h3 style="font-size: 1.35rem; margin-top: 10px; margin-bottom: 8px; font-family: 'Outfit';">
                        ${escapeHTML(team.name)}
                    </h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.8em;">
                        ${team.description ? escapeHTML(team.description) : '설명이 없는 프로젝트입니다.'}
                    </p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--glass-border); padding-top: 12px; margin-top: 8px;">
                    <span style="font-size: 0.85rem; color: var(--text-muted);">
                        <i class="fa-solid fa-user-group"></i> 팀원 ${team.member_count}명
                    </span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: capitalize;">
                        역할: <strong style="color: ${team.role === 'creator' ? 'var(--secondary)' : 'var(--text-primary)'};">${team.role}</strong>
                    </span>
                </div>
            `;
            teamListContainer.appendChild(teamCard);
        });
    }

    // HTML XSS 방지용 이스케이프 함수
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 페이지 로드 시 팀 목록 호출
    loadTeams();
});
