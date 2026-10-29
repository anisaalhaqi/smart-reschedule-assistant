# Dokumentasi Backend — Smart Reschedule Assistant

## 1. Gambaran Umum

Backend Smart Reschedule Assistant merupakan bagian dari proyek capstone Dicoding untuk membantu pengelolaan jadwal gym dan permintaan reschedule.

Backend bertanggung jawab menangani autentikasi pengguna, pengelolaan jadwal, ketersediaan slot, permintaan reschedule, pembatasan hak akses, dan konsistensi data.

Selama pengembangan, pengujian menggunakan data demo sintetis, bukan data customer nyata.

## 2. Teknologi

- Node.js
- Express.js
- PostgreSQL
- JSON Web Token (JWT)
- bcrypt
- dotenv
- nodemon

## 3. Fitur yang Telah Diimplementasikan

### 3.1 Autentikasi dan Otorisasi

- Registrasi customer.
- Login pengguna.
- Hashing password menggunakan bcrypt.
- Autentikasi menggunakan JWT.
- Pengambilan profil pengguna yang sedang login.
- Pembagian peran CUSTOMER dan ADMIN.
- Pembatasan akses berdasarkan autentikasi dan peran.
- Registrasi publik hanya dapat membuat akun CUSTOMER.

### 3.2 Pengelolaan Jadwal

- Melihat daftar jadwal.
- Melihat detail jadwal.
- Admin dapat melihat seluruh jadwal.
- Customer hanya dapat melihat jadwal miliknya sendiri.
- Validasi kepemilikan jadwal untuk akses customer.

### 3.3 Permintaan Reschedule

- Customer mengajukan reschedule untuk jadwal miliknya.
- Validasi kepemilikan jadwal, status jadwal, dan ketersediaan slot.
- Permintaan baru disimpan dengan status PENDING.
- Pencegahan permintaan PENDING ganda untuk jadwal yang sama.
- Admin dapat melihat daftar dan detail permintaan.
- Admin dapat menyetujui atau menolak permintaan.
- Persetujuan memperbarui jadwal dan menandai slot tujuan sebagai telah dipesan.
- Penolakan mengakhiri permintaan sehingga slot dapat tersedia kembali apabila tidak memiliki pemesanan atau permintaan aktif lainnya.
- Transaksi database dan penguncian data digunakan untuk membantu menjaga konsistensi perubahan.

## 4. Daftar Endpoint API

### 4.1 Autentikasi

| Metode | Endpoint             | Akses                   | Fungsi                      |
| ------ | -------------------- | ----------------------- | --------------------------- |
| POST   | `/api/auth/register` | Publik                  | Mendaftarkan customer       |
| POST   | `/api/auth/login`    | Publik                  | Login pengguna              |
| GET    | `/api/auth/me`       | Pengguna terautentikasi | Mendapatkan profil pengguna |

### 4.2 Jadwal

| Metode | Endpoint             | Akses              | Fungsi                                 |
| ------ | -------------------- | ------------------ | -------------------------------------- |
| GET    | `/api/schedules`     | Customer dan Admin | Melihat daftar jadwal sesuai hak akses |
| GET    | `/api/schedules/:id` | Customer dan Admin | Melihat detail jadwal sesuai hak akses |

### 4.3 Slot Tersedia

| Metode | Endpoint               | Fungsi                                           |
| ------ | ---------------------- | ------------------------------------------------ |
| GET    | `/api/available-slots` | Melihat slot yang tersedia sesuai aturan backend |

### 4.4 Permintaan Reschedule

| Metode | Endpoint                       | Akses              | Fungsi                                     |
| ------ | ------------------------------ | ------------------ | ------------------------------------------ |
| POST   | `/api/reschedule-requests`     | Customer           | Membuat permintaan reschedule              |
| GET    | `/api/reschedule-requests`     | Customer dan Admin | Melihat daftar permintaan sesuai hak akses |
| GET    | `/api/reschedule-requests/:id` | Customer dan Admin | Melihat detail permintaan sesuai hak akses |
| PATCH  | `/api/reschedule-requests/:id` | Admin              | Menyetujui atau menolak permintaan         |

