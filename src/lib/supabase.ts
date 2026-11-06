import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wqczgetcncftgyuaqhlf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_n37Rs8ZsGOAW_kwzy8UQxQ_ALReB0jo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// ─── TIPE DATA (sesuai schema.sql) ──────────────────────────────────────

export type StatusAbsen = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa' | 'Terlambat';
export type StatusValidasi = 'draft' | 'tervalidasi';
export type StatusStreak = 'aktif' | 'padam' | 'beku';
export type HariEnum = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
export type RoleEnum = 'siswa' | 'guru' | 'wali_kelas' | 'guru_piket' | 'operator';

export interface Profile {
  id: string;
  username: string;
  nama: string;
  role: RoleEnum;
  is_sekretaris: boolean;
  kelas_id: string | null;
  must_change_password: boolean;
  phone?: string;
  avatar_url?: string;
  kelas?: { id: string; nama: string } | null;
  is_wali_kelas?: boolean;
  wali_kelas?: { id: string; nama: string } | null;
  is_guru_piket?: boolean;
}

export interface Kelas {
  id: string;
  nama: string;
  wali_kelas_id: string | null;
}

export interface Mapel {
  id: string;
  nama: string;
}

export interface Jadwal {
  id: string;
  kelas_id: string;
  mapel_id: string;
  guru_id: string;
  hari: HariEnum;
  jam_mulai: string;
  jam_selesai: string;
  kelas?: { id: string; nama: string };
  mapel?: { id: string; nama: string };
  guru?: { id: string; nama: string };
}

export interface AbsenHarian {
  id: string;
  tanggal: string;
  siswa_id: string;
  kelas_id: string;
  status: StatusAbsen;
  keterangan: string | null;
  diinput_oleh: string | null;
  divalidasi_oleh: string | null;
  status_validasi: StatusValidasi;
}

export interface AbsenMapel {
  id: string;
  tanggal: string;
  jadwal_id: string;
  siswa_id: string;
  status: StatusAbsen;
  diinput_oleh: string | null;
}

export interface Streak {
  siswa_id: string;
  jumlah: number;
  status: StatusStreak;
  tanggal_update: string;
}

export interface PanggilanGuru {
  id: string;
  jadwal_id: string;
  kelas_id: string;
  dibuat_oleh: string;
  waktu: string;
  status: 'menunggu' | 'ditanggapi';
  pesan: string | null;
  tanggal: string;
}
