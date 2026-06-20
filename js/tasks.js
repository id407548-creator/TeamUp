document.addEventListener('DOMContentLoaded', () => {
    console.log("tasks.js 로드 완료");

    // URL 쿼리 스트링에서 team id 가져오기 (예: team.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const TEAM_ID = urlParams.get('id');

    if (!TEAM_ID) {
        alert("올바르지 않은 접근입니다. 대시보드로 이동합니다.");
        window.location.href = "dashboard.html";
        return;
    }

    // 1. DOM 요소 수집 (HTML과 ID 매칭 확인)
    const addTaskBtn = document.getElementById('open-add-task-modal'); // HTML 버튼 ID와 일치시킴
    const taskModal = document.getElementById('create-team-modal') || document.getElementById('task-modal'); 
    const closeTaskModalBtns = document.querySelectorAll('#close-create-team-modal, #cancel-create-team, .close-task-modal');
    const taskForm = document.getElementById('create-team-form') || document.getElementById('task-form');
    const taskModalTitle = document.querySelector('#create-team-modal h3') || document.getElementById('task-modal-title');
    
    // 칸반 보드 리스트 컬럼들 (수정된 HTML 구조 반영)
    const listTodo = document.getElementById('todo-list');
    const listInProgress = document.getElementById('inprogress-list');
    const listDone = document.getElementById('done-list');
    
    // 카운트 배지들
    const countTodo = document.getElementById('todo-count');
    const countInProgress = document.getElementById('inprogress-count');
    const countDone = document.getElementById('done-count');
    
    // 폼 인풋들 (모달 내부용 - 없을 경우 동적 처리용으로 체크)
    const assigneeSelect = document.getElementById('task-assignee-input');
    const memberAvatarsContainer = document.getElementById('team-members-avatars');

    // 로컬 데이터 캐시
    let teamMembers = [];
    let tasksCache = {};

    // 상단 팀 정보 화면에 반영하기
    function loadTeamInfo() {
        if (typeof StorageDB !== 'undefined') {
            const result = StorageDB.getTeams();
            if (result.success) {
                const currentTeam = result.teams.find(t => String(t.id) === String(TEAM_ID));
                if (currentTeam) {
                    if (document.getElementById('team-name-display')) {
                        document.getElementById('team-name-display').textContent = currentTeam.name;
                    }
                    if (document.getElementById('team-subject-display')) {
                        document.getElementById('team-subject-display').textContent = currentTeam.subject;
                    }
                    if (document.getElementById('team-description-display')) {
                        document.getElementById('team-description-display').textContent = currentTeam.description || '설명 없음';
                    }
                }
            }
        }
    }

    // 2. 모달 제어 (기존 모달 재활용 시 호환용 설정)
    function openModal(mode = 'create', taskData = null) {
        // 모달 폼이 업무용 입력창을 가지고 있는지 체크 후 없으면 prompt 등으로 임시 대처 가능하나, 우선 폼 초기화 실행
        if (taskForm) taskForm.reset();
        
        const idInput = document.getElementById('task-id');
        if (idInput) idInput.value = '';
        
        // 현재 HTML 구조에 맞춰 입력 폼이 부족할 경우 기본 prompt 창으로 우회 생성 처리 (과제 편의용)
        if (!document.getElementById('task-title-input')) {
            const title = prompt("새로운 업무 제목을 입력하세요:");
            if (!title) return;
            const desc = prompt("업무 설명을 입력하세요:");
            
            // StorageDB에 저장 시도
            saveTaskLocal({
                id: mode === 'edit' ? taskData.id : Date.now().toString(),
                title: title,
                description: desc || '',
                status: 'Todo',
                assignee_name: '나'
            });
            return;
        }

        if (mode === 'edit' && taskData) {
            if (taskModalTitle) taskModalTitle.textContent = '업무 수정';
            if (idInput) idInput.value = taskData.id;
            if (document.getElementById('task-title-input')) document.getElementById('task-title-input').value = taskData.title;
            if (document.getElementById('task-desc-input')) document.getElementById('task-desc-input').value = taskData.description || '';
            if (document.getElementById('task-status-input')) document.getElementById('task-status-input').value = taskData.status;
        } else {
            if (taskModalTitle) taskModalTitle.textContent = '업무 추가';
            if (document.getElementById('task-status-input')) document.getElementById('task-status-input').value = 'Todo';
        }
        
        if (taskModal) taskModal.classList.add('active');
    }

    function closeModal() {
        if (taskModal) taskModal.classList.remove('active');
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openModal('create'));
    }

    closeTaskModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) closeModal();
        });
    }

    // 3. 팀 멤버 목록 조회 (서버 API 대신 로컬 멤버 데이터 모킹)
    function loadTeamMembers() {
        // GitHub Pages 호환을 위해 고정 멤버 및 현재 유저 추가
        let sessionUser = "사용자";
        if (typeof StorageDB !== 'undefined' && StorageDB.getCurrentSession()) {
            const session = StorageDB.getCurrentSession();
            sessionUser = session.displayName || session.name || "나";
        }

        teamMembers = [
            { id: "1", display_name: sessionUser, username: "me", role: "팀장" },
            { id: "2", display_name: "김철수", username: "chulsoo", role: "팀원" },
            { id: "3", display_name: "이영희", username: "younghee", role: "팀원" }
        ];
        
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="">담당자 없음 (미정)</option>';
            teamMembers.forEach(member => {
                const option = document.createElement('option');
                option.value = member.display_name;
                option.textContent = `${member.display_name} (${member.role})`;
                assigneeSelect.appendChild(option);
            });
        }

        renderMemberAvatars(teamMembers);
    }

    function renderMemberAvatars(members) {
        if (!memberAvatarsContainer) return;
        memberAvatarsContainer.innerHTML = '';
        
        members.forEach((member, index) => {
            const avatar = document.createElement('div');
            avatar.style.width = '32px';
            avatar.style.height = '32px';
            avatar.style.borderRadius = '50%';
            avatar.style.background = getAvatarColor(index);
            avatar.style.color = '#fff';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '0.85rem';
            avatar.style.fontWeight = 'bold';
            avatar.style.border = '2px solid #fff';
            avatar.style.marginLeft = index > 0 ? '-8px' : '0px';
            avatar.style.cursor = 'default';
            avatar.title = `${member.display_name} (${member.role})`;
            
            avatar.textContent = member.display_name.charAt(0);
            memberAvatarsContainer.appendChild(avatar);
        });
    }

    function getAvatarColor(index) {
        const colors = ['#6366f1', '#06b6d4', '#10b981', '#f43f5e', '#eab308', '#3b82f6'];
        return colors[index % colors.length];
    }

    // 4. 태스크 로드 및 렌더링 (localStorage 연동)
    function loadTasks() {
        // 로컬 스토리지 키 생성 (팀별 분리 저장)
        const storageKey = `tasks_team_${TEAM_ID}`;
        const localTasks = localStorage.getItem(storageKey);
        const tasks = localTasks ? JSON.parse(localTasks) : [];

        renderTasks(tasks);
    }

    function renderTasks(tasks) {
        if (!listTodo || !listInProgress || !listDone) return;

        listTodo.innerHTML = '';
        listInProgress.innerHTML = '';
        listDone.innerHTML = '';

        tasksCache = {};
        let todoCount = 0;
        let inProgressCount = 0;
        let doneCount = 0;

        tasks.forEach(task => {
            tasksCache[task.id] = task;
            const card = createTaskCard(task);
            
            if (task.status === 'Todo') {
                listTodo.appendChild(card);
                todoCount++;
            } else if (task.status === 'InProgress') {
                listInProgress.appendChild(card);
                inProgressCount++;
            } else if (task.status === 'Done') {
                listDone.appendChild(card);
                doneCount++;
            }
        });

        if (countTodo) countTodo.textContent = todoCount;
        if (countInProgress) countInProgress.textContent = inProgressCount;
        if (countDone) countDone.textContent = doneCount;
    }

    // 로컬 데이터 저장 헬퍼 함수
    function saveTaskLocal(taskPayload) {
        const storageKey = `tasks_team_${TEAM_ID}`;
        const localTasks = localStorage.getItem(storageKey);
        let tasks = localTasks ? JSON.parse(localTasks) : [];

        const existingIndex = tasks.findIndex(t => String(t.id) === String(taskPayload.id));
        if (existingIndex > -1) {
            tasks[existingIndex] = { ...tasks[existingIndex], ...taskPayload };
        } else {
            tasks.push(taskPayload);
        }

        localStorage.setItem(storageKey, JSON.stringify(tasks));
        closeModal();
        loadTasks();
    }

    // 단일 할 일 카드 DOM 객체 생성
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'glass-panel task-card';
        card.style.padding = '16px';
        card.style.marginBottom = '10px';
        card.style.background = '#ffffff';
        card.style.borderLeft = '4px solid #6366f1';
        card.setAttribute('data-id', task.id);

        card.innerHTML = `
            <div style="display:flex; justify-content: flex-end; gap:8px; font-size:0.85rem;">
                <button class="edit-btn" style="background:none; border:none; cursor:pointer; color:#64748b;"><i class="fa-solid fa-pen"></i></button>
                <button class="delete-btn" style="background:none; border:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h4 style="margin: 8px 0; font-size:1.05rem;">${escapeHTML(task.title)}</h4>
            <p style="font-size:0.9rem; color:#64748b; margin-bottom:12px;">${task.description ? escapeHTML(task.description) : '세부 작업 설명이 없습니다.'}</p>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#94a3b8;">
                <span><i class="fa-regular fa-circle-user"></i> ${escapeHTML(task.assignee_name || '미정')}</span>
                <span><i class="fa-regular fa-clock"></i> 기한 없음</span>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            // 입력창이 부족하면 prompt로 수정 유도
            if (!document.getElementById('task-title-input')) {
                const newTitle = prompt("수정할 업무 제목:", task.title);
                if (newTitle) saveTaskLocal({ id: task.id, title: newTitle, status: task.status });
            } else {
                openModal('edit', task);
            }
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        return card;
    }

    // 5. 태스크 삭제 처리 (로컬 스토리지 반영)
    function deleteTask(taskId) {
        if (confirm('이 작업을 정말 삭제하시겠습니까?')) {
            const storageKey = `tasks_team_${TEAM_ID}`;
            const localTasks = localStorage.getItem(storageKey);
            if (localTasks) {
                let tasks = JSON.parse(localTasks);
                tasks = tasks.filter(t => String(t.id) !== String(taskId));
                localStorage.setItem(storageKey, JSON.stringify(tasks));
                loadTasks();
            }
        }
    }

    // 6. 업무 등록/수정 폼이 제출될 때 처리 코드
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const taskId = document.getElementById('task-id') ? document.getElementById('task-id').value : '';
            const titleElement = document.getElementById('task-title-input');
            const descElement = document.getElementById('task-desc-input');
            const assigneeElement = document.getElementById('task-assignee-input');
            const statusElement = document.getElementById('task-status-input');

            const title = titleElement ? titleElement.value.trim() : '';
            const description = descElement ? descElement.value.trim() : '';
            const assignee_name = assigneeElement ? assigneeElement.value : '미정';
            const status = statusElement ? statusElement.value : 'Todo';

            if (!title) {
                alert('업무 제목을 입력해 주세요.');
                return;
            }

            saveTaskLocal({
                id: taskId || Date.now().toString(),
                title,
                description,
                assignee_name,
                status
            });
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

    // 초기 실행 순서 정렬
    loadTeamInfo();
    loadTeamMembers();
    loadTasks();
});
