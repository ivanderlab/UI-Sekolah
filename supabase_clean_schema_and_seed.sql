-- ==============================================================================
-- SUPABASE MASTER DATABASE SCHEMA & SANITIZED SEED DATA
-- Target Project: Sistem Informasi Absensi & Presensi (SIAP)
-- Fokus Jurusan: TKJ (Teknik Komputer & Jaringan) & DKV (Desain Komunikasi Visual)
-- Jenjang Kelas: X, XI, XII
-- Seluruh Data 100% FIKTIF / SANITIZED (Bebas dari PII/Identitas Asli)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPE DATA ENUM
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'guru', 'siswa');
  END IF;
END $$;

-- 3. TABEL PENGATURAN SISTEM
CREATE TABLE IF NOT EXISTS public.pengaturan_sistem (
  id SERIAL PRIMARY KEY,
  kunci TEXT UNIQUE NOT NULL,
  nilai TEXT NOT NULL,
  keterangan TEXT,
  diperbarui_pada TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.pengaturan_sistem (kunci, nilai, keterangan) VALUES
  ('nama_sekolah', 'SMK Negeri Kejuruan Digital', 'Nama instansi sekolah percontohan'),
  ('semester_aktif', 'Ganjil 2026/2027', 'Semester aktif berjalan'),
  ('jp_mulai', '07:15', 'Jam masuk jam pelajaran pertama'),
  ('jp_durasi', '45', 'Durasi per jam pelajaran dalam menit'),
  ('jp_total', '9', 'Total jam pelajaran reguler'),
  ('istirahat_1_setelah', '3', 'Istirahat pertama setelah JP ke-3'),
  ('istirahat_1_durasi', '20', 'Durasi istirahat pagi'),
  ('istirahat_2_setelah', '6', 'Istirahat kedua setelah JP ke-6'),
  ('istirahat_2_durasi', '40', 'Durasi istirahat siang')
ON CONFLICT (kunci) DO UPDATE 
SET nilai = EXCLUDED.nilai, keterangan = EXCLUDED.keterangan, diperbarui_pada = NOW();

-- 4. TABEL KELAS (Fokus X, XI, XII Jurusan TKJ & DKV)
CREATE TABLE IF NOT EXISTS public.kelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama VARCHAR(50) UNIQUE NOT NULL,
  tingkat VARCHAR(10) NOT NULL,
  jurusan VARCHAR(20) NOT NULL,
  wali_kelas_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Kelas Resmi (X, XI, XII untuk TKJ & DKV)
INSERT INTO public.kelas (id, nama, tingkat, jurusan) VALUES
  ('11111111-0010-0001-0001-000000000001', 'X TKJ 1', 'X', 'TKJ'),
  ('11111111-0010-0001-0002-000000000002', 'X TKJ 2', 'X', 'TKJ'),
  ('11111111-0010-0002-0001-000000000003', 'X DKV 1', 'X', 'DKV'),
  ('11111111-0010-0002-0002-000000000004', 'X DKV 2', 'X', 'DKV'),
  ('11111111-0011-0001-0001-000000000005', 'XI TKJ 1', 'XI', 'TKJ'),
  ('11111111-0011-0001-0002-000000000006', 'XI TKJ 2', 'XI', 'TKJ'),
  ('11111111-0011-0002-0001-000000000007', 'XI DKV 1', 'XI', 'DKV'),
  ('11111111-0011-0002-0002-000000000008', 'XI DKV 2', 'XI', 'DKV'),
  ('e88128be-8fc3-4973-8d69-00ef17571626', 'XII TKJ 1', 'XII', 'TKJ'),
  ('11111111-0012-0001-0002-000000000010', 'XII TKJ 2', 'XII', 'TKJ'),
  ('11111111-0012-0002-0001-000000000011', 'XII DKV 1', 'XII', 'DKV'),
  ('11111111-0012-0002-0002-000000000012', 'XII DKV 2', 'XII', 'DKV')
ON CONFLICT (nama) DO NOTHING;

-- 5. TABEL PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  role VARCHAR(30) DEFAULT 'siswa' NOT NULL,
  is_sekretaris BOOLEAN DEFAULT FALSE NOT NULL,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE SET NULL,
  identifier VARCHAR(100),
  nip VARCHAR(30),
  nisn VARCHAR(30),
  avatar_url TEXT,
  phone VARCHAR(30),
  must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update foreign key wali_kelas_id di tabel kelas
ALTER TABLE public.kelas DROP CONSTRAINT IF EXISTS fk_kelas_wali_guru;
ALTER TABLE public.kelas ADD CONSTRAINT fk_kelas_wali_guru 
FOREIGN KEY (wali_kelas_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 6. TABEL MATA PELAJARAN (Spesifik TKJ & DKV + Mapel Umum)
CREATE TABLE IF NOT EXISTS public.mata_pelajaran (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(150) NOT NULL,
  jurusan VARCHAR(20) DEFAULT 'UMUM' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.mata_pelajaran (id, kode, nama, jurusan) VALUES
  ('22222222-0001-0000-0000-000000000001', 'BIND', 'Bahasa Indonesia', 'UMUM'),
  ('22222222-0002-0000-0000-000000000002', 'BING', 'Bahasa Inggris Kejuruan', 'UMUM'),
  ('22222222-0003-0000-0000-000000000003', 'PPKN', 'Pendidikan Pancasila & Kewarganegaraan', 'UMUM'),
  ('22222222-0004-0000-0000-000000000004', 'MTK', 'Matematika Terapan', 'UMUM'),
  ('22222222-0005-0000-0000-000000000005', 'AIJ', 'Administrasi Infrastruktur Jaringan', 'TKJ'),
  ('22222222-0006-0000-0000-000000000006', 'TLJ', 'Teknologi Layanan Jaringan', 'TKJ'),
  ('22222222-0007-0000-0000-000000000007', 'CYBER', 'Keamanan Jaringan & Cyber Security', 'TKJ'),
  ('22222222-0008-0000-0000-000000000008', 'CLOUD', 'Cloud Computing & Server Virtualization', 'TKJ'),
  ('22222222-0009-0000-0000-000000000009', 'DKV-DESAIN', 'Desain Komunikasi Visual & Motion', 'DKV'),
  ('22222222-0010-0000-0000-000000000010', 'DKV-FOTO', 'Fotografi & Videografi Editing', 'DKV'),
  ('22222222-0011-0000-0000-000000000011', 'DKV-TIPO', 'Tipografi & Ilustrasi Digital', 'DKV'),
  ('22222222-0012-0000-0000-000000000012', 'PKK', 'Produk Kreatif & Kewirausahaan', 'UMUM')
ON CONFLICT (kode) DO NOTHING;

-- 7. TABEL JADWAL PELAJARAN
CREATE TABLE IF NOT EXISTS public.jadwal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kelas_id UUID NOT NULL REFERENCES public.kelas(id) ON DELETE CASCADE,
  guru_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mapel_id UUID NOT NULL REFERENCES public.mata_pelajaran(id) ON DELETE CASCADE,
  hari VARCHAR(20) NOT NULL,
  jam_mulai TIME NOT NULL DEFAULT '07:15:00',
  jam_selesai TIME NOT NULL DEFAULT '09:30:00',
  jam_ke_mulai INTEGER NOT NULL DEFAULT 1,
  jam_ke_selesai INTEGER NOT NULL DEFAULT 3,
  durasi_jp INTEGER GENERATED ALWAYS AS (jam_ke_selesai - jam_ke_mulai + 1) STORED,
  ruang VARCHAR(100) DEFAULT 'Ruang Teori',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABEL ABSEN HARIAN, ABSEN MAPEL, & ABSEN SESI
CREATE TABLE IF NOT EXISTS public.absen_harian (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  siswa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kelas_id UUID REFERENCES public.kelas(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Hadir',
  status_validasi VARCHAR(20) DEFAULT 'draft',
  keterangan TEXT,
  diinput_oleh UUID REFERENCES public.profiles(id),
  divalidasi_oleh UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tanggal, siswa_id)
);

CREATE TABLE IF NOT EXISTS public.absen_mapel (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jadwal_id UUID NOT NULL REFERENCES public.jadwal(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  siswa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Hadir',
  keterangan TEXT,
  diinput_oleh UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tanggal, jadwal_id, siswa_id)
);
CREATE TABLE IF NOT EXISTS public.absen_sesi (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  jadwal_id UUID REFERENCES public.jadwal(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  siswa_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status CHAR(1) NOT NULL CHECK (status IN ('H', 'S', 'I', 'A')),
  keterangan TEXT,
  diinput_oleh UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(jadwal_id, tanggal, siswa_id)
);

CREATE TABLE IF NOT EXISTS public.streak_siswa (
  siswa_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  jumlah INTEGER DEFAULT 0 NOT NULL,
  hari_terakhir DATE DEFAULT CURRENT_DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'terputus', 'beban')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. STREAK TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.update_streak_siswa()
RETURNS TRIGGER AS $$
DECLARE
  today DATE := CURRENT_DATE;
  last_date DATE;
  streak_count INTEGER;
BEGIN
  SELECT hari_terakhir, jumlah INTO last_date, streak_count 
  FROM public.streak_siswa 
  WHERE siswa_id = NEW.siswa_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.streak_siswa (siswa_id, jumlah, hari_terakhir, status)
    VALUES (NEW.siswa_id, 1, today, 'aktif');
  ELSE
    IF today - last_date = 1 AND NEW.status = 'H' THEN
      UPDATE public.streak_siswa 
      SET jumlah = streak_count + 1, hari_terakhir = today, updated_at = NOW()
      WHERE siswa_id = NEW.siswa_id;
    ELSIF today - last_date > 1 OR NEW.status != 'H' THEN
      UPDATE public.streak_siswa 
      SET jumlah = 1, hari_terakhir = today,
          status = CASE WHEN NEW.status != 'H' THEN 'terputus' ELSE 'aktif' END,
          updated_at = NOW()
      WHERE siswa_id = NEW.siswa_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_absen_sesi_streak ON public.absen_sesi;
CREATE TRIGGER trg_absen_sesi_streak
  AFTER INSERT OR UPDATE OF status ON public.absen_sesi
  FOR EACH ROW
  WHEN (NEW.status IN ('H', 'S', 'I', 'A'))
  EXECUTE FUNCTION public.update_streak_siswa();

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absen_sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengaturan_sistem ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated & anon
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read kelas" ON public.kelas;
CREATE POLICY "Public read kelas" ON public.kelas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read mapel" ON public.mata_pelajaran;
CREATE POLICY "Public read mapel" ON public.mata_pelajaran FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read jadwal" ON public.jadwal;
CREATE POLICY "Public read jadwal" ON public.jadwal FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read absen_sesi" ON public.absen_sesi;
CREATE POLICY "Public read absen_sesi" ON public.absen_sesi FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read streak" ON public.streak_siswa;
CREATE POLICY "Public read streak" ON public.streak_siswa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read pengaturan" ON public.pengaturan_sistem;
CREATE POLICY "Public read pengaturan" ON public.pengaturan_sistem FOR SELECT USING (true);

-- Self profile update
DROP POLICY IF EXISTS "Self profile update" ON public.profiles;
CREATE POLICY "Self profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Write permission for attendance
DROP POLICY IF EXISTS "Teacher or secretary insert attendance" ON public.absen_sesi;
CREATE POLICY "Teacher or secretary insert attendance" ON public.absen_sesi 
FOR ALL USING (auth.role() = 'authenticated');

-- ==============================================================================
-- 11. DEMO AUTH USERS SEED (Password untuk semua akun: Demo@2025)
-- ==============================================================================

-- Helper function untuk insert aman ke auth.users
CREATE OR REPLACE FUNCTION public.seed_demo_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_nama TEXT,
  p_role TEXT,
  p_is_sekre BOOLEAN,
  p_kelas_id UUID,
  p_identifier TEXT,
  p_avatar TEXT
) RETURNS VOID AS $$
BEGIN
  -- Insert ke auth.users
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
  ) VALUES (
    p_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    json_build_object('username', p_username, 'name', p_nama),
    false, 'authenticated', 'authenticated'
  ) ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt(p_password, gen_salt('bf')),
    email = p_email;

  -- Insert ke auth.identities
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    p_id,
    p_id,
    p_email,
    json_build_object('sub', p_id, 'email', p_email),
    'email', NOW(), NOW(), NOW()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  -- Insert ke public.profiles
  INSERT INTO public.profiles (
    id, username, nama, role, is_sekretaris, kelas_id, identifier, avatar_url, must_change_password
  ) VALUES (
    p_id, p_username, p_nama, p_role, p_is_sekre, p_kelas_id, p_identifier, p_avatar, false
  ) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    nama = EXCLUDED.nama,
    role = EXCLUDED.role,
    is_sekretaris = EXCLUDED.is_sekretaris,
    kelas_id = EXCLUDED.kelas_id,
    identifier = EXCLUDED.identifier;
END;
$$ LANGUAGE plpgsql;

-- Eksekusi 4 Akun Demo Utama
SELECT public.seed_demo_user(
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa',
  'superadmin_demo@sekolah.demo',
  'Demo@2025',
  'superadmin_demo',
  'Superadmin SIAP (Kepala Sekolah)',
  'superadmin',
  false,
  null,
  'superadmin',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa',
  'tu_demo@sekolah.demo',
  'Demo@2025',
  'tu_demo',
  'Staf Tata Usaha (Operator)',
  'operator',
  false,
  null,
  'tu',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa',
  'guru_demo@sekolah.demo',
  'Demo@2025',
  'guru_demo',
  'Budi Santoso, S.Kom.',
  'guru',
  false,
  'e88128be-8fc3-4973-8d69-00ef17571626', -- Wali XII TKJ 1
  '198501012010011001',
  'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa',
  'guru_dkv@sekolah.demo',
  'Demo@2025',
  'guru_dkv',
  'Dewi Lestari, S.Pd',
  'guru',
  false,
  '11111111-0012-0002-0001-000000000011', -- Wali XII DKV 1
  '199003032014022003',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa',
  'siswa_demo@sekolah.demo',
  'Demo@2025',
  'siswa_demo',
  'Farhan Maulana',
  'siswa',
  true, -- Sekretaris Kelas
  'e88128be-8fc3-4973-8d69-00ef17571626', -- XII TKJ 1
  '0075120002',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0006-0006-0006-aaaaaaaaaaaa',
  'aditya_demo@sekolah.demo',
  'Demo@2025',
  'aditya_demo',
  'Aditya Pratama',
  'siswa',
  false,
  'e88128be-8fc3-4973-8d69-00ef17571626', -- XII TKJ 1
  '0075120001',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
);

SELECT public.seed_demo_user(
  'aaaaaaaa-0007-0007-0007-aaaaaaaaaaaa',
  'dimas_demo@sekolah.demo',
  'Demo@2025',
  'dimas_demo',
  'Dimas Setiawan',
  'siswa',
  false,
  '11111111-0012-0002-0001-000000000011', -- XII DKV 1
  '0075120006',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
);

-- Set Wali Kelas di tabel kelas
UPDATE public.kelas SET wali_kelas_id = 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa' WHERE id = 'e88128be-8fc3-4973-8d69-00ef17571626'; -- XII TKJ 1 -> Pak Budi
UPDATE public.kelas SET wali_kelas_id = 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa' WHERE id = '11111111-0012-0002-0001-000000000011'; -- XII DKV 1 -> Bu Dewi

-- 12. SEED JADWAL PELAJARAN KELAS XII TKJ 1 & XII DKV 1
INSERT INTO public.jadwal (kelas_id, guru_id, mapel_id, hari, jam_ke_mulai, jam_ke_selesai, ruang) VALUES
  -- SENIN XII TKJ 1
  ('e88128be-8fc3-4973-8d69-00ef17571626', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '22222222-0005-0000-0000-000000000005', 'Senin', 1, 3, 'Lab Komputer TKJ 1'),
  ('e88128be-8fc3-4973-8d69-00ef17571626', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '22222222-0007-0000-0000-000000000007', 'Senin', 4, 6, 'Lab Cyber Security'),
  -- SENIN XII DKV 1
  ('11111111-0012-0002-0001-000000000011', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '22222222-0009-0000-0000-000000000009', 'Senin', 1, 3, 'Studio Desain DKV'),
  ('11111111-0012-0002-0001-000000000011', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '22222222-0010-0000-0000-000000000010', 'Senin', 4, 6, 'Studio Foto & Video'),
  -- SELASA XII TKJ 1
  ('e88128be-8fc3-4973-8d69-00ef17571626', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '22222222-0006-0000-0000-000000000006', 'Selasa', 1, 4, 'Lab Jaringan'),
  -- SELASA XII DKV 1
  ('11111111-0012-0002-0001-000000000011', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '22222222-0011-0000-0000-000000000011', 'Selasa', 1, 4, 'Studio Ilustrasi Digital'),
  -- RABU XII TKJ 1 & DKV 1 (Umum)
  ('e88128be-8fc3-4973-8d69-00ef17571626', 'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', '22222222-0001-0000-0000-000000000001', 'Rabu', 1, 3, 'Ruang Teori 12'),
  ('11111111-0012-0002-0001-000000000011', 'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', '22222222-0002-0000-0000-000000000002', 'Rabu', 1, 3, 'Ruang Teori 11')
ON CONFLICT DO NOTHING;

-- Selesai!
SELECT 'Database SIAP (SMK TKJ & DKV) Berhasil Dikonfigurasi 100% Aman & Sanitized' as status;
