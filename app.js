/**
 * TeamUp - University Project Management Client Application
 * Main JS File: Database Logic (LocalStorage + IndexedDB), SPA Routing, Auth, Task, Schedule, and File Sharing
 */

// ==========================================================================
// 1. Toast Notification System
// ==========================================================================
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'info';
  if (type === 'success') icon = 'check_circle';
  if (type === 'error') icon = 'error';
  if (type === 'warning') icon = 'warning';
  
  toast.innerHTML = `
    <span class="material-symbols-outlined toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 50);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// ==========================================================================
// 2. IndexedDB Module for Large Files Storage
// ==========================================================================
const FileStorage = {
  dbName: 'TeamUpFileDB',
  storeName: 'fileData',
  db: null,

  // Initialize DB Connection
  init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = (event) => {
        console.error('IndexedDB load error:', event);
        reject(event);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  },

  // Save raw file Blob
  save(fileId, fileBlob) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(fileBlob, fileId);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  },

  // Retrieve raw file Blob
  get(fileId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(fileId);

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (e) => reject(e);
    });
  },

  // Delete raw file Blob
  delete(fileId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('Database not initialized');
        return;
      }
      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(fileId);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  }
};

// ==========================================================================
// 3. Database Wrapper (LocalStorage-based Metadata)
// ==========================================================================
const DB = {
  get(key) {
    const data = localStorage.getItem(`teamup_${key}`);
    return data ? JSON.parse(data) : [];
  },
  
  set(key, data) {
    localStorage.setItem(`teamup_${key}`, JSON.stringify(data));
  },
  
  // --- Users ---
  getUsers() { return this.get('users'); },
  saveUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.set('users', users);
  },
  findUserByEmail(email) {
    return this.getUsers().find(u => u.email === email);
  },
  findUserById(id) {
    return this.getUsers().find(u => u.id === id);
  },

  // --- Teams & Members ---
  getTeams() { return this.get('teams'); },
  getTeamMembers() { return this.get('teamMembers'); },
  
  saveTeam(team) {
    const teams = this.getTeams();
    teams.push(team);
    this.set('teams', teams);
  },
  saveTeamMember(member) {
    const members = this.getTeamMembers();
    members.push(member);
    this.set('teamMembers', members);
  },
  getTeamsByUser(userId) {
    const memberships = this.getTeamMembers().filter(m => m.userId === userId);
    const teams = this.getTeams();
    return teams.filter(t => memberships.some(m => m.teamId === t.id));
  },
  getMembersByTeam(teamId) {
    const memberships = this.getTeamMembers().filter(m => m.teamId === teamId);
    const users = this.getUsers();
    return memberships.map(m => {
      const u = users.find(user => user.id === m.userId);
      return {
        ...m,
        name: u ? u.name : '알 수 없음',
        email: u ? u.email : ''
      };
    });
  },

  // --- Tasks (Kanban) ---
  getTasks() { return this.get('tasks'); },
  saveTasks(tasks) { this.set('tasks', tasks); },
  getTasksByTeam(teamId) {
    return this.getTasks().filter(t => t.teamId === teamId);
  },
  saveTask(task) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      tasks[index] = task;
    } else {
      tasks.push(task);
    }
    this.saveTasks(tasks);
  },
  deleteTask(taskId) {
    const tasks = this.getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);
    this.saveTasks(filtered);
  },

  // --- Schedules (Calendar) ---
  getSchedules() { return this.get('schedules'); },
  saveSchedules(schedules) { this.set('schedules', schedules); },
  getSchedulesByTeam(teamId) {
    return this.getSchedules().filter(s => s.teamId === teamId);
  },
  saveSchedule(schedule) {
    const schedules = this.getSchedules();
    const index = schedules.findIndex(s => s.id === schedule.id);
    if (index > -1) {
      schedules[index] = schedule;
    } else {
      schedules.push(schedule);
    }
    this.saveSchedules(schedules);
  },
  deleteSchedule(scheduleId) {
    const schedules = this.getSchedules();
    const filtered = schedules.filter(s => s.id !== scheduleId);
    this.saveSchedules(filtered);
  },

  // --- Files (Metadata) ---
  getFiles() { return this.get('files'); },
  saveFiles(files) { this.set('files', files); },
  getFilesByTeam(teamId) {
    return this.getFiles().filter(f => f.teamId === teamId);
  },
  saveFileMetadata(fileMeta) {
    const files = this.getFiles();
    files.push(fileMeta);
    this.saveFiles(files);
  },
  deleteFileMetadata(fileId) {
    const files = this.getFiles();
    const filtered = files.filter(f => f.id !== fileId);
    this.saveFiles(filtered);
  },

  // --- Session Manager ---
  getSession() {
    const session = sessionStorage.getItem('teamup_session');
    return session ? JSON.parse(session) : null;
  },
  setSession(user) {
    sessionStorage.setItem('teamup_session', JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name
    }));
  },
  clearSession() {
    sessionStorage.removeItem('teamup_session');
  },

  // --- Seed Initial Dummy Data & Files ---
  async seedInitialData(user) {
    const userTeams = this.getTeamsByUser(user.id);
    if (userTeams.length > 0) return;

    // 1. Create a Default Team
    const defaultTeam = {
      id: `team_${Date.now()}`,
      name: '조 이름을 적어주세요',
      description: '프로젝트 명을 적어주세요',
      ownerId: user.id,
      createdAt: new Date().toISOString()
    };
    this.saveTeam(defaultTeam);

    // 2. Create Dummy Users
    const dummyUsers = [
      { id: 'user_dummy_1', name: '팀원 이름을 적어주세요', email: '이메일을 적어주세요', password: '123' },
      { id: 'user_dummy_2', name: '팀원 이름을 적어주세요', email: '이메일을 적어주세요', password: '123' },
      { id: 'user_dummy_3', name: '팀원 이름을 적어주세요', email: '이메일을 적어주세요', password: '123' }
    ];

    const currentUsers = this.getUsers();
    dummyUsers.forEach(du => {
      if (!currentUsers.some(u => u.email === du.email)) {
        currentUsers.push(du);
      }
    });
    this.set('users', currentUsers);

    // 3. Register Members
    this.saveTeamMember({ id: `member_${Date.now()}_0`, teamId: defaultTeam.id, userId: user.id, role: '역할을 정해주세요' });
    this.saveTeamMember({ id: `member_${Date.now()}_1`, teamId: defaultTeam.id, userId: 'user_dummy_1', role: '역할을 정해주세요' });
    this.saveTeamMember({ id: `member_${Date.now()}_2`, teamId: defaultTeam.id, userId: 'user_dummy_2', role: '역할을 정해주세요' });
    this.saveTeamMember({ id: `member_${Date.now()}_3`, teamId: defaultTeam.id, userId: 'user_dummy_3', role: '역할을 정해주세요' });

    // 4. Seed Tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const seedTasks = [
      {
        id: 'task_seed_1',
        teamId: defaultTeam.id,
        title: '업무 제목',
        description: '업무 설명을 적어주세요.',
        assigneeId: '이름을 적어주세요',
        status: 'done',
        dueDate: threeDaysAgo
      },
      {
        id: 'task_seed_2',
        teamId: defaultTeam.id,
        title: '업무 제목',
        description: '업무 설명을 적어주세요.',
        assigneeId: user.id,
        status: 'doing',
        dueDate: todayStr
      },
      {
        id: 'task_seed_3',
        teamId: defaultTeam.id,
        title: '업무 제목',
        description: '업무 설명을 적어주세요.',
        assigneeId: '이름을 적어주세요',
        status: 'todo',
        dueDate: twoDaysLater
      }
    ];
    seedTasks.forEach(t => this.saveTask(t));

    // 5. Seed Schedules
    const seedSchedules = [
      {
        id: 'sched_seed_1',
        teamId: defaultTeam.id,
        title: '👥 일정 제목을 적어주세요.',
        description: '일정 내용을 설명해주세요.',
        date: threeDaysAgo,
        time: '14:00',
        type: 'meeting'
      },
      {
        id: 'sched_seed_2',
        teamId: defaultTeam.id,
        title: '🚩 일정 제목을 적어주세요',
        description: '일정 내용을 설명해주세요.',
        date: twoDaysLater,
        time: '18:00',
        type: 'milestone'
      }
    ];
    seedSchedules.forEach(s => this.saveSchedule(s));

    // 6. Seed Files into IndexedDB
    try {
      const pdfBlob = new Blob(['%PDF-1.4 Mock University TeamUp Project Requirements Specification Document'], { type: 'application/pdf' });
      const pptBlob = new Blob(['MOCK PPTX Slides: 1. Introduction 2. Tech Stack 3. Architecture 4. Demo'], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
      
      // Virtual SVG Image
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#3b82f6"/><text x="10" y="50" fill="#fff" font-family="sans-serif">MOCK UI</text></svg>`;
      const imgBlob = new Blob([svgContent], { type: 'image/svg+xml' });

      const filesSeed = [
        { id: 'file_seed_1', name: '프로젝트_요구사항_분석서.pdf', type: 'application/pdf', size: pdfBlob.size, blob: pdfBlob },
        { id: 'file_seed_2', name: '발표자료_초안.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: pptBlob.size, blob: pptBlob },
        { id: 'file_seed_3', name: '와이어프레임_목업.png', type: 'image/png', size: imgBlob.size, blob: imgBlob }
      ];

      for (const f of filesSeed) {
        // Save Metadata
        this.saveFileMetadata({
          id: f.id,
          teamId: defaultTeam.id,
          fileName: f.name,
          fileType: f.type,
          fileSize: f.size,
          uploadedBy: 'user_dummy_2', // 팀원1
          uploadDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
        });
        // Save Binary
        await FileStorage.save(f.id, f.blob);
      }
    } catch (err) {
      console.error('Failed to seed files:', err);
    }
  }
};

