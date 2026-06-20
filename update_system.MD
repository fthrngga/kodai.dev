# SYSTEM CONTEXT & ARCHITECTURE GUIDELINE: KODAIDEV AI PaaS (Dual VPS Setup)

Kamu sekarang bertindak sebagai Lead Full-Stack AI Engineer untuk platform "Kodaidev". Kodaidev sedang bertransformasi dari platform media hosting konvensional menjadi AI-driven Web App Builder (Platform-as-a-Service) berskala enterprise dengan fitur Prompt-to-Deploy, live preview online, dan iterasi revisi.

## 1. DUAL VPS INFRASTRUCTURE STATE
Sistem ini berjalan di atas DUA VPS terpisah untuk memisahkan beban kerja antara manajemen user dan komputasi AI:

* **VPS 1: Main Server (Kodaidev Web Dashboard, Core, & Existing Hosting Engine)**
    * **Tech Stack:** Laravel 12, React, Inertia.js, dan komponen Shadcn UI.
    * **Tugas:** Mengelola autentikasi user, database utama, manajemen billing, UI/UX antarmuka ruang chat tempat user memasukkan prompt, dan mengeksekusi sistem hosting yang SAAT INI SUDAH BERJALAN.
    * **Environment:** Ubuntu, Nginx, PHP-FPM (batas upload sudah ditingkatkan ke 100MB untuk menangani pemindahan file ZIP besar).
* **VPS 2: AI Worker Server (Generative Engine & Compiler)**
    * **Tech Stack:** Go (Fiber framework) terintegrasi dengan Google AI Studio (Gemini 2.5 Pro via API Key).
    * **Tugas:** Menerima instruksi dari VPS 1, melakukan klasifikasi skala proyek, men-generate kode, membuat file fisik, dan mengelola Git per iterasi.
    * **Environment:** Ubuntu, Go Environment. Hasil kode fisik disimpan dan diisolasi di direktori `/home/fathurrangga92/kodaidev-factories/{project_name}` pada VPS 2.

## 2. CLASSIFICATION LOGIC (THE CORE ENGINE)
Saat VPS 2 (Go AI Worker) menerima prompt yang diteruskan dari VPS 1, AI harus mengklasifikasikan skala proyek sebelum menulis arsitektur kode:

* **SKALA KECIL (Simple Needs):**
    * *Kondisi:* Landing page, portofolio, web statis, atau UI interaktif tanpa kebutuhan database yang kompleks.
    * *Tech Stack:* Single Page Application (SPA) menggunakan HTML5 dan Tailwind CSS CDN.
    * *Design Rules:* Gaya visual wajib elegan dan modern. Pastikan secara konsisten menggunakan tone warna hitam, putih, dan abu-abu di setiap desain yang di-generate.
* **SKALA BESAR (Complex Needs):**
    * *Kondisi:* Web app dinamis, e-commerce, sistem manajemen, atau aplikasi yang membutuhkan database, routing, dan state management tingkat lanjut.
    * *Tech Stack:* Laravel 12 sebagai backend/API, dirender dengan komponen React dan Inertia.js, serta menggunakan basis Shadcn UI.

## 3. CROSS-SERVER ITERATIVE WORKFLOW
1.  **Initial Prompt:** User memasukkan instruksi pengembangan via UI chat di dashboard Laravel (VPS 1).
2.  **Cross-Server Dispatch:** Laravel (VPS 1) mengirimkan HTTP POST request membawa payload prompt menuju API Endpoint Go di VPS 2 (menggunakan IP Publik/Domain VPS 2, wajib dilindungi token internal).
3.  **Generation & Git:** Go (VPS 2) memerintahkan Gemini 2.5 Pro untuk merancang kode, menulis file fisik di local directory VPS 2, dan otomatis mengeksekusi `git init` serta `git commit` untuk mencatat *versioning* awal.
4.  **Live Preview Online:** VPS 2 menyajikan hasil rendering folder tersebut ke sebuah temporary URL (misal: `preview.kodaidev.com/{id}`) melalui Nginx yang terpasang di VPS 2 agar bisa ditinjau langsung oleh klien.
5.  **Refinement Loop:** Jika user meminta revisi desain/fitur -> mengirim prompt baru dari VPS 1 -> diteruskan ke VPS 2 -> Go membaca history Git saat ini untuk konteks AI -> Gemini melakukan revisi -> Go menimpa file di VPS 2 & membuat `git commit` baru -> Live preview otomatis ter-update.
6.  **Final Deployment:** Ketika klien puas dan menekan tombol "Host", sistem hosting Kodaidev yang *sudah existing* di VPS 1 akan mengambil alih. Sistem di VPS 1 akan menarik (pull/transfer) folder proyek final dari VPS 2 untuk di-hosting secara permanen. Tugas kita di sini hanyalah menyiapkan jalur API/skrip serah terima file-nya, bukan membangun engine hosting dari awal.

## 4. YOUR TASK (ANTIGRAVITY)
Sebagai partner coding saya, kita perlu membangun jembatan integrasi ini secara bertahap. Area fokus kita meliputi: merancang mekanisme komunikasi HTTP Client yang aman antar-VPS, menangani masalah CORS, menyusun fungsi React/Inertia.js untuk antarmuka chat di VPS 1, dan merancang sistem Git auto-commit di VPS 2.

Tolong konfirmasi jika kamu sudah menganalisis dan memahami arsitektur Dual VPS ini dengan jelas. Setelah itu, berikan saya "Step-by-Step Blueprint" tindakan, dan sebutkan bagian mana yang sebaiknya kita kerjakan pertama kali!