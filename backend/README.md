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
- Pembagian peran `CUSTOMER` dan `ADMIN`.
- Pembatasan akses berdasarkan autentikasi dan peran.
- Registrasi publik hanya dapat membuat akun `CUSTOMER`.

### 3.2 Pengelolaan Jadwal

- Melihat daftar jadwal.
- Melihat detail jadwal.
- Admin dapat melihat seluruh jadwal.
- Customer hanya dapat melihat jadwal miliknya sendiri.
- Validasi kepemilikan jadwal untuk akses customer.

### 3.3 Permintaan Reschedule

- Customer mengajukan reschedule untuk jadwal miliknya.
- Validasi kepemilikan jadwal, status jadwal, dan ketersediaan slot.
- Permintaan baru disimpan dengan status `PENDING`.
- Pencegahan permintaan `PENDING` ganda untuk jadwal yang sama.
- Customer dan admin dapat melihat permintaan sesuai hak akses.
- Admin dapat menyetujui atau menolak permintaan.
- Persetujuan memperbarui jadwal dan menandai slot tujuan sebagai telah dipesan.
- Penolakan mengakhiri permintaan sehingga slot dapat tersedia kembali apabila tidak memiliki pemesanan atau permintaan aktif lainnya.
- Transaksi database dan penguncian data digunakan untuk membantu menjaga konsistensi perubahan.

## 4. Daftar Endpoint API

Seluruh endpoint menggunakan prefix `/api`.

### 4.1 Autentikasi

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Publik | Mendaftarkan customer |
| POST | `/api/auth/login` | Publik | Login pengguna |
| GET | `/api/auth/me` | Pengguna terautentikasi | Mendapatkan profil pengguna |

### 4.2 Jadwal

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/schedules` | Customer dan Admin | Melihat daftar jadwal sesuai hak akses |
| GET | `/api/schedules/:id` | Customer dan Admin | Melihat detail jadwal sesuai hak akses |

### 4.3 Slot Tersedia

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/available-slots` | Pengguna terautentikasi | Melihat slot yang tersedia sesuai aturan backend |

### 4.4 Permintaan Reschedule

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| POST | `/api/reschedule-requests` | Customer | Membuat permintaan reschedule |
| GET | `/api/reschedule-requests` | Customer dan Admin | Melihat daftar permintaan sesuai hak akses |
| GET | `/api/reschedule-requests/:id` | Customer dan Admin | Melihat detail permintaan sesuai hak akses |
| PATCH | `/api/reschedule-requests/:id` | Admin | Menyetujui atau menolak permintaan |

### 4.5 Health Check

| Metode | Endpoint | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/health` | Sesuai konfigurasi aplikasi | Memeriksa kondisi API dan koneksi database |

## 5. Kontrak Request dan Response

### 5.1 Format Request

Request body dikirim menggunakan format JSON dengan header:

```http
Content-Type: application/json
```

#### Registrasi Customer

`POST /api/auth/register`

```json
{
  "name": "Customer Test",
  "email": "customer@example.test",
  "password": "contoh-password-yang-kuat"
}
```

Password pada contoh hanya ilustrasi. Gunakan password pengujian sendiri saat melakukan request.

Registrasi publik digunakan untuk membuat akun customer, bukan akun admin.

#### Login

`POST /api/auth/login`

```json
{
  "email": "customer@example.test",
  "password": "contoh-password-yang-kuat"
}
```

#### Membuat Permintaan Reschedule

`POST /api/reschedule-requests`

```json
{
  "schedule_id": 1,
  "available_slot_id": 701,
  "reason": "Ada keperluan keluarga sehingga perlu mengubah jadwal."
}
```

Field yang digunakan:

| Field | Keterangan |
| --- | --- |
| `schedule_id` | ID jadwal milik customer yang ingin di-reschedule |
| `available_slot_id` | ID slot alternatif yang dipilih |
| `reason` | Alasan pengajuan reschedule |

Tanggal dan waktu alternatif diperoleh dari slot yang dipilih. Oleh karena itu, request menggunakan `available_slot_id`, bukan mengirim `requested_date` dan `requested_time` secara langsung.

#### Memproses Permintaan Reschedule

`PATCH /api/reschedule-requests/:id`

Menyetujui permintaan:

```json
{
  "status": "APPROVED"
}
```

Menolak permintaan:

```json
{
  "status": "REJECTED"
}
```

Nilai status yang valid untuk pemrosesan admin adalah `APPROVED` dan `REJECTED`. Permintaan yang diproses harus masih berstatus `PENDING`.

### 5.2 Autentikasi JWT

Endpoint yang memerlukan autentikasi menggunakan header:

```http
Authorization: Bearer <JWT_TOKEN>
```

Token diperoleh melalui endpoint login.

Respons login menyediakan token JWT dan informasi pengguna. Token memiliki masa berlaku sesuai konfigurasi autentikasi backend.

Jangan membagikan token autentikasi atau menyimpan kredensial rahasia ke repository.

### 5.3 Format Response

Response API menggunakan JSON.

Contoh struktur response sukses:

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "token": "<JWT_TOKEN>",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "name": "Customer Test",
      "email": "customer@example.test",
      "role": "CUSTOMER"
    }
  }
}
```

