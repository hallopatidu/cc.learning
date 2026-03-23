# Cơ Chế Hoạt Động Của Message DevTools Trong Cocos Creator 3

Message DevTools của Cocos Creator 3 sử dụng cơ chế tương tự "Hook" (hoặc Man-In-The-Middle) để chặn và phân tích các tin nhắn IPC chạy qua hệ thống `Editor.Message`. Quá trình này được chia làm các bước cốt lõi sau:

## 1. Gắn Listener Vào EventBus Cốt Lõi (`__eb__`)
Thay vì ghi đè các hàm API công khai, extension `messages` truy cập trực tiếp vào đối tượng Global `Editor` của tiến trình Main thông qua mô-đun `@electron/remote`.
Sau đó, nó tìm kiếm biến `__eb__` (đóng vai trò là EventBus nội bộ làm cầu nối trung tâm chuyên vận chuyển tất cả các IPC). DevTools sẽ gắn các Listener vào 4 luồng thao tác chính là: `request`, `reply`, `send` và `broadcast`.

```javascript
addListener() {
    var e = require("@electron/remote").getGlobal("Editor");
    
    // Bắt đầu cắm "chân nghe" vào 4 luồng thao tác message chính
    e.remote.Message.__eb__.on("request", methods.request);
    e.remote.Message.__eb__.on("reply", methods.reply);
    // ...tương tự với send và broadcast
}
```

## 2. Trích Xuất Dấu Vết Mã Nguồn (Call Stack) Và Đóng Gói
Mỗi khi một hệ thống/extension nào đó gọi `Editor.Message.request(...)`, nó sẽ triggers event `request` trên EventBus, từ đó kích hoạt hàm `methods.request` của DevTools. Lúc này DevTools sẽ thực hiện các thao tác tracking:

- **Chống Loop:** DevTools luôn tự loại trừ chính nó (bỏ qua các message được gửi ra từ extension `messages`) để không tự bắt các message log của chính mình tạo ra vòng lặp vô tận.
- **Trích Xuất Vết Gọi Hàm:** Mẹo ở đây là tạo ra đối tượng ảo `new Error("message")`, sau đó match `.stack` của nó để tìm ra chính xác dòng code gốc (source) nào đã thực hiện tác vụ gọi IPC này.
- **Tạo ID Theo Dõi:** DevTool tự sinh một `ID` để đánh dấu `request` packet này. Sau đó nó lưu gói dữ liệu tracking này (bao gồm payload, timestamp,...) vào một hàng đợi (Queue) nội bộ.

```javascript
request(e) {
    var s;
    // Bỏ qua các tín hiệu nội bộ của chính extension "messages" để khỏi bị lặp vòng lặp vô tận (infinite loop)
    if ("messages" !== e.name) {
        
        // 1. Tạo 1 cái Error ảo để lấy trích xuất call stack (Lấy dấu vết xem ai là kẻ gửi)
        s = new Error("message").stack.match(/\(.*\\)/g);
        
        // 2. Wrap toàn bộ dữ liệu (tên người gửi, lúc mấy giờ, kiểu gửi, payload arguments là gì...)
        let packet = {
            process: "renderer",
            type: "request",
            name: e.name,        // Tên package nhận
            message: e.message,  // Tên message
            source: s[4],        // Lấy trace từ call stack đã truy xuất ở trên
            timestamp: Date.now(),
            time: 0,
            args: e.args,
            id: id++             // Tự sinh ID để sau này tracking được với gói tin "reply" (phản hồi)
        };
        e.id = packet.id;
        requestQueue.push(packet); // Lưu vào hàng đợi để chờ gói reply

        // 3. Nó gửi chính cái cục thông tin theo dõi này lại cho Window UI Message Devtool của nó để vẽ lên bảng
        Editor.Message.send("messages", "request", packet);
    }
}

```

## 3. Ghép Cặp Request/Reply Để Tính Toán Thời Gian
Đối với các sự kiện có phản hồi như `request` -> `reply`:
1. DevTools lưu gói gửi đi (request) kèm ID và thời gian bắt đầu (timestamp) vào bộ đệm `requestQueue`.
2. Khi tiến trình xử lý xong và gọi `reply`, `__eb__` lại báo cho DevTools biết.
3. Cùng với `ID` thu được, DevTools tìm lại request cũ trong hàng đợi. Nhờ đó nó tính được thời gian xử lý: `time: Date.now() - old_timestamp`.

## 4. Giao Tiếp Với Giao Diện Người Dùng (UI)
Sau khi đóng gói hoàn chỉnh dữ liệu bao gồm cả Call Stack, Thời gian chờ trễ, Tên gọi..., chính DevTools lại gọi hàm `Editor.Message.send("messages", "request", packet)` để gửi chuỗi dữ liệu tracking này lên màn hình UI của nó đang được render trên giao diện Editor (panel của devtool) để render thành bảng thông số.
