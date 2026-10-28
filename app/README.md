# SmartFlood: ứng dụng điện thoại

App điện thoại của đề tài **"SMARTFLOOD – Hệ thống IoT giám sát, cảnh báo sớm và hỗ trợ định tuyến tránh ngập đô thị"**.

App lấy dữ liệu từ **backend SmartFlood mới** (thư mục `smartflood-backend` nằm cạnh thư mục app, xem README của backend). Mỗi node đo ngập gửi dữ liệu qua LoRa → gateway → MQTT lên backend; backend lưu lại và đẩy xuống app. **App không cần tài khoản**: mở lên là dùng. App làm các chức năng trong tài liệu `SmartFlood_App_Requirements.pdf` (FR-01 → FR-15), riêng phần đăng nhập đã bỏ theo yêu cầu mới. **Màn Bản đồ là màn chính: mở app là thấy ngay tình hình ngập quanh mình.** App chạy được trên **điện thoại** (qua app Expo Go) và trên **laptop** (qua trình duyệt, xem mục 2 phần cuối).

```
Node đo ngập ──LoRa──▶ Gateway ──MQTT──▶ Backend SmartFlood ──API + Socket.IO──▶ App (đây)
 (mực nước ngập, mưa,               (đổi đơn vị, lưu PostgreSQL,         (Quanh bạn, bản đồ,
  triều, nhiệt độ)                   tính mức ngập, đường ngập,          cảnh báo, tuyến đường)
                                     kiểm tra tuyến)
```

**Trạm thật hiện có:** A01, A02. Mỗi lần đo trạm gửi: mực nước ngập (mm), lượng mưa (mm), cường độ mưa (mm/giây), thủy triều (m), nhiệt độ (°C), giờ đo. Backend đổi đơn vị rồi gửi xuống app; app hiện **mực nước ngập (cm)**, **lượng mưa (mm)**, **cường độ mưa (mm/h)**, **thủy triều (m)**, **nhiệt độ**. Trạm **chưa gửi dự đoán**, nên phần dự đoán / công thức ghi "Trạm chưa có dự đoán" (sẽ bổ sung sau).

---

## Mục lục

