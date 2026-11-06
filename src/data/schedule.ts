import { TimetablePeriod } from '../types/attendance';

export const TODAY_SCHEDULE: TimetablePeriod[] = [
  {
    period: 1,
    timeRange: '07.30 - 09.00 WIT',
    subject: 'Pemodelan Perangkat Lunak',
    code: 'RPL-204',
    teacher: 'Budi Santoso, S.Kom.',
    room: 'LAB-RPL-01',
    status: 'active',
  },
  {
    period: 2,
    timeRange: '09.15 - 11.30 WIT',
    subject: 'Pemrograman Web & Perangkat Bergerak',
    code: 'RPL-208',
    teacher: 'Ratna Kusuma, S.T., M.Kom.',
    room: 'LAB-RPL-02',
    status: 'upcoming',
  },
  {
    period: 3,
    timeRange: '12.15 - 13.45 WIT',
    subject: 'Basis Data Terdistribusi',
    code: 'RPL-206',
    teacher: 'Ahmad Faisal, S.Kom.',
    room: 'LAB-KOMP-03',
    status: 'upcoming',
  },
  {
    period: 4,
    timeRange: '14.00 - 15.30 WIT',
    subject: 'Produk Kreatif & Kewirausahaan',
    code: 'PKK-201',
    teacher: 'Dewi Lestari, S.Pd',
    room: 'RUANG-XII-TKJ-1',
    status: 'upcoming',
  },
];
