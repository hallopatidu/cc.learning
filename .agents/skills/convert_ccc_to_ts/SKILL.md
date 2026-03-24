---
name: Convert CCC to TS
description: Hướng dẫn các bước cho AI Agent để phân tích, decompile và chuyển đổi một file .ccc (JavaScript đã compile) thành file mã nguồn TypeScript (.ts) chuẩn xác.
---

# Mục đích
Trong môi trường Cocos Creator hoặc các extension liên quan, file `.ccc` thường chứa mã nguồn JavaScript đã được compile, bundle (bằng Rollup, SystemJS, Webpack) hoặc thậm chí bị minify từ mã nguồn TypeScript gốc. 
Kỹ năng này cung cấp một quy trình (workflow) tiêu chuẩn để các AI Agent có thể đọc, dịch ngược (decompile) và khôi phục lại mã nguồn của file `.ccc` về dạng TypeScript (`.ts`) ban đầu sao cho dễ đọc, dễ bảo trì và type-safe.

# Các bước thực hiện (Dành cho AI Agent)

Dưới đây là quy trình từng bước AI Agent cần tuân theo khi nhận được yêu cầu chuyển đổi từ file `.ccc` sang `.ts`:

## 1. Định vị và Đọc nội dung file `.ccc`
- Sử dụng các công cụ filesystem (ví dụ `view_file`) để đọc nội dung file `.ccc`.
- **Lưu ý**: Nếu file bị minify (gom hết vào 1 dòng) và quá khó đọc, hãy sử dụng `run_command` để định dạng lại mã nguồn bằng Prettier (`npx prettier --write <file>`) hoặc tự động format cấu trúc thụt lề trong memory trước khi phân tích.

## 2. Phân Tích Cấu Trúc Module
Hãy kiểm tra đoạn mã mở đầu và kết thúc của file để xác định format module:
- **SystemJS**: Đoạn mã thường được bọc trong `System.register(..., function(_export, _context) { ... })`. Trích xuất các dependency (các chuỗi import) và hàm khởi tạo.
- **CommonJS**: Cú pháp chứa `require("...")` và `module.exports = ...`.
- Nắm bắt những module nào đang được import và định hình để tái tạo lại các lệnh `import ... from ...` theo cú pháp ES Module (ES6).

## 3. Khôi Phục Cấu Trúc JavaScript Gốc
Dịch ngược lớp vỏ bọc do compiler sinh ra:
- Khôi phục lại các lệnh xuất (`_export("Biến", giá_trị)` hoặc `exports.Biến = ...`) thành cú pháp `export const` hoặc `export class`.
- Nhận diện các block ES6 Class bị biên dịch thành Function prototype và các helper như `__extends` hoặc `_inheritsLoose`. Cấu trúc lại chúng thành `class A extends B { ... }`.
- Nếu có mã async/await bị compile thành state machine (như đối tượng `regeneratorRuntime`), dịch ngược lại thành cách dùng `async` và `await` tự nhiên.

## 4. Bổ Sung TypeScript Types (Type Inference)
Đây là phần tinh túy nhất để tạo ra file `.ts` chất lượng:
- **Phục hồi Interface / Props**: Quan sát cách các object property được truy cập. (VD: nếu hàm gọi `obj.title` và `obj.size`, hãy định nghĩa `interface IObj { title: string, size: number }` và gán cho `obj`).
- **Chuẩn hóa biến**: Chuyển các khai báo `var` thành `let` hoặc `const` cho phù hợp với logic sử dụng trong toàn cục.
- **Định nghĩa kiểu trả về**: Thêm `: string`, `: number`, `: boolean`, hoặc type cụ thể cho các tham số và hàm (VD: `(): void`, `(): Promise<any>`). Nếu thật sự không thể suy luận được từ ngữ cảnh, dùng kiểu `any` hoặc `unknown` kèm theo một vài dòng comment.

## 5. Đặt Tên Lại Biến Obfuscate (De-obfuscate)
Trình đóng gói thường rút gọn tên biến thành `_c`, `_e`, `_temp`, v.v...
- Dựa vào ngữ cảnh để đổi tên biến cho có ý nghĩa thực tế (VD: Nếu `_c.width` xuất hiện, biến `_c` nên được đổi tên thành `rect` hoặc `layoutSize`). Việc này giúp mã nguồn sau khi decompile trở "sạch", người khác đọc hiểu ngay lập tức.

## 6. Lưu file `.ts` và Xác Minh Độc Lập
- Dùng `write_to_file` để lưu lại kết quả đã hoàn thiện dưới định dạng file `.ts` với thư mục và basename tương ứng (Ví dụ: `main.ccc` -> `main.ts`).
- Hãy chắc chắn bạn **tuyệt đối không thay đổi luồng hoạt động (logic tính toán cốt lõi)** của ứng dụng trừ khi phát hiện ra một lỗi quá rõ (như lỗi chính tả API). Mọi thay đổi logic đều bị cấm trong quá trình dịch ngược trừ khi user yêu cầu refactor.

# Tiêu chuẩn Hoàn Thành
- Dữ liệu ở tệp `.ts` luôn phải thụt lề chuẩn, dễ đọc.
- Không để sót lại System.register boilerplate và các mã polyfill.
- Toàn bộ source code đều đã được typed rõ ràng theo chuẩn TypeScript.
