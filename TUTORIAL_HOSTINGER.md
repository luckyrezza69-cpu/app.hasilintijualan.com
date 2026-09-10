# 🚀 Panduan Lengkap Upload & Deploy HIJ Apps ke Hostinger
### Domain / Subdomain: `apps.hasilintijualan.com` (atau domain utama Anda)

Panduan ini disusun langkah demi langkah secara praktis, terstruktur, dan mudah diikuti untuk mengunggah dan menjalankan aplikasi **HIJ Apps (ERP Konveksi & Garment)** di layanan **Hostinger** (baik **Hostinger Web / Cloud Hosting dengan Node.js** maupun **Hostinger VPS**).

---

## 📋 Ringkasan Alur Deployment

```
1. Build Frontend di Komputer Lokal (npm run build)
2. Buat File ZIP (dist, api, data, uploads, package.json, dll)
3. Buat Database MySQL & Import db_schema.sql di Hostinger
4. Buat Subdomain / Domain di Hostinger hPanel
5. Upload & Extract ZIP di File Manager Hostinger
6. Setup Node.js App & Install Dependencies di hPanel
7. Buat file .env untuk koneksi database
8. Aktifkan SSL HTTPS Gratis & Jalankan Aplikasi
```

---

## 📁 File & Folder yang Harus Di-Upload ke Hostinger

| File / Folder | Keterangan | Wajib? |
| :--- | :--- | :---: |
| 📁 **`dist/`** | Hasil build frontend Vite (HTML, CSS, JS) | **YA** |
| 📁 **`api/`** | Backend API Express & modul keamanan | **YA** |
| 📁 **`data/`** | Data JSON awal (Customer, PO, SPK, Users) | **YA** |
| 📁 **`uploads/`** | Folder penyimpanan foto, bukti transfer & dokumen | **YA** |
| 📄 **`package.json`** | Daftar dependencies & script Node.js | **YA** |
| 📄 **`package-lock.json`** | Versi dependencies yang terkunci | **YA** |
| 📄 **`db_schema.sql`** | Skema tabel database MySQL | **YA** |
| 📄 **`.env`** | Konfigurasi database & kredensial server | **YA** (dibuat di server) |
| ❌ `node_modules/` | **JANGAN DI-UPLOAD** (diinstall di server) | **TIDAK** |
| ❌ `.git/` | **JANGAN DI-UPLOAD** | **TIDAK** |

---

## 🛠️ LANGKAH-LANGKAH DEPLOYMENT (PANDUAN LENGKAP)

---

### Langkah 1: Build Aplikasi di Komputer Lokal

Sebelum upload ke hosting, lakukan proses build terlebih dahulu di komputer Anda agar aplikasi dioptimasi untuk performa cepat:

1. Buka Terminal (PowerShell / Command Prompt) di folder proyek komputer:
   ```bash
   npm run build
   ```
2. Pastikan muncul pesan sukses: `✓ built in ...s` dan folder **`dist/`** terisi file hasil build.

---

### Langkah 2: Kompresi File ke Format ZIP

1. Di komputer Anda, pilih folder dan file berikut:
   - 📁 `dist`
   - 📁 `api`
   - 📁 `data`
   - 📁 `uploads`
   - 📄 `package.json`
   - 📄 `package-lock.json`
   - 📄 `db_schema.sql`
2. Klik kanan pada file yang dipilih > pilih **Compress to ZIP** (atau *Kirim ke > Compressed (zipped) folder*).
3. Beri nama file: **`hijapps-deploy.zip`**.

> 💡 **Penting**: Pastikan folder `node_modules` **TIDAK ikut terkompres** ke dalam file ZIP agar ukuran file kecil (hanya beberapa MB) dan upload berlangsung sangat cepat.

---

### Langkah 3: Setup Subdomain di Hostinger hPanel

