/**
 * TeamUp LocalStorage Database Engine
 * SQLite 및 백엔드 서버를 대체하는 로컬 브라우저 데이터베이스 모듈입니다.
 */

const STORAGE_KEYS = {
    USERS: 'teamup_users',
    TEAMS: 'teamup_teams',
    MEMBERS: 'teamup_members',
    TASKS: 'teamup_tasks',
    SCHEDULES: 'teamup_schedules',
    SESSION: 'teamup_session'
};

// 1. 초기 스토리지 데이터 셋업
function _initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.TEAMS)) localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.MEMBERS)) localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULES)) localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify([]));
}

// 2. 헬퍼 함수
function _load(key) {
    _initStorage();
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
        console.error('Error loading key:', key, e);
        return [];
    }
}

function _save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ==========================================
// A. 인증 및 회원 관련 API (Auth)
// ==========================================

function authRegister(username, password, displayName, email) {
    const users = _load(STORAGE_KEYS.USERS);
    
    // 아이디 및 이메일 중복 체크
    const duplicate = users.find(u => u.username === username || u.email === email);
    if (duplicate) {
        return { success: false, message: '이미 사용 중인 아이디 또는 이메일입니다.' };
    }

    const newUser = {
        id: Date.now(), // 고유한 ID 생성
        username,
        password, // 모의 구현이므로 평문 저장
        displayName,
        email,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    _save(STORAGE_KEYS.USERS, users);
    return { success: true, message: '회원가입이 완료되었습니다.' };
}

function authLogin(username, password) {
    const users = _load(STORAGE_KEYS.USERS);
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return { success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' };
    }

    const sessionData = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName
    };
    
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
    return { success: true, message: '로그인에 성공했습니다.' };
}

function authLogout() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return { success: true };
}

function getCurrentSession() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)) || null;
    } catch (e) {
        return null;
    }
}

// ==========================================
// B. 팀 프로젝트 관련 API (Teams)
// ==========================================

function getTeams() {
    const session = getCurrentSession();
    if (!session) return { success: false, message: '로그인이 필요합니다.' };

    const teams = _load(STORAGE_KEYS.TEAMS);
    const members = _load(STORAGE_KEYS.MEMBERS);

    // 내가 가입되어 있는 멤버 매핑 목록 필터링
    const myMemberships = members.filter(m => m.userId === session.userId);
    
    const myTeams = myMemberships.map(m => {
        const team = teams.find(t => t.id === m.teamId);
        if (!team) return null;
        
        // 팀원 수 카운트
        const memberCount = members.filter(mem => mem.teamId === m.teamId).length;
        
        return {
            ...team,
            role: m.role,
            memberCount
        };
    }).filter(t => t !== null);

    return { success: true, teams: myTeams };
}

function createTeam(name, subject, description) {
    const session = getCurrentSession();
    if (!session) return { success: false, message: '로그인이 필요합니다.' };

    const teams = _load(STORAGE_KEYS.TEAMS);
    const members = _load(STORAGE_KEYS.MEMBERS);

    const newTeam = {
        id: Date.now(),
        name,
        subject,
        description,
        createdBy: session.userId,
        createdAt: new Date().toISOString()
    };

    teams.push(newTeam);
    _save(STORAGE_KEYS.TEAMS, teams);

    // 생성자를 멤버에 creator 역할로 등록
    members.push({
        teamId: newTeam.id,
        userId: session.userId,
        role: 'creator',
        joinedAt: new Date().toISOString()
    });
    _save(STORAGE_KEYS.MEMBERS, members);

    return { success: true, teamId: newTeam.id };
}

function getTeamDetails(teamId) {
    const session = getCurrentSession();
    if (!session) return { success: false, message: '로그인이 필요합니다.' };

    const teams = _load(STORAGE_KEYS.TEAMS);
    const members = _load(STORAGE_KEYS.MEMBERS);

    const team = teams.find(t => t.id === Number(teamId));
    if (!team) return { success: false, message: '존재하지 않는 팀입니다.' };

    const membership = members.find(m => m.teamId === Number(teamId) && m.userId === session.userId);
    if (!membership) return { success: false, message: '팀 접근 권한이 없습니다.' };

    return {
        success: true,
        team,
        myRole: membership.role
    };
}

function getTeamMembers(teamId) {
    const session = getCurrentSession();
    if (!session) return { success: false, message: '로그인이 필요합니다.' };

    const members = _load(STORAGE_KEYS.MEMBERS);
    const users = _load(STORAGE_KEYS.USERS);

    // 팀 소속 멤버 조회
    const teamMemberships = members.filter(m => m.teamId === Number(teamId));
    
    const memberList = teamMemberships.map(m => {
        const u = users.find(user => user.id === m.userId);
        return {
            id: m.userId,
            username: u ? u.username : 'unknown',
            displayName: u ? u.displayName : 'unknown',
            role: m.role
        };
    });

    return { success: true, members: memberList };
}

