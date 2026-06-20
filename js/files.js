document.addEventListener('DOMContentLoaded', () => {
    console.log("files.js 로컬 버전 가동");

    // URL에서 team id 가져오기 (누락되었던 TEAM_ID 정의 추가)
    const urlParams = new URLSearchParams(window.location.search);
    const TEAM_ID = urlParams.get('id');

    if (!TEAM_ID) return;

    // 1. DOM 요소 수집
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');
    const fileListTbody = document.getElementById('file-list-tbody');

    const storageKey = `files_team_${TEAM_ID}`;

    // 2. 드롭존 클릭 및 드래그 앤 드롭 이벤트 처리
    if (dropzone && fileInput) {
        // 드롭존 클릭 시 실제 파일 입력창 열기
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });

        // 파일 선택 변경 감지
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files.length > 0) {
                handleFileUploads(files);
            }
        });

        // 드래그 관련 시각 효과 처리
        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
            }, false);
        });

        // 파일 드롭 감지
        dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleFileUploads(files);
            }
        });
    }

    // 3. 파일 순차 업로드 핸들러 (로컬 시뮬레이션 버전)
    function handleFileUploads(files) {
        // 임시 로딩 문구 노출
        if (fileListTbody) {
            fileListTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px 0;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-right: 10px; color: #4f46e5;"></i>
                        자료 업로드 중... 잠시만 기다려 주세요.
                    </td>
                </tr>
            `;
        }

        // 현재 가상 세션 유저 이름 가져오기
        let sessionUser = "이다경";
        if (typeof StorageDB !== 'undefined' && StorageDB.getCurrentSession()) {
            const session = StorageDB.getCurrentSession();
            sessionUser = session.displayName || session.name || "이다경";
        }

        // 로컬 스토리지 데이터 가져오기
        let localFiles = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // 1초 뒤 업로드 완료되는 것처럼 시뮬레이션
        setTimeout(() => {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                
                // 파일 크기 체크 (16MB 제한)
                if (file.size > 16 * 1024 * 1024) {
                    alert(`[${file.name}] 파일 크기가 16MB를 초과하여 업로드할 수 없습니다.`);
                    continue;
                }

                // 가상 파일 객체 생성하여 배열에 push
                const now = new Date();
                const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                
                localFiles.push({
                    id: Date.now().toString() + '_' + i,
                    original_name: file.name,
                    file_size: file.size,
                    uploader_name: sessionUser,
                    uploaded_at: formattedDate
                });
            }

            // 로컬 스토리지에 최종 저장
            localStorage.setItem(storageKey, JSON.stringify(localFiles));
            
            // 입력창 비우고 목록 리프레시
            if (fileInput) fileInput.value = '';
            loadFiles();
        }, 800);
    }

    // 4. 자료실 파일 목록 가져오기 (로컬 스토리지 기반)
    function loadFiles() {
        if (!fileListTbody) return;

        try {
            const localData = localStorage.getItem(storageKey);
            const files = localData ? JSON.parse(localData) : [];
            renderFiles(files);
        } catch (error) {
            console.error('Load Files Error:', error);
            fileListTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #ef4444; padding: 30px 0;">
                        <i class="fa-solid fa-triangle-exclamation"></i> 자료 목록을 불러오는 중 오류가 발생했습니다.
                    </td>
                </tr>
            `;
        }
    }

    // 파일 목록 동적 테이블 출력
    function renderFiles(files) {
        if (!files || files.length === 0) {
            fileListTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #64748b; padding: 60px 0;">
                        <i class="fa-regular fa-folder-open" style="font-size: 2.5rem; margin-bottom: 12px; display: block;"></i>
                        자료실이 비어 있습니다. PDF, PPT, 이미지 파일을 업로드해 보세요!
                    </td>
                </tr>
            `;
            return;
        }

        fileListTbody.innerHTML = '';
        files.forEach(file => {
            const tr = document.createElement('tr');
            
            // 확장자 파악 및 아이콘 할당
            const ext = file.original_name.split('.').pop().toLowerCase();
            let iconClass = 'fa-solid fa-file';
            let iconColor = '#64748b';
            
            if (ext === 'pdf') {
                iconClass = 'fa-solid fa-file-pdf';
                iconColor = '#ef4444';
            } else if (['ppt', 'pptx'].includes(ext)) {
                iconClass = 'fa-solid fa-file-powerpoint';
                iconColor = '#ea580c';
            } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
                iconClass = 'fa-solid fa-file-image';
                iconColor = '#16a34a';
            }

            tr.innerHTML = `
                <td style="padding: 12px 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.2rem;"></i>
                        <span style="font-weight: 500; word-break: break-all; color: #1e293b;">
                            ${escapeHTML(file.original_name)}
                        </span>
                    </div>
                </td>
                <td style="color: #64748b; font-size: 0.9rem; padding: 12px 8px;">
                    ${formatBytes(file.file_size)}
                </td>
                <td style="color: #64748b; font-size: 0.9rem; padding: 12px 8px;">
                    ${escapeHTML(file.uploader_name)}
                </td>
                <td style="color: #94a3b8; font-size: 0.85rem; padding: 12px 8px;">
                    ${file.uploaded_at}
                </td>
                <td style="text-align: center; padding: 12px 8px;">
                    <div style="display: inline-flex; gap: 8px;">
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" title="다운로드" onclick="alert('${escapeHTML(file.original_name)} 파일을 다운로드합니다. (정적 시뮬레이션)')">
                            <i class="fa-solid fa-download"></i>
                        </button>
                        <button class="btn btn-secondary delete-file-btn" data-id="${file.id}" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239,68,68,0.15);" title="삭제">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;

            // 삭제 버튼 바인딩
            tr.querySelector('.delete-file-btn').addEventListener('click', (e) => {
                const fileId = e.currentTarget.getAttribute('data-id');
                deleteFile(fileId);
            });

            fileListTbody.appendChild(tr);
        });
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // 5. 파일 삭제 처리 (로컬 스토리지 기반)
    function deleteFile(fileId) {
        if (confirm('이 파일을 자료실에서 영구적으로 삭제하시겠습니까?')) {
            let files = JSON.parse(localStorage.getItem(storageKey) || '[]');
            files = files.filter(f => String(f.id) !== String(fileId));
            localStorage.setItem(storageKey, JSON.stringify(files));
            loadFiles();
        }
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 초기 리스트 로드
    loadFiles();
    
    // 글로벌 함수 등록
    window.refreshTeamFiles = loadFiles;
});
