document.addEventListener('DOMContentLoaded', () => {
    console.log("tasks.js 최종 버전 가동");

    // URL에서 team id 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const TEAM_ID = urlParams.get('id');

    if (!TEAM_ID) {
        alert("프로젝트 ID가 없습니다. 대시보드로 이동합니다.");
        window.location.href = "dashboard.html";
        return;
    }

    // 1. DOM 요소 바인딩
    const addTaskBtn = document.getElementById('open-add-task-modal');
    const taskModal = document.getElementById('task-modal');
    const closeTaskModalBtns = document.querySelectorAll('.close-task-modal');
    const taskForm = document.getElementById('task-form');
    const taskModalTitle = document.getElementById('task-modal-title');
    
    const listTodo = document.getElementById('todo-list');
    const listInProgress = document.getElementById('inprogress-list');
    const listDone = document.getElementById('done-list');
    
    const countTodo = document.getElementById('todo-count');
    const countInProgress = document.getElementById('inprogress-count');
    const countDone = document.getElementById('done-count');
    
    const assigneeSelect = document.getElementById('task-assignee-input');
    const memberAvatarsContainer = document.getElementById('team-members-avatars');

    // 추가 기능 버튼 및 탭 바인딩
    const inviteMemberBtn = document.getElementById('invite-member-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tasksSection = document.getElementById('tasks-section');

    let teamMembers = [];

    // 프로젝트 정보 채우기
    function loadTeamInfo() {
        if (typeof StorageDB !== 'undefined') {
            const result = StorageDB.getTeams();
            if (result && result.success) {
                const currentTeam = result.teams.find(t => String(t.id) === String(TEAM_ID));
                if (currentTeam) {
                    if (document.getElementById('team-name-display')) document.getElementById('team-name-display').textContent = currentTeam.name;
                    if (document.getElementById('team-subject-display')) document.getElementById('team-subject-display').textContent = currentTeam.subject;
                    if (document.getElementById('team-description-display')) document.getElementById('team-description-display').textContent = currentTeam.description || '설명 없음';
                }
            }
        }
    }

    // 2. 업무 추가/수정 모달 제어
    function openModal(mode = 'create', taskData = null) {
        if (!taskModal) {
            console.error("task-modal 엘리먼트를 찾을 수 없습니다.");
            return;
        }
        if (taskForm) taskForm.reset();
        
        const idInput = document.getElementById('task-id');
        if (idInput) idInput.value = '';
        
        if (mode === 'edit' && taskData) {
            if (taskModalTitle) taskModalTitle.textContent = '업무 수정';
            if (idInput) idInput.value = taskData.id;
            document.getElementById('task-title-input').value = taskData.title;
            document.getElementById('task-desc-input').value = taskData.description || '';
            document.getElementById('task-assignee-input').value = taskData.assignee_name || '';
            document.getElementById('task-status-input').value = taskData.status;
        } else {
            if (taskModalTitle) taskModalTitle.textContent = '업무 추가';
            document.getElementById('task-status-input').value = 'Todo';
        }
        taskModal.style.display = 'flex'; // 대시보드와 동일한 flex 스타일로 띄우기
    }

    function closeModal() {
        if (taskModal) taskModal.style.display = 'none';
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openModal('create'));
    }
    
    closeTaskModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) closeModal();
        });
    }

    // 3. 팀원 초대 버튼 작동 구현
    if (inviteMemberBtn) {
        inviteMemberBtn.addEventListener('click', () => {
            const memberName = prompt("초대할 팀원의 이름을 입력하세요:");
            if (memberName && memberName.trim() !== "") {
                alert(`${memberName.trim()} 님에게 초대 링크가 발송되었습니다! (정적 모킹 완료)`);
                // 원한다면 여기에 teamMembers에 동적 push하는 로직을 넣을 수도 있습니다.
            }
        });
    }

    // 4. 탭 메뉴 클릭 시 전환 기능 작동 구현 (일정관리, 자료공유)
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            // 기존 활성화 클래스 제거
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = '#64748b';
                btn.style.borderBottom = 'none';
                btn.style.fontWeight = 'normal';
            });

            // 클릭한 탭 활성화 디자인 적용
            button.classList.add('active');
            button.style.color = '#4f46e5';
            button.style.borderBottom = '2px solid #4f46e5';
            button.style.fontWeight = 'bold';

            const clickedTabName = button.textContent.trim();
            
            if (clickedTabName.includes("역할 분담")) {
                if (tasksSection) tasksSection.style.display = 'block';
            } else if (clickedTabName.includes("일정 관리")) {
                if (tasksSection) tasksSection.style.display = 'none';
                alert("일정 관리(Schedules) 페이지 준비 중입니다! (기능 연결 확인 완료)");
                // 추후 js/schedules.js 연동 시 여기에 호출 함수를 넣습니다.
            } else if (clickedTabName.includes("자료 공유")) {
                if (tasksSection) tasksSection.style.display = 'none';
                alert("자료 공유(Files) 페이지 준비 중입니다! (기능 연결 확인 완료)");
                // 추후 js/files.js 연동 시 여기에 호출 함수를 넣습니다.
            }
        });
    });

    // 5. 팀 멤버 리스트업 및 아바타 생성
    function loadTeamMembers() {
        let sessionUser = "이다경";
        if (typeof StorageDB !== 'undefined' && StorageDB.getCurrentSession()) {
            const session = StorageDB.getCurrentSession();
            sessionUser = session.displayName || session.name || "이다경";
        }

        teamMembers = [
            { id: "1", display_name: sessionUser, role: "팀장" },
            { id: "2", display_name: "김철수", role: "팀원" },
            { id: "3", display_name: "이영희", role: "팀원" }
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
            avatar.style.background = ['#6366f1', '#06b6d4', '#10b981'][index % 3];
            avatar.style.color = '#fff';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '0.85rem';
            avatar.style.fontWeight = 'bold';
            avatar.style.border = '2px solid #fff';
            avatar.style.marginLeft = index > 0 ? '-8px' : '0px';
            avatar.title = `${member.display_name} (${member.role})`;
            avatar.textContent = member.display_name.charAt(0);
            memberAvatarsContainer.appendChild(avatar);
        });
    }

    // 6. 로컬 태스크 저장/조회 핵심 로직
    function loadTasks() {
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

        let todoCount = 0, inProgressCount = 0, doneCount = 0;

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.style.padding = '16px';
            card.style.marginBottom = '10px';
            card.style.background = '#ffffff';
            card.style.borderRadius = '8px';
            card.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            card.style.borderLeft = task.status === 'Todo' ? '4px solid #cbd5e1' : task.status === 'InProgress' ? '4px solid #16a34a' : '4px solid #2563eb';

            card.innerHTML = `
                <div style="display:flex; justify-content: flex-end; gap:8px;">
                    <button class="edit-btn" style="background:none; border:none; cursor:pointer; color:#64748b;"><i class="fa-solid fa-pen"></i></button>
                    <button class="delete-btn" style="background:none; border:none; cursor:pointer; color:#ef4444;"><i class="fa-solid fa-trash-can"></i></button>
                </div>
                <h4 style="margin: 4px 0 8px 0; font-size:1rem;">${escapeHTML(task.title)}</h4>
                <p style="font-size:0.85rem; color:#64748b; margin:0 0 12px 0;">${task.description ? escapeHTML(task.description) : '세부 작업 설명이 없습니다.'}</p>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#94a3b8;">
                    <span><i class="fa-regular fa-circle-user"></i> ${escapeHTML(task.assignee_name || '미정')}</span>
                </div>
            `;

            card.querySelector('.edit-btn').addEventListener('click', () => openModal('edit', task));
            card.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

            if (task.status === 'Todo') { listTodo.appendChild(card); todoCount++; }
            else if (task.status === 'InProgress') { listInProgress.appendChild(card); inProgressCount++; }
            else if (task.status === 'Done') { listDone.appendChild(card); doneCount++; }
        });

        if (countTodo) countTodo.textContent = todoCount;
        if (countInProgress) countInProgress.textContent = inProgressCount;
        if (countDone) countDone.textContent = doneCount;
    }

    function deleteTask(taskId) {
        if (confirm('이 작업을 정말 삭제하시겠습니까?')) {
            const storageKey = `tasks_team_${TEAM_ID}`;
            let tasks = JSON.parse(localStorage.getItem(storageKey) || '[]');
            tasks = tasks.filter(t => String(t.id) !== String(taskId));
            localStorage.setItem(storageKey, JSON.stringify(tasks));
            loadTasks();
        }
    }

    // 7. 폼 전송 이벤트 (업무 생성 및 수정 완료 처리)
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const taskId = document.getElementById('task-id').value;
            const title = document.getElementById('task-title-input').value.trim();
            const description = document.getElementById('task-desc-input').value.trim();
            const assignee_name = document.getElementById('task-assignee-input').value;
            const status = document.getElementById('task-status-input').value;

            if (!title) return;

            const storageKey = `tasks_team_${TEAM_ID}`;
            let tasks = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (taskId) {
                const idx = tasks.findIndex(t => String(t.id) === String(taskId));
                if (idx > -1) tasks[idx] = { id: taskId, title, description, assignee_name, status };
            } else {
                tasks.push({ id: Date.now().toString(), title, description, assignee_name, status });
            }

            localStorage.setItem(storageKey, JSON.stringify(tasks));
            closeModal();
            loadTasks();
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 가동
    loadTeamInfo();
    loadTeamMembers();
    loadTasks();
});
