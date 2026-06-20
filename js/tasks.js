document.addEventListener('DOMContentLoaded', () => {
    console.log("tasks.js 최종 버전 가동 (StorageDB 완전 연동 - 싱크 교정판)");

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

    const inviteMemberBtn = document.getElementById('invite-member-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tasksSection = document.getElementById('tasks-section');

    // 2. 프로젝트 상단 정보 조회 (StorageDB 연동)
    function loadTeamInfo() {
        if (typeof StorageDB !== 'undefined') {
            const result = StorageDB.getTeamDetails(TEAM_ID);
            if (result && result.success) {
                const currentTeam = result.team;
                if (document.getElementById('team-name-display')) document.getElementById('team-name-display').textContent = currentTeam.name;
                if (document.getElementById('team-subject-display')) document.getElementById('team-subject-display').textContent = currentTeam.subject;
                if (document.getElementById('team-description-display')) document.getElementById('team-description-display').textContent = currentTeam.description || '설명 없음';
            }
        }
    }

    // 3. 업무 추가/수정 모달 제어 (CSS 트랜지션 완벽 연동)
    function openModal(mode = 'create', taskData = null) {
        if (!taskModal) return;
        if (taskForm) taskForm.reset();
        
        const idInput = document.getElementById('task-id');
        if (idInput) idInput.value = '';
        
        if (mode === 'edit' && taskData) {
            if (taskModalTitle) taskModalTitle.textContent = '업무 수정';
            if (idInput) idInput.value = taskData.id;
            if (document.getElementById('task-title-input')) document.getElementById('task-title-input').value = taskData.title;
            if (document.getElementById('task-desc-input')) document.getElementById('task-desc-input').value = taskData.description || '';
            
            // 💡 교정 완료: 명확한 ID 기반 다이렉트 매핑 처리로 실시간 풀림 방지
            if (assigneeSelect) {
                assigneeSelect.value = taskData.assignedTo ? taskData.assignedTo.toString() : '';
            }
            if (document.getElementById('task-status-input')) document.getElementById('task-status-input').value = taskData.status;
        } else {
            if (taskModalTitle) taskModalTitle.textContent = '업무 추가';
            if (document.getElementById('task-status-input')) document.getElementById('task-status-input').value = 'Todo';
        }
        
        // CSS 클래스와 디스플레이 타이밍 일치화
        taskModal.style.display = 'flex';
        setTimeout(() => taskModal.classList.add('active'), 10);
    }

    function closeModal() {
        if (!taskModal) return;
        taskModal.classList.remove('active');
        setTimeout(() => {
            taskModal.style.display = 'none';
        }, 250); // CSS transition 시간(0.25s) 동기화
    }

    if (addTaskBtn) addTaskBtn.addEventListener('click', () => openModal('create'));
    closeTaskModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) closeModal();
        });
    }

    // 4. 팀원 초대 버튼 (StorageDB 등록 연동)
    if (inviteMemberBtn) {
        inviteMemberBtn.addEventListener('click', () => {
            const memberIdInput = prompt("초대할 팀원의 아이디(Username)를 입력하세요:");
            if (memberIdInput && memberIdInput.trim() !== "") {
                if (typeof StorageDB !== 'undefined') {
                    const res = StorageDB.inviteMemberToTeam(TEAM_ID, memberIdInput);
                    alert(res.message);
                    if (res.success) {
                        loadTeamMembers(); 
                    }
                }
            }
        });
    }

    // 5. 탭 메뉴 클릭 시 전환 제어
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.color = '#64748b';
                btn.style.borderBottom = 'none';
                btn.style.fontWeight = 'normal';
            });

            button.classList.add('active');
            button.style.color = '#4f46e5';
            button.style.borderBottom = '2px solid #4f46e5';
            button.style.fontWeight = 'bold';

            const clickedTabName = button.textContent.trim();
            
            const schedulesSec = document.getElementById('schedules-section');
            const filesSec = document.getElementById('files-section');

            if (clickedTabName.includes("역할 분담")) {
                if (tasksSection) tasksSection.style.display = 'block';
                if (schedulesSec) schedulesSec.style.display = 'none';
                if (filesSec) filesSec.style.display = 'none';
                loadTasks();
            } else if (clickedTabName.includes("일정 관리")) {
                if (tasksSection) tasksSection.style.display = 'none';
                if (schedulesSec) schedulesSec.style.display = 'block';
                if (filesSec) filesSec.style.display = 'none';
                if (window.refreshTeamSchedules) window.refreshTeamSchedules();
            } else if (clickedTabName.includes("자료 공유")) {
                if (tasksSection) tasksSection.style.display = 'none';
                if (schedulesSec) schedulesSec.style.display = 'none';
                if (filesSec) filesSec.style.display = 'block';
                if (window.refreshTeamFiles) window.refreshTeamFiles();
            }
        });
    });

    // 6. 팀 멤버 로드 및 아바타 출력
    function loadTeamMembers() {
        if (typeof StorageDB !== 'undefined') {
            const result = StorageDB.getTeamMembers(TEAM_ID);
            if (result && result.success) {
                const members = result.members;
                if (assigneeSelect) {
                    assigneeSelect.innerHTML = '<option value="">담당자 없음 (미정)</option>';
                    members.forEach(member => {
                        const option = document.createElement('option');
                        option.value = member.id; 
                        option.textContent = `${member.displayName} (${member.role === 'creator' ? '팀장' : '팀원'})`;
                        assigneeSelect.appendChild(option);
                    });
                }
                renderMemberAvatars(members);
            }
        }
    }

    function renderMemberAvatars(members) {
        if (!memberAvatarsContainer) return;
        memberAvatarsContainer.innerHTML = '';
        
        members.forEach((member, index) => {
            const avatar = document.createElement('div');
            avatar.style.width = '32px';
            avatar.style.height = '32px';
            avatar.style.borderRadius = '50%';
            avatar.style.background = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'][index % 4];
            avatar.style.color = '#fff';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
            avatar.style.fontSize = '0.85rem';
            avatar.style.fontWeight = 'bold';
            avatar.style.border = '2px solid #fff';
            avatar.style.marginLeft = index > 0 ? '-8px' : '0px';
            avatar.title = `${member.displayName} (${member.role === 'creator' ? '팀장' : '팀원'})`;
            avatar.textContent = member.displayName ? member.displayName.charAt(0) : 'U';
            memberAvatarsContainer.appendChild(avatar);
        });
    }

    // 7. 업무 통합 저장/조회 핵심 로직
    function loadTasks() {
        if (typeof StorageDB !== 'undefined') {
            const result = StorageDB.getTasks(TEAM_ID);
            if (result && result.success) {
                renderTasks(result.tasks);
            }
        }
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
                <h4 style="margin: 4px 0 8px 0; font-size:1rem; color:#1e293b;">${escapeHTML(task.title)}</h4>
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
            if (typeof StorageDB !== 'undefined') {
                StorageDB.deleteTask(taskId);
                loadTasks();
            }
        }
    }

    // 8. 업무 등록/수정 이벤트 바인딩
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const taskId = document.getElementById('task-id').value;
            const title = document.getElementById('task-title-input').value.trim();
            const description = document.getElementById('task-desc-input').value.trim();
            const assignedTo = document.getElementById('task-assignee-input').value;
            const status = document.getElementById('task-status-input').value;

            if (!title) return;

            if (typeof StorageDB !== 'undefined') {
                if (taskId) {
                    StorageDB.updateTask(taskId, title, description, assignedTo, null, status);
                } else {
                    StorageDB.createTask(TEAM_ID, title, description, assignedTo, null, status);
                }
                closeModal();
                loadTasks();
            }
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 초기 실행 가동
    loadTeamInfo();
    loadTeamMembers();
    loadTasks();
});
