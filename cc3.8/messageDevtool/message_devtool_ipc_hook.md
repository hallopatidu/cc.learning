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


# BROWSER CCC
# Phân tích Chức năng File `builtin\messages\dist\browser.ccc`

Dựa vào cấu trúc của extension **messages** (được định nghĩa trong `package.json`) và kiến trúc chung của phần mềm **Cocos Creator**, file `browser.ccc` đóng vai trò là thành phần cốt lõi với các chức năng chính sau:

---

### 1. Điểm neo chính (Main Entry) tại Main Process
* **Bản chất file:** Đuôi `.ccc` thực chất là mã nguồn JavaScript (`browser.js`) đã được Cocos biên dịch thành dạng **bytecode** (bằng *bytenode V8*) để tối ưu tốc độ nạp và bảo mật mã nguồn lõi.
* **Vai trò:** Hoạt động dưới dạng tiến trình chính (**Main Process / Backend**) của nền tảng Electron/Node.js để quản lý toàn bộ vòng đời của công cụ **Message Manager** (Trình quản lý giao tiếp thông điệp) trong Editor.

### 2. Bắt, Ghi chép và Quản lý Giao tiếp (IPC Monitoring)
Trình Editor của Cocos Creator sử dụng hệ thống **IPC (Inter-Process Communication)** để các extension tương tác với nhau thông qua `Editor.Message`. File `browser.ccc` thực hiện nhiệm vụ giám sát hệ thống này:

* **Ghi chép log:** Xử lý các lệnh `start-record` (Bắt đầu ghi hệ thống IPC) và `stop-record` (Dừng ghi) bằng cách gắn các Listener vào lõi phần mềm.
* **Lưu trữ:** Phụ trách tính năng tự động sao lưu lịch sử thông điệp khi được yêu cầu qua các hook `start-auto-save` và `stop-auto-save`.
* **Trạng thái:** Sử dụng hàm `queryMessageState` để trả về cho giao diện (UI) trạng thái hiện tại của hệ thống và số lượng message đã ghi nhận.

### 3. Quản lý việc Mở Giao diện (Panels)
Phần tử này kiểm soát việc liên kết các Menu trên thanh công cụ với giao diện người dùng (Renderer). Nó chứa các hàm `open` và `openDebug` để khởi tạo 2 bảng làm việc:

* **Default Panel (Message Manager):** Bảng hiển thị toàn bộ lịch sử các luồng message chạy ngầm trong phần mềm.
* **Debug Panel (Debug Message):** Bảng dành riêng cho việc debug thông điệp.

### 4. Cung cấp chức năng gửi thông điệp giả lập
Bên cạnh việc giám sát, `browser.ccc` còn đóng vai trò là một cổng cho phép nhà phát triển chủ động phát các xung IPC tùy chỉnh để kiểm thử Extension:

| Phương thức | Chức năng |
| :--- | :--- |
| **debug.broadcast** | Phát sự kiện diện rộng không cần phản hồi. |
| **debug.request** | Gửi yêu cầu bắt buộc và đợi kết quả (Promise). |
| **debug.send** | Gửi thông điệp đơn thuần đến một extension cụ thể. |
| **debug.reply** | Trả lời một thông điệp cụ thể. |

---

> **Tóm tắt:** > Tệp `browser.ccc` chính là "bộ não" của công cụ **Message Manager (Developer Tools)** trong Cocos Creator. Nó chạy dưới dạng tiến trình nền nhằm giám sát, thu thập lịch sử kết nối giữa các module và hiển thị lên UI để hỗ trợ việc sửa lỗi extension.

# Phân tích chức năng file `builtin\messages\dist\browser.ccc`

Dựa vào cấu trúc của extension **messages** (được định nghĩa trong `package.json`) và kiến trúc chung của phần mềm **Cocos Creator**, file `browser.ccc` có các chức năng hoạt động chính sau đây:

---

### 1. Điểm neo chính (Main Entry) tại Main Process
* **Bản chất file:** Đuôi `.ccc` thực chất là mã nguồn JavaScript (`browser.js`) đã được Cocos biên dịch thành dạng **bytecode** (sử dụng *bytenode V8*) nhằm tối ưu tốc độ nạp và mã hóa bảo mật lõi phần mềm.
* **Vai trò:** Hoạt động dưới dạng **tiến trình chính (Main Process / Backend)** trên nền tảng Electron/Node.js. Nó quản lý toàn bộ vòng đời của công cụ tích hợp sẵn mang tên **Message Manager** (Trình quản lý giao tiếp thông điệp) của Editor.

### 2. Bắt, Ghi chép và Quản lý Giao tiếp (IPC Monitoring)
Trình Editor của Cocos Creator sử dụng hệ thống **IPC (Inter-Process Communication)** để các extension tương tác với nhau thông qua `Editor.Message`. File `browser.ccc` đóng vai trò "giám sát" hệ thống này:

* **Ghi chép log:** Xử lý các lệnh `start-record` (Bắt đầu ghi hệ thống IPC) và `stop-record` (Dừng ghi) bằng cách gắn các Listener vào lõi phần mềm.
* **Lưu trữ:** Phụ trách tính năng tự động sao lưu lịch sử thông điệp khi được kích hoạt qua các hook `start-auto-save` và `stop-auto-save`.
* **Trạng thái:** Sử dụng hàm `queryMessageState` để phản hồi cho giao diện người dùng (UI) biết hệ thống đang ở trạng thái nào và đã ghi nhận bao nhiêu message.

### 3. Quản lý việc Mở Giao diện (Panels)
Thành phần này kiểm soát việc liên kết các Menu trên thanh công cụ với giao diện người dùng (Renderer). Nó chứa các hàm `open` và `openDebug` để khởi tạo hai cửa sổ làm việc:

