document.addEventListener('DOMContentLoaded', () => {

    const session = StorageDB.getCurrentSession();

    // 로그인 안 되어 있으면 로그인 페이지로
    if (!session) {
        window.location.href = "login.html";
        return;
    }

    // 사용자 이름 표시
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = session.displayName;
    }

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
        createTeamForm.reset();
        createTeamModal.classList.add('active');
    }

    function closeModal() {
        createTeamModal.classList.remove('active');
    }

    if (openModalBtn) {
        openModalBtn.addEventListener('click', openModal);
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }

    if (createTeamModal) {
        createTeamModal.addEventListener('click', (e) => {
            if (e.target === createTeamModal) {
                closeModal();
            }
        });
    }

// 팀 생성
if (createTeamForm) {
    createTeamForm.addEventListener('submit', (e) => {

        e.preventDefault();

        hideModalError();

        const name =
            document.getElementById('team-name').value.trim();

        const subject =
            document.getElementById('team-subject').value.trim();

        const description =
            document.getElementById('team-description').value.trim();

        if (!name || !subject) {
            showModalError('팀 이름과 과목명을 입력해주세요.');
            return;
        }

        console.log('생성 시도');

        const result = StorageDB.createTeam(
            name,
            subject,
            description
        );

        console.log(result);

        if (result.success) {
            closeModal();
            loadTeams();
        } else {
            showModalError(result.message);
        }
    });
}

            if (!name || !subject) {
                showModalError('팀 이름과 과목명을 입력해주세요.');
                return;
            }

            const result = StorageDB.createTeam(
                name,
                subject,
                description
            );

            if (result.success) {
                closeModal();
                loadTeams();
            } else {
                showModalError(result.message);
            }
        });
    }

    function loadTeams() {

        const result = StorageDB.getTeams();

        if (!result.success) {
            teamListContainer.innerHTML = `
                <div class="glass-panel" style="padding:40px;text-align:center;">
                    <p>${result.message}</p>
                </div>
            `;
            return;
        }

        renderTeams(result.teams);

        if (badge) {
            badge.textContent = `${result.teams.length}개`;
        }
    }

    function renderTeams(teams) {

        if (!teams || teams.length === 0) {

            teamListContainer.innerHTML = `
                <div class="glass-panel"
                     style="grid-column:1/-1;padding:60px;text-align:center;">

                    <i class="fa-solid fa-folder-open"
                       style="font-size:3rem;margin-bottom:20px;"></i>

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
                <span style="
                    display:inline-block;
                    margin-bottom:10px;
                    padding:4px 10px;
                    border-radius:20px;
                    background:#eef2ff;
                    font-size:0.8rem;
                ">
                    ${escapeHTML(team.subject)}
                </span>

                <h3 style="margin-bottom:10px;">
                    ${escapeHTML(team.name)}
                </h3>

                <p style="
                    color:var(--text-secondary);
                    margin-bottom:15px;
                ">
                    ${escapeHTML(team.description || '설명 없음')}
                </p>

                <div style="
                    display:flex;
                    justify-content:space-between;
                    font-size:0.85rem;
                    color:var(--text-muted);
                ">
                    <span>팀원 ${team.memberCount}명</span>
                    <span>${team.role}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                window.location.href =
                    `team.html?id=${team.id}`;
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
