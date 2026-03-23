import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

// Định nghĩa khung cấu trúc chuẩn của một "Log Thông điệp IPC"
export interface IpcMessageLog {
    type: 'send' | 'request' | 'broadcast' | 'reply'; // Loại tín hiệu
    extension: string;                                // Tên Của Extension gửi đi
    message: string;                                  // Nội dung / Tên Hàm
    args: any[];                                      // Tham số truyền vào
    timestamp: number;                                // Dấu thời gian
}

/**
 * RecordMessageManager (Trình Quản Lý Bộ Đệm Tin Nhắn)
 */
class RecordMessageManager {
    // Mảng lưu trữ trên RAM (RAM buffer)
    private logs: IpcMessageLog[] = [];
    
    // Giới hạn chống tràn bộ nhớ (Memory Leak)
    private readonly MAX_LOGS = 1000;

    /**
     * Hàm nội bộ: Thêm một tin nhắn mới vào mảng lưu trữ
     */
    public addMessageLog(log: IpcMessageLog): void {
        this.logs.push(log);
        
        // Tự động đẩy log cũ nhất ra ngoài nếu hàng đợi quá tải
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift(); // remove thẻ index [0]
        }
    }

    /**
     * Hàm nội bộ: Lấy toàn bộ hàng đợi cho UI Panel hiển thị
     */
    public getAllLogs(): IpcMessageLog[] {
        return this.logs;
    }

    /**
     * Hàm nội bộ: Xóa sạch (Clear)
     */
    public clearAll(): void {
        this.logs = [];
    }

    /**
     * Tính năng "Auto-save": Kết xuất mảng dữ liệu RAM ra thành File JSON
     */
    public dumpToFile(projectPath: string): void {
        if (this.logs.length === 0) return;

        // Lưu giấu trong thư mục /temp/ (Temporary) của Dự án hiện tại
        const targetDir = join(projectPath, 'temp', 'ipc-messages-logs');
        
        // Tạo thư mục nếu chưa tồn tại
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }

        // Tên file đánh dấu thời gian (VD: message-logs-1736463...json)
        const filePath = join(targetDir, `message-logs-${Date.now()}.json`);
        
        try {
            // Ghi file định dạng JSON (Thụt lề 2 khoảng trắng để dev dễ đọc)
            writeFileSync(filePath, JSON.stringify(this.logs, null, 2), 'utf-8');
            console.log(`[Message Manager] Ghi log thành công sang vị trí: ${filePath}`);
        } catch (error) {
            console.error(`[Message Manager] Lỗi Auto-save: ${error}`);
        }
    }
}

// Xuất ra một Thể hiện Duy Nhất (Singleton Instance) để browser.ts tái sử dụng
export const recordMessageStore = new RecordMessageManager();