Endpoint health check juga tersedia melalui `GET /api/health`.

## 5. Aturan Bisnis Reschedule

### 5.1 Pengajuan Permintaan

1. Pengguna harus login sebagai CUSTOMER.
2. Jadwal harus dimiliki oleh customer yang mengajukan.
3. Jadwal harus berada dalam status yang diperbolehkan untuk reschedule.
4. Slot tujuan harus tersedia dan tidak digunakan oleh pemesanan atau permintaan aktif lainnya.
5. Customer tidak boleh memiliki permintaan PENDING lain untuk jadwal yang sama.
6. Permintaan yang valid disimpan dengan status PENDING.

### 5.2 Persetujuan Admin

Ketika admin menyetujui permintaan:

1. Status permintaan dan kondisi jadwal diperiksa.
2. Ketersediaan slot diverifikasi kembali.
3. Tanggal dan waktu jadwal diperbarui sesuai slot tujuan.
4. Status jadwal menjadi RESCHEDULED.
5. Slot tujuan ditandai telah dipesan.
6. Status permintaan menjadi APPROVED.

### 5.3 Penolakan Admin

Ketika admin menolak permintaan:

1. Permintaan harus masih berstatus PENDING.
2. Status permintaan diubah menjadi REJECTED.
3. Slot tidak lagi dianggap sedang direservasi oleh permintaan tersebut.
4. Slot dapat digunakan kembali apabila tidak memiliki pemesanan atau permintaan aktif lainnya.

Perubahan persetujuan dan penolakan diproses menggunakan transaksi database.

## 6. Database

Database pengembangan bernama `smart_reschedule_assistant`.

Tabel utama:

- `users`: informasi pengguna dan peran.
- `schedules`: jadwal customer.
- `available_slots`: slot waktu yang dapat dipilih.
- `reschedule_requests`: permintaan reschedule dan statusnya.

Migration `sql/003_auth_and_customer_ownership.sql` digunakan untuk menambahkan kebutuhan autentikasi dan relasi kepemilikan jadwal.

Data pengujian menggunakan akun, jadwal, dan slot demo.

## 7. Hasil Pengujian

Pengujian dilakukan menggunakan Postman dan verifikasi database PostgreSQL.

### 7.1 Autentikasi

- Login admin dan customer berhasil.
- Akses tanpa token ditolak dengan 401 Unauthorized.
- Token tidak valid ditolak.
- Registrasi dengan email duplikat menghasilkan 409 Conflict.
- Registrasi publik tidak dapat membuat akun ADMIN.
- Endpoint profil berhasil mengembalikan data pengguna yang terautentikasi.

### 7.2 Akses Jadwal

- Admin dapat melihat seluruh jadwal.
- Customer dapat melihat jadwal miliknya.
- Customer tidak dapat mengakses jadwal customer lain.
- ID tidak valid menghasilkan 400 Bad Request.
- Jadwal yang tidak ditemukan menghasilkan 404 Not Found.

### 7.3 Permintaan Reschedule

- Pengajuan untuk jadwal milik customer lain ditolak.
- Pengajuan valid berhasil dibuat.
- Pengajuan PENDING duplikat ditolak dengan 409 Conflict.
- Customer tidak dapat menyetujui permintaan admin.
- Admin berhasil menyetujui dan menolak permintaan.
- Perubahan jadwal, permintaan, dan slot diverifikasi melalui PostgreSQL.

Pengujian validasi input tambahan dan skenario batas masih perlu dilanjutkan.

## 8. Konfigurasi dan Menjalankan Backend

Pastikan Node.js dan PostgreSQL tersedia serta database telah disiapkan.

Masuk ke direktori backend