// ==========================================================================
// 4. Application Controller & Router
// ==========================================================================
const AppState = {
  currentUser: null,
  currentTeamId: '',
  currentView: 'dashboard',
  
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),

  async init() {
    // 1. Initialize IndexedDB first
    try {
      await FileStorage.init();
      console.log('IndexedDB Connected Successfully.');
    } catch (e) {
      showToast('파일 데이터베이스를 초기화하지 못했습니다.', 'error');
    }

    // 2. Load Session
    this.currentUser = DB.getSession();
    this.setupEventListeners();
    this.updateTodayDate();
    this.initFileDropzone();
    
    if (this.currentUser) {
      this.loginSuccess(this.currentUser, false);
    } else {
      this.logout(false);
    }
  },

  updateTodayDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    document.getElementById('header-today-date').textContent = today.toLocaleDateString('ko-KR', options);
  },

  setupEventListeners() {
    // Auth toggles
    document.getElementById('to-signup-btn').addEventListener('click', () => this.switchAuthCard('signup'));
    document.getElementById('to-login-btn').addEventListener('click', () => this.switchAuthCard('login'));

    // Forms
    document.getElementById('signup-form').addEventListener('submit', (e) => { e.preventDefault(); this.handleSignup(); });
    document.getElementById('login-form').addEventListener('submit', (e) => { e.preventDefault(); this.handleLogin(); });

    // Tabs
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');
        this.switchView(target);
      });
    });

    // Team selector
    document.getElementById('team-selector').addEventListener('change', (e) => {
      this.currentTeamId = e.target.value;
      this.refreshCurrentView();
    });

    document.getElementById('logout-btn').addEventListener('click', () => this.logout(true));

    // Task Modals
    document.getElementById('task-modal-close').addEventListener('click', () => this.closeModal('task-modal'));
    document.getElementById('btn-cancel-task').addEventListener('click', () => this.closeModal('task-modal'));
    document.getElementById('task-form').addEventListener('submit', (e) => { e.preventDefault(); this.handleTaskSubmit(); });
    document.getElementById('btn-delete-task').addEventListener('click', () => {
      const taskId = document.getElementById('task-id').value;
      if (taskId && confirm('이 업무를 삭제하시겠습니까?')) {
        DB.deleteTask(taskId);
        showToast('업무가 삭제되었습니다.');
        this.closeModal('task-modal');
        this.refreshCurrentView();
      }
    });

    // Schedule Modals
    document.getElementById('schedule-modal-close').addEventListener('click', () => this.closeModal('schedule-modal'));
    document.getElementById('btn-cancel-schedule').addEventListener('click', () => this.closeModal('schedule-modal'));
    document.getElementById('schedule-form').addEventListener('submit', (e) => { e.preventDefault(); this.handleScheduleSubmit(); });
    document.getElementById('btn-delete-schedule').addEventListener('click', () => {
      const schedId = document.getElementById('schedule-id').value;
      if (schedId && confirm('이 일정을 삭제하시겠습니까?')) {
        DB.deleteSchedule(schedId);
        showToast('일정이 삭제되었습니다.');
        this.closeModal('schedule-modal');
        this.refreshCurrentView();
      }
    });

    // Tasks columns + buttons
    document.getElementById('btn-add-task-todo').addEventListener('click', () => this.openTaskModal(null, 'todo'));
    document.getElementById('btn-add-task-doing').addEventListener('click', () => this.openTaskModal(null, 'doing'));
    document.getElementById('btn-add-task-done').addEventListener('click', () => this.openTaskModal(null, 'done'));

    // Calendar navigation
    document.getElementById('cal-prev-btn').addEventListener('click', () => this.navigateCalendar(-1));
    document.getElementById('cal-next-btn').addEventListener('click', () => this.navigateCalendar(1));
    document.getElementById('cal-today-btn').addEventListener('click', () => {
      this.calYear = new Date().getFullYear();
      this.calMonth = new Date().getMonth();
      this.renderCalendar();
    });
    document.getElementById('cal-add-btn').addEventListener('click', () => this.openScheduleModal());
  },

  switchAuthCard(cardType) {
    const loginCard = document.getElementById('login-card');
    const signupCard = document.getElementById('signup-card');
    this.clearFormErrors('login-form');
    this.clearFormErrors('signup-form');

    if (cardType === 'login') {
      signupCard.classList.remove('active');
      loginCard.classList.add('active');
    } else {
      loginCard.classList.remove('active');
      signupCard.classList.add('active');
    }
  },

  clearFormErrors(formId) {
    const form = document.getElementById(formId);
    form.reset();
    form.querySelectorAll('.error-message').forEach(el => el.textContent = '');
    form.querySelectorAll('.input-wrapper input, .input-wrapper select, .input-wrapper textarea').forEach(el => {
      el.classList.remove('shake');
      el.style.borderColor = 'var(--border-color)';
    });
  },

  switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-target') === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${viewName}-view`);
    });

    const viewTitles = {
      dashboard: '대시보드',
      teams: '팀 관리',
      tasks: '역할 분담',
      schedules: '일정 관리',
      files: '자료 공유'
    };
    
    document.getElementById('current-view-title').textContent = viewTitles[viewName] || 'TeamUp';
    this.currentView = viewName;
    this.refreshCurrentView();
  },

  refreshCurrentView() {
    if (!this.currentUser) return;

    if (this.currentView === 'dashboard') {
      this.renderDashboard();
    } else if (this.currentView === 'tasks') {
      this.renderTasks();
    } else if (this.currentView === 'schedules') {
      this.renderCalendar();
    } else if (this.currentView === 'files') {
      this.renderFiles();
    }
  },

  loadUserTeams() {
    const select = document.getElementById('team-selector');
    const teams = DB.getTeamsByUser(this.currentUser.id);
    
    select.innerHTML = '';
    
    if (teams.length === 0) {
      select.innerHTML = '<option value="">선택할 팀 없음</option>';
      this.currentTeamId = '';
      return;
    }

    teams.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      select.appendChild(opt);
    });

    if (!this.currentTeamId || !teams.some(t => t.id === this.currentTeamId)) {
      this.currentTeamId = teams[0].id;
    }
    select.value = this.currentTeamId;
  },

  // ==========================================================================
  // 5. Auth Execution
  // ==========================================================================
  handleSignup() {
    const nameEl = document.getElementById('signup-name');
    const emailEl = document.getElementById('signup-email');
    const pwEl = document.getElementById('signup-password');
    const confirmPwEl = document.getElementById('signup-confirm-password');

    let isValid = true;
    this.setFieldError('signup-name', '');
    this.setFieldError('signup-email', '');
    this.setFieldError('signup-password', '');
    this.setFieldError('signup-confirm-password', '');

    if (!nameEl.value.trim()) { this.setFieldError('signup-name', '이름을 입력해 주세요.'); isValid = false; }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailEl.value.trim()) {
      this.setFieldError('signup-email', '이메일을 입력해 주세요.');
      isValid = false;
    } else if (!emailRegex.test(emailEl.value)) {
      this.setFieldError('signup-email', '올바른 이메일 형식이 아닙니다.');
      isValid = false;
    }

    if (pwEl.value.length < 8) { this.setFieldError('signup-password', '비밀번호는 최소 8자 이상이어야 합니다.'); isValid = false; }
    if (pwEl.value !== confirmPwEl.value) { this.setFieldError('signup-confirm-password', '비밀번호가 일치하지 않습니다.'); isValid = false; }

    if (!isValid) return;

    if (DB.findUserByEmail(emailEl.value.trim())) {
      this.setFieldError('signup-email', '이미 가입된 이메일 주소입니다.');
      this.shakeInput(emailEl);
      return;
    }

    const newUser = {
      id: `user_${Date.now()}`,
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      password: pwEl.value
    };

    DB.saveUser(newUser);
    showToast('회원가입 성공! 로그인 해주세요.');
    this.switchAuthCard('login');
  },

  async handleLogin() {
    const emailEl = document.getElementById('login-email');
    const pwEl = document.getElementById('login-password');
    this.setFieldError('login-email', '');
    this.setFieldError('login-password', '');

    let isValid = true;
    if (!emailEl.value.trim()) { this.setFieldError('login-email', '이메일을 입력해 주세요.'); isValid = false; }
    if (!pwEl.value) { this.setFieldError('login-password', '비밀번호를 입력해 주세요.'); isValid = false; }

    if (!isValid) return;

    const user = DB.findUserByEmail(emailEl.value.trim());
    if (!user || user.password !== pwEl.value) {
      showToast('이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
      this.setFieldError('login-email', '인증 정보가 맞지 않습니다.');
      this.setFieldError('login-password', '인증 정보가 맞지 않습니다.');
      this.shakeInput(emailEl);
      this.shakeInput(pwEl);
      return;
    }

    // Seed dummy first project and mock team members/schedules/files
    await DB.seedInitialData(user);
    
    DB.setSession(user);
    this.currentUser = DB.getSession();
    this.loginSuccess(this.currentUser);
  },

  loginSuccess(user, notify = true) {
    document.getElementById('profile-user-name').textContent = user.name;
    document.getElementById('profile-user-email').textContent = user.email;
    document.getElementById('welcome-user-name').textContent = user.name;
    document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';

    this.loadUserTeams();
    this.switchView('dashboard');

    if (notify) showToast(`${user.name}님, 환영합니다!`);
  },

  logout(notify = true) {
    DB.clearSession();
    this.currentUser = null;
    this.currentTeamId = '';

    document.getElementById('app-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'flex';
    this.switchAuthCard('login');

    if (notify) showToast('로그아웃 되었습니다.');
  },

  setFieldError(inputId, message) {
    const errorEl = document.getElementById(`${inputId}-error`);
    if (errorEl) errorEl.textContent = message;
    const input = document.getElementById(inputId);
    if (input) input.style.borderColor = message ? 'var(--danger)' : 'var(--border-color)';
  },

  shakeInput(inputEl) {
    inputEl.classList.add('shake');
    setTimeout(() => inputEl.classList.remove('shake'), 400);
  },

  openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  },

  closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  },

  // ==========================================================================
  // 6. Dashboard Center Hub Renderer
  // ==========================================================================
  renderDashboard() {
    this.loadUserTeams();

    const myTeams = DB.getTeamsByUser(this.currentUser.id);
    
    if (!this.currentTeamId) {
      document.getElementById('dash-my-tasks-count').textContent = '0';
      document.getElementById('dash-this-week-schedules-count').textContent = '0';
      document.getElementById('dash-files-count').textContent = '0';
      document.getElementById('dash-task-list').innerHTML = '<li class="list-empty">팀을 선택해주세요.</li>';
      document.getElementById('dash-schedule-list').innerHTML = '<li class="list-empty">팀을 선택해주세요.</li>';
      document.getElementById('dash-file-list').innerHTML = '<li class="list-empty">팀을 선택해주세요.</li>';
      document.getElementById('dash-member-list').innerHTML = '<li class="list-empty">팀을 선택해주세요.</li>';
      return;
    }

    const teamTasks = DB.getTasksByTeam(this.currentTeamId);
    const teamSchedules = DB.getSchedulesByTeam(this.currentTeamId);
    const teamFiles = DB.getFilesByTeam(this.currentTeamId);
    const teamMembers = DB.getMembersByTeam(this.currentTeamId);

    // A. Update Top counts
    const myTasks = teamTasks.filter(t => t.assigneeId === this.currentUser.id && t.status !== 'done');
    document.getElementById('dash-my-tasks-count').textContent = myTasks.length;

    const today = new Date();
    today.setHours(0,0,0,0);
    const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thisWeekSchedules = teamSchedules.filter(s => {
      const sDate = new Date(s.date);
      return sDate >= today && sDate <= oneWeekLater;
    });
    document.getElementById('dash-this-week-schedules-count').textContent = thisWeekSchedules.length;
    document.getElementById('dash-files-count').textContent = teamFiles.length;

    // B. Widget 1: My Tasks
    const taskList = document.getElementById('dash-task-list');
    taskList.innerHTML = '';
    if (myTasks.length === 0) {
      taskList.innerHTML = '<li class="list-empty">할 일이 없습니다. 🎉</li>';
    } else {
      myTasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
      myTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = 'dashboard-list-item';
        const ddayText = this.calculateDDay(task.dueDate);
        const ddayClass = ddayText.includes('초과') ? 'badge-dday danger' : 'badge-dday';

        li.innerHTML = `
          <div class="item-left">
            <span class="material-symbols-outlined text-purple">radio_button_unchecked</span>
            <span class="item-title">${task.title}</span>
          </div>
          <div class="item-right">
            <span class="${ddayClass}">${ddayText}</span>
          </div>
        `;
        li.addEventListener('click', () => {
          this.switchView('tasks');
          this.openTaskModal(task.id);
        });
        taskList.appendChild(li);
      });
    }

    // C. Widget 2: Upcoming Schedules
    const scheduleList = document.getElementById('dash-schedule-list');
    scheduleList.innerHTML = '';
    const upcomingSchedules = teamSchedules.filter(s => new Date(s.date) >= today);
    upcomingSchedules.sort((a,b) => new Date(a.date) - new Date(b.date));

    if (upcomingSchedules.length === 0) {
      scheduleList.innerHTML = '<li class="list-empty">다가오는 일정이 없습니다.</li>';
    } else {
      upcomingSchedules.slice(0, 4).forEach(s => {
        const li = document.createElement('li');
        li.className = 'dashboard-list-item';
        
        let typeIcon = 'event';
        let typeColor = 'text-blue';
        if (s.type === 'meeting') { typeIcon = 'groups'; typeColor = 'text-blue'; }
        if (s.type === 'milestone') { typeIcon = 'flag'; typeColor = 'text-purple'; }
        if (s.type === 'assignment') { typeIcon = 'edit_note'; typeColor = 'text-purple'; }

        li.innerHTML = `
          <div class="item-left">
            <span class="material-symbols-outlined ${typeColor}">${typeIcon}</span>
            <span class="item-title">${s.title}</span>
          </div>
          <div class="item-right">
            <span class="user-email">${s.date} ${s.time ? s.time : ''}</span>
          </div>
        `;
        li.addEventListener('click', () => {
          const sDate = new Date(s.date);
          this.calYear = sDate.getFullYear();
          this.calMonth = sDate.getMonth();
          this.switchView('schedules');
          this.openScheduleModal(s.id);
        });
        scheduleList.appendChild(li);
      });
    }

    // D. Widget 3: Recently Uploaded Files
    const fileList = document.getElementById('dash-file-list');
    fileList.innerHTML = '';
    if (teamFiles.length === 0) {
      fileList.innerHTML = '<li class="list-empty">공유 자료실에 파일이 없습니다.</li>';
    } else {
      // Sort by upload date desc
      teamFiles.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      teamFiles.slice(0, 4).forEach(f => {
        const li = document.createElement('li');
        li.className = 'dashboard-list-item';
        
        let iconClass = 'icon-generic';
        if (f.fileType.includes('pdf')) iconClass = 'icon-pdf';
        else if (f.fileType.includes('presentation') || f.fileType.includes('powerpoint')) iconClass = 'icon-ppt';
        else if (f.fileType.includes('image')) iconClass = 'icon-image';

        li.innerHTML = `
          <div class="item-left">
            <span class="material-symbols-outlined ${iconClass}">draft</span>
            <span class="item-title">${f.fileName}</span>
          </div>
          <div class="item-right">
            <span class="badge-file-type type-generic" style="font-size: 0.6rem;">${this.formatFileSize(f.fileSize)}</span>
            <span class="material-symbols-outlined text-blue" style="font-size: 16px;">download</span>
          </div>
        `;
        li.addEventListener('click', () => {
          this.downloadFile(f.id);
        });
        fileList.appendChild(li);
      });
    }

    // E. Widget 4: Team Members
    const memberList = document.getElementById('dash-member-list');
    memberList.innerHTML = '';
    teamMembers.forEach(m => {
      const li = document.createElement('li');
      li.className = 'dashboard-list-item';
      li.style.cursor = 'default';
      const initial = m.name.charAt(0).toUpperCase();

      li.innerHTML = `
        <div class="item-left">
          <div class="mini-avatar" style="width:20px; height:20px; font-size: 0.6rem;">${initial}</div>
          <span class="item-title" style="font-size:0.8rem;">${m.name}</span>
          <span class="badge-file-type type-generic" style="font-size:0.6rem; padding: 1px 4px;">${m.role}</span>
        </div>
        <div class="item-right">
          <span class="user-email" style="font-size:0.7rem;">${m.email}</span>
        </div>
      `;
      memberList.appendChild(li);
    });
  },

  calculateDDay(dateStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'D-Day';
    if (diffDays < 0) return `마감 초과 (${Math.abs(diffDays)}일)`;
    return `D-${diffDays}`;
  },

  // ==========================================================================
  // 7. Task Kanban Execution
  // ==========================================================================
  renderTasks() {
    const noTeamEl = document.getElementById('tasks-no-team');
    const boardEl = document.getElementById('tasks-board-container');

    if (!this.currentTeamId) {
      noTeamEl.style.display = 'flex';
      boardEl.style.display = 'none';
      return;
    }

    noTeamEl.style.display = 'none';
    boardEl.style.display = 'block';

    const tasks = DB.getTasksByTeam(this.currentTeamId);
    const columns = {
      todo: document.getElementById('tasks-todo'),
      doing: document.getElementById('tasks-doing'),
      done: document.getElementById('tasks-done')
    };

    Object.keys(columns).forEach(status => {
      columns[status].innerHTML = '';
      document.getElementById(`count-${status}`).textContent = '0';
    });

    let counts = { todo: 0, doing: 0, done: 0 };

    tasks.forEach(task => {
      const col = columns[task.status];
      if (!col) return;

      counts[task.status]++;
      const card = this.createTaskCard(task);
      col.appendChild(card);
    });

    Object.keys(counts).forEach(status => {
      document.getElementById(`count-${status}`).textContent = counts[status];
    });

    document.querySelectorAll('.kanban-column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('drag-over');
      });
      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });
      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        const taskId = e.dataTransfer.getData('text/plain');
        const targetStatus = column.getAttribute('data-status');
        this.updateTaskStatus(taskId, targetStatus);
      });
    });
  },

  createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('data-id', task.id);

    const assignee = DB.findUserById(task.assigneeId);
    const assigneeName = assignee ? assignee.name : '미정';
    const initial = assigneeName.charAt(0).toUpperCase();

    const ddayText = this.calculateDDay(task.dueDate);
    let ddayClass = 'badge-dday';
    if (task.status === 'done') {
      ddayClass += ' success';
    } else if (ddayText.includes('초과')) {
      ddayClass += ' danger';
    } else if (ddayText === 'D-Day' || ddayText === 'D-1' || ddayText === 'D-2') {
      ddayClass += ' warning';
    }

    card.innerHTML = `
      <h5 class="task-card-title">${task.title}</h5>
      <p class="task-card-desc">${task.description ? task.description : '상세 설명이 비어있습니다.'}</p>
      <div class="task-card-meta">
        <div class="task-card-assignee">
          <div class="mini-avatar" title="담당자: ${assigneeName}">${initial}</div>
          <span class="assignee-name">${assigneeName}</span>
        </div>
        <div class="task-card-date">
          <span class="material-symbols-outlined">schedule</span>
          <span class="${ddayClass}">${ddayText}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      this.openTaskModal(task.id);
    });

    card.addEventListener('dragstart', (e) => {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', task.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });

    return card;
  },

  updateTaskStatus(taskId, newStatus) {
    const tasks = DB.getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      task.status = newStatus;
      DB.saveTasks(tasks);
      showToast(`업무가 '${newStatus === 'todo' ? '시작 전' : newStatus === 'doing' ? '진행 중' : '완료'}' 상태로 이동되었습니다.`);
      this.refreshCurrentView();
    }
  },

  openTaskModal(taskId = null, defaultStatus = 'todo') {
    const form = document.getElementById('task-form');
    this.clearFormErrors('task-form');

    const assigneeSelect = document.getElementById('task-assignee');
    assigneeSelect.innerHTML = '<option value="">담당자 선택</option>';
    
    const members = DB.getMembersByTeam(this.currentTeamId);
    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.userId;
      opt.textContent = `${m.name} (${m.role})`;
      assigneeSelect.appendChild(opt);
    });

    const modalTitle = document.getElementById('task-modal-title');
    const deleteBtn = document.getElementById('btn-delete-task');
    const statusGroup = document.getElementById('task-status-group');

    if (taskId) {
      modalTitle.textContent = '업무 수정';
      deleteBtn.style.display = 'block';
      statusGroup.style.display = 'block';

      const task = DB.getTasks().find(t => t.id === taskId);
      if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.description || '';
        document.getElementById('task-assignee').value = task.assigneeId;
        document.getElementById('task-duedate').value = task.dueDate;
        document.getElementById('task-status').value = task.status;
      }
    } else {
      modalTitle.textContent = '업무 등록';
      deleteBtn.style.display = 'none';
      statusGroup.style.display = 'none';

      document.getElementById('task-id').value = '';
      document.getElementById('task-status-hidden').value = defaultStatus;
      
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      document.getElementById('task-duedate').value = tomorrow;
    }

    this.openModal('task-modal');
  },

  handleTaskSubmit() {
    const id = document.getElementById('task-id').value;
    const titleEl = document.getElementById('task-title');
    const desc = document.getElementById('task-desc').value;
    const assigneeEl = document.getElementById('task-assignee');
    const dueDateEl = document.getElementById('task-duedate');
    const statusHidden = document.getElementById('task-status-hidden').value;
    const statusSelect = document.getElementById('task-status').value;

    this.setFieldError('task-title', '');
    this.setFieldError('task-assignee', '');
    this.setFieldError('task-duedate', '');

    let isValid = true;
    if (!titleEl.value.trim()) { this.setFieldError('task-title', '업무명을 입력하세요.'); isValid = false; }
    if (!assigneeEl.value) { this.setFieldError('task-assignee', '담당자를 지정하세요.'); isValid = false; }
    if (!dueDateEl.value) { this.setFieldError('task-duedate', '마감일을 지정하세요.'); isValid = false; }

    if (!isValid) return;

    const task = {
      id: id || `task_${Date.now()}`,
      teamId: this.currentTeamId,
      title: titleEl.value.trim(),
      description: desc.trim(),
      assigneeId: assigneeEl.value,
      dueDate: dueDateEl.value,
      status: id ? statusSelect : statusHidden
    };

    DB.saveTask(task);
    showToast(id ? '업무 수정 완료!' : '새 업무 등록 완료!');
    this.closeModal('task-modal');
    this.refreshCurrentView();
  },

  // ==========================================================================
  // 8. Schedule Calendar Execution
  // ==========================================================================
  renderCalendar() {
    const noTeamEl = document.getElementById('schedules-no-team');
    const calEl = document.getElementById('schedules-calendar-container');

    if (!this.currentTeamId) {
      noTeamEl.style.display = 'flex';
      calEl.style.display = 'none';
      return;
    }

    noTeamEl.style.display = 'none';
    calEl.style.display = 'block';

    const monthYearTitle = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-days-grid');
    
    monthYearTitle.textContent = `${this.calYear}년 ${this.calMonth + 1}월`;
    grid.innerHTML = '';

    const firstDay = new Date(this.calYear, this.calMonth, 1);
    const startDayOfWeek = firstDay.getDay(); 
    const lastDay = new Date(this.calYear, this.calMonth + 1, 0);
    const numDays = lastDay.getDate();
    const prevMonthLastDay = new Date(this.calYear, this.calMonth, 0).getDate();

    const schedules = DB.getSchedulesByTeam(this.currentTeamId);
    const totalCells = startDayOfWeek + numDays > 35 ? 42 : 35;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      
      let dayNumber;
      let cellDate;

      if (i < startDayOfWeek) {
        dayNumber = prevMonthLastDay - startDayOfWeek + i + 1;
        cell.classList.add('other-month');
        cellDate = new Date(this.calYear, this.calMonth - 1, dayNumber);
      } else if (i >= startDayOfWeek + numDays) {
        dayNumber = i - startDayOfWeek - numDays + 1;
        cell.classList.add('other-month');
        cellDate = new Date(this.calYear, this.calMonth + 1, dayNumber);
      } else {
        dayNumber = i - startDayOfWeek + 1;
        cellDate = new Date(this.calYear, this.calMonth, dayNumber);
      }

      const dayOfWeek = cellDate.getDay();
      if (dayOfWeek === 0) cell.classList.add('sunday');
      if (dayOfWeek === 6) cell.classList.add('saturday');

      const today = new Date();
      if (cellDate.getFullYear() === today.getFullYear() &&
          cellDate.getMonth() === today.getMonth() &&
          cellDate.getDate() === today.getDate()) {
        cell.classList.add('today');
      }

      const dateStr = cellDate.toISOString().split('T')[0];

      cell.innerHTML = `
        <div class="cal-day-cell-header">
          <span class="cal-day-number">${dayNumber}</span>
        </div>
        <div class="cal-day-events" id="events-${dateStr}"></div>
      `;

      const dayEvents = schedules.filter(s => s.date === dateStr);
      const eventsContainer = cell.querySelector(`.cal-day-events`);

      dayEvents.forEach(evt => {
        const badge = document.createElement('span');
        badge.className = `cal-event-badge cal-event-${evt.type}`;
        badge.textContent = `${evt.time ? evt.time + ' ' : ''}${evt.title}`;
        badge.title = evt.title;
        
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openScheduleModal(evt.id);
        });
        eventsContainer.appendChild(badge);
      });

      cell.addEventListener('click', () => {
        this.openScheduleModal(null, dateStr);
      });

      grid.appendChild(cell);
    }
  },

  navigateCalendar(offset) {
    this.calMonth += offset;
    if (this.calMonth < 0) {
      this.calMonth = 11;
      this.calYear -= 1;
    } else if (this.calMonth > 11) {
      this.calMonth = 0;
      this.calYear += 1;
    }
    this.renderCalendar();
  },

  openScheduleModal(scheduleId = null, defaultDate = null) {
    const form = document.getElementById('schedule-form');
    this.clearFormErrors('schedule-form');

    const modalTitle = document.getElementById('schedule-modal-title');
    const deleteBtn = document.getElementById('btn-delete-schedule');

    if (scheduleId) {
      modalTitle.textContent = '일정 수정';
      deleteBtn.style.display = 'block';

      const schedule = DB.getSchedules().find(s => s.id === scheduleId);
      if (schedule) {
        document.getElementById('schedule-id').value = schedule.id;
        document.getElementById('schedule-title').value = schedule.title;
        document.getElementById('schedule-desc').value = schedule.description || '';
        document.getElementById('schedule-date').value = schedule.date;
        document.getElementById('schedule-time').value = schedule.time || '';
        document.getElementById('schedule-type').value = schedule.type;
      }
    } else {
      modalTitle.textContent = '일정 등록';
      deleteBtn.style.display = 'none';

      document.getElementById('schedule-id').value = '';
      document.getElementById('schedule-date').value = defaultDate || new Date().toISOString().split('T')[0];
      document.getElementById('schedule-time').value = '12:00';
    }

    this.openModal('schedule-modal');
  },

  handleScheduleSubmit() {
    const id = document.getElementById('schedule-id').value;
    const titleEl = document.getElementById('schedule-title');
    const desc = document.getElementById('schedule-desc').value;
    const dateEl = document.getElementById('schedule-date');
    const time = document.getElementById('schedule-time').value;
    const type = document.getElementById('schedule-type').value;

    this.setFieldError('schedule-title', '');
    this.setFieldError('schedule-date', '');

    let isValid = true;
    if (!titleEl.value.trim()) { this.setFieldError('schedule-title', '일정명을 입력하세요.'); isValid = false; }
    if (!dateEl.value) { this.setFieldError('schedule-date', '날짜를 입력하세요.'); isValid = false; }

    if (!isValid) return;

    const schedule = {
      id: id || `sched_${Date.now()}`,
      teamId: this.currentTeamId,
      title: titleEl.value.trim(),
      description: desc.trim(),
      date: dateEl.value,
      time: time,
      type: type
    };

    DB.saveSchedule(schedule);
    showToast(id ? '일정이 수정되었습니다.' : '새 일정이 등록되었습니다.');
    this.closeModal('schedule-modal');
    this.refreshCurrentView();
  },

  // ==========================================================================
  // 9. Files Sharing & Dropzone Execution
  // ==========================================================================
  initFileDropzone() {
    const dropzone = document.getElementById('file-dropzone');
    const fileInputHidden = document.getElementById('file-input-hidden');

    if (!dropzone || !fileInputHidden) return;

    // Click to select
    dropzone.addEventListener('click', () => {
      fileInputHidden.click();
    });

    fileInputHidden.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files);
        fileInputHidden.value = ''; // Reset
      }
    });

    // Drag-over styling
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files);
      }
    });
  },

  async handleFileUpload(fileList) {
    if (!this.currentTeamId) {
      showToast('팀을 먼저 선택해 주세요.', 'warning');
      return;
    }

    const files = Array.from(fileList);
    let successCount = 0;

    for (const file of files) {
      // Validate File Extensions
      const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      const isImg = file.type.startsWith('image/');
      
      if (!allowedExtensions.includes(fileExt) && !isImg) {
        showToast(`'${file.name}'은 지원되지 않는 파일입니다. (PDF, PPT, 이미지 파일만 가능)`, 'error');
        continue;
      }

      // Max size: 50MB (52,428,800 bytes)
      if (file.size > 52428800) {
        showToast(`'${file.name}' 용량이 너무 큽니다. (최대 50MB)`, 'error');
        continue;
      }

      const fileId = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Save Metadata to LocalStorage
      const fileMeta = {
        id: fileId,
        teamId: this.currentTeamId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedBy: this.currentUser.id,
        uploadDate: new Date().toISOString()
      };

      try {
        // Save raw Blob to IndexedDB
        await FileStorage.save(fileId, file);
        DB.saveFileMetadata(fileMeta);
        successCount++;
      } catch (err) {
        console.error('File write to DB failed:', err);
        showToast(`'${file.name}' 업로드 중 에러가 발생했습니다.`, 'error');
      }
    }

    if (successCount > 0) {
      showToast(`${successCount}개의 파일이 공유방에 정상 업로드되었습니다.`);
      this.refreshCurrentView();
    }
  },

  renderFiles() {
    const noTeamEl = document.getElementById('files-no-team');
    const boardEl = document.getElementById('files-board-container');

    if (!this.currentTeamId) {
      noTeamEl.style.display = 'flex';
      boardEl.style.display = 'none';
      return;
    }

    noTeamEl.style.display = 'none';
    boardEl.style.display = 'flex';

    const files = DB.getFilesByTeam(this.currentTeamId);
    const tbody = document.getElementById('file-list-tbody');
    const countBadge = document.getElementById('files-count-badge');

    countBadge.textContent = files.length;
    tbody.innerHTML = '';

    if (files.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="list-empty">공유방에 등록된 파일이 없습니다. 첫 파일을 공유해 보세요!</td>
        </tr>
      `;
      return;
    }

    // Sort by upload date desc
    files.sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    files.forEach(f => {
      const tr = document.createElement('tr');
      
      let iconClass = 'icon-generic';
      let typeText = 'etc';
      let typeClass = 'type-generic';

      if (f.fileType.includes('pdf')) {
        iconClass = 'icon-pdf';
        typeText = 'PDF';
        typeClass = 'type-pdf';
      } else if (f.fileType.includes('presentation') || f.fileType.includes('powerpoint')) {
        iconClass = 'icon-ppt';
        typeText = 'PPT';
        typeClass = 'type-ppt';
      } else if (f.fileType.includes('image')) {
        iconClass = 'icon-image';
        typeText = '이미지';
        typeClass = 'type-image';
      }

      // Find Uploader Name
      const uploader = DB.findUserById(f.uploadedBy);
      const uploaderName = uploader ? uploader.name : '알 수 없음';
      const uploadDateStr = f.uploadDate.split('T')[0];

      tr.innerHTML = `
        <td class="text-left">
          <div class="file-name-cell">
            <span class="material-symbols-outlined file-type-icon ${iconClass}">draft</span>
            <span>${f.fileName}</span>
          </div>
        </td>
        <td>${this.formatFileSize(f.fileSize)}</td>
        <td><span class="badge-file-type ${typeClass}">${typeText}</span></td>
        <td>${uploaderName}</td>
        <td>${uploadDateStr}</td>
        <td>
          <button class="btn-table-action btn-download" title="다운로드">
            <span class="material-symbols-outlined">download</span>
          </button>
          <button class="btn-table-action btn-delete-item" title="삭제">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </td>
      `;

      // Event listeners
      tr.querySelector('.btn-download').addEventListener('click', () => this.downloadFile(f.id));
      tr.querySelector('.btn-delete-item').addEventListener('click', () => this.deleteFile(f.id));

      tbody.appendChild(tr);
    });
  },

  async downloadFile(fileId) {
    const meta = DB.getFiles().find(f => f.id === fileId);
    if (!meta) {
      showToast('파일 메타데이터를 찾을 수 없습니다.', 'error');
      return;
    }

    showToast('파일 다운로드를 시작합니다...');

    try {
      const blob = await FileStorage.get(fileId);
      if (!blob) {
        showToast('실제 파일 데이터를 스토리지에서 찾지 못했습니다.', 'error');
        return;
      }

      // Trigger actual browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = meta.fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (e) {
      console.error('File download failed:', e);
      showToast('파일 다운로드 중 에러가 발생했습니다.', 'error');
    }
  },

  async deleteFile(fileId) {
    if (confirm('공유 자료실에서 이 파일을 삭제하시겠습니까?')) {
      try {
        await FileStorage.delete(fileId);
        DB.deleteFileMetadata(fileId);
        showToast('파일이 보관함에서 영구 삭제되었습니다.');
        this.refreshCurrentView();
      } catch (err) {
        console.error('File deletion failed:', err);
        showToast('파일 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  },

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
};

// Bootstrap App
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
});
