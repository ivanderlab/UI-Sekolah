import { ScheduleDay, SubjectSchedule } from '../../types/attendance';

export const SCHEDULE_DAYS: ScheduleDay[] = [
  { id: 'senin', name: 'Senin' },
  { id: 'selasa', name: 'Selasa' },
  { id: 'rabu', name: 'Rabu' },
  { id: 'kamis', name: 'Kamis' },
  { id: 'jumat', name: 'Jumat' },
  { id: 'sabtu', name: 'Sabtu' },
];

export const SCHEDULES_BY_DAY: Record<string, SubjectSchedule[]> = {
  senin: [
    {
      id: 'senin-1',
      subject: 'Administrasi Infrastruktur Jaringan',
      time: '08.15 - 11.50',
      teacher: 'Ahmad Fauzi, M.T.',
      type: 'productive',
    },
    {
      id: 'senin-2',
      subject: 'Desain Komunikasi Visual & Motion',
      time: '11.50 - 13.25',
      teacher: 'Siti Rahmawati, S.Pd',
      type: 'productive',
    },
    {
      id: 'senin-3',
      subject: 'Pemrograman Web & Basis Data',
      time: '13.25 - 14.45',
      teacher: 'Budi Santoso, S.Kom',
      type: 'productive',
    },
  ],
  selasa: [
    {
      id: 'selasa-1',
      subject: 'Pendidikan Pancasila & Kewarganegaraan',
      time: '08.15 - 09.35',
      teacher: 'Rina Kurniawati, S.Pd',
      type: 'general',
    },
    {
      id: 'selasa-2',
      subject: 'Teknologi Layanan Jaringan (TKJ)',
      time: '09.35 - 12.30',
      teacher: 'Ahmad Fauzi, M.T.',
      type: 'productive',
    },
    {
      id: 'selasa-3',
      subject: 'Tipografi & Ilustrasi Digital (DKV)',
      time: '12.45 - 14.45',
      teacher: 'Dewi Lestari, S.Pd',
      type: 'productive',
    },
  ],
  rabu: [
    {
      id: 'rabu-1',
      subject: 'Bahasa Indonesia',
      time: '08.15 - 10.15',
      teacher: 'Rina Kurniawati, S.Pd',
      type: 'general',
    },
    {
      id: 'rabu-2',
      subject: 'Bahasa Inggris Kejuruan',
      time: '10.30 - 12.30',
      teacher: 'Maya Anggraini, S.Pd',
      type: 'general',
    },
    {
      id: 'rabu-3',
      subject: 'Matematika Terapan',
      time: '12.45 - 14.45',
      teacher: 'Hendro Prasetyo, S.Kom',
      type: 'general',
    },
  ],
  kamis: [
    {
      id: 'kamis-1',
      subject: 'Keamanan Jaringan & Cyber Security',
      time: '08.15 - 12.30',
      teacher: 'Budi Santoso, S.Kom',
      type: 'productive',
    },
    {
      id: 'kamis-2',
      subject: 'Produk Kreatif & Kewirausahaan (DKV/TKJ)',
      time: '12.45 - 14.45',
      teacher: 'Dewi Lestari, S.Pd',
      type: 'productive',
    },
  ],
  jumat: [
    {
      id: 'jumat-1',
      subject: 'Praktikum Cloud Computing (TKJ)',
      time: '08.15 - 09.15',
      teacher: 'Ahmad Fauzi, M.T.',
      type: 'productive',
    },
    {
      id: 'jumat-2',
      subject: 'Fotografi & Videografi Editing (DKV)',
      time: '09.15 - 11.00',
      teacher: 'Siti Rahmawati, S.Pd',
      type: 'productive',
    },
  ],
  sabtu: [
    {
      id: 'sabtu-1',
      subject: 'Pengembangan Portofolio Digital',
      time: '08.15 - 10.15',
      teacher: 'Dewi Lestari, S.Pd',
      type: 'productive',
    },
    {
      id: 'sabtu-2',
      subject: 'Troubleshooting Jaringan WAN',
      time: '10.30 - 11.50',
      teacher: 'Budi Santoso, S.Kom',
      type: 'productive',
    },
    {
      id: 'sabtu-3',
      subject: 'Evaluasi Projek Akhir Siswa',
      time: '12.05 - 13.25',
      teacher: 'Ahmad Fauzi, M.T.',
      type: 'productive',
    },
  ],
};
