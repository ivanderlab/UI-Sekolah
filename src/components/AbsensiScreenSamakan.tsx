import React, { useState } from 'react';
import { UserProfile, StudentAttendance, ClassAttendanceSummary, TeacherCallAlert } from '../types';

interface AbsensiScreenProps {
  user: UserProfile;
  classSummary: ClassAttendanceSummary;
  students: StudentAttendance[];
  teacherAlert: TeacherCallAlert;
  onValidateMorningAttendance: () => void;
  onUpdateSubjectStatus: (studentId: string, newStatus: 'hadir' | 'bolos' | 'dispensasi') => void;
  onRespondToCall: (responseType: 'menuju_kelas' | 'tugas_mandiri') => void;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
}

export const AbsensiScreen: React.FC<AbsensiScreenProps> = ({
  user,
  classSummary,
  students,
  teacherAlert,
  onValidateMorningAttendance,
  onUpdateSubjectStatus,
  onRespondToCall,
  onShowToast,
}) => {
  const [callResponseSent, setCallResponseSent] = useState<string | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isReportSubmitted, setIsReportSubmitted] = useState(false);

  // Find Kevin Pratama
  const kevin = students.find((s) => s.name.includes('Kevin')) || students[1];
  const isKevinTruant = kevin?.subjectStatus === 'bolos';

  const handleHeadingToClass = () => {
    onRespondToCall('menuju_kelas');
    setCallResponseSent('Guru sedang berjalan ke Lab Komputer RPL 2 🏃‍♂️');
    onShowToast(
      'Respon Dikirim!',
      'Status Anda telah diperbarui di display kelas: Guru Menuju Lab RPL 2 🏃‍♂️',
      'success'
    );
  };

  const handleSendAssignment = () => {
    onRespondToCall('tugas_mandiri');
    setCallResponseSent('Instruksi modul jobsheet telah dikirimkan ke Farhan (Ketua Kelas) 📝');
    onShowToast(
      'Tugas Mandiri Terkirim',
      'Modul Jobsheet Praktikum telah diteruskan ke kelas XI RPL 1 📝',
      'info'
    );
  };

  const handleToggleKevin = () => {
    if (isKevinTruant) {
      onUpdateSubjectStatus(kevin.id, 'hadir');
      onShowToast(
        'Status Kevin Pratama',
        'Kevin Pratama telah ditandai Hadir di ruang praktikum.',
        'success'
      );
    } else {
      onUpdateSubjectStatus(kevin.id, 'bolos');
      onShowToast(
        'Peringatan Bolos Mapel',
        'Kevin Pratama ditandai Tidak Hadir di mapel ini (Bolos Mapel).',
        'warning'
      );
    }
  };

  const handleCallSpeaker = () => {
    onShowToast(
      'Panggilan Pengeras Suara',
      'Pesan pemanggilan Kevin Pratama telah dikirim ke Ruang Piket Barat.',
      'info'
    );
  };

  const handleSubmitSubjectReport = () => {
    setIsSubmittingReport(true);
    setTimeout(() => {
      setIsSubmittingReport(false);
      setIsReportSubmitted(true);
      onShowToast(
        'Laporan Berhasil Terkirim!',
        'Data absensi mapel telah disinkronkan ke Wali Kelas (Ibu Siti Rahmawati, S.Pd.) dan Guru BK.',
        'success'
      );
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-24">
      {/* DANA Style Ocean Top Header Banner */}
      <div className="w-full bg-primary pb-8 pt-3 px-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary-fixed text-primary">
              <span className="material-symbols-outlined notranslate text-[16px]">school</span>
            </span>
            <span className="font-label-md text-xs text-primary-fixed uppercase tracking-wider font-bold">
              Portal Pendidik SMKN 1
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-primary-container px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-ping"></span>
            <span>Aktif Mengajar</span>
          </div>
        </div>
      </div>

      {/* Content Stream with DANA Card Elevation Overlap */}
      <div className="px-4 flex flex-col gap-4 -mt-5">
        {/* 1. Header Card Guru (FinTech Floating Deck) */}
        <div className="w-full bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-3 border border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
                  alt="Budi Santoso, S.Kom."
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsjqqNUms7en4dEsFynEe-Ynj70m9IRBQFAt4kd0q0EC86X5bcowEuKK7P8ESzZQ1GnZPacrA3xHhBPbyzvPgqXjtQzmUdbHn5A7iE7Obpm-e1QLGdAx5Fk04s125mVdFFPsqg4ka06-5JLRBZyHIjrxP65z71ILzB2zNoP6IS7AlEXCqB9WSOVtmqXTEZnVAJ_PElhjC9ooSUx9lDAf0vqxN8gwIyRKMT7mD_nWG0YUat6Ke_v5Cn"
                />
                <span className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-0.5 flex items-center justify-center">
                  <span className="material-symbols-outlined notranslate text-[14px]">verified</span>
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-headline font-bold text-sm text-slate-900 truncate">
                  Selamat Pagi, Budi Santoso, S.Kom. 👨‍🏫
                </span>
                <span className="text-xs text-slate-500 truncate">
                  NIP: 19850314 201001 1 008 • Guru Produktif RPL
                </span>
              </div>
            </div>
          </div>

          <div className="w-full bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-primary text-[20px]">
                calendar_month
              </span>
              <span className="text-xs font-bold text-slate-800">Jadwal Mengajar Hari Ini</span>
            </div>
            <span className="bg-sky-100 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-primary">
              2 Kelas Terjadwal
            </span>
          </div>

          {/* Quick Micro-Schedule Deck */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div className="bg-surface-container rounded-xl p-2.5 flex flex-col border border-sky-200/60">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase">SEKARANG</span>
                <span className="material-symbols-outlined notranslate text-primary text-[14px]">
                  schedule
                </span>
              </div>
              <span className="font-headline font-bold text-base text-slate-900 mt-0.5">
                XI RPL 1
              </span>
              <span className="text-[11px] text-slate-500 truncate">Lab Komputer RPL 2</span>
            </div>

            <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">10.30 - 12.00</span>
                <span className="material-symbols-outlined notranslate text-slate-400 text-[14px]">
                  history_toggle_off
                </span>
              </div>
              <span className="font-headline font-bold text-base text-slate-900 mt-0.5">
                XII TKJ 2
              </span>
              <span className="text-[11px] text-slate-500 truncate">Lab Jaringan Barat</span>
            </div>
          </div>
        </div>

        {/* 2. Notifikasi Banner Panggilan Masuk (High Priority Alert) */}
        {teacherAlert.isActive && (
          <div className="w-full bg-amber-500/15 border border-amber-300 rounded-2xl p-4 shadow-md flex flex-col gap-2.5 relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-bounce">
                <span className="material-symbols-outlined notranslate text-[20px]">
                  notifications_active
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase">
                    Urgent • Siswa Memanggil
                  </span>
                  <span className="text-[11px] text-amber-900 font-bold">08.50 WIT</span>
                </div>
                <p className="text-xs font-bold text-amber-950 mt-1 leading-snug">
                  📢 Panggilan dari Siswa XI RPL 1: Kelas menunggu di Lab RPL 2 sejak 08.50 WIT.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleHeadingToClass}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
                type="button"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">directions_run</span>
                <span className="truncate">Menuju Kelas 🏃‍♂️</span>
              </button>
              <button
                onClick={handleSendAssignment}
                className="w-full bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-transform"
                type="button"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">edit_note</span>
                <span className="truncate">Tugas Mandiri 📝</span>
              </button>
            </div>

            {callResponseSent && (
              <div className="text-xs font-semibold bg-amber-600 text-white p-2 rounded-xl text-center animate-in fade-in duration-150">
                {callResponseSent}
              </div>
            )}
          </div>
        )}

        {/* 3. Validasi Absen Harian Lapis 2 (Absen Pagi dari Sekretaris Kelas) */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined notranslate text-[20px]">verified_user</span>
              </span>
              <div className="flex flex-col">
                <span className="font-headline font-bold text-sm text-slate-900">
                  Validasi Absen Pagi (Lapis 2)
                </span>
                <span className="text-[11px] text-slate-500">
                  XI RPL 1 • Oleh Farhan (Sekretaris)
                </span>
              </div>
            </div>

            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                classSummary.validationStatus === 'tervalidasi'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {classSummary.validationStatus === 'tervalidasi'
                ? 'Telah Divalidasi'
                : 'Draft Masuk'}
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-surface-container-low rounded-xl p-2 flex flex-col">
              <span className="font-headline font-bold text-xl text-primary">
                {classSummary.present}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">Hadir</span>
            </div>
            <div className="bg-amber-50 rounded-xl p-2 flex flex-col">
              <span className="font-headline font-bold text-xl text-amber-600">
                {classSummary.sick}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">Sakit</span>
            </div>
            <div className="bg-surface-container rounded-xl p-2 flex flex-col">
              <span className="font-headline font-bold text-xl text-secondary">
                {classSummary.permitted}
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">Izin</span>
            </div>
            <div className="bg-slate-50 rounded-xl p-2 flex flex-col">
              <span className="font-headline font-bold text-xl text-slate-400">
                {classSummary.unexcused}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">Alfa</span>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-bold">Catatan Izin &amp; Sakit:</span>
              <span className="font-bold text-primary">Surat Terlampir (2)</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              • Sakit: <strong>Ahmad Dani</strong> (Flu), <strong>Rina Melinda</strong> (Demam)
              <br />• Izin: <strong>Doni Tata</strong> (Dispensasi Lomba LKS Web)
            </p>
          </div>

          <button
            onClick={onValidateMorningAttendance}
            disabled={classSummary.validationStatus === 'tervalidasi'}
            className={`w-full font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow transition-all ${
              classSummary.validationStatus === 'tervalidasi'
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-primary text-white hover:bg-primary-container active:scale-98'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[18px]">
              {classSummary.validationStatus === 'tervalidasi' ? 'verified' : 'lock_clock'}
            </span>
            <span>
              {classSummary.validationStatus === 'tervalidasi'
                ? 'Terkunci & Sah (Resmi)'
                : 'Validasi & Kunci Absen Pagi 🔒'}
            </span>
          </button>
        </div>

        {/* 4. Absensi Per Mapel & Deteksi Siswa Bolos Mapel (Fitur Kunci) */}
        <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold bg-sky-100 text-primary px-2.5 py-0.5 rounded-full uppercase">
                SESI BERJALAN
              </span>
              <span className="text-xs text-slate-500">08.45 - 10.15 WIT</span>
            </div>
            <span className="font-headline font-bold text-base text-slate-900">
              Absen Mapel: Pemrograman Web
            </span>
            <span className="text-xs text-slate-500">
              Verifikasi kehadiran di ruangan Lab Komputer RPL 2
            </span>
          </div>

          {/* Critical Flag: Alert Bolos Mapel Banner */}
          {isKevinTruant && (
            <div className="w-full bg-error-container text-on-error-container p-3 rounded-xl flex items-start gap-2.5 border border-rose-200 animate-in fade-in duration-200">
              <span className="material-symbols-outlined notranslate text-error text-[22px] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-error">
                  Terdeteksi 1 Siswa Bolos Mapel!
                </span>
                <span className="text-[11px] text-slate-700 leading-tight">
                  Siswa terdata Hadir pada Absen Pagi tetapi tidak berada di dalam ruang kelas mapel
                  ini.
                </span>
              </div>
            </div>
          )}

          {/* Daftar Quick-Toggle Kehadiran Siswa */}
          <div className="flex flex-col gap-2">
            {/* Siswa 1: Muhammad Farhan */}
            <div className="w-full bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt="Muhammad Farhan"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAoF0IwBG0rnnwwhQJI4Xm2x8B91tc_cBA0Cb2mxe_u193s80e7uKrMkJKxf-gjrVC5G_jY6hit5Sf8ijZPBrzMeyDTanVEZXWfWncEtI3V9dueUPu7PlCQW-FALpimlpMQ1dqMLFJbiLZj_FQ0wm66TKplPkIjSfuOkh45tOE8SX9EJOFn75io4Mlgy5gnyDfoIyHvXF2fHmnZN7f466f1ZtXNiUhXislLBlrNTsL3tnkyBaw3Qp5"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    Muhammad Farhan
                  </span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>Hadir Pagi:</span>
                    <span className="text-primary font-bold">YA</span>
                  </div>
                </div>
              </div>

              <span className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined notranslate text-[16px]">check_circle</span>
                <span>HADIR</span>
              </span>
            </div>

            {/* Siswa 2: Kevin Pratama (BOLOS MAPEL DETECTED) */}
            <div className="w-full bg-surface-container-low rounded-xl p-2.5 flex flex-col gap-1.5 border border-rose-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      className="w-10 h-10 rounded-full object-cover"
                      alt="Kevin Pratama"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuANGP7Qqs7Gjw1CHcqTcVhs3PlExZDDCzgVlCZRfOVdQ_DutWS6YziETQdAvETSTySizRn97ULIu3HKrmeI5RjOdH7AlkmyII-f4ziAsn4w9ILX-dOk1Lrb7oE8skkO01gWDPL3IhxCmBAz_tcECX09yqDMVY5YyXHEl2ciK4thc3a0VBdN2-y7M6yv7ZCJNEy6aGabeS9Ga2jUjkBEH3hU_M58gIHrmvwxM1rR8hHnIVcLnRyRB5a8"
                    />
                    {isKevinTruant && (
                      <span className="absolute -top-1 -right-1 bg-error text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                        !
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      Kevin Pratama
                    </span>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <span>Hadir Pagi:</span>
                      <span className="text-primary font-bold">YA (06.58)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleKevin}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all active:scale-95 ${
                    isKevinTruant
                      ? 'bg-error text-white hover:bg-rose-700'
                      : 'bg-primary text-white hover:bg-primary-container'
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined notranslate text-[16px]">
                    {isKevinTruant ? 'person_off' : 'check_circle'}
                  </span>
                  <span className="truncate">
                    {isKevinTruant ? 'BOLOS MAPEL' : 'HADIR (DI KELAS)'}
                  </span>
                </button>
              </div>

              {isKevinTruant && (
                <div className="bg-rose-50 px-2.5 py-1 rounded-lg flex items-center justify-between">
                  <span className="text-[11px] font-bold text-error">
                    Status Mapel: Tidak ada di kelas ⚠️
                  </span>
                  <button
                    onClick={handleCallSpeaker}
                    className="text-[11px] font-bold text-primary underline"
                  >
                    Panggil via Pengeras
                  </button>
                </div>
              )}
            </div>

            {/* Siswa 3: Siti Aminah */}
            <div className="w-full bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt="Siti Aminah"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6ATs24ewyqE0mhqdjvOhidGqazm6XbMOZqLh9sxXUkf7ISKL4MdTBMlnpgMmsFBSLh0J2yaVuSi9j2P4KMoG5ENBLJ6BxxwdUqYLjnIMpTGfDjF_qkJPrxLEtKugoAHsTvrDCoKADfBRR3zR4KCWxDA7O5bBmp1gsN8eC8OfDXxAlG1V-r63VAH8qn2UNm3lmGNx4BzNdS71bWPweBcczZt-gOjQCPCZo24bqMCjQaDW49tuGWDwz"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate">Siti Aminah</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>Hadir Pagi:</span>
                    <span className="text-primary font-bold">YA</span>
                  </div>
                </div>
              </div>
              <span className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined notranslate text-[16px]">check_circle</span>
                <span>HADIR</span>
              </span>
            </div>

            {/* Siswa 4: Doni Tata (Status Izin) */}
            <div className="w-full bg-surface-container-low rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt="Doni Tata"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYtVadvsmDFMwbnpURLpogQCUfl4E1MBROuSv_GucxKYxpmGJy2I0sjbmxVSLqER3V_3CnMfKeRcFGq109tS8rhMfPYYFDTaTpZ0yhjbkd9P5xnI-WTCwh9E99mWrZb5-DA2i9ETZ7iPrxl9PnIOSZDdjNMsiqoUx7s9FgQUnl_-zq9pBaCYQGEeMd_ZkH-Tciho5Y3ls9uhxRghP5DrEN2CAWlhXYU0RRFAVrjOqNB3NeWQhmuh4D"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-slate-900 truncate">Doni Tata</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <span>Hadir Pagi:</span>
                    <span className="text-secondary font-bold">IZIN (LKS)</span>
                  </div>
                </div>
              </div>
              <span className="bg-surface-container-high text-on-secondary-container px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined notranslate text-[16px]">description</span>
                <span>DISPENSASI</span>
              </span>
            </div>
          </div>

          {/* Action Button Submit */}
          <div className="pt-2 flex flex-col gap-1.5">
            <button
              onClick={handleSubmitSubjectReport}
              disabled={isSubmittingReport}
              className={`w-full font-bold text-sm py-3.5 rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 ${
                isReportSubmitted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary-container text-white hover:bg-primary'
              }`}
            >
              {isSubmittingReport ? (
                <>
                  <span className="material-symbols-outlined notranslate text-[20px] animate-spin">
                    sync
                  </span>
                  <span>Mengirim ke BK &amp; Kurikulum...</span>
                </>
              ) : isReportSubmitted ? (
                <>
                  <span className="material-symbols-outlined notranslate text-[20px]">task_alt</span>
                  <span>Laporan Berhasil Disimpan &amp; Terkirim!</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined notranslate text-[20px]">send</span>
                  <span>Simpan &amp; Kirim Laporan Mapel</span>
                </>
              )}
            </button>
            <span className="text-center text-[11px] text-slate-500">
              Laporan terhubung otomatis ke Wali Kelas &amp; Guru BK
            </span>
          </div>
        </div>

        {/* Quick Help Floating info */}
        <div className="w-full bg-surface-container p-3 rounded-2xl flex items-center gap-2.5 border border-sky-200">
          <span className="material-symbols-outlined notranslate text-primary text-[24px]">
            contact_support
          </span>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-xs text-slate-900">Pusat Bantuan Guru Piket</span>
            <span className="text-[11px] text-slate-600">
              Hubungi Ruang Piket Barat jika ada rotasi ruang praktek.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
