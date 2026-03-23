import { Editor } from '@editor/creator-api';

/**
 * Mẫu HTML Giao diện của Panel Message Manager
 */
export const template = `
<div class="message-manager-panel">
    <div class="toolbar">
        <ui-button class="start-record-btn">Bắt đầu ghi (Record)</ui-button>
        <ui-button class="stop-record-btn">Dừng ghi</ui-button>
        <ui-checkbox class="auto-save-checkbox">Tự động lưu</ui-checkbox>
    </div>
    
    <div class="message-list-container">
        <ui-section class="message-logs" header="Lịch sử Thông điệp (IPC Logs)">
            <!-- Nơi chứa các thông điệp sẽ được render tại đây -->
            <div id="logs-container"></div>
        </ui-section>
    </div>
</div>
`;

/**
 * File CSS (Style) cho UI Panel
 */
export const style = `
.message-manager-panel {
    display: flex;
    flex-direction: column;
    padding: 10px;
    height: 100%;
}
.toolbar {
    margin-bottom: 15px;
    display: flex;
    gap: 10px;
}
#logs-container {
    overflow-y: auto;
    max-height: 400px;
    background: #252525;
}
.log-item {
    font-family: monospace;
    border-bottom: 1px solid #333;
    padding: 4px;
}
`;

/**
 * Khai báo các biến selector ($) - Gắn các phần tử HTML để thao tác từ JS
 */
export const $ = {
    container: '.message-manager-panel',
    startBtn: '.start-record-btn',
    stopBtn: '.stop-record-btn',
    autoSaveCb: '.auto-save-checkbox',
    logsContainer: '#logs-container'
};

/**
 * Quản lý các hàm sự kiện (event handler) hoặc UI Logic bên trong Panel
 */
export const methods = {
    // 1. Gửi request sang 'browser.ts' để yêu cầu trạng thái hiện tại
    async fetchInitialState() {
        const state = await Editor.Message.request('messages', 'query-message-state');
        // Cập nhật giao diện theo trạng thái nhận được
        if (state.isRecording) {
            // VD: Ẩn/Hiện nút bấm...
        }
    },

    // 2. Hàm vẽ log tin nhắn mới lên màn hình
    renderNewLog(messageData: any) {
        if (!this.$.logsContainer) return;
        
        const logEl = document.createElement('div');
        logEl.className = 'log-item';
        logEl.textContent = `[${new Date().toLocaleTimeString()}] ${JSON.stringify(messageData)}`;
        this.$.logsContainer.appendChild(logEl);
        
        // Tự động cuộn xuống cùng
        this.$.logsContainer.scrollTop = this.$.logsContainer.scrollHeight;
    }
};

/**
 * Hàm Lifecycle được gọi ngay khi Panel UI "Default" được mở và render xong
 */
export function ready() {
    console.log('[Message Manager Panel] Đã sẵn sàng hiển thị (UI Ready)');

    // Lấy trạng thái từ main process (browser.ts / browser.ccc)
    this.methods.fetchInitialState();

    // -- ĐĂNG KÝ CÁC SỰ KIỆN NÚT BẤM (UI Events) --
    
    // Nút Bắt đầu ghi
    this.$.startBtn.addEventListener('confirm', () => {
        // Gửi lệnh lên Main Process yêu cầu bắt đầu ghi IPC
        Editor.Message.send('messages', 'start-record');
    });

    // Nút Dừng ghi
    this.$.stopBtn.addEventListener('confirm', () => {
        // Gửi lệnh lên Main Process yêu cầu ngưng ghi
        Editor.Message.send('messages', 'stop-record');
    });

    // -- LẮNG NGHE SỰ KIỆN BROADCAST TỪ MAIN PROCESS --
    // Giả sử cứ mỗi khi có 1 message mới chạy trong Cocos, main process broadcast sự kiện "new-ipc-message"
    Editor.Message.addBroadcastListener('messages:new-ipc-message', (messageData: any) => {
        this.methods.renderNewLog(messageData);
    });
}

/**
 * Hàm Lifecycle được gọi trước khi Panel UI chuẩn bị đóng (tắt tab)
 */
export function close() {
    console.log('[Message Manager Panel] Đã đóng');
    
    // Tháo gỡ các Event Listener cho sạch bộ nhớ (Memory Leak)
    Editor.Message.removeBroadcastListener('messages:new-ipc-message');
}
