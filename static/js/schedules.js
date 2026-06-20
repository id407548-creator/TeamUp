document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 수집
    const addScheduleBtn = document.getElementById('add-schedule-btn');
    const scheduleModal = document.getElementById('schedule-modal');
    const closeScheduleModalBtns = document.querySelectorAll('.close-schedule-modal');
    const scheduleForm = document.getElementById('schedule-form');
    const scheduleModalTitle = document.getElementById('schedule-modal-title');
    const deleteScheduleBtn = document.getElementById('delete-schedule-btn');
    const colorChips = document.querySelectorAll('.color-chip');

    let calendarInstance = null;
    let selectedColor = '#4F46E5'; // 기본 색상 (Indigo)

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
        scheduleForm.reset();
        document.getElementById('schedule-id').value = '';
        deleteScheduleBtn.style.display = 'none';

        // 컬러 칩 초기화
        colorChips.forEach(c => c.classList.remove('active-chip'));
        
        if (mode === 'edit' && eventData) {
            scheduleModalTitle.textContent = '일정 수정';
            deleteScheduleBtn.style.display = 'block';
            
            document.getElementById('schedule-id').value = eventData.id;
            document.getElementById('schedule-title-input').value = eventData.title;
            document.getElementById('schedule-desc-input').value = eventData.extendedProps.description || '';
            
            // FullCalendar 날짜 포맷 변환 (ISO string -> datetime-local 포맷: YYYY-MM-DDTHH:MM)
            document.getElementById('schedule-start-input').value = formatDateTimeLocal(eventData.start);
            if (eventData.end) {
                document.getElementById('schedule-end-input').value = formatDateTimeLocal(eventData.end);
            } else {
                document.getElementById('schedule-end-input').value = formatDateTimeLocal(eventData.start);
            }

            // 저장된 컬러 칩 선택 상태 반영
            selectedColor = eventData.backgroundColor || '#4F46E5';
            const matchedChip = document.querySelector(`.color-chip input[value="${selectedColor}"]`);
            if (matchedChip) {
                matchedChip.checked = true;
                matchedChip.parentElement.classList.add('active-chip');
            } else {
                colorChips[0].classList.add('active-chip');
            }
        } else {
            scheduleModalTitle.textContent = '일정 추가';
            colorChips[0].classList.add('active-chip');
            colorChips[0].querySelector('input').checked = true;
            selectedColor = '#4F46E5';

            // 시작/종료 일시 기본값 채우기 (현재 시각 및 1시간 뒤)
            const now = new Date();
            const oneHourLater = new Date(now.getTime() + (60 * 60 * 1000));
            document.getElementById('schedule-start-input').value = formatDateTimeLocal(now);
            document.getElementById('schedule-end-input').value = formatDateTimeLocal(oneHourLater);
        }

        scheduleModal.classList.add('active');
    }

    function closeScheduleModal() {
        scheduleModal.classList.remove('active');
    }

    if (addScheduleBtn) {
        addScheduleBtn.addEventListener('click', () => openScheduleModal('create'));
    }

    closeScheduleModalBtns.forEach(btn => {
        btn.addEventListener('click', closeScheduleModal);
    });

    scheduleModal.addEventListener('click', (e) => {
        if (e.target === scheduleModal) closeScheduleModal();
    });

    // datetime-local 입력창에 맞게 Date 포맷 변환 (YYYY-MM-DDTHH:MM)
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

    // 4. FullCalendar 초기화 및 연동
    const calendarEl = document.getElementById('calendar');
    if (calendarEl) {
        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            navLinks: true, // 날짜 클릭 시 일간 뷰 전환
            editable: false, // 달력 자체 드래그앤드롭 비활성 (더블클릭/클릭 상세 편집에 집중)
            dayMaxEvents: true, // 일정 초과 시 '+ 더보기' 표시
            
            // 일정 데이터 소스 바인딩
            events: async function(fetchInfo, successCallback, failureCallback) {
                try {
                    const response = await fetch(`/api/teams/${TEAM_ID}/schedules`);
                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        // FullCalendar 형식에 맞춰 바인딩
                        const fcEvents = result.schedules.map(item => ({
                            id: item.id,
                            title: item.title,
                            start: item.start,
                            end: item.end,
                            backgroundColor: item.color,
                            textColor: '#ffffff',
                            extendedProps: {
                                description: item.description,
                                created_by: item.created_by
                            }
                        }));
                        successCallback(fcEvents);
                    } else {
                        failureCallback(result.message);
                    }
                } catch (error) {
                    console.error('Error fetching schedules:', error);
                    failureCallback(error);
                }
            },

            // 일정 클릭 핸들러
            eventClick: function(info) {
                openScheduleModal('edit', info.event);
            }
        });

        // 렌더링
        calendarInstance.render();
        
        // 전역 객체 저장 (탭 전환 시 크기 갱신용)
        window.teamCalendar = calendarInstance;
    }

    // 5. 일정 추가 및 수정 폼 제출
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', async (e) => {
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

            // 시작 일시가 종료 일시보다 늦은지 검사
            if (new Date(start_time) > new Date(end_time)) {
                alert('종료 일시는 시작 일시보다 빠를 수 없습니다.');
                return;
            }

            const payload = {
                title,
                description,
                start_time,
                end_time,
                color: selectedColor
            };

            let url = `/api/teams/${TEAM_ID}/schedules/create`;
            if (scheduleId) {
                url = `/api/schedules/${scheduleId}/update`;
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
                    closeScheduleModal();
                    if (calendarInstance) {
                        calendarInstance.refetchEvents();
                    }
                } else {
                    alert(result.message || '일정 저장 실패');
                }
            } catch (error) {
                console.error('Save schedule error:', error);
                alert('서버 저장 도중 장애가 발생했습니다.');
            }
        });
    }

    // 6. 일정 삭제 처리
    if (deleteScheduleBtn) {
        deleteScheduleBtn.addEventListener('click', async () => {
            const scheduleId = document.getElementById('schedule-id').value;
            if (!scheduleId) return;

            if (confirm('이 일정을 삭제하시겠습니까?')) {
                try {
                    const response = await fetch(`/api/schedules/${scheduleId}/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const result = await response.json();
                    if (response.ok && result.success) {
                        closeScheduleModal();
                        if (calendarInstance) {
                            calendarInstance.refetchEvents();
                        }
                    } else {
                        alert(result.message || '일정 삭제 실패');
                    }
                } catch (error) {
                    console.error('Delete schedule error:', error);
                    alert('일정 삭제 통신 중 장애가 발생했습니다.');
                }
            }
        });
    }
});