* **Default Panel (Message Manager):** Bảng hiển thị toàn bộ lịch sử các luồng message chạy ngầm trong phần mềm.
* **Debug Panel (Debug Message):** Bảng dành riêng cho việc gỡ lỗi (debug) thông điệp.

### 4. Cung cấp chức năng gửi thông điệp giả lập
Bên cạnh việc lắng nghe, `browser.ccc` còn là một "cổng" cho phép nhà phát triển chủ động phát các xung IPC tùy chỉnh để kiểm thử Extension thông qua các phương thức:

| Phương thức | Mô tả chức năng |
| :--- | :--- |
| `debug.broadcast` | Phát sự kiện diện rộng, không yêu cầu phản hồi. |
| `debug.request` | Gửi yêu cầu bắt buộc và đợi kết quả trả về (**Promise**). |
| `debug.send` | Gửi thông điệp đơn thuần đến một extension cụ thể. |
| `debug.reply` | Phản hồi lại một thông điệp đang chờ. |

---

> **Tóm tắt:** > Tệp `browser.ccc` chính là **bộ não** của công cụ **Message Manager (Developer Tools)** trong Cocos Creator. Nó vận hành như một tiến trình nền để giám sát, thu thập mọi lịch sử giao tiếp giữa các module, đồng thời hiển thị chúng lên UI giúp nhà phát triển dễ dàng chẩn đoán và sửa lỗi extension.


# Phân tích Cấu trúc Extension: `browser.ts` vs `index.ts`

Trong kiến trúc của Cocos Creator Extension, sự phân chia giữa **Lõi (Backend)** và **Vỏ (Frontend)** được thể hiện rõ qua hai tệp tin chủ chốt sau:

--- SUMMARY -------

### 1. browser.ts (browser.ccc) - Tiến trình Hệ thống
* **Vai trò:** Chạy ẩn phía sau với quyền hạn cao nhất (**Node.js**).
* **Chức năng chính:** * Quản lý logic luồng dữ liệu toàn cục.
    * "Nghe lén" và bắt mọi thông điệp IPC (Inter-Process Communication) trong toàn bộ hệ thống Cocos Editor.
* **Ví dụ:** Khi nhận được tín hiệu yêu cầu ghi chép, tệp này sẽ trực tiếp can thiệp vào hệ thống để lưu trữ dữ liệu.

### 2. index.ts (index.ccc) - Giao diện Người dùng
* **Vai trò:** Là giao diện thẻ (**Tab UI**) được xây dựng bằng HTML/CSS/TypeScript.
* **Chức năng chính:** * Chịu trách nhiệm hiển thị các nút thao tác và bảng biểu cho người dùng.
    * Truyền tải chỉ thị từ người dùng xuống lớp xử lý bên dưới.
* **Luồng hoạt động:** Khi người dùng click nút **"Record"** trên Panel, `index.ts` sẽ thực thi câu lệnh:
    ```typescript
    Editor.Message.send('messages', 'start-record');
    ```
    Lệnh này gửi một tín hiệu chạy ngầm lên cho `browser.ts` để kích hoạt việc "bật ghi nhớ IPC".

---

Với kích thước file chỉ khoảng 1.1 KB (đã được nén mã hóa bytecode), 
builtin\messages\dist\record-message.ccc
 bản chất là một Helper Module (file tiện ích). Nó không xử lý cả hệ thống cồng kềnh như browser.ts, cũng không vẽ giao diện UI như index.ts.

Nhiệm vụ duy nhất của nó là Bao đóng dữ liệu (Data Structure / Store). Nó định nghĩa cấu trúc của một dòng log tin nhắn, cung cấp các hàm đẩy/xóa dữ liệu trên RAM, đồng thời phụ trách tính năng Ghi ra tệp 
.json
 vào phân vùng ổ cứng (nếu tính năng Auto-save đang bật).

Dưới đây là mã nguồn TypeScript quy chuẩn được tái tạo lại dựa trên chức năng của 
record-message.ccc
:

### Bảng so sánh nhanh

| Đặc điểm | browser.ts (The Core) | index.ts (The Shell) |
| :--- | :--- | :--- |
| **Môi trường** | Node.js (Main Process) | Renderer Process (UI) |
| **Quyền hạn** | Cao nhất, can thiệp hệ thống | Giới hạn trong Panel giao diện |
| **Công nghệ** | Logic xử lý ngầm | HTML, CSS, UI Components |
| **Mối quan hệ** | Là **Lõi** (Xử lý thực thi) | Là **Vỏ** (Hiển thị & Tương tác) |

> **Ghi chú:** Hiểu nôm na, `index.ts` là người đưa ra mệnh lệnh từ phía người dùng, còn `browser.ts` là người thực sự thực hiện công việc nặng nhọc phía sau hậu trường.


### Mối liên kết 3 file trong Extension "Messages" của Cocos:
**record-message.ts**: Đóng vai trò là Cơ Sở Dữ Liệu (Database / Store) lưu mọi thông tin dạng mảng (Array).
**browser.ts**: Đóng vai trò trung gian Xử lý Luồng (Controller) bắt (hook) các sự kiện trên Cocos Editor, và cứ mỗi lần bắt được một sự kiện, nó sẽ gọi hàm recordMessageStore.addMessageLog(...) để báo cho file số 1 lưu lại.
**panel/default/index.ts**: Đóng vai trò Giao Diện (Views/UI), nó sẽ gửi lệnh truy vấn lên file số 2. File 2 móc qua lấy chuỗi Array từ file 1, tống xuống lại giao diện và file số 3 sẽ vẽ (render) ra màn hình.