1. Login ke akun **[Hostinger hPanel](https://hpanel.hostinger.com)**.
2. Masuk ke menu **Websites** > klik tombol **Manage** pada domain Anda (`hasilintijualan.com`).
3. Pada kolom pencarian di sebelah kiri, ketik **Subdomains** (atau buka menu **Domains** > **Subdomains**).
4. Di bagian **Create a Subdomain**:
   - **Subdomain Name**: Isi `apps` (sehingga menjadi `apps.hasilintijualan.com`).
   - **Custom folder for subdomain**: Centang opsi ini, arahkan ke `public_html/apps` (atau biarkan default).
5. Klik **Create**.

---

### Langkah 4: Membuat Database MySQL & Import Data

1. Di hPanel Hostinger, masuk ke menu **Databases** > **MySQL Databases**.
2. Di bagian **Create a New MySQL Database and User**:
   - **Database Name**: Masukkan nama database, misal: `hijapps` (nama lengkapnya menjadi `u123456789_hijapps`).
   - **Username**: Masukkan username, misal: `hijuser` (nama lengkapnya menjadi `u123456789_hijuser`).
   - **Password**: Buat password yang kuat dan aman.
3. Klik tombol **Create**.
4. **Catat 3 data penting ini**:
   - Nama Database: `u123456789_hijapps`
   - Username Database: `u123456789_hijuser`
   - Password Database: `(Password yang Anda buat)`
5. Klik tombol **Enter phpMyAdmin** di sebelah database yang baru Anda buat.
6. Di phpMyAdmin:
   - Klik nama database Anda di panel sebelah kiri.
   - Klik tab **Import** di menu atas.
   - Klik tombol **Choose File** / **Browse**, pilih file **`db_schema.sql`** dari komputer Anda.
   - Klik tombol **Import** / **Go** di bagian bawah.
   - *(Seluruh tabel database akan otomatis terbuat lengkap).*

---

### Langkah 5: Upload & Extract File di Hostinger File Manager

1. Di hPanel Hostinger, masuk ke menu **Files** > **File Manager**.
2. Buka folder subdomain aplikasi Anda:
   📁 `public_html/apps` (atau folder yang dipilih saat membuat subdomain).
3. Hapus file bawaan `default.php` jika ada.
4. Klik tombol **Upload** (ikon panah ke atas di pojok kanan atas) > pilih **File** > pilih **`hijapps-deploy.zip`**.
5. Tunggu proses upload selesai hingga 100%.
6. Klik kanan pada file `hijapps-deploy.zip` > pilih **Extract**.
7. Pilih direktori saat ini (`.`) dan klik **Extract**.
8. Setelah file terekstrak, Anda dapat menghapus file `hijapps-deploy.zip` untuk menghemat kapasitas hosting.

---

### Langkah 6: Membuat File Konfigurasi `.env` di Hosting

1. Masih di **File Manager** pada folder `public_html/apps`:
2. Klik tombol **New File** (ikon kertas dengan tanda tambah).
3. Beri nama file: **`.env`** (pastikan diawali tanda titik).
4. Klik kanan file `.env` > pilih **Edit**, lalu masukkan konfigurasi berikut:

```ini
# Lingkungan Server
NODE_ENV=production
PORT=3000

# Akun Admin Utama
ADMIN_USERNAME=admin.rezza
ADMIN_PASSWORD=luckyrezza

# Konfigurasi Database MySQL Hostinger (Sesuai Langkah 4)
DB_HOST=localhost
DB_USER=u123456789_hijuser
DB_PASSWORD=PasswordDatabaseAndaYangTadiDibuat
DB_NAME=u123456789_hijapps

# Cloudinary (Opsional: Jika menggunakan cloud storage gambar)
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret
```
5. Klik **Save** & **Close**.

---

### Langkah 7: Setup Node.js Application di Hostinger hPanel

Hostinger menyediakan fitur **Node.js Selector** bawaan:

1. Di hPanel Hostinger, cari menu **Node.js** (biasanya di bawah kategori *Advanced* atau *Websites*).
2. Klik tombol **Create Application** / **Add Application**:
   - **Node.js Version**: Pilih versi **`20.x`** atau **`22.x`** (versi LTS terbaru).
   - **Application Mode**: Pilih **`Production`**.
   - **Application Root**: Masukkan path folder aplikasi Anda, contoh: `public_html/apps` (atau path lengkap hosting Anda).
   - **Application URL**: Pilih subdomain `apps.hasilintijualan.com`.
   - **Application Startup File**: Masukkan **`api/index.ts`** (atau `npm start`).
3. Klik tombol **Create** / **Save**.
4. Di halaman detail aplikasi Node.js, klik tombol **NPM Install** (atau **Install Dependencies**) untuk menginstall paket aplikasi secara otomatis.
5. Setelah instalasi selesai, klik tombol **Restart Application**.

---

### Langkah 8: Aktivasi SSL HTTPS Gratis

1. Di hPanel Hostinger, buka menu **Security** > **SSL**.
2. Cari subdomain `apps.hasilintijualan.com`.
3. Klik **Install SSL** (sertifikat Let's Encrypt gratis & otomatis diperpanjang).
4. Aktifkan fitur **Force HTTPS** agar semua akses diarahkan ke `https://` yang aman dengan enkripsi SSL.

---

### 🌐 Buka & Uji Coba Aplikasi

Buka browser dan kunjungi:
👉 **`https://apps.hasilintijualan.com`**

1. **Login Akun Admin**:
   - **Username**: `admin.rezza`
   - **Password**: `luckyrezza` (atau password yang Anda tentukan di file `.env`).
2. Masuk ke menu **Manajemen Akun** untuk mengganti password dengan kombinasi baru yang kuat.
3. Seluruh fitur (Dashboard, Pelanggan, Pesanan, SPK Produksi, Penawaran, Inventaris, Keuangan, Portal Lacak Customer) siap digunakan secara online 24/7!

---

## 🛠️ Alternatif: Panduan Deploy jika Menggunakan Hostinger VPS (Ubuntu)

Jika Anda menyewa paket **Hostinger VPS** (bukan Shared Hosting), Anda dapat mendeploy menggunakan **PM2** & **Nginx**:

1. **Login SSH ke VPS**:
   ```bash
   ssh root@IP_SERVER_ANDA
   ```
2. **Install Node.js 20 & Git**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
   sudo npm install -g pm2
   ```
3. **Upload File Proyek ke VPS** (misal di `/var/www/hijapps`):
   ```bash
   cd /var/www/hijapps
   npm install
   npm run build
   ```
4. **Jalankan Aplikasi dengan PM2**:
   ```bash
   pm2 start "npm start" --name "hij-apps"
   pm2 save
   pm2 startup
   ```
5. **Konfigurasi Reverse Proxy Nginx** (`/etc/nginx/sites-available/hijapps`):
   ```nginx
   server {
       server_name apps.hasilintijualan.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
6. **Aktifkan Nginx & SSL Certbot**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/hijapps /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d apps.hasilintijualan.com
   ```

---

## ❓ Troubleshooting & Solusi Kendala Umum

| Kendala | Penyebab | Solusi |
| :--- | :--- | :--- |
| **Layar Blank Putih saat dibuka** | Folder `dist/` belum di-build atau belum ter-upload | Jalankan `npm run build` di komputer lokal, lalu upload ulang folder `dist/` ke hosting. |
| **Error: MySQL Connection Refused / Access Denied** | Kredensial di file `.env` salah | Buka File Manager > edit file `.env`. Pastikan `DB_USER`, `DB_PASSWORD`, dan `DB_NAME` sama persis dengan yang dibuat di MySQL Databases Hostinger. |
| **Error 404 pada request `/api/...`** | Node.js app belum berjalan | Buka menu Node.js di hPanel > klik **Restart**. Pastikan statusnya hijau / **Running**. |
| **Gagal Upload Gambar / Dokumen** | Permission folder uploads terbatas | Di File Manager, klik kanan folder `uploads` > pilih **Change Permissions** > set ke `755` atau `775`. |
| **Terlalu Banyak Percobaan Login (Rate Limit)** | Salah memasukkan password > 5 kali | Tunggu 15 menit, atau restart aplikasi Node.js untuk mereset counter rate limit. |

