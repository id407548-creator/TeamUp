document.addEventListener('DOMContentLoaded', () => {
    // 1. DOM 요소 수집
    const dropzone = document.getElementById('file-dropzone');
    const fileInput = document.getElementById('file-input');
    const fileListTbody = document.getElementById('file-list-tbody');

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

    // 3. 파일 순차 업로드 핸들러
    async function handleFileUploads(files) {
        // 임시 로딩 문구 노출
        if (fileListTbody) {
            fileListTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px 0;">
                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 1.5rem; margin-right: 10px; color: var(--secondary);"></i>
                        자료 업로드 중... 잠시만 기다려 주세요.
                    </td>
                </tr>
            `;
        }

        // 다중 파일 업로드 루프
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            
            // 파일 크기 체크 (16MB 제한)
            if (file.size > 16 * 1024 * 1024) {
                alert(`[${file.name}] 파일 크기가 16MB를 초과하여 업로드할 수 없습니다.`);
                continue;
            }

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`/api/teams/${TEAM_ID}/files/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (!response.ok || !result.success) {
                    alert(`[${file.name}] 업로드 실패: ${result.message || '알 수 없는 오류'}`);
                }
            } catch (error) {
                console.error('File Upload Error:', error);
                alert(`[${file.name}] 업로드 도중 네트워크 통신 장애가 발생했습니다.`);
            }
        }

        // 업로드 끝난 후 입력 비우고 목록 리프레시
        fileInput.value = '';
        loadFiles();
    }

    // 4. 자료실 파일 목록 가져오기
    async function loadFiles() {
        if (!fileListTbody) return;

        try {
            const response = await fetch(`/api/teams/${TEAM_ID}/files`);
            const result = await response.json();

            if (response.ok && result.success) {
                renderFiles(result.files);
            } else {
                fileListTbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; color: var(--danger); padding: 30px 0;">
                            <i class="fa-solid fa-triangle-exclamation"></i> ${result.message || '자료 목록 조회 실패'}
                        </td>
                    </tr>
                `;
            }
        } catch (error) {
            console.error('Load Files Error:', error);
            fileListTbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--danger); padding: 30px 0;">
                        <i class="fa-solid fa-triangle-exclamation"></i> 서버 통신 장애가 발생했습니다.
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
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 60px 0;">
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
            
            // 확장자 파악 및 적절한 아이콘 클래스 할당
            const ext = file.original_name.split('.').pop().toLowerCase();
            let iconClass = 'fa-solid fa-file file-icon';
            
            if (ext === 'pdf') {
                iconClass = 'fa-solid fa-file-pdf file-icon pdf';
            } else if (['ppt', 'pptx'].includes(ext)) {
                iconClass = 'fa-solid fa-file-powerpoint file-icon ppt';
            } else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
                iconClass = 'fa-solid fa-file-image file-icon image';
            }

            // 파일 정보 행 렌더링
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center;">
                        <i class="${iconClass}"></i>
                        <span style="font-weight: 500; word-break: break-all; color: var(--text-primary);">
                            ${escapeHTML(file.original_name)}
                        </span>
                    </div>
                </td>
                <td style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${formatBytes(file.file_size)}
                </td>
                <td style="color: var(--text-secondary); font-size: 0.9rem;">
                    ${escapeHTML(file.uploader_name)}
                </td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">
                    ${file.uploaded_at}
                </td>
                <td style="text-align: center;">
                    <div style="display: inline-flex; gap: 8px;">
                        <!-- 다운로드 버튼 -->
                        <a href="/api/files/${file.id}/download" class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" title="다운로드">
                            <i class="fa-solid fa-download"></i>
                        </a>
                        <!-- 삭제 버튼 -->
                        <button class="btn btn-secondary delete-file-btn" data-id="${file.id}" style="padding: 6px 12px; font-size: 0.8rem; color: var(--danger); border-color: rgba(239,68,68,0.15);" title="삭제">
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

    // 파일 용량 가독성 개선 함수 (Bytes -> KB, MB)
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // 5. 파일 삭제 통신 처리
    async function deleteFile(fileId) {
        if (confirm('이 파일을 자료실에서 영구적으로 삭제하시겠습니까? (서버 원본 파일도 완전히 삭제됩니다)')) {
            try {
                const response = await fetch(`/api/files/${fileId}/delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                if (response.ok && result.success) {
                    loadFiles();
                } else {
                    alert(result.message || '파일 삭제에 실패했습니다.');
                }
            } catch (error) {
                console.error('Delete File Error:', error);
                alert('파일 삭제 처리 중 장애가 발생했습니다.');
            }
        }
    }

    // HTML 이스케이프 헬퍼
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 자료 공유 탭으로 스위칭 시에도 수동 트리거를 통해 목록 갱신 가능하게 하기 위해 초기 실행
    loadFiles();
    
    // 글로벌 함수 등록 (schedules와 유사하게 탭 스위칭 리드용)
    window.refreshTeamFiles = loadFiles;
});
