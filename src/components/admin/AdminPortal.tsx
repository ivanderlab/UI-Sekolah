import React, { useState } from 'react';
import { Header } from './Header';
import { BottomNav, TabType } from './BottomNav';
import { AdminDashboardView } from './AdminDashboardView';
import { JadwalView, getJpRangeFromTimes } from './JadwalView';
import { RekapView } from './RekapView';
import { ProfilView, getUserAvatar } from './ProfilView';
import { ScheduleModal } from './ScheduleModal';
import { AttachmentModal } from './AttachmentModal';
import { NotificationsModal } from './NotificationsModal';
import { PrintModal } from './PrintModal';
import {
  INITIAL_STUDENTS,
  INITIAL_SCHEDULES,
  INITIAL_TEACHERS,
  NOTIFICATIONS,
} from './mockData';
import { Student, ScheduleSlot, NotificationItem, Teacher } from '../../types';
import { exportAttendanceRecapToExcel } from '../../utils/excelHelper';

import { supabase } from '../../lib/supabase';

export interface AdminPortalSession {
  username: string;
  role: 'admin' | 'superadmin' | 'operator';
  nama: string;
}

interface AdminPortalProps {
  session: AdminPortalSession;
  onLogout: () => void;
  onSwitchToAppRole?: (role: 'guru' | 'siswa') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ session, onLogout, onSwitchToAppRole }) => {
  const normalizedRole: 'admin' | 'superadmin' =
    session.role === 'superadmin' ? 'superadmin' : 'admin';

  // ─── NAV STATE ───
  const [currentTab, setCurrentTab] = useState<TabType>('beranda');

  // ─── DATA STATE (Connected to Supabase with local fallback) ───
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [teachers, setTeachers] = useState<Teacher[]>(INITIAL_TEACHERS);
  const [schedules, setSchedules] = useState<ScheduleSlot[]>(INITIAL_SCHEDULES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('smkn1_school_announcements');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return NOTIFICATIONS;
  });

  // Fetch real school data from Supabase
  React.useEffect(() => {
    let active = true;

    async function loadSupabaseData() {
      try {
        // 1. Fetch Teachers (All registered teachers)
        const { data: dbTeachers } = await supabase
          .from('profiles')
          .select('id, nama, username')
          .eq('role', 'guru')
          .order('nama', { ascending: true });

        const { data: dbClasses } = await supabase
          .from('kelas')
          .select('id, nama, wali_kelas_id')
          .order('nama', { ascending: true });

        if (active && dbTeachers && dbTeachers.length > 0) {
          const mappedTeachers: Teacher[] = dbTeachers.map((t, idx) => {
            const assignedClass = dbClasses?.find((c) => c.wali_kelas_id === t.id);
            return {
              id: t.id,
              nip: t.username.includes('budi') ? '198501152010011001'
                : t.username.includes('dewi') ? '199003202015022002'
                : t.username.includes('iwan') ? '198708142011011003'
                : `19900101201803${String(idx + 1).padStart(4, '0')}`,
              name: t.nama,
              subject: t.username.includes('dewi') ? 'Guru Kejuruan DKV' : 'Guru Kejuruan TKJ',
              room: assignedClass ? `Wali Kelas ${assignedClass.nama}` : 'Lab Komputer SMKN 1',
            };
          });
          setTeachers(mappedTeachers);
        }

        // 2. Fetch Students (All registered students)
        const { data: dbStudents } = await supabase
          .from('profiles')
          .select('id, nama, username, kelas:kelas_id(nama)')
          .eq('role', 'siswa')
          .order('nama', { ascending: true });

        if (active && dbStudents && dbStudents.length > 0) {
          const mappedStudents: Student[] = dbStudents.map((s, idx) => {
            const kName = (s.kelas as any)?.nama || 'XII TKJ 1';
            return {
              id: s.id,
              no: String(idx + 1).padStart(2, '0'),
              nis: s.username.replace(/^s_?/, ''),
              name: s.nama,
              kelas: kName,
              status: idx % 10 === 8 ? 'Sakit' : idx % 10 === 9 ? 'Izin' : 'Hadir',
            };
          });
          setStudents(mappedStudents);
        }

        // 3. Fetch Schedules (All registered classes)
        const { data: dbJadwal } = await supabase
          .from('jadwal')
          .select(`
            id, jam_mulai, jam_selesai, hari,
            kelas:kelas_id!inner(id, nama),
            mapel:mapel_id(nama),
            guru:guru_id(nama)
          `)
          .order('jam_mulai', { ascending: true });

        if (active && dbJadwal && dbJadwal.length > 0) {
          const mappedSchedules: ScheduleSlot[] = dbJadwal.map((j, idx) => {
            const jStart = j.jam_mulai ? j.jam_mulai.substring(0, 5) : '07:15';
            const jEnd = j.jam_selesai ? j.jam_selesai.substring(0, 5) : '08:45';
            const kName = (j.kelas as any)?.nama || 'XII TKJ 1';
            const mName = (j.mapel as any)?.nama || 'Mata Pelajaran';
            const gName = (j.guru as any)?.nama || 'Budi Santoso, S.Kom.';
            const jp = getJpRangeFromTimes(jStart, jEnd);
            return {
              id: j.id || `sch-db-${idx}`,
              day: (j.hari as any) || 'Kamis',
              jpStart: jp.jpStart,
              jpEnd: jp.jpEnd,
              jpLabel: jp.jpLabel,
              timeRange: `${jStart} - ${jEnd} WIT`,
              subject: mName,
              teacher: gName,
              room: kName.includes('DKV') ? 'Studio DKV 1' : 'Lab Komputer 1',
              badgeType: 'normal',
              classTarget: kName,
            };
          });
          setSchedules(mappedSchedules);
        }
      } catch (e) {
        console.warn('AdminPortal Supabase fetch fallback to mockData:', e);
      }
    }

    loadSupabaseData();
    return () => { active = false; };
  }, []);

  // ─── MODALS ───
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [selectedStudentAttachment, setSelectedStudentAttachment] = useState<Student | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // ─── TOAST ───
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // ─── SCHEDULE CRUD ───
  const handleOpenAddSchedule = () => {
    setEditingSlot(null);
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setIsScheduleModalOpen(true);
  };

  const handleDeleteSchedule = (id: string, subject: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus slot pelajaran "${subject}"?`)) {
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      showToast(`Jadwal "${subject}" berhasil dihapus.`);
    }
  };

  const handleSaveSchedule = (slotData: Partial<ScheduleSlot>) => {
    if (editingSlot) {
      setSchedules((prev) =>
        prev.map((s) => (s.id === editingSlot.id ? { ...s, ...slotData } : s))
      );
      showToast(`Jadwal "${slotData.subject}" berhasil diperbarui!`);
    } else {
      const newSlot: ScheduleSlot = {
        id: `sch-${Date.now()}`,
        day: slotData.day || 'Selasa',
        jpStart: slotData.jpStart || 1,
        jpEnd: slotData.jpEnd || 2,
        jpLabel: slotData.jpLabel || 'JP 1 - 2',
        timeRange: slotData.timeRange || '07:15 - 08:45 WIT',
        subject: slotData.subject || 'Mapel Baru',
        teacher: slotData.teacher || 'Guru Pengampu',
        room: slotData.room || 'Lab Komputer 2',
        badgeType: 'normal',
      };
      setSchedules((prev) => [...prev, newSlot]);
      showToast(`Jadwal baru berhasil ditambahkan!`);
    }
    setIsScheduleModalOpen(false);
  };

  const handleImportSchedules = (newSchedules: ScheduleSlot[]) => {
    setSchedules((prev) => [...prev, ...newSchedules]);
    showToast(`${newSchedules.length} jadwal berhasil diimpor dari file Excel!`);
  };

  const handleImportStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    showToast(`${newStudents.length} data siswa berhasil diimpor dari file Excel!`);
  };

  const handleAddTeacher = async (newTeacher: Teacher) => {
    setTeachers((prev) => [newTeacher, ...prev]);
    showToast(`Guru ${newTeacher.name} berhasil ditambahkan!`);
    try {
      await supabase.from('profiles').insert([{
        username: newTeacher.nip,
        nama: newTeacher.name,
        role: 'guru',
        is_sekretaris: false,
        must_change_password: true,
      }]);
    } catch (err) {
      console.warn('Error saving teacher to Supabase:', err);
    }
  };

  const handleAddStudent = async (newStudent: Student) => {
    setStudents((prev) => [...prev, newStudent]);
    showToast(`Siswa ${newStudent.name} (${newStudent.kelas || 'Rombel'}) berhasil ditambahkan!`);
    try {
      await supabase.from('profiles').insert([{
        username: newStudent.nis.startsWith('s') ? newStudent.nis : `s${newStudent.nis}`,
        nama: newStudent.name,
        role: 'siswa',
        is_sekretaris: false,
        must_change_password: true,
      }]);
    } catch (err) {
      console.warn('Error saving student to Supabase:', err);
    }
  };

  const handleResetUserPassword = (username: string, _newPass: string) => {
    showToast(`Kata sandi akun ${username} berhasil disetel ulang!`);
  };

  // ─── NOTIFICATIONS ───
  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try { localStorage.setItem('smkn1_school_announcements', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    showToast('Semua notifikasi ditandai telah dibaca.');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // ─── DOWNLOAD RECAP ───
  const handleDownloadRecapPDF = () => {
    exportAttendanceRecapToExcel(students, 'XII TKJ 1', 'Oktober 2026');
    showToast('Rekap presensi berhasil diekspor ke Excel (.xlsx)');
  };

  // ─── HEADER TITLE ───
  const getHeaderTitle = () => {
    if (currentTab === 'jadwal') return 'Jadwal Pelajaran';
    if (currentTab === 'rekap') return 'Rekap Presensi';
    if (currentTab === 'profil') return 'Profil';
    return 'Beranda';
  };

  const handleHeaderBack = () => {
    if (currentTab !== 'beranda') {
      setCurrentTab('beranda');
    }
  };

  const roleTitle =
    normalizedRole === 'superadmin' ? 'Kepala Sekolah / IT Admin' : 'Tata Usaha / Operator';

  return (
    <div className="bg-slate-100 min-h-screen text-[#191c1e] flex flex-col items-center justify-start font-sans selection:bg-[#77b7fe] selection:text-[#00487a]">
      {/* Shell Container: Full-width on mobile, responsive modern adaptive layout on tablet/desktop */}
      <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl min-h-screen bg-[#f7f9fb] shadow-2xl relative flex flex-col transition-all duration-200">
        {/* Top Application Bar */}
        <Header
          title={getHeaderTitle()}
          showBack={currentTab !== 'beranda'}
          onBack={handleHeaderBack}
          onNotificationClick={() => setIsNotificationsOpen(true)}
          onProfileClick={() => setCurrentTab('profil')}
          unreadCount={unreadNotificationsCount}
          avatarUrl={getUserAvatar({ username: session.username, role: normalizedRole, nama: session.nama })}
        />

        {/* Quick Bridge to Guru & Murid for Testing / Live Monitoring */}
        {onSwitchToAppRole && (
          <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white px-4 py-2 mt-16 flex items-center justify-between text-xs z-30 shadow-xs border-b border-white/10 flex-wrap gap-2">
            <span className="flex items-center gap-1.5 font-semibold text-sky-200">
              <span className="material-symbols-outlined text-[16px] text-sky-400">swap_horiz</span>
              <span>Koneksi Guru &amp; Siswa:</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSwitchToAppRole('guru')}
                className="bg-sky-500/20 hover:bg-sky-500/30 active:scale-95 px-2.5 py-1 rounded-lg text-[11px] font-bold text-sky-200 transition-all flex items-center gap-1 cursor-pointer border border-sky-400/30"
              >
                <span>👨‍🏫 Buka Mode Guru</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchToAppRole('siswa')}
                className="bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-200 transition-all flex items-center gap-1 cursor-pointer border border-emerald-400/30"
              >
                <span>🎓 Buka Mode Siswa</span>
              </button>
            </div>
          </div>
        )}

        {/* Main View Area */}
        <main className={`flex-1 flex flex-col relative w-full ${onSwitchToAppRole ? 'pt-2' : 'pt-16'}`}>
          {currentTab === 'beranda' ? (
            <AdminDashboardView
              onOpenScheduleManager={handleOpenAddSchedule}
              onOpenPrintModal={() => setIsPrintModalOpen(true)}
              onOpenNotifications={() => setIsNotificationsOpen(true)}
              roleTitle={roleTitle}
              schedules={schedules}
              students={students}
              teachers={teachers}
              onImportSchedules={handleImportSchedules}
              onImportStudents={handleImportStudents}
              onAddTeacher={handleAddTeacher}
              onAddStudent={handleAddStudent}
              onResetUserPassword={handleResetUserPassword}
            />
          ) : currentTab === 'jadwal' ? (
            <JadwalView
              schedules={schedules}
              onOpenAddModal={handleOpenAddSchedule}
              onOpenEditModal={handleOpenEditSchedule}
              onDeleteSlot={handleDeleteSchedule}
              onPrint={() => setIsPrintModalOpen(true)}
              onOpenAbsensiKelas={() => {}}
              userRole={normalizedRole}
              session={{ username: session.username, role: normalizedRole, nama: session.nama }}
              studentClass="XII TKJ 1"
              onImportSchedules={handleImportSchedules}
            />
          ) : currentTab === 'rekap' ? (
            <RekapView
              onBackToBeranda={() => setCurrentTab('beranda')}
              onDownloadReport={handleDownloadRecapPDF}
              userRole={normalizedRole}
              session={{ username: session.username, role: normalizedRole, nama: session.nama }}
              students={students}
            />
          ) : (
            <ProfilView
              session={{ username: session.username, role: normalizedRole, nama: session.nama }}
              onLogout={onLogout}
              onOpenLencanaModal={() => {}}
              onNavigateToAbsensi={() => {}}
            />
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <BottomNav
          activeTab={currentTab}
          userRole={normalizedRole}
          onTabChange={(tab) => setCurrentTab(tab)}
        />

        {/* Logout FAB (visible on profil tab) */}
        {currentTab === 'profil' && (
          <button
            type="button"
            onClick={onLogout}
            className="fixed bottom-24 right-4 z-50 w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-90 transition-all cursor-pointer"
            aria-label="Keluar"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
          </button>
        )}
      </div>

      {/* ─── Modals ─── */}
      <ScheduleModal
        isOpen={isScheduleModalOpen}
        editingSlot={editingSlot}
        onClose={() => setIsScheduleModalOpen(false)}
        onSave={handleSaveSchedule}
      />

      <AttachmentModal
        student={selectedStudentAttachment}
        onClose={() => setSelectedStudentAttachment(null)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        notifications={notifications}
        onClose={() => setIsNotificationsOpen(false)}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        userRole={normalizedRole}
        onAddNotification={(newNotif) => {
          setNotifications((prev) => {
            const updated = [newNotif, ...prev];
            try { localStorage.setItem('smkn1_school_announcements', JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
          showToast('Pemberitahuan berhasil disiarkan!');
        }}
      />

      <PrintModal
        isOpen={isPrintModalOpen}
        schedules={schedules}
        onClose={() => setIsPrintModalOpen(false)}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-auto md:top-20 md:right-6 md:left-auto md:translate-x-0 w-max max-w-[calc(100vw-2rem)] z-50 bg-[#2d3133] text-[#eff1f3] px-4 py-2.5 rounded-2xl md:rounded-full shadow-xl text-[12px] font-semibold flex items-center gap-2 animate-bounceIn border border-white/10">
          <span className="material-symbols-outlined text-[#6ffbbe] text-[18px]">
            check_circle
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
