document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 수집
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskModal = document.getElementById('task-modal');
    const closeTaskModalBtns = document.querySelectorAll('.close-task-modal');
    const taskForm = document.getElementById('task-form');
    const taskModalTitle = document.getElementById('task-modal-title');
    
    const listTodo = document.getElementById('list-todo');
    const listInProgress = document.getElementById('list-inprogress');
    const listDone = document.getElementById('list-done');
    
    const countTodo = document.getElementById('count-todo');
    const countInProgress = document.getElementById('count-inprogress');
    const countDone = document.getElementById('count-done');
    
    const assigneeSelect = document.getElementById('task-assignee-input');
    const memberAvatarsContainer = document.getElementById('team-members-avatars');

    // 로컬 데이터 캐시
    let teamMembers = [];
    let tasksCache = {};

    // 2. 모달 열기/닫기 제어
    function openModal(mode = 'create', taskData = null) {
        taskForm.reset();
        document.getElementById('task-id').value = '';
        
        if (mode === 'edit' && taskData) {
            taskModalTitle.textContent = '업무 수정';
            document.getElementById('task-id').value = taskData.id;
            document.getElementById('task-title-input').value = taskData.title;
            document.getElementById('task-desc-input').value = taskData.description || '';
            document.getElementById('task-assignee-input').value = taskData.assigned_to || '';
            document.getElementById('task-duedate-input').value = taskData.due_date || '';
            document.getElementById('task-status-input').value = taskData.status;
        } else {
            taskModalTitle.textContent = '업무 추가';
            document.getElementById('task-status-input').value = 'Todo';
        }
        
        taskModal.classList.add('active');
    }

    function closeModal() {
        taskModal.classList.remove('active');
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => openModal('create'));
    }

    closeTaskModalBtns.forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    // 3. 팀 멤버 목록 조회 및 바인딩
    async function loadTeamMembers() {
        try {
            const response = await fetch(`/api/teams/${TEAM_ID}/members`);
            const result = await response.json();
            
            if (response.ok && result.success) {
                teamMembers = result.members;
                
                // 담당자 드롭다운 옵션 갱신
                assigneeSelect.innerHTML = '<option value="">담당자 없음 (미정)</option>';
                teamMembers.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = `${member.display_name} (${member.username})`;
                    assigneeSelect.appendChild(option);
                });

                // 상단 아바타 바 렌더링
                renderMemberAvatars(teamMembers);
            }
        } catch (error) {
            console.error('Error loading team members:', error);
        }
    }

    // 팀원 아바타 리스트 그리기
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
            avatar.style.border = '2px solid var(--bg-main)';
            avatar.style.marginLeft = index > 0 ? '-8px' : '0px';
            avatar.style.cursor = 'default';
            avatar.title = `${member.display_name} (${member.role})`;
            
            // 이름 첫 글자 표시
            avatar.textContent = member.display_name.charAt(0);
            memberAvatarsContainer.appendChild(avatar);
        });
    }

    // 아바타 배경색 무작위/순서대로 반환
    function getAvatarColor(index) {
        const colors = [
            'hsl(263, 70%, 50%)', // Violet
            'hsl(190, 90%, 45%)', // Cyan
            'hsl(142, 60%, 45%)', // Green
            'hsl(350, 70%, 50%)', // Red
            'hsl(45, 85%, 45%)',  // Yellow/Orange
            'hsl(200, 75%, 45%)'  // Blue
        ];
        return colors[index % colors.length];
    }

    // 4. 태스크 로드 및 렌더링
    async function loadTasks() {
        try {
            const response = await fetch(`/api/teams/${TEAM_ID}/tasks`);
            const result = await response.json();

            if (response.ok && result.success) {
                renderTasks(result.tasks);
            }
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    function renderTasks(tasks) {
        // 리스트 비우기
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

        // 갯수 표시 갱신
        countTodo.textContent = todoCount;
        countInProgress.textContent = inProgressCount;
        countDone.textContent = doneCount;

        // 드래그 이벤트 등록
        bindDragEvents();
    }

    // HTML5 드래그앤드롭 이벤트 바인딩
    function bindDragEvents() {
        const cards = document.querySelectorAll('.task-card');
        const columns = document.querySelectorAll('.kanban-list');

        cards.forEach(card => {
            card.addEventListener('dragstart', () => {
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                
                const draggingCard = document.querySelector('.task-card.dragging');
                if (!draggingCard) return;

                const taskId = draggingCard.getAttribute('data-id');
                const newStatus = column.parentElement.getAttribute('data-status');
                
                const task = tasksCache[taskId];
                if (task && task.status !== newStatus) {
                    // 상태 임시 갱신 후 백엔드 전송
                    await updateTaskStatus(taskId, newStatus);
                }
            });
        });
    }

    // 드래그앤드롭 상태 변경 API 통신
    async function updateTaskStatus(taskId, newStatus) {
        const task = tasksCache[taskId];
        if (!task) return;

        try {
            const response = await fetch(`/api/tasks/${taskId}/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    assigned_to: task.assigned_to,
                    due_date: task.due_date,
                    status: newStatus
                })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                // 성공 시 리로드
                loadTasks();
            } else {
                alert(result.message || '상태 수정 실패');
            }
        } catch (error) {
            console.error('Drag drop status update error:', error);
            alert('상태를 수정하는 도중 통신 장애가 발생했습니다.');
        }
    }

    // 단일 할 일 카드 DOM 객체 생성
    function createTaskCard(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', task.id);

        // D-Day 계산
        let dDayHtml = '';
        if (task.due_date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(task.due_date);
            due.setHours(0, 0, 0, 0);
            
            const diffTime = due - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let dDayClass = 'color: var(--text-secondary);';
            let dDayText = `D-${diffDays}`;
            
            if (diffDays === 0) {
                dDayClass = 'color: var(--warning); font-weight: 700;';
                dDayText = 'D-Day';
            } else if (diffDays < 0) {
                dDayClass = 'color: var(--danger); font-weight: 700;';
                dDayText = `기한 초과 (${Math.abs(diffDays)}일)`;
            } else if (diffDays <= 3) {
                dDayClass = 'color: var(--danger); font-weight: 700;';
            }
            
            dDayHtml = `
                <div class="task-duedate" style="${dDayClass}">
                    <i class="fa-regular fa-clock"></i> ${task.due_date} (${dDayText})
                </div>
            `;
        } else {
            dDayHtml = `
                <div class="task-duedate">
                    <i class="fa-regular fa-clock"></i> 기한 없음
                </div>
            `;
        }

        card.innerHTML = `
            <div class="task-actions">
                <button class="action-btn edit-btn" title="수정"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete delete-btn" title="삭제"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <h4 class="task-title">${escapeHTML(task.title)}</h4>
            <p class="task-desc">${task.description ? escapeHTML(task.description) : '세부 작업 설명이 작성되지 않았습니다.'}</p>
            <div class="task-meta">
                <div class="task-assignee">
                    <i class="fa-regular fa-circle-user"></i> <span>${escapeHTML(task.assignee_name)}</span>
                </div>
                ${dDayHtml}
            </div>
        `;

        // 카드 내 수정 및 삭제 이벤트 위임
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openModal('edit', task);
        });

        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        return card;
    }

    // 5. 태스크 삭제 처리
    async function deleteTask(taskId) {
        if (confirm('이 작업을 정말 삭제하시겠습니까?')) {
            try {
                const response = await fetch(`/api/tasks/${taskId}/delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    loadTasks();
                } else {
                    alert(result.message || '삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('Delete task error:', error);
                alert('통신 장애가 발생했습니다.');
            }
        }
    }

    // 6. 업무 등록/수정 폼 제출 처리
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskId = document.getElementById('task-id').value;
            const title = document.getElementById('task-title-input').value.trim();
            const description = document.getElementById('task-desc-input').value.trim();
            const assigned_to = document.getElementById('task-assignee-input').value;
            const due_date = document.getElementById('task-duedate-input').value;
            const status = document.getElementById('task-status-input').value;

            if (!title) {
                alert('업무 제목을 입력해 주세요.');
                return;
            }

            const payload = { title, description, assigned_to, due_date, status };
            
            let url = `/api/teams/${TEAM_ID}/tasks/create`;
            if (taskId) {
                url = `/api/tasks/${taskId}/update`;
            }

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    closeModal();
                    loadTasks();
                } else {
                    alert(result.message || '업무 저장에 실패했습니다.');
                }
            } catch (error) {
                console.error('Save task error:', error);
                alert('서버와 통신하는 중 문제가 발생했습니다.');
            }
        });
    }

    // HTML 이스케이프 함수
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 초기 구동 실행
    loadTeamMembers();
    loadTasks();
});