1. [App có gì](#1-app-có-gì)
2. [Cài đặt và chạy app từng bước](#2-cài-đặt-và-chạy-app-từng-bước)
   - [Không có điện thoại: chạy trên laptop bằng trình duyệt](#không-có-điện-thoại-chạy-trên-laptop-bằng-trình-duyệt)
3. [Chế độ DEMO (khi thuyết trình)](#3-chế-độ-demo-khi-thuyết-trình)
4. [Cây thư mục](#4-cây-thư-mục)
5. [Dữ liệu chạy trong app như thế nào](#5-dữ-liệu-chạy-trong-app-như-thế-nào)
6. [Quy tắc viết code của dự án](#6-quy-tắc-viết-code-của-dự-án)
7. [Muốn sửa X thì mở file nào](#7-muốn-sửa-x-thì-mở-file-nào)
8. [Đối chiếu tài liệu yêu cầu (FR-01 → FR-15)](#8-đối-chiếu-tài-liệu-yêu-cầu)
9. [Giới hạn hiện tại](#9-giới-hạn-hiện-tại)
10. [Lỗi thường gặp](#10-lỗi-thường-gặp)
11. [Kiểm tra trước buổi thuyết trình](#11-kiểm-tra-trước-buổi-thuyết-trình)

---

## 1. App có gì

| Tab / màn | Làm được gì |
|---|---|
| **◉ Bản đồ** (màn chính) | **Mở lên là thấy ngập quanh bạn:** bản đồ zoom vào vị trí của bạn, vẽ **vòng 2 km**; đoạn đường nào trong vòng đang ngập thì **tô màu theo mức ngập**. Thẻ **"Quanh bạn"** ở đáy cho biết có ngập gần bạn không, các điểm ngập gần nhất, cách bao xa, tên đường bị ngập. Trạm ngoài 2 km vẫn hiện nhưng mờ. **Chạm giữ** (laptop: chuột phải) lên bản đồ để xem ngập quanh điểm khác; nút **◎** quay về vị trí của bạn. Có bộ lọc trạm, chú giải, nút **⇄** kiểm tra tuyến đường. |
| **⌂ Tổng quan** | Tóm tắt toàn hệ thống. Chọn một trạm để xem độ ngập, mức ngập, kết nối và các thông số trạm gửi (mưa, triều, nhiệt độ...). |
| **! Cảnh báo** | Các trạm đang từ mức Cảnh báo trở lên, và các lần trạm tăng mức ngập nhận được trong lần mở app này. |
| **≡ Trạm** | Danh sách trạm: tìm theo tên (gõ không dấu cũng được), lọc, sắp xếp theo độ ngập, cập nhật mới nhất hoặc khoảng cách. |
| **⚙ Cài đặt** | Bật/tắt thông báo, trạng thái quyền thông báo, các trạm đang theo dõi (lưu trên máy), địa chỉ máy chủ. |
| Chi tiết trạm | Độ ngập, **thông số đo** (lượng mưa, cường độ mưa, thủy triều, nhiệt độ — chỉ hiện thông số trạm có gửi), biểu đồ lịch sử 1 giờ / 24 giờ / 7 ngày kèm nút **Xuất CSV** (laptop: tải file về; điện thoại: mở bảng Chia sẻ), dự đoán và **công thức dự đoán riêng của trạm** (hiện "Trạm chưa có dự đoán" khi trạm chưa gửi), vị trí, nút theo dõi. |
| Giới thiệu | Chỉ hiện ở lần mở đầu tiên. |

Các quy tắc an toàn app tuân theo (lấy từ tài liệu yêu cầu, mục 2.2):

- **Trạm mất kết nối ≠ khu vực an toàn.** Trạm offline hiện màu xám, ghi "dữ liệu cũ" và không vẽ vòng tròn ngập.
- **Thiếu số đo thì ghi "Chưa có dữ liệu", không bao giờ thay bằng 0.**
- **Không chỉ dùng màu để báo mức.** Mỗi mức có thêm ký hiệu (● ▲ ◆ ■) và chữ, để người không phân biệt được màu vẫn đọc được.
- **Không đủ dữ liệu thì nói là không đủ.** Quanh bạn không có trạm nào đang hoạt động thì thẻ "Quanh bạn" ghi **"Chưa đủ dữ liệu"**, không bao giờ ghi "an toàn".
- **Đường tô màu là ước lượng.** Node chỉ đo được 1 điểm; app tô các đoạn đường nằm trong vùng ảnh hưởng quanh node đang ngập (100–300 m tùy mức) và ghi rõ là ước lượng.
- **Trạm không gửi thông số nào thì app ẩn thông số đó** (vd A01, A02 không gửi độ ẩm → không có ô độ ẩm), thay vì hiện cả loạt ô "Chưa có dữ liệu".
- **Số liệu chỉ để tham khảo**, không thay thế cảnh báo và hướng dẫn của cơ quan chức năng (ghi ở màn Giới thiệu và Cài đặt).
- **Không tự bịa dự đoán.** Trạm chưa gửi dự đoán thì app ghi "Trạm chưa có dự đoán"; khi có, app ghi rõ phiên bản công thức.
- **Kiểm tra tuyến đường:** nếu gần tuyến có trạm mất kết nối, app ghi **"Chưa đủ dữ liệu đánh giá"** và không kết luận tuyến an toàn.

---

## 2. Cài đặt và chạy app từng bước

> 💻 **Chỉ có laptop, không có điện thoại?** Làm Bước 0 → 4, rồi nhảy xuống phần [Không có điện thoại: chạy trên laptop bằng trình duyệt](#không-có-điện-thoại-chạy-trên-laptop-bằng-trình-duyệt).

Làm lần lượt từ trên xuống. Mỗi bước có ghi **thế nào là thành công**: đúng như vậy thì làm bước tiếp, khác đi thì xem dòng "Nếu lỗi" ngay bên dưới.

Lệnh `npm` và `npx` thì máy nào gõ cũng y hệt nhau. Chỗ nào khác giữa các hệ điều hành thì có ghi riêng: **🪟 Windows** và **🍎 macOS / 🐧 Linux**.

**Cần chuẩn bị:**
- Máy tính Windows, macOS hoặc Linux có mạng.
- Điện thoại Android hoặc iPhone.
- (Nên có) **VS Code** để mở và sửa code: tải ở code.visualstudio.com.

### Bước 0. Mở cửa sổ gõ lệnh (terminal)

- 🪟 **Windows:** bấm phím **Windows**, gõ `PowerShell`, rồi Enter.
- 🍎 **macOS:** bấm **⌘ Cmd + Space**, gõ `Terminal`, rồi Enter.
- 🐧 **Linux:** bấm **Ctrl + Alt + T** (Ubuntu), hoặc mở app **Terminal**.

Mọi lệnh bên dưới đều gõ vào cửa sổ này; gõ xong một lệnh thì bấm Enter.

> Nếu dùng VS Code: menu **Terminal → New Terminal** là ra cửa sổ gõ lệnh ngay trong VS Code, máy nào cũng giống nhau.

### Bước 1. Kiểm tra / cài Node.js

```bash
node -v
```

| Kết quả | Làm gì |
|---|---|
| `v24.x.x` (hoặc `v22.13` trở lên, hoặc `v26.x.x`) | ✅ Đúng rồi, sang **Bước 2** |
| Báo lỗi `node is not recognized` / `command not found: node` | Máy chưa có Node, cài theo hướng dẫn của máy mình bên dưới |
| Ra bản số lẻ như `v23...`, `v25...` | Bản này Expo không hỗ trợ: **gỡ hoặc đổi bản** theo hướng dẫn bên dưới |

#### 🪟 Windows

Làm hoàn toàn bằng chuột, máy Windows nào cũng làm được.

**1. Gỡ Node cũ** (chỉ làm khi `node -v` ra bản số lẻ như `v25`; máy chưa có Node thì bỏ qua):

1. Bấm phím **Windows**, gõ `Add or remove programs` (máy tiếng Việt: `Thêm hoặc loại bỏ chương trình`), Enter.
2. Trong ô tìm kiếm gõ `Node.js` → bấm **⋯** hoặc bấm vào dòng Node.js → **Uninstall** → xác nhận.
3. Không thấy Node.js trong danh sách thì gõ lệnh này vào PowerShell để xem Node đang nằm ở đâu:
   ```powershell
   (Get-Command node).Source
   ```
   - Ra `C:\Program Files\nodejs\node.exe`: thử tìm Node.js trong **Control Panel → Programs and Features** rồi gỡ ở đó.
   - Ra đường dẫn khác (có chữ `scoop`, `chocolatey`, `nvm`...): Node được cài bằng công cụ khác, nhờ anh Khoa gỡ giúp.

**2. Cài Node 24 LTS:**

1. Mở trình duyệt vào **nodejs.org**.
2. Bấm nút có chữ **LTS** (bản 24.x hoặc 26.x đều được) để tải file `.msi`. Nếu trang hiện nhiều lựa chọn thì chọn **Windows Installer (.msi)**, bản **x64** (máy chip ARM thì chọn ARM64).
3. Mở file vừa tải → bấm **Next** liên tục, giữ nguyên các lựa chọn mặc định → **Install** → nếu Windows hỏi quyền thì bấm **Yes** → **Finish**.
   - Màn hình có ô *"Automatically install the necessary tools..."* thì **để trống, không cần tích**.

> ⚠️ Bộ cài báo *"A later version of Node.js is already installed"* nghĩa là **chưa gỡ bản cũ**: làm lại phần 1 rồi cài lại.

> Máy có sẵn lệnh `winget` thì có thể thay 2 phần trên bằng lệnh `winget uninstall OpenJS.NodeJS` rồi `winget install OpenJS.NodeJS.LTS`. Gõ `winget` mà báo `not recognized` thì cứ làm bằng chuột như trên.

#### 🍎 macOS

**Cách dễ nhất:** vào **nodejs.org**, bấm nút **LTS** để tải file `.pkg`, mở ra rồi bấm Continue liên tục. Bản mới sẽ ghi đè bản cũ, không cần gỡ trước.

> Nếu trước đây cài Node bằng Homebrew (`brew install node`), gỡ đi trước để khỏi bị 2 bản giành nhau: `brew uninstall node`.

#### 🐧 Linux (và macOS nếu muốn đổi qua lại nhiều bản Node)

**Không dùng `sudo apt install nodejs`**: kho phần mềm của Ubuntu/Debian thường chỉ có bản Node rất cũ. Dùng **nvm** thì không cần `sudo` mà tự đổi được đúng phiên bản:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
Tắt terminal, mở lại, rồi gõ:
```bash
nvm install 24
nvm alias default 24
```

> Project có file `.nvmrc` ghi `24`. Sau này đứng trong thư mục project, chỉ cần gõ `nvm use` là nvm tự chuyển sang đúng bản.

⚠️ **Máy nào cũng vậy:** cài hoặc gỡ xong phải **tắt hẳn cửa sổ terminal rồi mở cửa sổ mới**, sau đó gõ lại `node -v` để kiểm tra. Cửa sổ cũ vẫn nhớ bản Node cũ.

### Bước 2. Đặt code vào đúng chỗ

Chép (hoặc giải nén) thư mục `smartflood-app` vào:

| Máy | Đặt ở đâu |
|---|---|
| 🪟 Windows | `D:\Projects\smartflood-app` (máy không có ổ D thì dùng `C:\code\smartflood-app`) |
| 🍎 macOS / 🐧 Linux | `~/Projects/smartflood-app` (`~` là thư mục cá nhân, ví dụ `/Users/ten-ban` hoặc `/home/ten-ban`) |

> ⚠️ **Không để code trong thư mục có bật đồng bộ:** OneDrive, Google Drive, Dropbox, và trên Mac là **iCloud Drive**. Mac có bật "Desktop & Documents" trên iCloud thì **Desktop và Documents cũng bị đồng bộ**. Phần mềm đồng bộ sẽ khóa file trong lúc `npm install` đang chạy, gây lỗi `EPERM`/`EBUSY`, và cố tải lên mây hàng chục nghìn file làm máy rất chậm.

Vào thư mục và kiểm tra:

🪟 **Windows**
```powershell
cd D:\Projects\smartflood-app
Get-ChildItem -Force
```

🍎🐧 **macOS / Linux**
```bash
cd ~/Projects/smartflood-app
ls -la
```

✅ **Thành công:** danh sách có `package.json`, `.npmrc`, `.nvmrc` và thư mục `src`.

> Trên macOS / Linux, file có dấu chấm ở đầu tên (như `.npmrc`) là **file ẩn**: lệnh `ls` thường và Finder không hiện. Dùng `ls -la` mới thấy. Trong Finder bấm **⌘ Cmd + Shift + .** để hiện file ẩn.

**Nếu thiếu `.npmrc`**, tạo lại bằng lệnh dưới đây. File này bắt npm dừng ngay khi máy dùng sai phiên bản Node.

🪟 **Windows**
```powershell
Set-Content -Path .npmrc -Value "engine-strict=true"
```

🍎🐧 **macOS / Linux**
```bash
echo "engine-strict=true" > .npmrc
```

### Bước 3. Cài thư viện (chỉ làm lần đầu, mất vài phút, cần mạng)

```bash
npm install
```

✅ **Thành công:** cuối cùng có dòng `added ... packages`.

- Có dòng `... vulnerabilities` là **bình thường**, cứ kệ nó. **Đừng chạy `npm audit fix --force`**: lệnh này đổi phiên bản thư viện và làm hỏng app.
- **Nếu lỗi `EBADENGINE`:** sai phiên bản Node, quay lại **Bước 1**. Đổi Node xong thì xóa thư mục `node_modules` rồi chạy lại `npm install`:
  - 🪟 `Remove-Item -Recurse -Force node_modules`
  - 🍎🐧 `rm -rf node_modules`
- **Nếu lỗi `EPERM` / `EBUSY`:** code đang nằm trong thư mục đồng bộ, hoặc bị phần mềm diệt virus khóa. Làm lại **Bước 2**, rồi chạy lại `npm install`.
- 🪟 **Nếu báo `running scripts is disabled on this system`:** Windows đang chặn chạy script. Gõ `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, chọn `Y`, rồi chạy lại `npm install`.
- 🍎🐧 **Nếu lỗi `EACCES` / `permission denied`:** **đừng thêm `sudo`** trước lệnh `npm`. Lỗi này thường do trước đây từng chạy `sudo npm` nên thư mục bị đổi chủ sở hữu. Gõ `sudo chown -R $(whoami) ~/.npm .` (đứng trong thư mục project), rồi chạy lại `npm install`.

### Bước 4. Kiểm tra code

```bash
npm run typecheck
```

✅ **Thành công:** chạy xong mà **không in ra dòng lỗi nào**.

### Bước 5. Chuẩn bị điện thoại

1. Cài app **Expo Go**, bản mới nhất:
   - 📱 **Android (Samsung, Xiaomi, Oppo...):** tải trên **CH Play (Google Play)**. **Galaxy Store** của Samsung không có Expo Go.
   - **iPhone:** tải trên **App Store**.
2. Cho điện thoại **bắt chung một mạng Wi-Fi** với máy tính.
   - 📱 **Samsung:** nếu Wi-Fi đó không có Internet, máy có thể tự chuyển sang 4G làm mất kết nối với máy tính. Vào **Cài đặt → Kết nối → Wi-Fi → ⋮ → Thông minh / Intelligent Wi-Fi**, tắt **Chuyển sang dữ liệu di động** (Switch to mobile data).

### Bước 6. Đăng nhập tài khoản Expo (bắt buộc nếu dùng iPhone)

Expo Go trên **iPhone** chỉ mở được app khi **máy tính và Expo Go cùng đăng nhập một tài khoản Expo**. Thiếu bước này thì iPhone báo *"You need to be signed in to Expo Go and Expo CLI to open your project"*. **Android** hiện chưa bắt buộc (Expo đã báo sau này sẽ bắt buộc luôn), nên đăng nhập sẵn cho chắc. Trên Android: mở Expo Go → bấm **biểu tượng tài khoản ở góc trên bên phải** → **Log in**, làm y như iPhone.

> ⚠️ **Đừng nhầm 2 tài khoản:**
>
> | Tài khoản | Dùng để làm gì | Đăng nhập ở đâu |
> |---|---|---|
> | **Expo** (expo.dev) | Cho Expo Go mở được code của mình | Terminal trên máy tính (`npx expo login`) + app Expo Go |
> | ~~SmartFlood~~ | App SmartFlood **không còn đăng nhập**, mở lên là xem được | — |

**Làm theo đúng thứ tự: máy tính → iPhone → rồi mới chạy app.**

**6.1. Tạo tài khoản Expo** (chưa có thì làm): vào **expo.dev/signup**, đăng ký bằng email hoặc bấm **Continue with Google**. Cả nhóm có thể dùng chung một tài khoản của dự án.

**6.2. Đăng nhập trên máy tính** (mở terminal trong thư mục project):

🍎🐧 **macOS / Linux:** gõ `npx expo login` → trình duyệt tự mở → đăng nhập.

🪟 **Windows:** **không gõ `npx expo login` trơn.** Trên Windows, lệnh này cố tự mở trình duyệt rồi chết với lỗi `cmd.exe /c start ... exited with non-zero code: 1`. Chọn cách theo loại tài khoản:

**Cách A: tài khoản tạo bằng Google / GitHub** (không có mật khẩu Expo). Đã thử chạy được với tài khoản Gmail.
1. Gõ 2 lệnh, cửa sổ terminal **để nguyên đó, đừng tắt**:
   ```powershell
   $env:BROWSER = "none"
   npx expo login
   ```
   Dòng đầu chỉ có tác dụng trong cửa sổ PowerShell này: nó bảo Expo đừng tự mở trình duyệt.
2. Terminal in ra dòng *"If your browser doesn't automatically open, visit this link to log in: https://expo.dev/login?client_id=..."*.
3. **Bôi đen cả đường link** từ `https://` tới hết dòng → **chuột phải** để copy. **Đừng bấm Ctrl+C**: lỡ chưa bôi đen là nó tắt luôn lệnh đăng nhập đang chạy.
4. Dán link vào Chrome / Edge → bấm **Continue with Google** → chọn đúng Gmail.
5. Trình duyệt báo đăng nhập thành công, quay lại terminal thấy nó báo xong là được.

**Cách B: tài khoản có mật khẩu Expo.** Đăng nhập thẳng trong terminal:
```powershell
npx expo login --no-browser
```
Gõ username (hoặc email) và mật khẩu. Lúc gõ mật khẩu không hiện chữ là bình thường. Tài khoản có bật xác thực 2 lớp thì nó hỏi thêm mã OTP.

**Kiểm tra** (máy nào cũng vậy):
```bash
npx expo whoami       # in ra đúng tên tài khoản là được; "Not logged in" là chưa đăng nhập
```
Chỉ cần làm **một lần**, các lần sau máy tự nhớ. Muốn đổi tài khoản thì gõ `npx expo logout` rồi đăng nhập lại.

**6.3. Đăng nhập trên điện thoại (iPhone, nên làm luôn với Android):** mở Expo Go → bấm **biểu tượng tài khoản ở góc trên bên phải** → **Log in** → đăng nhập **đúng tài khoản ở bước 6.2** (tài khoản Gmail thì bấm Continue with Google).

✅ **Thành công:** `npx expo whoami` trên máy tính ra cùng tên với tài khoản đang hiện trong Expo Go.

- **Lỡ chạy `npx expo start` rồi mới đăng nhập:** khỏi tắt, cứ bấm **Try Again** trên iPhone.
- **iPhone báo *"...accounts need to match..."*:** máy tính và Expo Go đang đăng nhập 2 tài khoản khác nhau. Đăng nhập lại cho giống nhau, rồi `Ctrl+C` tắt và chạy lại `npx expo start`.

### Bước 7. Chạy app

**7a. Chọn máy chủ (làm 1 lần).** App cần biết backend nằm ở đâu. Tạo file `.env.local` trong thư mục app (cạnh `package.json`):

🪟 **Windows**
```powershell
Set-Content -Path .env.local -Value "EXPO_PUBLIC_API_BASE_URL=http://localhost:3000","EXPO_PUBLIC_DEMO_MODE=false"
```

🍎🐧 **macOS / Linux**
```bash
printf "EXPO_PUBLIC_API_BASE_URL=http://localhost:3000\nEXPO_PUBLIC_DEMO_MODE=false\n" > .env.local
```

Rồi mở file `.env.local` bằng VS Code, sửa dòng đầu cho đúng trường hợp của mình:

| Trường hợp | Ghi |
|---|---|
| Backend **chạy thử trên chính laptop này** (README backend, mục 2), mở app bằng **trình duyệt** | `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` |
| Backend chạy trên laptop, mở app trên **điện thoại** | `EXPO_PUBLIC_API_BASE_URL=http://<IP của laptop>:3000`, vd `http://192.168.1.15:3000`. Xem IP: 🪟 `ipconfig` → dòng *IPv4 Address*; 🍎 `ipconfig getifaddr en0`. Điện thoại và laptop phải chung Wi-Fi |
| Backend **anh mentor đã đưa lên máy chủ** | `EXPO_PUBLIC_API_BASE_URL=https://<địa chỉ anh mentor đưa>` |
| Không có mạng / không có backend | Đổi dòng 2 thành `EXPO_PUBLIC_DEMO_MODE=true` (xem mục 3) |

Không có file `.env.local` thì app tự dùng `http://localhost:3000`. Mỗi lần sửa file này phải tắt app (`Ctrl+C`) rồi chạy lại kèm `--clear`.

**7b. Chạy:**

```bash
npx expo start --clear
```

1. Lần đầu máy tính có thể hỏi cho phép kết nối mạng:
   - 🪟 **Windows:** hiện bảng Firewall → bấm **Allow access**.
   - 🍎 **macOS:** hỏi *"Do you want the application node to accept incoming network connections?"* → bấm **Allow**.
   - 🐧 **Linux:** thường không hỏi gì. Nếu máy bật tường lửa `ufw` mà điện thoại không vào được thì gõ `sudo ufw allow 8081/tcp`.
2. Cửa sổ terminal hiện một **mã QR**. Quét mã:
   - 📱 **Android / Samsung:** quét **bằng chính app Expo Go** (mở Expo Go → **Scan QR code** → cho phép dùng camera). **Đừng quét bằng camera Samsung hay Google Lens**: chúng hay mở link bằng trình duyệt thay vì Expo Go.
   - **iPhone:** mở app **Camera** quét mã, rồi bấm vào thông báo "Mở trong Expo Go".
3. Lần đầu phải chờ khoảng **30 giây – 1 phút** để app được tải về điện thoại.
4. Vào app sẽ thấy màn **Giới thiệu**: bấm **Bắt đầu**. Không cần đăng nhập.
5. Điện thoại hỏi quyền thì chọn như sau:
   - **Vị trí** (hỏi ngay khi vào Bản đồ, để xem ngập quanh bạn): chọn **Khi dùng ứng dụng / While using the app**, bật **Vị trí chính xác**. Từ chối thì app xem quanh trung tâm TP.HCM, vẫn dùng bình thường.
   - **Thông báo** (khi bật trong tab Cài đặt): chọn **Cho phép / Allow**.

✅ **Thành công:** thấy màn **Bản đồ** có vòng 2 km quanh vị trí của bạn và thẻ **"Quanh bạn"** ở đáy.

Trong lúc app đang chạy:
- **Sửa code rồi lưu** (Ctrl+S, trên Mac là ⌘ Cmd+S) là app trên điện thoại tự cập nhật.
- Trong cửa sổ terminal: bấm `r` để tải lại app, bấm `Ctrl+C` để tắt (trên Mac cũng là `Ctrl+C`, không phải ⌘).

### Bước 8. Quét QR mà điện thoại không vào được

Thường do điện thoại và máy tính khác mạng, mạng trường chặn, hoặc tường lửa chặn. Trên Android hay hiện màn hình đỏ *"Something went wrong"* hoặc *"Failed to connect to /192.168.x.x:8081"*, trên iPhone là *"The request timed out"*. Tắt bằng `Ctrl+C` rồi chạy:
```bash
npx expo start --tunnel
```
Lần đầu nó hỏi có cài `@expo/ngrok` không thì gõ `y`, Enter. Cách này chậm hơn một chút nhưng mạng nào cũng chạy được.

### Bước 9. Thử nhanh các chức năng chính

1. Mở app: bản đồ zoom vào chỗ mình đứng, có vòng 2 km; thẻ **"Quanh bạn"** báo có ngập gần đây không. Chưa có node thật gần mình thì chạy thêm `npm run fake-node -- --lat <vĩ độ> --lng <kinh độ>` bên backend (README backend, mục 2) để có node thử quanh mình.
2. Chạm 1 điểm ngập trong thẻ "Quanh bạn" → bản đồ bay tới trạm đó, thấy đoạn đường bị tô màu. Bấm **Xem chi tiết** → biểu đồ lịch sử, dự đoán, công thức riêng của trạm.
3. Chạm giữ một chỗ khác trên bản đồ → app xem ngập quanh chỗ đó. Bấm **◎** để quay về.
4. Bấm nút **⇄**, chạm giữ trên bản đồ để chọn điểm A, chạm giữ lần nữa chọn điểm B, rồi bấm **Kiểm tra tuyến**.

### Ghi chú riêng cho điện thoại Android / Samsung

| Việc | Cách làm trên Samsung (One UI) |
|---|---|
| Mở menu của Expo (Reload, tắt/bật chế độ debug...) | **Lắc điện thoại**, hoặc bấm `m` trong terminal trên máy tính |
| Cấp lại quyền vị trí / thông báo lỡ bấm "Từ chối" | **Cài đặt → Ứng dụng → Expo Go → Quyền** → **Vị trí**: "Chỉ cho phép khi dùng ứng dụng"; **Cài đặt → Ứng dụng → Expo Go → Thông báo** → bật |
| App ra nền một lúc là không còn nhận cảnh báo | Samsung hay "cho ngủ" app để tiết kiệm pin. **Cài đặt → Ứng dụng → Expo Go → Pin → Không hạn chế (Unrestricted)**. Kiểm tra thêm **Cài đặt → Chăm sóc thiết bị → Pin → Giới hạn sử dụng nền**: Expo Go **không** được nằm trong danh sách "Ứng dụng ngủ" / "Ứng dụng ngủ sâu" |
| Bản đồ trắng, không hiện đường phố | Bản đồ Android dùng Google Maps: kiểm tra điện thoại có mạng (4G hoặc Wi-Fi có Internet). Cập nhật **Dịch vụ Google Play** trong CH Play |
| Dùng hotspot của điện thoại cho máy tính bắt (khi Wi-Fi chặn) | **Cài đặt → Kết nối → Điểm truy cập di động và Chia sẻ kết nối → Điểm truy cập di động** → bật, rồi cho máy tính bắt Wi-Fi đó |

### Những lần sau

Không cần cài lại gì, chỉ cần vào thư mục project rồi chạy:

🪟 **Windows**
```powershell
cd D:\Projects\smartflood-app
npx expo start
```

🍎🐧 **macOS / Linux**
```bash
cd ~/Projects/smartflood-app
nvm use            # chỉ cần nếu cài Node bằng nvm
npx expo start
```

Chỉ chạy lại `npm install` khi file `package.json` thay đổi (ví dụ vừa thêm thư viện mới).

### Không có điện thoại: chạy trên laptop bằng trình duyệt

App chạy được ngay trên laptop bằng **Chrome / Edge**, có đủ **bản đồ thật** và **dữ liệu thật** (lấy từ backend đặt trong `.env.local`, Bước 7a). Không cần điện thoại, không cần tài khoản Expo.

1. Làm **Bước 0 → Bước 4** như trên, và **Bước 7a** (tạo `.env.local`). **Bỏ qua Bước 5, 6** (đó là bước cho điện thoại). Dùng backend chạy thử trên laptop thì nhớ bật backend trước (`npm run dev` trong thư mục backend).
2. Chạy:
   ```bash
   npm run web
   ```
   Lệnh này giống hệt `npx expo start --web`. Trình duyệt sẽ tự mở **http://localhost:8081**; không tự mở thì tự mở Chrome và gõ địa chỉ đó. Lần đầu chờ khoảng **30 giây**.
3. Màn **Giới thiệu** → **Bắt đầu**. Trình duyệt hỏi quyền vị trí thì bấm **Allow / Cho phép**.

✅ **Thành công:** thấy bản đồ có **đường phố**, **vòng 2 km** và **nhãn các trạm**. App hiện trong một cột rộng cỡ điện thoại ở giữa màn hình, đó là cố ý: app được thiết kế cho điện thoại.

⚠️ **Để nguyên cửa sổ terminal đang chạy `npm run web` trong suốt lúc dùng.** Backend mới cho trình duyệt gọi thẳng vào (đã bật CORS) nên không cần gì đứng giữa.

**Trên laptop khác điện thoại ở mấy chỗ:**

| Chức năng | Trên điện thoại | Trên laptop |
|---|---|---|
| Chọn điểm A / B khi kiểm tra tuyến, chọn điểm để xem ngập quanh đó | Chạm giữ trên bản đồ | **Bấm chuột phải** lên bản đồ |
| Bản đồ nền | Google Maps (Android) / Apple Maps (iPhone) | **OpenStreetMap**, cần Internet. Không có mạng thì nền xám nhưng nhãn trạm vẫn hiện |
| Vị trí của tôi (vòng 2 km, nút ◎) | GPS, chính xác | Trình duyệt **đoán qua Wi-Fi**, có thể lệch từ vài trăm mét tới vài km. Lệch quá thì chuột phải lên đúng chỗ mình để xem quanh đó |
| Thông báo khi trạm tăng mức ngập | Có thông báo của điện thoại + dải cảnh báo | **Chỉ có dải cảnh báo** trên đầu màn hình |

**Mẹo khi thuyết trình bằng laptop / máy chiếu:**
- Bấm **F11** để trình duyệt toàn màn hình; **Ctrl +** / **Ctrl −** để phóng to, thu nhỏ cho người ngồi xa dễ đọc.
- Mở sẵn app **trước khi lên trình bày**, để lỡ mạng chậm thì cũng không phải ngồi chờ.
- **DEMO trên laptop:** bật DEMO như **mục 3**, nhưng chạy `npx expo start --web --clear` thay cho `npx expo start --clear`.


---

## 3. Chế độ DEMO (khi thuyết trình)

Chế độ DEMO không cần mạng và không cần backend. App dùng dữ liệu mẫu trong `src/demo/` và hiện dải vàng **"CHẾ ĐỘ DEMO"** để không ai nhầm là số đo thật. Vị trí của bạn được giả lập ở gần Q.1 để thẻ "Quanh bạn" luôn có dữ liệu.

**Bật DEMO:** mở file `.env.local` (Bước 7a), sửa dòng `EXPO_PUBLIC_DEMO_MODE=false` thành `EXPO_PUBLIC_DEMO_MODE=true`, lưu lại. Tắt app (`Ctrl+C`) rồi chạy lại:

```bash
npx expo start --clear          # điện thoại
npx expo start --web --clear    # laptop
```

**Tắt DEMO**, quay về dữ liệu thật: sửa lại thành `EXPO_PUBLIC_DEMO_MODE=false`, rồi chạy lại y như trên.

> `--clear` bắt Expo đọc lại cấu hình. Thiếu nó thì app có thể vẫn giữ chế độ cũ.

Dữ liệu mẫu có sẵn đủ các tình huống để trình diễn:

| Trạm mẫu | Tình huống |
|---|---|
| Demo – Nguyễn Hữu Cảnh (Q.1) | **Rất nguy hiểm** (≈ 44 cm), độ ngập đổi mỗi 10 giây (giả lập realtime) |
| Demo – Tôn Đức Thắng (Q.1) | **Nguy hiểm** (27,5 cm) |
| Demo – Võ Văn Tần (Q.3) | **Cảnh báo** (12 cm) |
| Demo – Ung Văn Khiêm (Bình Thạnh) | **An toàn**. Sau 15 giây tăng lên **Cảnh báo** → hiện **dải cảnh báo** |
| Demo – Khánh Hội (Q.4) | **Mất kết nối 3 ngày**: màu xám, "dữ liệu cũ", không vẽ vùng ngập |
| Demo – Huỳnh Tấn Phát (Q.7) | **An toàn**, ngoài vòng 2 km nên mờ |
| Demo – Trạm mới | **Chưa có dữ liệu** |

Số đo mẫu giống gói tin thật của A01, A02 (mực nước, lượng mưa, cường độ mưa, triều, nhiệt độ), **không có dự đoán / công thức**, để demo hiện đúng như khi chạy thật.

Chế độ demo không có mạng nên **không có hình dạng đường**: chỗ ngập được vẽ bằng **vòng tròn vùng ảnh hưởng** thay cho tô màu đường (thẻ "Quanh bạn" có ghi chú điều này).

Gợi ý kịch bản demo (khoảng 2 phút):

1. Mở app: chỉ vào thẻ **"Quanh bạn"** — "Có ngập gần bạn", 3 điểm ngập, nặng nhất Rất nguy hiểm. Chỉ vào vòng 2 km và các trạm mờ bên ngoài.
2. Chạm điểm Nguyễn Hữu Cảnh trong thẻ → bay tới trạm → **Xem chi tiết** → độ ngập, thông số đo (mưa, cường độ mưa, triều, nhiệt độ), biểu đồ lịch sử (bấm Lượng mưa / Thủy triều để đổi thông số).
3. Chờ dải cảnh báo của trạm Bình Thạnh hiện lên, chạm vào để mở đúng trạm.
4. Quay về Bản đồ, bấm ⇄, chạm giữ để chọn điểm A, chạm giữ lần nữa để chọn điểm B, rồi bấm "Kiểm tra tuyến".
5. Chỉ vào trạm Q.4 màu xám và giải thích: "mất kết nối không có nghĩa là an toàn".

**Nhớ tắt DEMO** khi muốn dùng số liệu thật.

---

## 4. Cây thư mục

Nguyên tắc: **mỗi file làm đúng 1 việc, tên file nói luôn việc đó.** Không biết một chức năng nằm ở đâu thì tìm theo tên trong cây dưới đây.

Nhìn nhanh:

```
smartflood-app/
├── src/
│   ├── app/            MÀN HÌNH (mỗi file = 1 màn)
│   ├── components/     MẢNH GIAO DIỆN (nút, thẻ, bản đồ, biểu đồ...)
│   ├── state/          KHO DỮ LIỆU DÙNG CHUNG (trạm, realtime, theo dõi...)
│   ├── api/            GỌI MÁY CHỦ (mỗi file = 1 API)
│   ├── hooks/          hàm useXxx dùng lại
│   ├── utils/          hàm nhỏ: tính toán, định dạng
│   ├── types/          kiểu dữ liệu
│   ├── constants/      màu, nhãn
│   ├── config/         cấu hình
│   ├── notifications/  thông báo
│   ├── navigation/     chuyển màn
│   ├── storage/        lưu trên máy
│   └── demo/           dữ liệu mẫu
└── (các file cấu hình: package.json, app.json, metro.config.js...)
```

Đầy đủ:

```
smartflood-app/
├── assets/                                         # Biểu tượng app, ảnh màn hình chờ
├── src/                                            # TOÀN BỘ CODE CỦA APP
│   ├── api/                                        # NÓI CHUYỆN VỚI MÁY CHỦ — mỗi file gọi đúng 1 API
│   │   ├── mappers/                                # Đổi JSON của máy chủ sang kiểu dữ liệu của app
│   │   │   ├── toFloodLevel.ts                     # Chữ mức ngập của máy chủ → FloodLevel
│   │   │   ├── toLatLngList.ts                     # JSON dãy tọa độ → LatLng[]
│   │   │   ├── toNearbyFlooding.ts                 # JSON "Quanh bạn" → NearbyFlooding
│   │   │   ├── toRouteCheckResult.ts               # JSON kiểm tra tuyến → RouteCheckResult
│   │   │   ├── toSensorReading.ts                  # JSON 1 lần đo → SensorReading
│   │   │   ├── toStation.ts                        # JSON trạm → Station
│   │   │   └── toStationModel.ts                   # JSON 1 phiên bản công thức → StationModel
│   │   ├── nearby/                                 # Quanh bạn
│   │   │   └── getNearbyFlooding.ts                # ★ GET /api/v1/nearby — tình hình ngập quanh 1 vị trí ("Quanh bạn")
│   │   ├── realtime/                               # Realtime
│   │   │   └── connectRealtimeSocket.ts            # Kết nối Socket.IO, nhận sự kiện station:update
│   │   ├── route/                                  # Tuyến đường
│   │   │   └── checkRouteFloodRisk.ts              # POST /api/v1/route/check — kiểm tra tuyến đường
│   │   ├── sensor/                                 # Số đo cảm biến
│   │   │   └── getSensorHistory.ts                 # GET /api/v1/stations/:id/readings — lịch sử đo
│   │   ├── stations/                               # Trạm
│   │   │   ├── getStationList.ts                   # GET /api/v1/stations — danh sách trạm + tình trạng mới nhất
│   │   │   └── getStationModels.ts                 # GET /api/v1/stations/:id/models — các phiên bản công thức của trạm
│   │   ├── ApiError.ts                             # Kiểu lỗi khi máy chủ trả lỗi (có mã HTTP)
│   │   └── requestJson.ts                          # Hàm gọi máy chủ DUY NHẤT (hết giờ chờ, lỗi, chế độ demo)
│   ├── app/                                        # MÀN HÌNH — mỗi file là 1 màn, tên file = đường dẫn (Expo Router)
│   │   ├── (tabs)/                                 # 5 màn có thanh tab dưới đáy
│   │   │   ├── _layout.tsx                         # Thanh tab dưới đáy: Bản đồ | Tổng quan | Cảnh báo | Trạm | Cài đặt
│   │   │   ├── alerts.tsx                          # Màn CẢNH BÁO: trạm đang cảnh báo, cảnh báo mới nhận (FR-11)
│   │   │   ├── index.tsx                           # ★ Màn BẢN ĐỒ — màn chính: "Quanh bạn" 2 km, đường ngập, tuyến đường (FR-04, 13, 14)
│   │   │   ├── overview.tsx                        # Màn TỔNG QUAN: chọn trạm, độ ngập, dự đoán, thông số (FR-03)
│   │   │   ├── settings.tsx                        # Màn CÀI ĐẶT: thông báo, trạm theo dõi, thông tin app (FR-12)
│   │   │   └── stations.tsx                        # Màn DANH SÁCH TRẠM: tìm, lọc, sắp xếp (FR-05)
│   │   ├── station/                                # Màn chi tiết trạm (mở chồng lên trên tab)
│   │   │   └── [nodeId].tsx                        # Màn CHI TIẾT TRẠM: độ ngập, dự đoán, lịch sử, công thức, vị trí (FR-06/07/08)
│   │   ├── _layout.tsx                             # Khung gốc: bọc dữ liệu dùng chung, khai báo các màn, dải cảnh báo
│   │   └── onboarding.tsx                          # Màn GIỚI THIỆU lần đầu mở app (FR-01)
│   ├── components/                                 # MẢNH GIAO DIỆN tái sử dụng, chia theo chủ đề
│   │   ├── alerts/                                 # Cảnh báo
│   │   │   ├── RealtimeAlertBanner.tsx             # Dải cảnh báo đầu màn hình khi trạm tăng mức ngập
│   │   │   └── RealtimeAlertItem.tsx               # Một cảnh báo realtime trong màn Cảnh báo
│   │   ├── charts/                                 # Biểu đồ (vẽ bằng SVG)
│   │   │   └── HistoryLineChart.tsx                # Biểu đồ đường lịch sử, ngắt ở chỗ thiếu dữ liệu
│   │   ├── common/                                 # Mảnh dùng chung mọi nơi (nút, thẻ, trạng thái tải/lỗi/rỗng)
│   │   │   ├── AppButton.tsx                       # Nút bấm dùng chung (xanh / viền / đỏ, đang xử lý)
│   │   │   ├── Card.tsx                            # Khung thẻ trắng bo góc
│   │   │   ├── ChoiceChip.tsx                      # Nút lựa chọn dạng viên (bộ lọc, khoảng thời gian)
│   │   │   ├── DemoModeBanner.tsx                  # Dải vàng "CHẾ ĐỘ DEMO"
│   │   │   ├── EmptyView.tsx                       # Trạng thái RỖNG (không có dữ liệu / không có kết quả)
│   │   │   ├── ErrorView.tsx                       # Trạng thái LỖI + nút Thử lại
│   │   │   ├── LoadingView.tsx                     # Trạng thái ĐANG TẢI
│   │   │   ├── SectionTitle.tsx                    # Tiêu đề của một thẻ
│   │   │   ├── StaleDataWarning.tsx                # Dòng báo "không cập nhật được, đang hiện dữ liệu cũ"
│   │   │   ├── TextField.tsx                       # Ô nhập chữ có nhãn
│   │   │   └── WebPhoneFrame.tsx                   # Trên laptop: hiện app trong khung rộng như điện thoại
│   │   ├── forecast/                               # Dự đoán
│   │   │   └── NodePredictionCard.tsx              # Thẻ dự đoán ngập (trạm chưa gửi dự đoán → "Trạm chưa có dự đoán")
│   │   ├── map/                                    # ★ Mọi thứ trên màn Bản đồ (file .web.tsx = bản cho trình duyệt)
│   │   │   ├── FloodedRoadLines.tsx                # ★ Tô màu các đoạn đường bị ngập
│   │   │   ├── FloodedRoadLines.web.tsx            # Tô màu đường ngập trên bản đồ web
│   │   │   ├── FloodZoneCircle.tsx                 # Vòng vùng ảnh hưởng quanh trạm đang ngập
│   │   │   ├── FloodZoneCircle.web.tsx             # Vòng vùng ngập trên bản đồ web
│   │   │   ├── leafletMapStyles.css                # Giao diện của thư viện bản đồ Leaflet (bản web)
│   │   │   ├── MapFilterBar.tsx                    # Thanh lọc trạm trên bản đồ (kèm số lượng)
│   │   │   ├── MapLegend.tsx                       # Chú giải bản đồ
│   │   │   ├── MapRoundButton.tsx                  # Nút tròn nổi trên bản đồ (vị trí, tuyến, tải lại)
│   │   │   ├── NearbyRadiusCircle.tsx              # Vòng nét đứt 2 km "Quanh bạn"
│   │   │   ├── NearbyRadiusCircle.web.tsx          # Vòng 2 km trên bản đồ web
│   │   │   ├── NearbySummaryCard.tsx               # ★ Thẻ "Quanh bạn": có ngập gần bạn không, điểm ngập gần nhất
│   │   │   ├── RealtimeStatusPill.tsx              # Viên trạng thái realtime + số trạm có dữ liệu mới
│   │   │   ├── RouteCheckPanel.tsx                 # Khung kiểm tra tuyến: hướng dẫn từng bước + nút
│   │   │   ├── RouteCheckResultView.tsx            # Kết quả kiểm tra tuyến (có "Chưa đủ dữ liệu đánh giá")
│   │   │   ├── RouteLines.tsx                      # Vẽ tuyến chính (đỏ/xanh dương), tuyến tránh (xanh lá), điểm A/B
│   │   │   ├── RouteLines.web.tsx                  # Vẽ tuyến đường + điểm A/B trên bản đồ web
│   │   │   ├── StationInfoSheet.tsx                # Thẻ thông tin trạm ở đáy bản đồ khi chạm vào trạm
│   │   │   ├── StationMap.tsx                      # ★ Bản đồ điện thoại: vòng 2 km, đường ngập, vùng ảnh hưởng, trạm, tuyến
│   │   │   ├── StationMap.web.tsx                  # ★ Bản đồ trên trình duyệt (Leaflet + OpenStreetMap)
│   │   │   ├── StationMarker.tsx                   # Nhãn trạm trên bản đồ (màu + ký hiệu + độ ngập, mờ nếu ngoài 2 km)
│   │   │   ├── StationMarker.web.tsx               # Nhãn trạm trên bản đồ web (giống bản điện thoại)
│   │   │   ├── UserLocationDot.web.tsx             # Chấm xanh vị trí của tôi trên bản đồ web
│   │   │   └── WebMapController.web.tsx            # Nối bản đồ Leaflet với màn Bản đồ (bay tới, thu phóng, chuột phải)
│   │   ├── overview/                               # Màn Tổng quan
│   │   │   └── SystemSummaryCard.tsx               # Tóm tắt toàn hệ thống: số trạm theo từng mức
│   │   ├── settings/                               # Màn Cài đặt
│   │   │   └── FollowedStationRow.tsx              # 1 dòng trạm đang theo dõi trong màn Cài đặt
│   │   └── station/                                # Mảnh hiển thị thông tin một trạm
│   │       ├── ConnectionBadge.tsx                 # Nhãn kết nối: Online / Chậm / Offline
│   │       ├── FloodLevelBadge.tsx                 # Nhãn mức ngập (màu + ký hiệu + chữ)
│   │       ├── FollowButton.tsx                    # Nút Theo dõi / Bỏ theo dõi trạm
│   │       ├── LastUpdateText.tsx                  # Dòng "Cập nhật ... trước" / "Dữ liệu đã cũ"
│   │       ├── SensorHistoryCard.tsx               # Thẻ biểu đồ lịch sử 1 giờ / 24 giờ / 7 ngày + nút Xuất CSV (FR-07)
│   │       ├── SensorMetricsCard.tsx               # ★ Thẻ thông số đo: lượng mưa, cường độ mưa, triều, nhiệt độ... (chỉ hiện ô trạm có gửi)
│   │       ├── StationListItem.tsx                 # Một dòng trong danh sách trạm
│   │       ├── StationLocationCard.tsx             # Thẻ tọa độ + bán kính ảnh hưởng
│   │       ├── StationModelCard.tsx                # ★ Thẻ công thức dự đoán riêng của trạm + các phiên bản (trống nếu trạm chưa có)
│   │       ├── StationPickerBar.tsx                # Thanh chọn trạm cuộn ngang
│   │       └── WaterLevelCard.tsx                  # Thẻ độ ngập (chữ to nhất), 3 ngưỡng, mức ngập, kết nối
│   ├── config/                                     # Cấu hình — muốn chỉnh thông số thì vào đây
│   │   └── appConfig.ts                            # ★ Cấu hình chung: địa chỉ backend, demo, chu kỳ tải lại, bán kính 2 km
│   ├── constants/                                  # Hằng số: màu, nhãn, danh sách lựa chọn
│   │   ├── appColors.ts                            # Bảng màu chung của app
│   │   ├── connectionStateStyles.ts                # Màu, chữ của trạng thái kết nối
│   │   ├── floodLevelStyles.ts                     # Màu, ký hiệu, chữ của từng mức ngập
│   │   ├── historyRanges.ts                        # Các khoảng xem lịch sử: 1 giờ, 24 giờ, 7 ngày
│   │   ├── mapGestureText.ts                       # Chữ hướng dẫn chọn điểm: "chạm giữ" (điện thoại) / "bấm chuột phải" (laptop)
│   │   ├── modelVariables.ts                       # Ý nghĩa các biến trong công thức (H, V, T, RH, L...)
│   │   └── sensorMetrics.ts                        # ★ Danh sách thông số đo: tên, đơn vị, số chữ số lẻ
│   ├── demo/                                       # Dữ liệu mẫu cho CHẾ ĐỘ DEMO (không cần mạng)
│   │   ├── demoNearby.ts                           # "Quanh bạn" mẫu
│   │   ├── demoRouteCheck.ts                       # Kiểm tra tuyến mẫu
│   │   ├── demoSensorHistory.ts                    # Lịch sử đo mẫu (giống gói tin A01, A02)
│   │   ├── demoStations.ts                         # Trạm mẫu cho chế độ demo (số đo giống gói tin A01, A02)
│   │   ├── getDemoResponse.ts                      # "Máy chủ giả" cho chế độ demo
│   │   └── startDemoRealtime.ts                    # Giả lập realtime cho chế độ demo
│   ├── hooks/                                      # Hàm useXxx tái sử dụng
│   │   ├── useAutoRefresh.ts                       # Tải dữ liệu + tự tải lại định kỳ, không hiện nhầm dữ liệu trạm cũ
│   │   ├── useCurrentLocation.ts                   # Lấy vị trí hiện tại (có giới hạn 15 giây, báo rõ lý do nếu lỗi)
│   │   ├── useNearbyFlooding.ts                    # Tải "Quanh bạn", tự tải lại khi có dữ liệu mới
│   │   └── useShowOnboardingOnce.ts                # Lần đầu mở app → chuyển sang màn Giới thiệu
│   ├── navigation/                                 # Hàm chuyển màn dùng chung
│   │   ├── openStationDetail.ts                    # Mở màn chi tiết của một trạm
│   │   └── openStationOnMap.ts                     # Mở tab Bản đồ và bay tới một trạm
│   ├── notifications/                              # Thông báo trên điện thoại
│   │   ├── configureNotifications.ts               # Cấu hình cách hiện thông báo + kênh Android
│   │   ├── requestNotificationPermission.ts        # Xin quyền gửi thông báo
│   │   ├── showFloodAlertNotification.ts           # Hiện 1 thông báo cảnh báo ngập trên điện thoại
│   │   ├── useNotificationPermissionStatus.ts      # Đọc trạng thái quyền thông báo của hệ điều hành
│   │   └── useOpenStationFromNotification.ts       # Chạm thông báo → mở đúng trạm
│   ├── state/                                      # KHO DỮ LIỆU DÙNG CHUNG cho mọi màn (React Context)
│   │   ├── AppProviders.tsx                        # Gộp các kho dữ liệu dùng chung
│   │   ├── FavoritesProvider.tsx                   # Trạm đang theo dõi (lưu trên máy)
│   │   ├── NotificationSettingsProvider.tsx        # Kho CÀI ĐẶT THÔNG BÁO trên điện thoại
│   │   ├── RealtimeProvider.tsx                    # Nhận realtime, tạo cảnh báo khi trạm tăng mức ngập
│   │   └── StationsProvider.tsx                    # Danh sách trạm dùng chung (tải định kỳ + gộp realtime)
│   ├── storage/                                    # Lưu dữ liệu nhỏ trên điện thoại
│   │   └── onboardingStorage.ts                    # Ghi nhớ đã xem màn giới thiệu chưa
│   ├── types/                                      # Kiểu dữ liệu (TypeScript) — mỗi file 1 kiểu
│   │   ├── ConnectionState.ts                      # Kiểu dữ liệu: trạng thái kết nối
│   │   ├── FloodedRoad.ts                          # Kiểu 1 đoạn đường bị ngập
│   │   ├── FloodLevel.ts                           # Kiểu dữ liệu: mức ngập (normal → critical)
│   │   ├── FloodThresholds.ts                      # Kiểu 3 ngưỡng ngập
│   │   ├── LatLng.ts                               # Kiểu dữ liệu: một tọa độ
│   │   ├── NearbyFlooding.ts                       # Kiểu kết quả "Quanh bạn"
│   │   ├── RealtimeFloodEvent.ts                   # Kiểu 1 cảnh báo realtime
│   │   ├── RouteCheckResult.ts                     # Kiểu dữ liệu: kết quả kiểm tra tuyến
│   │   ├── SensorReading.ts                        # Kiểu 1 lần đo
│   │   ├── Station.ts                              # Kiểu 1 trạm
│   │   └── StationModel.ts                         # Kiểu 1 phiên bản công thức dự đoán
│   └── utils/                                      # Hàm tính toán / định dạng nhỏ — mỗi file 1 hàm
│       ├── circleBoundsPoints.ts                   # 4 điểm mép vòng tròn (để thu/phóng vừa vòng 2 km)
│       ├── describeLocationError.ts                # Đổi lỗi lấy vị trí thành câu dễ hiểu (vì sao + làm gì)
│       ├── describeNearbyCenter.ts                 # Câu mô tả đang xem quanh đâu
│       ├── distanceInMeters.ts                     # Khoảng cách giữa 2 tọa độ (m)
│       ├── distanceToRouteInMeters.ts              # Khoảng cách từ 1 điểm tới tuyến đường (m)
│       ├── filterStations.ts                       # Lọc trạm: tất cả / đang ngập / theo dõi / mất kết nối
│       ├── findUnreliableStationsNearRoute.ts      # Tìm trạm mất kết nối nằm gần tuyến đường
│       ├── floodLevelRank.ts                       # Thứ hạng mức ngập để so sánh
│       ├── formatClockTime.ts                      # Hiển thị giờ:phút (giờ Việt Nam)
│       ├── formatDateTime.ts                       # Hiển thị giờ:phút ngày/tháng/năm
│       ├── formatDayAndTime.ts                     # Hiển thị ngày/tháng giờ:phút (trục biểu đồ)
│       ├── formatDistance.ts                       # Hiển thị khoảng cách: "850 m", "2.3 km"
│       ├── formatModelFormula.ts                   # Viết công thức thành 1 dòng chữ
│       ├── formatModelNumber.ts                    # Viết 1 hệ số cho dễ đọc
│       ├── formatQuickReadings.ts                  # Dòng tóm tắt "Mưa 14.4 mm/h · Triều 1.35 m · 29.4 °C" cho thẻ trạm trên bản đồ
│       ├── formatSensorValue.ts                    # Hiển thị số đo + đơn vị; thiếu → "Chưa có dữ liệu"
│       ├── formatTimeAgo.ts                        # Hiển thị "2 phút trước", "3 ngày trước"
│       ├── getStationMarkerLook.ts                 # Màu + chữ của nhãn trạm (dùng chung điện thoại và web)
│       ├── isOutsideNearby.ts                      # Trạm có nằm ngoài vòng 2 km không
│       ├── isStationDataFresh.ts                   # Trạm còn dữ liệu mới không (online/chậm)
│       ├── listRoadNames.ts                        # Tên các đường bị ngập quanh 1 trạm
│       ├── mergeLiveStations.ts                    # Gộp dữ liệu realtime vào danh sách trạm
│       ├── saveCsvFile.ts                          # Xuất CSV trên điện thoại: mở bảng Chia sẻ của máy
│       ├── saveCsvFile.web.ts                      # Xuất CSV trên trình duyệt: tải file .csv về máy
│       ├── searchStations.ts                       # Tìm trạm theo tên/mã, gõ không dấu được
│       ├── shouldRaiseFloodAlert.ts                # Có nên báo động không (mức ngập tăng)
│       ├── showAlert.ts                            # Hiện hộp thông báo, chạy được cả điện thoại lẫn trình duyệt
│       ├── sortModelVariables.ts                   # Sắp các biến của công thức theo thứ tự dễ đọc
│       ├── sortStations.ts                         # Sắp xếp trạm: tên / mực nước / mới nhất / gần nhất
│       ├── splitSeriesAtGaps.ts                    # Cắt đường biểu đồ ở chỗ thiếu dữ liệu
│       ├── toChartPoints.ts                        # Số đo → điểm vẽ biểu đồ (bỏ giá trị thiếu)
│       ├── toFloodAlertEvent.ts                    # Tạo 1 cảnh báo từ trạm vừa tăng mức ngập
│       ├── toNumberOrNull.ts                       # Đọc số an toàn: không phải số → null
│       ├── toReadingsCsv.ts                        # Lịch sử đo → nội dung file CSV (chỉ cột trạm có gửi, ô trống = không có số)
│       └── toVietnamTime.ts                        # Đổi giờ máy chủ (UTC) sang giờ Việt Nam
├── .env.example                                    # Mẫu cấu hình: địa chỉ backend, bật/tắt chế độ demo
├── .gitignore                                      # Những file KHÔNG đưa lên Git (node_modules, .env.local...)
├── .npmrc                                          # Bắt npm dừng lại nếu máy dùng sai phiên bản Node
├── .nvmrc                                          # Phiên bản Node cần dùng: 24
├── AGENTS.md                                       # Ghi chú của mẫu Expo cho công cụ AI viết code (không ảnh hưởng app)
├── app.json                                        # Cấu hình app Expo: tên, biểu tượng, quyền vị trí, thông báo
├── expo-env.d.ts                                   # Giúp TypeScript hiểu kiểu dữ liệu của Expo (tự tạo, không sửa)
├── metro.config.js                                 # Cấu hình đóng gói mặc định của Expo
├── package-lock.json                               # Khóa đúng phiên bản thư viện (tự tạo, không sửa)
├── package.json                                    # Danh sách thư viện và lệnh chạy (npm start...)
├── README.md                                       # Bạn đang đọc file này
└── tsconfig.json                                   # Cấu hình TypeScript, khai báo @/ = thư mục src/
```

> Ký hiệu **★** đánh dấu các file của phần Bản đồ, phần nổi bật nhất của app.
> File có đuôi **`.web.tsx`** là bản dành cho trình duyệt. Expo tự chọn: chạy trên điện thoại thì dùng `StationMap.tsx`, chạy trên laptop thì dùng `StationMap.web.tsx`. Hai bản nhận cùng dữ liệu nên trạm hiện giống nhau.
> Ghi chú: `@/` trong lệnh `import` nghĩa là thư mục `src/`. Ví dụ `@/utils/formatDistance` là file `src/utils/formatDistance.ts`.

---

## 5. Dữ liệu chạy trong app như thế nào

Ví dụ: **node Q.1 gửi độ ngập mới, bản đồ đổi màu**.

```
1. Node gửi số đo ──LoRa → gateway → MQTT──▶ backend lưu lại, phát sự kiện Socket.IO "station:update" (gửi nguyên cả trạm)
2. src/api/realtime/connectRealtimeSocket.ts      nhận sự kiện
3. src/api/mappers/toStation.ts                   đổi JSON → Station
4. src/state/RealtimeProvider.tsx                 lưu bản mới nhất của từng trạm; mức ngập TĂNG thì tạo cảnh báo
                                                  (utils/shouldRaiseFloodAlert.ts)
5. src/state/StationsProvider.tsx                 gộp vào danh sách trạm (utils/mergeLiveStations.ts:
                                                  bản CŨ HƠN dữ liệu đang có thì bỏ qua)
6. src/app/(tabs)/index.tsx                       màn Bản đồ đọc danh sách trạm mới, tải lại "Quanh bạn"
7. src/components/map/StationMarker.tsx           vẽ lại nhãn với màu mới
```

Ngoài realtime, danh sách trạm và "Quanh bạn" còn **tự tải lại mỗi 30 giây**. Khi realtime vừa kết nối lại sau một lúc mất, app cũng tải lại ngay. Nhờ vậy lỡ mất gói realtime nào thì vài giây sau màn hình vẫn đúng.

Ví dụ: **mở app, màn Bản đồ hiện "Quanh bạn"**.

```
src/app/(tabs)/index.tsx
  ├─ useCurrentLocation()                   → xin quyền, lấy vị trí của bạn
  ├─ useNearbyFlooding(vị trí, 2000 m)      → GET /api/v1/nearby: trạm trong 2 km, kết luận, các đoạn đường ngập
  ├─ <StationMap>                           → vòng 2 km (NearbyRadiusCircle), đường ngập (FloodedRoadLines),
  │                                           vùng ảnh hưởng (FloodZoneCircle), nhãn trạm (StationMarker, mờ nếu ngoài 2 km)
  └─ <NearbySummaryCard>                    → thẻ "Quanh bạn" ở đáy
```

Ví dụ: **mở màn Chi tiết trạm**.

```
src/app/station/[nodeId].tsx
  ├─ useStations()                          → thông tin trạm + lần đo mới nhất (đã có sẵn trong kho)
  ├─ <SensorMetricsCard>                    → thông số đo của lần đo mới nhất (ẩn thông số trạm không gửi)
  ├─ <SensorHistoryCard>                    → tự gọi getSensorHistory theo khoảng 1h/24h/7 ngày
  ├─ <NodePredictionCard>                   → dự đoán (trạm chưa gửi → "Trạm chưa có dự đoán")
  └─ <StationModelCard>                     → tự gọi getStationModels: các phiên bản công thức của trạm
```

`useAutoRefresh` (trong `src/hooks/`) lo 3 việc: **đổi trạm thì xóa ngay số của trạm cũ**, **phản hồi đến muộn bị bỏ qua**, và **lỗi mạng không xóa dữ liệu đang hiện** (chỉ hiện thêm dòng báo lỗi).

---

## 6. Quy tắc viết code của dự án

| Quy tắc | Ví dụ |
|---|---|
| Mỗi file làm **1 việc**, tên file = tên việc đó | `formatDistance.ts` chỉ định dạng khoảng cách |
| Hàm gọi API bắt đầu bằng động từ: `get…`, `check…` | `getStationList`, `getNearbyFlooding`, `checkRouteFloodRisk` |
| Hàm đổi dữ liệu máy chủ sang dữ liệu app bắt đầu bằng `to…` | `toStation`, `toSensorReading` |
| Hook bắt đầu bằng `use…` | `useAutoRefresh`, `useCurrentLocation` |
| Kho dữ liệu dùng chung tên là `…Provider` | `StationsProvider` (dùng qua `useStations()`) |
| Component (mảnh giao diện) viết HOA chữ đầu | `WaterLevelCard`, `StationMarker` |
| **Không gọi `fetch` trực tiếp** trong màn hình, luôn đi qua `src/api/` | Đổi máy chủ chỉ cần sửa một chỗ |
| **Không viết cứng màu** trong màn hình | Màu nằm ở `src/constants/appColors.ts` và `floodLevelStyles.ts` |
| Chú thích bằng tiếng Việt ở đầu mỗi file | Đọc 3 dòng đầu file là biết file làm gì |

---

## 7. Muốn sửa X thì mở file nào

| Muốn… | Mở file |
|---|---|
| Đổi màu một mức ngập (vd. "Nguy hiểm" thành màu khác) | `src/constants/floodLevelStyles.ts` |
| Đổi chữ / màu trên nhãn trạm (cả điện thoại và laptop) | `src/utils/getStationMarkerLook.ts` |
| Sửa bản đồ khi chạy trên laptop | Các file `src/components/map/*.web.tsx` |
| Đổi nền bản đồ trên laptop | `src/components/map/StationMap.web.tsx` (dòng `TileLayer url=...`) |
| Đổi độ rộng khung app trên laptop (đang là 480px) | `src/components/common/WebPhoneFrame.tsx` |
| Đổi màu chủ đạo của app | `src/constants/appColors.ts` |
| Đổi địa chỉ máy chủ, bật DEMO | `.env.local` (xem `.env.example`) |
| Đổi chu kỳ tự tải lại (30 giây…), bán kính "Quanh bạn" (2 km) | `src/config/appConfig.ts` |
| Đổi giao diện nhãn trạm trên bản đồ | `src/components/map/StationMarker.tsx` |
| Đổi vòng tròn vùng ngập | `src/components/map/FloodZoneCircle.tsx` |
| Đổi cách tô màu đường ngập | `src/components/map/FloodedRoadLines.tsx` (+ `.web.tsx`) |
| Đổi vòng 2 km "Quanh bạn" | `src/components/map/NearbyRadiusCircle.tsx` (+ `.web.tsx`) |
| Đổi nội dung thẻ "Quanh bạn" | `src/components/map/NearbySummaryCard.tsx` |
| Đổi cách viết công thức dự đoán, ý nghĩa các biến | `src/utils/formatModelFormula.ts`, `src/constants/modelVariables.ts` |
| Đổi khi nào thì báo động (mức ngập tăng) | `src/utils/shouldRaiseFloodAlert.ts` |
| Thêm nút tròn mới trên bản đồ | `src/app/(tabs)/index.tsx` (phần "Nút tròn bên phải") + `MapRoundButton` |
| Thêm / sửa trạm mẫu cho DEMO | `src/demo/demoStations.ts` |
| Đổi chữ của tab | `src/app/(tabs)/_layout.tsx` |
| Đổi nội dung màn giới thiệu | `src/app/onboarding.tsx` (mảng `FEATURES`) |

**Thêm một màn hình mới**, ví dụ "Hướng dẫn":

1. Tạo file `src/app/guide.tsx` có `export default function GuideScreen() { … }`. Expo Router tự tạo đường dẫn `/guide` theo tên file.
2. Khai báo tiêu đề trong `src/app/_layout.tsx`: `<Stack.Screen name="guide" options={{ title: 'Hướng dẫn' }} />`.
3. Mở màn từ chỗ khác bằng `router.push('/guide')` (nhớ `import { router } from 'expo-router'`).
4. Muốn nó thành một tab thì đặt file trong `src/app/(tabs)/` và thêm `<Tabs.Screen>` trong `src/app/(tabs)/_layout.tsx`.

**Thêm một API mới**, ví dụ backend có thêm `GET /api/v1/abc`:

1. Viết kiểu dữ liệu trong `src/types/Abc.ts`.
2. Viết hàm đổi dữ liệu `src/api/mappers/toAbc.ts`.
3. Viết hàm gọi API `src/api/abc/getAbc.ts`, gọi qua `requestJson('GET', '/api/v1/abc')`.
4. Nếu muốn chạy được ở chế độ DEMO, thêm một nhánh trả dữ liệu mẫu trong `src/demo/getDemoResponse.ts`.
5. Trong màn hình: `const abc = useAutoRefresh(() => getAbc(), [])`.

**Thư viện mới:** cài bằng `npx expo install <tên>`, đừng dùng `npm install <tên>`. Lệnh của Expo tự chọn phiên bản hợp với Expo. Thư viện có code gốc (native) mà Expo Go không có sẵn thì sẽ **không chạy trong Expo Go**.

---

## 8. Đối chiếu tài liệu yêu cầu

✅ = đã làm, 🟡 = làm một phần, ⬜ = chưa làm. Lý do của các mục 🟡 và ⬜ ghi ở cột cuối.

| Mã | Yêu cầu | Trạng thái | File chính | Ghi chú |
|---|---|---|---|---|
| FR-01 | Giới thiệu lần đầu | ✅ | `app/onboarding.tsx`, `hooks/useShowOnboardingOnce.ts` | Có nút Bỏ qua, chỉ tự hiện lần đầu |
| FR-02 | Đăng nhập, đăng ký OTP, phiên | — | — | **Bỏ theo yêu cầu mới:** app xem công khai, không cần tài khoản |
| FR-03 | Tổng quan và chọn trạm | ✅ | `app/(tabs)/overview.tsx` | Đổi trạm thì mọi thẻ đổi theo, không hiện nhầm số trạm cũ |
| FR-04 | **Bản đồ** trạm và vùng ảnh hưởng | ✅ | `app/(tabs)/index.tsx`, `components/map/*` (điện thoại: react-native-maps; laptop: Leaflet) | Thêm **"Quanh bạn"**: vòng 2 km, tô màu đường ngập, thẻ tóm tắt. Trạm thiếu tọa độ không đặt bừa trên bản đồ |
| FR-05 | Danh sách trạm (P0 + P1) | ✅ | `app/(tabs)/stations.tsx`, `utils/filterStations.ts`, `searchStations.ts`, `sortStations.ts` | Có nút "Xóa bộ lọc" khi không có kết quả |
| FR-06 | Chi tiết trạm và realtime | ✅ | `app/station/[nodeId].tsx`, `state/RealtimeProvider.tsx`, `utils/mergeLiveStations.ts` | Kết nối lại thì tải lại danh sách trạm ngay |
| FR-07 | Biểu đồ lịch sử | ✅ | `components/station/SensorHistoryCard.tsx`, `components/charts/HistoryLineChart.tsx` | Độ ngập, lượng mưa, cường độ mưa, triều, nhiệt độ (chỉ hiện nút cho thông số trạm có gửi). Ngắt đường ở chỗ thiếu dữ liệu. Xuất CSV toàn bộ số đo trong khoảng đang xem. ⬜ Tự chọn khoảng thời gian (P1) |
| FR-08 | Dự báo | ⬜ chờ dữ liệu | `components/forecast/NodePredictionCard.tsx`, `components/station/StationModelCard.tsx` | App đã sẵn chỗ hiện dự đoán + công thức + các phiên bản; trạm A01, A02 **chưa gửi dự đoán** nên đang hiện "Trạm chưa có dự đoán" |
| FR-09 | Theo dõi trạm | ✅ | `components/station/FollowButton.tsx`, `state/FavoritesProvider.tsx` | Lưu **trên máy** (không còn tài khoản) |
| FR-10 | Push và mở đúng trạm | 🟡 | `notifications/*`, `components/alerts/RealtimeAlertBanner.tsx` | Backend **chưa gửi Push**. App hiện dải cảnh báo và thông báo khi app đang chạy; chạm vào mở đúng trạm |
| FR-11 | Trung tâm cảnh báo | 🟡 | `app/(tabs)/alerts.tsx`, `components/alerts/*` | Trạm đang cảnh báo + cảnh báo nhận trong lần mở app. ⬜ Lịch sử cảnh báo lưu trên máy chủ, ⬜ lọc (P1) |
| FR-12 | Cài đặt thông báo | 🟡 | `app/(tabs)/settings.tsx`, `notifications/useNotificationPermissionStatus.ts` | Bật/tắt thông báo lưu trên máy. ⬜ Chọn cấp độ |
| FR-13 | Vị trí và trạm gần tôi | ✅ | `hooks/useCurrentLocation.ts`, `hooks/useNearbyFlooding.ts` | Xin quyền khi mở Bản đồ để xem "Quanh bạn". Từ chối vẫn dùng app bình thường |
| FR-14 | Kiểm tra tuyến đường | ✅ | `components/map/RouteCheckPanel.tsx`, `RouteCheckResultView.tsx`, `RouteLines.tsx` | Chọn điểm bằng chạm giữ hoặc dùng vị trí hiện tại. ⬜ Tìm kiếm địa điểm theo tên |
| FR-15 | Cá nhân và quyền | — | `app/(tabs)/settings.tsx` | Không còn tài khoản nên không có hồ sơ, đổi mật khẩu |
| NFR-01 | Bảo mật | ✅ | `api/requestJson.ts` | App chỉ đọc dữ liệu công khai, không lưu mật khẩu hay token nào. Nên dùng HTTPS cho máy chủ thật |
| NFR-02 | Cập nhật ≤ 5 giây | ✅ | `api/realtime/connectRealtimeSocket.ts` | Socket.IO, tự kết nối lại |
| NFR-03 | Mất kết nối | 🟡 | `hooks/useAutoRefresh.ts` | Lỗi mạng vẫn giữ số gần nhất. Chưa lưu dữ liệu khi tắt hẳn app |
| NFR-05 | Dễ dùng | ✅ | `constants/floodLevelStyles.ts` | Tiếng Việt, đơn vị rõ, màu kèm ký hiệu và chữ |
| NFR-06 | Quyền riêng tư | ✅ | `hooks/useCurrentLocation.ts`, `state/NotificationSettingsProvider.tsx` | Vị trí chỉ dùng để hỏi máy chủ tình hình quanh bạn, không lưu lại |

**Khác tài liệu:** tài liệu xếp tab theo thứ tự Home | Map | Alerts | Stations | Profile. App đưa **Bản đồ ("Quanh bạn") lên tab đầu** và làm màn mở đầu, vì người dùng cần thấy ngập quanh mình trước tiên. "Home" được đặt tên là "Tổng quan", "Profile" thành "Cài đặt" vì không còn tài khoản.

---

## 9. Giới hạn hiện tại

| Giới hạn | Ghi chú |
|---|---|
| **Đường tô màu là ước lượng** | Node đo 1 điểm; backend coi các đoạn đường trong 100–300 m quanh node đang ngập là ngập. Ở mức zoom thấy cả vòng 2 km, các đoạn này khá nhỏ; phóng to vào sẽ rõ |
| Hình dạng đường lấy từ OpenStreetMap (dịch vụ Overpass miễn phí) | Lỗi hoặc quá tải thì app vẽ **vòng tròn vùng ảnh hưởng** thay cho tô màu đường, và ghi chú trong thẻ "Quanh bạn" |
| Chưa có thông báo đẩy (Push) | Thông báo trên máy và dải cảnh báo chỉ có khi app đang chạy |
| Không có tài khoản | Trạm theo dõi, cài đặt thông báo lưu trên từng máy; đổi máy phải chọn lại |
| **Chưa có dự đoán** | Trạm A01, A02 chỉ gửi số đo. App đã có sẵn thẻ dự đoán + công thức, trạm (hoặc máy chủ) gửi dự đoán thì tự hiện |
| Một số ý nghĩa số đo chưa chốt với bên IoT | Mực nước đo so với mặt đường hay mốc khác, lượng mưa cộng dồn từ lúc nào... (xem `IOT_DATA_FORMAT.md` của backend, mục 8). Nhãn trên app có thể phải sửa lại |
| Vị trí trên laptop | Trình duyệt đoán vị trí qua Wi-Fi, có thể lệch; chuột phải lên bản đồ để chọn đúng chỗ |

---

## 10. Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| `npm install` rất lâu hoặc báo lỗi `EPERM` / `EBUSY` | Code đang nằm trong thư mục đồng bộ (OneDrive, Google Drive, iCloud...). Chép ra `D:\Projects\` (Windows) hoặc `~/Projects/` (macOS / Linux) rồi cài lại |
| 🪟 Gõ `npm` / `npx` báo `...cannot be loaded because running scripts is disabled on this system` | Windows đang chặn chạy script. Gõ `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, chọn `Y`, rồi gõ lại lệnh |
| `npm install` báo lỗi `EBADENGINE` / `Unsupported engine` | Node đang là bản không được hỗ trợ (vd. 25). Đổi sang Node 24 LTS theo **Bước 1** (Linux / máy có nvm: `nvm install 24` rồi `nvm use 24`), **tắt hẳn terminal mở lại**, xóa thư mục `node_modules`, chạy lại `npm install` |
| `npm install` báo "N high severity vulnerabilities" | Bình thường với dự án Expo, phần lớn nằm ở công cụ chạy trên máy tính, không vào app. **Không chạy `npm audit fix --force`**: lệnh này đổi phiên bản thư viện và làm hỏng app |
| 🍎🐧 `npm install` báo `EACCES` / `permission denied` | **Đừng dùng `sudo npm`.** Đứng trong thư mục project gõ `sudo chown -R $(whoami) ~/.npm .` rồi cài lại |
| 🍎🐧 `node` hoặc `nvm` báo `command not found` ngay sau khi cài | Tắt hẳn terminal, mở cửa sổ mới. Vẫn lỗi với nvm thì gõ `source ~/.bashrc` (Linux) hoặc `source ~/.zshrc` (macOS) |
| 🍎 `npx expo start` báo `EMFILE: too many open files` | Cài Watchman để Expo theo dõi file hiệu quả hơn: `brew install watchman` (cần có Homebrew: brew.sh) |
| 🐧 `npx expo start` báo `ENOSPC: System limit for number of file watchers reached` | Tăng giới hạn theo dõi file: `echo fs.inotify.max_user_watches=524288 \| sudo tee -a /etc/sysctl.conf && sudo sysctl -p` |
| iPhone báo *"You need to be signed in to Expo Go and Expo CLI..."* (hoặc *"...accounts need to match..."*) | Đăng nhập **cùng một tài khoản Expo** ở cả hai nơi: máy tính đăng nhập theo **Bước 6** (Windows: `$env:BROWSER = "none"` rồi `npx expo login`), iPhone vào Expo Go → biểu tượng tài khoản góc trên phải → Log in. Xong bấm **Try Again** trên iPhone. Nếu vừa đổi sang tài khoản khác thì `Ctrl+C` tắt rồi chạy lại `npx expo start` |
| 🪟 `npx expo login` báo `cmd.exe /c start "" https://expo.dev/login... exited with non-zero code: 1` | Lỗi khi CLI tự mở trình duyệt trên Windows. Tài khoản Google/GitHub: gõ `$env:BROWSER = "none"` rồi `npx expo login`, copy link nó in ra dán vào trình duyệt để đăng nhập. Tài khoản có mật khẩu: `npx expo login --no-browser` |
| Terminal hiện `WARN expo-notifications: Android Push notifications ... removed from Expo Go` và `` `expo-notifications` functionality is not fully supported in Expo Go `` | **Bình thường, kệ nó.** Expo Go không còn hỗ trợ Push từ máy chủ, nhưng app chỉ dùng thông báo ngay trên máy (local notification), loại này vẫn chạy trong Expo Go |
| Terminal đã báo `iOS Bundled ...` / `Android Bundled ...` nhưng sau đó báo `ERROR The request timed out.`, điện thoại không vào được app | Điện thoại tải app từ máy tính quá chậm hoặc bị chặn giữa chừng. Thử lần lượt: (1) bấm `r` trong terminal hoặc **Reload** trên điện thoại, lần 2 thường nhanh hơn; (2) 🪟 đặt mạng Wi-Fi của máy tính là **Private** (Settings → Network & Internet → Wi-Fi → bấm tên mạng → **Private network**); (3) cho máy tính bắt **hotspot của chính điện thoại**; (4) Wi-Fi trường / quán cà phê thường chặn các máy nói chuyện với nhau: dùng `npx expo start --tunnel` |
| 📱 Android hiện màn đỏ *"Something went wrong"* / *"Failed to connect to /192.168.x.x:8081"* / `java.net.SocketTimeoutException` | Điện thoại không nói chuyện được với máy tính. Làm như dòng `The request timed out` ở trên: Wi-Fi máy tính để **Private**, dùng hotspot của điện thoại, hoặc `npx expo start --tunnel` |
| 📱 Quét QR bằng camera Samsung thì mở ra trình duyệt chứ không vào app | Quét bằng nút **Scan QR code** bên trong app Expo Go |
| 📱 Samsung: tắt màn hình hoặc ra ngoài một lúc thì không còn nhận cảnh báo | Đặt pin của Expo Go là **Không hạn chế** (xem "Ghi chú riêng cho điện thoại Android / Samsung" ở mục 2) |
| Báo `Error: Cannot find module '...'` mà đường dẫn nằm trong `node_modules/` (vd. `Cannot find module '../utils/args'`) | Thư mục `node_modules` **bị thiếu file**: `npm install` bị ngắt giữa chừng, hoặc `node_modules` được chép từ máy khác / qua OneDrive / iCloud / file zip. **Đừng bao giờ chép `node_modules`**, luôn cài lại trên chính máy đó: xóa `node_modules` (🍎🐧 `rm -rf node_modules`, 🪟 `Remove-Item -Recurse -Force node_modules`), chạy `npm cache verify`, rồi `npm install`. Vẫn lỗi thì chạy thêm `npm cache clean --force` rồi cài lại |
| Expo Go báo "Project is incompatible with this version of Expo Go" | Cập nhật Expo Go lên bản mới nhất |
| Quét QR xong quay mãi không vào | Điện thoại và máy tính khác mạng Wi-Fi. Dùng `npm run start:tunnel` |
| Màn hình báo "Không tải được trạm: Không kết nối được máy chủ (http://...)" | Địa chỉ trong ngoặc là máy chủ app đang gọi. (1) Backend chạy thử trên laptop: kiểm tra cửa sổ `npm run dev` của backend còn chạy không; mở thử `http://localhost:3000/api/v1/health` trên trình duyệt. (2) Mở app trên **điện thoại** mà ghi `localhost` → sai, phải ghi IP của laptop (Bước 7a). (3) Máy chủ thật: hỏi anh mentor địa chỉ đúng. Mạng yếu thì bật chế độ DEMO |
| Điện thoại không gọi được backend chạy trên laptop dù đã ghi đúng IP | Điện thoại và laptop phải chung Wi-Fi. 🪟 Windows hỏi Firewall cho Node.js thì bấm **Allow**; đặt mạng Wi-Fi là **Private**. Wi-Fi trường thường chặn các máy nói chuyện với nhau: dùng hotspot của điện thoại |
| Thẻ "Quanh bạn" ghi "Chưa đủ dữ liệu quanh đây" | Không có trạm nào đang hoạt động trong 2 km. Chạm giữ (laptop: chuột phải) lên chỗ có trạm để xem quanh đó, hoặc chạy thử `npm run fake-node -- --lat ... --lng ...` bên backend |
| Có ngập nhưng không thấy đường tô màu, chỉ thấy vòng tròn | Backend chưa lấy được hình dạng đường từ OpenStreetMap (xem log backend), hoặc đang ở chế độ DEMO. 2 phút sau backend tự thử lại |
| Bật thông báo nhưng không thấy gì | Vào Cài đặt điện thoại → Expo Go → Thông báo → Cho phép |
| Sửa `.env.local` mà app không đổi | `Ctrl+C` tắt rồi chạy lại bằng `npx expo start --clear` |
| 💻 Chạy `npm run web` thấy dòng vàng `WARN [expo-notifications] Listening to push token changes is not yet fully supported on web` | **Bình thường, kệ nó.** Thư viện thông báo tự in ra khi chạy trên trình duyệt, không ảnh hưởng app |
| 💻 Trên laptop bản đồ xám, không có đường phố | Nền bản đồ OpenStreetMap cần Internet: kiểm tra mạng của laptop. Nhãn trạm vẫn hiện bình thường |
| 💻 Trên laptop báo "Không kết nối được máy chủ" | Backend chưa chạy / sai địa chỉ trong `.env.local` (xem dòng "Không tải được trạm" ở trên), hoặc laptop mất mạng. Sửa xong tắt `npm run web` rồi chạy lại `npx expo start --web --clear` |
| 💻 Trên laptop bấm nút ◎ thì báo chưa lấy được vị trí | App ghi rõ lý do. (1) **"Trình duyệt đang chặn quyền vị trí"**: bấm biểu tượng bên trái địa chỉ `localhost:8081` → bật **Vị trí**, rồi tải lại trang (F5). (2) **"Trình duyệt đã cho phép nhưng máy tính không xác định được vị trí"**: Windows đang tắt định vị. Mở **Settings (Win + I) → Privacy & security → Location**, bật **Location services** và **Let desktop apps access your location**, rồi tải lại trang. macOS: **System Settings → Privacy & Security → Location Services** → bật cho Chrome. (3) Vẫn không được, hoặc vị trí bị lệch: **bấm chuột phải lên bản đồ ngay chỗ mình** để xem ngập quanh đó |

---

## 11. Kiểm tra trước buổi thuyết trình

- [ ] `npm run typecheck` không báo lỗi.
- [ ] Điện thoại thuyết trình là Samsung / Android: đã cài Expo Go từ CH Play, đặt pin Expo Go là **Không hạn chế**, đã thử quét QR bằng Expo Go.
- [ ] Điện thoại dùng để thuyết trình là iPhone thì đã đăng nhập **cùng một tài khoản Expo** trên máy tính (`npx expo whoami`) và trên Expo Go.
- [ ] `.env.local` đã ghi đúng địa chỉ backend anh mentor deploy (không phải `localhost`). Mở app thấy thẻ "Quanh bạn" và các trạm thật.
- [ ] Thuyết trình bằng laptop: đã chạy `npm run web` trên **đúng laptop đó**, bản đồ có đường phố, vòng 2 km đúng chỗ (lệch thì chuột phải chọn lại), thử chuột phải chọn A/B kiểm tra tuyến.
- [ ] Mở chi tiết trạm A01/A02: thấy đủ mực nước, lượng mưa, cường độ mưa, thủy triều, nhiệt độ. Chuẩn bị câu trả lời nếu giám khảo hỏi phần dự đoán (hiện "Trạm chưa có dự đoán").
- [ ] Chạm trạm → Xem chi tiết → biểu đồ có dữ liệu.
- [ ] Thử kiểm tra một tuyến đường.
- [ ] Đã thử **chế độ DEMO** trên đúng điện thoại sẽ dùng để thuyết trình (phòng khi mạng ở hội trường yếu).
- [ ] Sạc đầy điện thoại, tắt thông báo của các app khác.

> 🔒 **Bảo mật:** không đưa lên Git hoặc gửi cho người khác file `.env` của backend và các file `*.tar.gz`, `*.archive.gz` của máy chủ cũ. Chúng chứa mật khẩu thật.
