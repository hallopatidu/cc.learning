import { Editor } from '@editor/creator-api';

/**
 * Trạng thái hiện tại của Trình quản lý tin nhắn (Message Manager)
 */
interface MessageState {
    isRecording: boolean;
    isAutoSave: boolean;
    recordedMessages: any[];
}

const state: MessageState = {
    isRecording: false,
    isAutoSave: false,
    recordedMessages: []
};

/**
 * Các hàm IPC Methods được đăng ký hoạt động trong package.json
 */
export const methods: { [key: string]: (...args: any[]) => any } = {
    
    // --- 1. Chức năng Ghi Lịch sử Thông Điệp (Record Messages) ---
    addListener() {
        console.log('[Message Manager] Đã bật chế độ lắng nghe thông điệp IPC');
        state.isRecording = true;
        // Thực tế lõi Editor sẽ gắn hooks (event listeners) vào hệ thống
    },

    removeListener() {
        console.log('[Message Manager] Đã tắt chế độ lắng nghe thông điệp IPC');
        state.isRecording = false;
        // Thực thi việc tháo gỡ (unhook) các hooks
    },

    // --- 2. Tính năng Lập lịch tự động lưu (Auto-save) ---
    startAutoSave() {
        state.isAutoSave = true;
        console.log('[Message Manager] Đang tự động lưu tiến trình...');
    },

    stopAutoSave() {
        state.isAutoSave = false;
        console.log('[Message Manager] Đã dừng tự động lưu tiến trình');
    },

    // --- 3. Mở Cửa sổ giao diện Panel ---
    open() {
        // Mở màn hình chính của Message Manager (gọi panel 'default')
        Editor.Panel.open('messages.default');
    },

    openDebug() {
        // Mở cửa sổ nhắn tin gỡ lỗi (gọi panel 'debug')
        Editor.Panel.open('messages.debug');
    },

    // --- 4. Cung cấp trạng thái cho Panel UI ---
    queryMessageState(): MessageState {
        // Trả về cho UI trạng thái hiện tại
        return state;
    },

    // --- 5. Debug Channel (Dùng để test việc gửi nhận trực tiếp từ Debug Panel) ---
    'debug.broadcast'(messageName: string, ...args: any[]) {
        // Gửi thông điệp broadcast (quảng bá cho tất cả)
        Editor.Message.broadcast(messageName, ...args);
    },

    async 'debug.request'(extensionName: string, messageName: string, ...args: any[]) {
        // Gửi một yêu cầu và chờ đợi phản hồi trả về (Promise)
        return await Editor.Message.request(extensionName, messageName, ...args);
    },

    'debug.send'(extensionName: string, messageName: string, ...args: any[]) {
        // Gửi thông điệp đơn chiều (fire-and-forget)
        Editor.Message.send(extensionName, messageName, ...args);
    },

    'debug.reply'(extensionName: string, messageName: string, ...args: any[]) {
        // Chức năng phản hồi thông điệp phục vụ cho test
    }
};

/**
 * Hàm khởi tạo (Lifecycle) được gọi một lần khi Extension bắt đầu chạy
 */
export function load() {
    console.log('[messages extension] Loaded successfully');
    // Thực hiện thiết lập file lưu trữ, load cấu hình cũ, v.v
}

/**
 * Hàm kết thúc (Lifecycle) được gọi khi Extension bị dừng, vô hiệu hóa
 */
export function unload() {
    console.log('[messages extension] Unloaded');
    // Đảm bảo dọn dẹp (clear) các listeners đã đăng ký
    if (state.isRecording) {
        methods.removeListener();
    }
    if (state.isAutoSave) {
        methods.stopAutoSave();
    }
}