Contoh di atas menggambarkan struktur response login. Field `data` pada endpoint lain menyesuaikan data yang dikembalikan oleh endpoint tersebut.

Contoh struktur response error:

```json
{
  "status": "error",
  "message": "Authentication token is required"
}
```

Response error dapat memiliki pesan yang berbeda sesuai jenis kesalahan. Konsumen API sebaiknya menggunakan HTTP status code dan struktur response sebagai dasar penanganan error.

## 6. Status HTTP dan Penanganan Error

| Status HTTP | Makna | Contoh penggunaan |
| --- | --- | --- |
| `200 OK` | Operasi berhasil | Mengambil data atau memproses permintaan |
| `201 Created` | Resource berhasil dibuat | Registrasi atau pengajuan reschedule yang berhasil |
| `400 Bad Request` | Request tidak valid | Parameter atau input tidak memenuhi validasi |
| `401 Unauthorized` | Autentikasi gagal atau token tidak tersedia | Mengakses endpoint terlindungi tanpa token |
| `403 Forbidden` | Pengguna tidak memiliki izin | Customer mencoba memproses permintaan sebagai admin |
| `404 Not Found` | Resource tidak ditemukan | Jadwal atau permintaan tidak ditemukan |
| `409 Conflict` | Operasi bertentangan dengan kondisi data saat ini | Email duplikat, pengajuan yang bertentangan, atau permintaan yang sudah diproses |
| `500 Internal Server Error` | Terjadi kesalahan internal server | Kesalahan tak terduga pada backend |

Contoh error yang telah muncul dalam pengujian:

## 401 Unauthorized

Request ke endpoint terlindungi tanpa token ditolak.

```json
{
  "status": "error",
  "message": "Authentication token is required"
}
```

## 403 Forbidden

Customer yang mencoba memproses permintaan admin ditolak.

```json
{
  "status": "error",
  "message": "You do not have permission to access this resource"
}
```

## 409 Conflict

Permintaan yang sudah tidak berstatus `PENDING` tidak dapat diproses ulang.

```json
{
  "status": "error",
  "message": "Only pending requests can be processed"
}
```

Pesan error yang ditampilkan di atas merupakan contoh respons yang telah diamati. Pesan aktual lainnya mengikuti implementasi masing-masing endpoint.

## 7. Aturan Bisnis Reschedule

### 7.1 Pengajuan Permintaan

1. Pengguna harus login sebagai `CUSTOMER`.
2. Jadwal harus dimiliki oleh customer yang mengajukan.
3. Jadwal harus berada dalam status yang diperbolehkan untuk reschedule.
4. Slot tujuan harus tersedia dan tidak digunakan oleh pemesanan atau permintaan aktif lainnya.
5. Customer tidak boleh memiliki permintaan `PENDING` lain untuk jadwal yang sama.
6. Permintaan yang valid disimpan dengan status `PENDING`.

### 7.2 Persetujuan Admin

Ketika admin menyetujui permintaan:

1. Status permintaan dan kondisi jadwal diperiksa.
2. Permintaan harus masih berstatus `PENDING`.
3. Ketersediaan slot diverifikasi kembali.
4. Tanggal dan waktu jadwal diperbarui sesuai slot tujuan.
5. Status jadwal menjadi `RESCHEDULED`.
6. Slot tujuan ditandai telah dipesan.
7. Status permintaan menjadi `APPROVED`.