// 헬퍼: 팀에 멤버 임의 초대 기능 (모의 데이터 동작 보완용)
function inviteMemberToTeam(teamId, username) {
    const users = _load(STORAGE_KEYS.USERS);
    const targetUser = users.find(u => u.username === username);
    if (!targetUser) return { success: false, message: '존재하지 않는 사용자 아이디입니다.' };

    const members = _load(STORAGE_KEYS.MEMBERS);
    const alreadyMember = members.find(m => m.teamId === Number(teamId) && m.userId === targetUser.id);
    if (alreadyMember) return { success: false, message: '이미 팀에 소속된 멤버입니다.' };

    members.push({
        teamId: Number(teamId),
        userId: targetUser.id,
        role: 'member',
        joinedAt: new Date().toISOString()
    });
    _save(STORAGE_KEYS.MEMBERS, members);

    return { success: true, message: `${targetUser.displayName}님이 팀에 초대되었습니다.` };
}

// ==========================================
// C. 태스크 관련 API (Tasks)
// ==========================================

function getTasks(teamId) {
    const tasks = _load(STORAGE_KEYS.TASKS);
    const users = _load(STORAGE_KEYS.USERS);

    const teamTasks = tasks.filter(t => t.teamId === Number(teamId));
    const taskList = teamTasks.map(t => {
        const u = users.find(user => user.id === Number(t.assignedTo));
        return {
            ...t,
            assignee_name: u ? u.displayName : '미정'
        };
    }).sort((a,b) => b.id - a.id); // 최근 생성 순

    return { success: true, tasks: taskList };
}

function createTask(teamId, title, description, assignedTo, dueDate, status = 'Todo') {
    const tasks = _load(STORAGE_KEYS.TASKS);
    
    const newTask = {
        id: Date.now(),
        teamId: Number(teamId),
        title,
        description,
        assignedTo: assignedTo ? Number(assignedTo) : null,
        dueDate: dueDate || null,
        status,
        createdAt: new Date().toISOString()
    };

    tasks.push(newTask);
    _save(STORAGE_KEYS.TASKS, tasks);
    return { success: true };
}

function updateTask(taskId, title, description, assignedTo, dueDate, status) {
    const tasks = _load(STORAGE_KEYS.TASKS);
    const taskIndex = tasks.findIndex(t => t.id === Number(taskId));
    
    if (taskIndex === -1) return { success: false, message: '업무를 찾을 수 없습니다.' };

    tasks[taskIndex] = {
        ...tasks[taskIndex],
        title,
        description,
        assignedTo: assignedTo ? Number(assignedTo) : null,
        dueDate: dueDate || null,
        status
    };

    _save(STORAGE_KEYS.TASKS, tasks);
    return { success: true };
}

function deleteTask(taskId) {
    const tasks = _load(STORAGE_KEYS.TASKS);
    const filteredTasks = tasks.filter(t => t.id !== Number(taskId));
    
    _save(STORAGE_KEYS.TASKS, filteredTasks);
    return { success: true };
}

// ==========================================
// D. 일정 관련 API (Schedules)
// ==========================================

function getSchedules(teamId) {
    const schedules = _load(STORAGE_KEYS.SCHEDULES);
    const teamSchedules = schedules.filter(s => s.teamId === Number(teamId));
    return { success: true, schedules: teamSchedules };
}

function createSchedule(teamId, title, description, startTime, endTime, color) {
    const session = getCurrentSession();
    if (!session) return { success: false, message: '로그인이 필요합니다.' };

    const schedules = _load(STORAGE_KEYS.SCHEDULES);
    const newSchedule = {
        id: Date.now(),
        teamId: Number(teamId),
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        color: color || '#4F46E5',
        createdBy: session.userId,
        createdAt: new Date().toISOString()
    };

    schedules.push(newSchedule);
    _save(STORAGE_KEYS.SCHEDULES, schedules);
    return { success: true };
}

function updateSchedule(scheduleId, title, description, startTime, endTime, color) {
    const schedules = _load(STORAGE_KEYS.SCHEDULES);
    const scheduleIndex = schedules.findIndex(s => s.id === Number(scheduleId));

    if (scheduleIndex === -1) return { success: false, message: '일정을 찾을 수 없습니다.' };

    schedules[scheduleIndex] = {
        ...schedules[scheduleIndex],
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        color
    };

    _save(STORAGE_KEYS.SCHEDULES, schedules);
    return { success: true };
}

function deleteSchedule(scheduleId) {
    const schedules = _load(STORAGE_KEYS.SCHEDULES);
    const filteredSchedules = schedules.filter(s => s.id !== Number(scheduleId));

    _save(STORAGE_KEYS.SCHEDULES, filteredSchedules);
    return { success: true };
}

// 전역 객체로 모듈 API 노출
window.StorageDB = {
    authRegister,
    authLogin,
    authLogout,
    getCurrentSession,
    getTeams,
    createTeam,
    getTeamDetails,
    getTeamMembers,
    inviteMemberToTeam,
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule
};
