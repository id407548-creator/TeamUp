document.addEventListener('DOMContentLoaded', () => {
    console.log("schedules.js 로컬 버젼 가동");

    // URL에서 team id 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const TEAM_ID = urlParams.get('id');

    if (!TEAM_ID) return;

    // 1. DOM 요소 수집 (요소가 없을 경우를 대비해 예외처리용 단축평가 적용)
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const scheduleModal = document.getElementById('schedule-modal');
    const closeScheduleModalBtns = document.querySelectorAll('.close-schedule-modal');
    const scheduleForm = document.getElementById('schedule-form');
    const scheduleModalTitle = document.getElementById('schedule-modal-title');
    const deleteScheduleBtn = document.getElementById('delete-schedule-btn');
    const colorChips = document.querySelectorAll('.color-chip');

    let calendarInstance = null;
    let selectedColor = '#4F46E5'; // 기본 색상 (Indigo)

    const storageKey = `schedules_team_${TEAM_ID}`;

    // 2. 컬러 칩 선택 이벤트 처리
    colorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            colorChips.forEach(c => c.classList.remove('active-chip'));
            chip.classList.add('active-chip');
            const radio = chip.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = true;
                selectedColor = radio.value;
            }
        });
    });

    // 3. 모달 제어
    function openScheduleModal(mode = 'create', eventData = null) {
        if (!scheduleModal) return;
        if (scheduleForm) scheduleForm.reset();
        
        if (document.getElementById('schedule-id')) {
            document.getElementById('schedule-id').value = '';
        }
        if (deleteScheduleBtn) deleteScheduleBtn.style.display = 'none';

        colorChips.forEach(c => c.classList.remove('active-chip'));
        
        if (mode === 'edit' && eventData) {
            if (scheduleModalTitle) scheduleModalTitle.textContent = '일정 수정';
            if (deleteScheduleBtn) deleteScheduleBtn.style.display = 'block';
            
            if (document.getElementById('schedule-id')) document.getElementById('schedule-id').value = eventData.id;
            if (document.getElementById('schedule-title-input')) document.getElementById('schedule-title-input').value = eventData.title;
            if (document.getElementById('schedule-desc-input')) {
                document.getElementById('schedule-desc-input').value = eventData.extendedProps ? (eventData.extendedProps.description || '') : '';
            }
            
            if (document.getElementById('schedule-start-input')) {
                document.getElementById('schedule-start-input').value = formatDateTimeLocal(eventData.start);
            }
            if (document.getElementById('schedule-end-input')) {
                document.getElementById('schedule-end-input').value = eventData.end ? formatDateTimeLocal(eventData.end) : formatDateTimeLocal(eventData.start);
            }

            selectedColor = eventData.backgroundColor || '#4F46E5';
            const matchedChip = document.querySelector(`.color-chip input[value="${selectedColor}"]`);
            if (matchedChip) {
                matchedChip.checked = true;
                matchedChip.parentElement.classList.add('active-chip');
            } else if (colorChips[0]) {
                colorChips[0].classList.add('active-chip');
            }
        } else {
            if (scheduleModalTitle) scheduleModalTitle.textContent = '일정 추가';
            if (colorChips[0]) {
                colorChips[0].classList.add('active-chip');
                const firstRadio = colorChips[0].querySelector('input');
                if (firstRadio) firstRadio.checked = true;
            }
            selectedColor = '#4F46E5';

            const now = new Date();
            const oneHourLater = new Date(now.getTime() + (60 * 60 * 1000));
            if (document.getElementById('schedule-start-input')) document.getElementById('schedule-start-input').value = formatDateTimeLocal(now);
            if (document.getElementById('schedule-end-input')) document.getElementById('schedule-end-input').value = formatDateTimeLocal(oneHourLater);
        }

        scheduleModal.style.display = 'flex'; // 대시보드 스타일의 일관된 표시 메커니즘
    }

    function closeScheduleModal() {
        if (scheduleModal) scheduleModal.style.display = 'none';
    }

    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', () => openScheduleModal('create'));
    }

    closeScheduleModalBtns.forEach(btn => {
        btn.addEventListener('click', closeScheduleModal);
    });

    if (scheduleModal) {
        scheduleModal.addEventListener('click', (e) => {
            if (e.target === scheduleModal) closeScheduleModal();
        });
    }

    function formatDateTimeLocal(dateObj) {
        const d = new Date(dateObj);
        const pad = (num) => String(num).padStart(2, '0');
        const year = d.getFullYear();
        const month = pad(d.getMonth() + 1);
        const day = pad(d.getDate());
        const hours = pad(d.getHours());
        const minutes = pad(d.getMinutes());
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 4. FullCalendar 로컬 저장소 연동 초기화
    const calendarEl = document.getElementById('calendar');
    if (calendarEl && typeof FullCalendar !== 'undefined') {
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            navLinks: true,
            editable: false,
            dayMaxEvents: true,
            
            // 💡 로컬 스토리지 데이터 바인딩으로 변경
            events: function(fetchInfo, successCallback, failureCallback) {
                try {
                    const localData = localStorage.getItem(storageKey);
                    const schedules = localData ? JSON.parse(localData) : [];
                    
                    const fcEvents = schedules.map(item => ({
                        id: item.id,
                        title: item.title,
                        start: item.start_time,
                        end: item.end_time,
                        backgroundColor: item.color,
                        textColor: '#ffffff',
                        extendedProps: {
                            description: item.description
                        }
                    }));
                    successCallback(fcEvents);
                } catch (error) {
                    console.error('로컬 일정 로드 실패:', error);
                    failureCallback(error);
                }
            },

            eventClick: function(info) {
                openScheduleModal('edit', info.event);
            }
        });

        calendarInstance.render();
        window.teamCalendar = calendarInstance;
    }

    // 5. 로컬 저장소 폼 제출 처리
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const scheduleId = document.getElementById('schedule-id').value;
            const title = document.getElementById('schedule-title-input').value.trim();
            const description = document.getElementById('schedule-desc-input').value.trim();
            const start_time = document.getElementById('schedule-start-input').value;
            const end_time = document.getElementById('schedule-end-input').value;

            if (!title || !start_time || !end_time) {
                alert('필수 입력 항목을 확인해 주세요.');
                return;
            }

            if (new Date(start_time) > new Date(end_time)) {
                alert('종료 일시는 시작 일시보다 빠를 수 없습니다.');
                return;
            }

            let schedules = JSON.parse(localStorage.getItem(storageKey) || '[]');

            if (scheduleId) {
                // 수정 모드
                const idx = schedules.findIndex(s => String(s.id) === String(scheduleId));
                if (idx > -1) {
                    schedules[idx] = { id: scheduleId, title, description, start_time, end_time, color: selectedColor };
                }
            } else {
                // 추가 모드
                schedules.push({
                    id: Date.now().toString(),
                    title,
                    description,
                    start_time,
                    end_time,
                    color: selectedColor
                });
            }

            localStorage.setItem(storageKey, JSON.stringify(schedules));
            closeScheduleModal();
            if (calendarInstance) calendarInstance.refetchEvents();
        });
    }

    // 6. 로컬 저장소 일정 삭제 처리
    if (deleteScheduleBtn) {
        deleteScheduleBtn.addEventListener('click', () => {
            const scheduleId = document.getElementById('schedule-id').value;
            if (!scheduleId) return;

            if (confirm('이 일정을 삭제하시겠습니까?')) {
                let schedules = JSON.parse(localStorage.getItem(storageKey) || '[]');
                schedules = schedules.filter(s => String(s.id) !== String(scheduleId));
                localStorage.setItem(storageKey, JSON.stringify(schedules));
                
                closeScheduleModal();
                if (calendarInstance) calendarInstance.refetchEvents();
            }
        });
    }
});