Perubahan tersebut diproses menggunakan transaksi database untuk membantu menjaga konsistensi data.

### 7.3 Penolakan Admin

Ketika admin menolak permintaan:

1. Permintaan harus masih berstatus `PENDING`.
2. Status permintaan diubah menjadi `REJECTED`.
3. Permintaan yang telah ditolak tidak dapat diproses ulang.
4. Slot dapat digunakan kembali apabila tidak memiliki pemesanan atau permintaan aktif lainnya.

### 7.4 Pembatasan Akses

- Endpoint terlindungi memerlukan autentikasi.
- Customer hanya dapat mengakses jadwal miliknya sendiri.
- Customer hanya dapat mengajukan reschedule untuk jadwal miliknya sendiri.
- Customer tidak memiliki izin untuk menyetujui atau menolak permintaan.
- Pemrosesan persetujuan dan penolakan dilakukan oleh admin.

## 8. Database

Database pengembangan bernama `smart_reschedule_assistant`.

Tabel utama:

- `users`: informasi pengguna dan peran.
- `schedules`: jadwal customer.
- `available_slots`: slot waktu yang dapat dipilih.
- `reschedule_requests`: permintaan reschedule dan statusnya.

Migration `sql/003_auth_and_customer_ownership.sql` digunakan untuk menambahkan kebutuhan autentikasi dan relasi kepemilikan jadwal.

Data pengujian menggunakan akun, jadwal, dan slot demo sintetis.

## 9. Hasil Pengujian

Pengujian dilakukan menggunakan Postman dan verifikasi database PostgreSQL.

### 9.1 Autentikasi dan Otorisasi

- Login customer berhasil.
- Login admin berhasil.
- Pengambilan profil melalui endpoint `/api/auth/me` berhasil.
- Akses tanpa token ditolak dengan `401 Unauthorized`.
- Customer tidak diizinkan memproses permintaan admin dan menerima `403 Forbidden`.

### 9.2 Akses Jadwal

- Customer berhasil mengambil daftar jadwal sesuai hak aksesnya.
- Customer berhasil mengambil detail jadwal miliknya.
- Pengujian endpoint jadwal menggunakan data demo berhasil.

### 9.3 Permintaan Reschedule

- Pengajuan reschedule yang valid berhasil dibuat dengan status `PENDING`.
- Daftar dan detail permintaan berhasil diambil.
- Admin berhasil menyetujui permintaan.
- Perubahan status jadwal, permintaan, dan ketersediaan slot diverifikasi melalui PostgreSQL.
- Pemrosesan ulang permintaan yang sudah tidak berstatus `PENDING` ditolak dengan `409 Conflict`.

Hasil di atas merangkum skenario yang telah diuji. Tidak semua kemungkinan input tidak valid dan kondisi batas otomatis tercakup oleh daftar ini.

## 10. Konfigurasi dan Menjalankan Backend

Pastikan Node.js dan PostgreSQL tersedia serta database telah disiapkan.

### 10.1 Instalasi Dependensi

Dari direktori root repository, jalankan:

cd backend
npm install

### 10.2 Konfigurasi Environment

Buat file `.env` di direktori `backend` dan sesuaikan konfigurasi dengan lingkungan lokal.

Variabel environment yang digunakan:

| Variabel | Fungsi |
| --- | --- |
| `PORT` | Port server; jika tidak diatur, aplikasi menggunakan port 3000 |
| `DB_HOST` | Host PostgreSQL |
| `DB_PORT` | Port PostgreSQL |
| `DB_NAME` | Nama database |
| `DB_USER` | Pengguna database |
| `DB_PASSWORD` | Password pengguna database |
| `JWT_SECRET` | Secret untuk autentikasi JWT |

Jangan memasukkan file `.env` atau kredensial rahasia ke repository Git.

### 10.3 Menjalankan Server

Untuk menjalankan server dalam mode pengembangan:

npm run dev

Untuk menjalankan server secara langsung:

npm start

Jalankan perintah dari direktori `backend`.

### 10.4 Pemeriksaan Server

Setelah server berjalan, periksa health check melalui endpoint:

`GET /api/health`

Server yang berjalan dengan benar seharusnya memberikan respons sukses apabila API dan koneksi database tersedia.
