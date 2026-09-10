# Tutorial: Upload HIJ Apps ke cPanel (MySQL Database)

Tutorial ini akan membantu Anda memindahkan aplikasi dari Google Sheets ke database MySQL di cPanel Anda.

## Langkah 1: Persiapan Database di cPanel

1.  **Login ke cPanel** Anda.
2.  Cari menu **MySQL® Database Wizard**.
3.  **Buat Database Baru**: Masukkan nama database (contoh: `u123_hij_apps`).
4.  **Buat User Database**: Masukkan username dan password. **Catat credential ini**.
5.  **Add User to Database**: Centang **ALL PRIVILEGES**.
6.  Buka menu **phpMyAdmin** di cPanel.
7.  Pilih database yang baru dibuat di sisi kiri.
8.  Klik tab **Import** di bagian atas.
9.  Pilih file `db_schema.sql` yang ada di folder aplikasi Anda.
10. Klik **Go** atau **Import**. Database Anda sekarang sudah siap dengan tabel-tabel yang diperlukan.

## Langkah 2: Persiapan File Aplikasi (Build & Packaging)

Bagian ini bertujuan untuk mengubah kode program menjadi file yang siap dijalankan di server.

1.  **Jalankan Build**:
    Buka terminal di folder proyek Anda (di komputer lokal), lalu ketik:
    ```bash
    npm run build
    ```
    *   **Hasilnya**: Anda akan melihat folder baru bernama **`dist`** muncul. Folder ini berisi file website yang sudah dioptimasi.

2.  **Membuat File ZIP**:
    Jangan upload semua file. Kita hanya butuh file utama untuk dijalankan di server. Pilih file/folder berikut:
    *   Folder `api/`
    *   Folder `dist/`
    *   File `package.json`
    *   File `.env`
    *   File `db_schema.sql` (opsional, untuk backup)
    
    **Klik kanan** pada pilihan tersebut lalu pilih **Compress to ZIP** (atau "Send to Compressed Folder"). Beri nama file tersebut, contoh: `hij-app-prod.zip`.

## Langkah 3: Upload ke cPanel

1.  Di cPanel, cari menu **File Manager**.
2.  Masuk ke direktori aplikasi Anda (biasanya folder baru di luar `public_html`, contoh: `/home/user/hij-app`).
3.  **Upload file ZIP** Anda ke sana dan **Extract**.

## Langkah 4: Setup Node.js di cPanel

1.  Cari menu **Setup Node.js App** di cPanel.
2.  Klik **Create Application**.
3.  **Node.js version**: Pilih versi terbaru (misal 18.x atau 20.x).
4.  **Application mode**: Production.
5.  **Application root**: Masukkan path tempat Anda mengekstrak file tadi (contoh: `/hij-app`).
6.  **Application URL**: Pilih domain atau subdomain Anda.
7.  **Application startup file**: Masukkan `api/index.ts` (jika menggunakan tsx) atau sesuaikan dengan file entry point Anda.
    *Catatan: Beberapa cPanel memerlukan file JS. Jika gagal, Anda mungkin perlu melakukan kompilasi TypeScript terlebih dahulu atau menggunakan `tsx` sebagai loader di `package.json`.*
8.  Klik **Create**.

## Langkah 5: Konfigurasi Environment Variables (.env)

1.  Di menu **Setup Node.js App**, cari bagian **Configuration File** atau **Environment variables**.
2.  Tambahkan variable berikut sesuai dengan database cPanel Anda:
    *   `DB_HOST`: `localhost`
    *   `DB_USER`: (Username database yang Anda buat di Langkah 1)
    *   `DB_PASSWORD`: (Password database Anda)
    *   `DB_NAME`: (Nama database Anda)
    *   `NODE_ENV`: `production`

## Langkah 6: Install Dependencies

1.  Masih di menu **Setup Node.js App**, klik tombol **Run JS Script** atau buka **Terminal** cPanel.
2.  Jalankan perintah:
    ```bash
    npm install
    ```
3.  Setelah selesai, klik **Restart** pada aplikasi Node.js Anda.

Aplikasi Anda sekarang aktif dan menggunakan database MySQL di cPanel!
