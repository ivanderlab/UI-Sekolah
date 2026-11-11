import { supabase } from './lib/supabase';
import React, { useState } from 'react';
import {
  INITIAL_CLASS_SUMMARY,
  INITIAL_STUDENTS as SAMAKAN_INITIAL_STUDENTS,
  INITIAL_TEACHER_ALERT,
  USER_PROFILES,
} from './data/samakan/mockData';
import { INITIAL_STUDENTS as OLD_INITIAL_STUDENTS } from './data/students';
import { Student, AttendanceStatus } from './types/attendance';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNavSamakan';
import { Toast, ToastData } from './components/Toast';
import { HomeScreen } from './components/HomeScreenSamakan';
import { LoginScreen } from './components/LoginScreen';
import { JadwalScreen } from './components/JadwalScreen';
import { ProfileScreen } from './components/ProfileScreenSamakan';
import { EditProfileScreen } from './components/EditProfileScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { UserProfile, ClassAttendanceSummary, StudentAttendance, TeacherCallAlert, UserRole } from './types';
import { useAuth } from './hooks/useAuth';
import { getWewenangPengabsenHariIni } from './utils/perangkatKelasManager';

// Old Attendance Screen
import { AttendanceScreen } from './components/AttendanceScreen';
import { SubmitModal } from './components/SubmitModal';
import { AttachmentModal } from './components/AttachmentModal';
import { ValidasiGuruScreen } from './components/ValidasiGuruScreen';
import { PerangkatKelasScreen } from './components/PerangkatKelasScreen';
import { WaliKelasDashboard } from './components/WaliKelasDashboard';
import { GuruPiketDashboard } from './components/GuruPiketDashboard';
import { OperatorDashboard } from './components/OperatorDashboard';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AdminPortal } from './components/admin/AdminPortal';
import { NotificationsModal } from './components/NotificationsModal';
import { NOTIFICATIONS } from './components/admin/mockData';
import { NotificationItem } from './types';

export default function App() {
  const auth = useAuth();

  // --- UI State ---
  const [isGuestPublic, setIsGuestPublic] = useState(false);
  const [avatarOverride, setAvatarOverride] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<'beranda' | 'jadwal' | 'absensi' | 'profil' | 'edit-profil' | 'ganti-password' | 'wali-kelas' | 'guru-piket'>('beranda');
  const [adminInspectingRole, setAdminInspectingRole] = useState<'guru' | 'siswa' | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  
  // Samakan state
  const [classSummary, setClassSummary] = useState<ClassAttendanceSummary>(INITIAL_CLASS_SUMMARY);
  const [samakanStudents, setSamakanStudents] = useState<StudentAttendance[]>(SAMAKAN_INITIAL_STUDENTS);
  const [teacherAlert, setTeacherAlert] = useState<TeacherCallAlert>(INITIAL_TEACHER_ALERT);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Notifications State (Synced with AdminPortal)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('smkn1_school_announcements');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return NOTIFICATIONS;
  });
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      try {
        localStorage.setItem('smkn1_school_announcements', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Notifikasi', 'Semua notifikasi ditandai telah dibaca.', 'info');
  };

  const handleAddNotification = (newNotif: NotificationItem) => {
    setNotifications((prev) => {
      const updated = [newNotif, ...prev];
      try {
        localStorage.setItem('smkn1_school_announcements', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    showToast('Berhasil', 'Pengumuman baru berhasil disiarkan.', 'success');
  };

  // Old Attendance state
  const [oldStudents, setOldStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('smkn1_attendance_students_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const deduped = parsed.filter(s => {
            const key = (s.name || '').trim().toUpperCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return deduped.map((s, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            return { ...s, absentNo: numStr, studentNo: numStr };
          });
        }
      } catch (e) { console.error(e); }
    }
    return OLD_INITIAL_STUDENTS;
  });
  const [isDraftSavedOffline, setIsDraftSavedOffline] = useState<boolean>(false);
  const [previousOldStudentsState, setPreviousOldStudentsState] = useState<Student[] | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [selectedStudentForAttachment, setSelectedStudentForAttachment] = useState<Student | null>(null);
  const [attachmentModalMode, setAttachmentModalMode] = useState<'view' | 'edit'>('view');

  const showToast = (title: string, description: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToast({ title, description, type });
    setTimeout(() => setToast(null), 4000);
  };

  const supabaseRole: UserRole = (auth.userRole as UserRole) ?? 'siswa';
  const currentUser: UserProfile = auth.profile
    ? {
        ...USER_PROFILES[supabaseRole] ?? USER_PROFILES.siswa,
        id: auth.profile.id,
        name: auth.profile.nama,
        phone: auth.profile.phone || '',
        avatarUrl: avatarOverride || auth.profile.avatar_url || (USER_PROFILES[supabaseRole] ?? USER_PROFILES.siswa).avatarUrl,
        role: supabaseRole,
        roleTitle:
          supabaseRole === 'superadmin' ? 'Kepala Sekolah / IT Admin'
          : (supabaseRole === 'operator' || (supabaseRole as any) === 'admin') ? 'Tata Usaha / Operator'
          : auth.profile.is_wali_kelas ? `Wali Kelas ${auth.profile.wali_kelas?.nama || ''}`
          : auth.profile.is_guru_piket ? 'Guru Piket'
          : supabaseRole === 'guru' ? 'Guru Mata Pelajaran'
          : auth.profile.is_sekretaris ? 'Sekretaris Kelas'
          : 'Siswa',
        identifier: auth.profile.username,
        kelas_id: auth.profile.kelas_id || auth.profile.wali_kelas?.id || 'e88128be-8fc3-4973-8d69-00ef17571626',
        kelas: (auth.profile as any).kelas || (auth.profile.wali_kelas ? { id: auth.profile.wali_kelas.id, nama: auth.profile.wali_kelas.nama } : { id: 'e88128be-8fc3-4973-8d69-00ef17571626', nama: 'XII TKJ 1' }),
        is_wali_kelas: auth.profile.is_wali_kelas,
        wali_kelas: auth.profile.wali_kelas ? { id: auth.profile.wali_kelas.id, nama: auth.profile.wali_kelas.nama } : undefined,
        is_guru_piket: auth.profile.is_guru_piket,
      }
    : {
        ...USER_PROFILES.siswa,
        kelas_id: 'e88128be-8fc3-4973-8d69-00ef17571626',
        kelas: { id: 'e88128be-8fc3-4973-8d69-00ef17571626', nama: 'XII TKJ 1' },
      };

  // Unread Notifications Count based on targetAudience and user role
  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter((n) => {
      if (n.read) return false;
      const roleKey =
        currentUser.role === 'superadmin' ? 'superadmin'
        : currentUser.role === 'operator' || (currentUser.role as any) === 'admin' ? 'admin'
        : currentUser.role === 'guru' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru_piket' ? 'guru'
        : 'siswa';
      if (roleKey === 'admin' || roleKey === 'superadmin') return true;
      if (!n.targetAudience || n.targetAudience === 'semua') return true;
      return n.targetAudience === roleKey;
    }).length;
  }, [notifications, currentUser.role]);

  // Status Kehadiran Hari Ini & Wewenang Pengabsen Harian Siswa
  const todayStatusMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    oldStudents.forEach(s => {
      map[s.id] = s.status;
    });
    return map;
  }, [oldStudents]);

  const wewenangPengabsen = React.useMemo(() => {
    const targetKelasId = currentUser.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626';
    return getWewenangPengabsenHariIni(
      targetKelasId,
      currentUser.id,
      todayStatusMap,
      oldStudents.map(s => ({ id: s.id, nama: s.name }))
    );
  }, [currentUser.kelas_id, currentUser.id, todayStatusMap, oldStudents]);

  // Load real students for currentUser.kelas_id
  React.useEffect(() => {
    const targetKelasId = currentUser.kelas_id;
    if (!targetKelasId) return;

    async function loadClassStudents() {
      try {
        const { data: dbStudents } = await supabase
          .from('profiles')
          .select('id, nama, username')
          .eq('kelas_id', targetKelasId)
          .eq('role', 'siswa')
          .order('nama', { ascending: true });

        if (dbStudents && dbStudents.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: todayAbsen } = await supabase
            .from('absen_harian')
            .select('siswa_id, status, keterangan')
            .eq('kelas_id', targetKelasId)
            .eq('tanggal', todayStr);

          const statusMap: Record<string, any> = {};
          (todayAbsen || []).forEach((a: any) => {
            const s = a.status === 'Hadir' ? 'H' : a.status === 'Sakit' ? 'S' : a.status === 'Izin' ? 'I' : a.status === 'Bolos' ? 'B' : 'A';
            statusMap[a.siswa_id] = { status: s, note: a.keterangan };
          });

          // Deduplicate students by name to guarantee exact unique list
          const seenNames = new Set<string>();
          const uniqueDbStudents = dbStudents.filter(s => {
            const key = (s.nama || '').trim().toUpperCase();
            if (seenNames.has(key)) return false;
            seenNames.add(key);
            return true;
          });

          const mapped: Student[] = uniqueDbStudents.map((s, idx) => {
            const numStr = String(idx + 1).padStart(2, '0');
            const existing = statusMap[s.id];
            return {
              id: s.id,
              absentNo: numStr,
              name: s.nama,
              studentNo: numStr,
              nisn: s.username.replace(/^s_?/, ''),
              status: existing ? existing.status : 'H',
              note: existing?.note || undefined,
              avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.nama)}&background=005fa0&color=fff`,
            };
          });

          setOldStudents(mapped);
          localStorage.setItem('smkn1_attendance_students_v2', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('Offline mode: Using cached students data', err);
      }
    }

    loadClassStudents();
  }, [currentUser.kelas_id]);

  const handleLogin = async (_role: UserRole, identifier?: string, password?: string) => {
    if (!identifier || !password) return;
    setLoginError(null);

    const result = await auth.login(identifier, password);
    if (result.error) {
      setLoginError(result.error);
    } else {
      setCurrentTab('beranda');
      showToast('Login Berhasil!', `Selamat datang, ${result.profile?.nama ?? identifier}!`, 'success');
    }
  };

  const handleOpenPublicSchedule = () => {
    setIsGuestPublic(true);
    setCurrentTab('jadwal');
  };

  const handleLogout = async () => {
    await auth.logout();
    setIsGuestPublic(false);
    setCurrentTab('beranda');
    setLoginError(null);
  };

  // --- Samakan Handlers ---
  const handleSendTeacherCall = () => {
    setTeacherAlert((prev) => ({ ...prev, isActive: true, timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIT', statusResponse: 'pending' }));
  };

  const handleSubmitMorningDraft = (updatedStudents: StudentAttendance[]) => {
    setSamakanStudents(updatedStudents);
    const presentCount = updatedStudents.filter((s) => s.morningStatus === 'hadir').length;
    setClassSummary((prev) => ({ ...prev, present: presentCount, sick: updatedStudents.filter(s => s.morningStatus === 'sakit').length, permitted: updatedStudents.filter(s => s.morningStatus === 'izin').length, unexcused: updatedStudents.filter(s => s.morningStatus === 'alfa').length, validationStatus: 'menunggu_acc' }));
  };

  // --- Old Attendance Handlers ---
  const handleUpdateStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setOldStudents((prev) =>
      prev.map((student) => {
        if (student.id === studentId) {
          return { ...student, status, warningAlert: status === 'B' ? (student.warningAlert || 'Terdeteksi Bolos: Siswa tidak berada di kelas.') : undefined };
        }
        return student;
      })
    );
    setIsDraftSavedOffline(false);
  };


  const handleSaveOfflineDraft = () => {
    localStorage.setItem('smkn1_attendance_students_v2', JSON.stringify(oldStudents));
    setIsDraftSavedOffline(true);
    showToast('Tersimpan', 'Draft presensi berhasil disimpan secara lokal (Offline)!', 'success');
  };

  const handleConfirmSubmit = async () => {
    localStorage.setItem('smkn1_attendance_students_v2', JSON.stringify(oldStudents));
    setIsSubmitModalOpen(false);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const targetKelasId = currentUser.kelas_id;
      if (targetKelasId) {
        const rows = oldStudents.map(s => {
          const dbStatus = s.status === 'H' ? 'Hadir' : s.status === 'S' ? 'Sakit' : s.status === 'I' ? 'Izin' : s.status === 'B' ? 'Bolos' : 'Alfa';
          return {
            tanggal: todayStr,
            siswa_id: s.id,
            kelas_id: targetKelasId,
            status: dbStatus,
            keterangan: s.note || null,
            diinput_oleh: currentUser.id,
            status_validasi: 'draft' as const
          };
        });
        await supabase.from('absen_harian').upsert(rows, { onConflict: 'tanggal,siswa_id' });
      }
    } catch (e) {
      console.error('Error saving absen_harian:', e);
    }

    showToast('Berhasil', 'Draft berhasil dikirim untuk validasi!', 'success');
  };

  const handleSaveNote = (studentId: string, note: string, fileName?: string) => {
    setOldStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            note,
            badge: 'Baru Diubah',
            attachment: s.attachment
              ? { ...s.attachment, fileName: fileName || s.attachment.fileName }
              : { type: 'doctor_note', title: 'Keterangan Khusus', fileName: fileName || 'Keterangan.jpg', date: new Date().toLocaleDateString('id-ID') },
          };
        }
        return s;
      })
    );
    setSelectedStudentForAttachment(null);
    showToast('Berhasil', 'Keterangan dan lampiran berhasil diperbarui.', 'success');
  };

  // --- Loading ---
  if (auth.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9ff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#005fa0] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-500 font-medium">Memuat aplikasi...</span>
        </div>
      </div>
    );
  }

  // --- Login Screen ---
  if (!auth.isLoggedIn && !isGuestPublic) {
    return (
      <>
        <LoginScreen
          onLoginSuccess={handleLogin}
          onOpenPublicSchedule={handleOpenPublicSchedule}
        />
        {loginError && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold max-w-xs text-center">
            ❌ {loginError}
          </div>
        )}
        <Toast toast={toast} onClose={() => setToast(null)} />
      </>
    );
  }

  // --- Admin TU & Super Admin Portal (UI-Sekolah) ---
  const isAdminOrSuperadmin =
    currentUser.role === 'operator' ||
    (currentUser.role as any) === 'admin' ||
    currentUser.role === 'superadmin';

  if (isAdminOrSuperadmin && !isGuestPublic && !adminInspectingRole) {
    return (
      <AdminPortal
        session={{
          username: currentUser.identifier || 'admin_demo',
          role: currentUser.role === 'superadmin' ? 'superadmin' : 'admin',
          nama: currentUser.name || (currentUser.role === 'superadmin' ? 'Superadmin SIAP' : 'Tata Usaha / Operator'),
        }}
        onLogout={handleLogout}
        onSwitchToAppRole={(targetRole) => {
          setAdminInspectingRole(targetRole);
          setCurrentTab('beranda');
          showToast('Mode Inspeksi Aktif', `Beralih ke tampilan simulasi ${targetRole.toUpperCase()}`, 'info');
        }}
      />
    );
  }

  const effectiveRole: UserRole = adminInspectingRole || supabaseRole;
  const activeUser: UserProfile = adminInspectingRole
    ? {
        ...currentUser,
        role: adminInspectingRole,
        roleTitle: adminInspectingRole === 'guru' ? 'Guru Mapel (Inspeksi Admin)' : 'Siswa (Inspeksi Admin)',
      }
    : currentUser;

  // --- Main App ---
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-surface flex flex-col justify-between font-body text-on-surface">
      {adminInspectingRole && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white px-3 sm:px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg border-b border-white/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Mode Inspeksi {adminInspectingRole === 'guru' ? '👨‍🏫 Guru' : '🎓 Siswa'} • Operator: {currentUser.name}</span>
          </div>
          <button
            onClick={() => setAdminInspectingRole(null)}
            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer shadow-xs border border-white/20 whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined notranslate text-[14px]">arrow_back</span>
            <span>Kembali ke Portal Admin</span>
          </button>
        </div>
      )}

      {currentTab !== 'edit-profil' && currentTab !== 'ganti-password' && (
        <Navbar
          currentTab={currentTab}
          user={activeUser}
          onSelectRole={() => {}}
          onOpenHtmlModal={() => {}}
          onNavigateToTab={(tab) => setCurrentTab(tab as any)}
        />
      )}

      {isGuestPublic && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-amber-500 text-amber-950 px-3 sm:px-4 py-1.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <span>Mode Tamu: Jadwal Pelajaran Publik SMKN 1 Sorong</span>
          <button onClick={() => setIsGuestPublic(false)} className="bg-white/90 hover:bg-white px-2.5 py-0.5 rounded text-[11px] text-amber-900 whitespace-nowrap shrink-0 cursor-pointer">Masuk ke Akun</button>
        </div>
      )}

      <main className={`flex-1 w-full ${adminInspectingRole ? 'pt-28 sm:pt-24' : isGuestPublic ? 'pt-28 sm:pt-24' : 'pt-16'}`}>
        {currentTab === 'beranda' && (
          (activeUser.role === 'operator' || (activeUser.role as any) === 'admin' || activeUser.role === 'superadmin') ? (
            <AdminDashboardView
              roleTitle={activeUser.roleTitle}
              initialRoleMode={activeUser.role === 'superadmin' ? 'superadmin' : 'admin'}
              onLogout={handleLogout}
            />
          ) : (
            <HomeScreen
              user={activeUser}
              classSummary={classSummary}
              students={samakanStudents}
              oldStudents={oldStudents}
              teacherAlert={teacherAlert}
              onSendTeacherCall={handleSendTeacherCall}
              onSubmitMorningDraft={handleSubmitMorningDraft}
              onNavigateToTab={(tab) => setCurrentTab(tab as any)}
              onShowToast={showToast}
              onOpenNotifications={() => setIsNotificationModalOpen(true)}
              unreadNotificationsCount={unreadNotificationsCount}
            />
          )
        )}

        {currentTab === 'jadwal' && (
          activeUser.role === 'operator' ? (
            <OperatorDashboard
              user={activeUser}
              onLogout={handleLogout}
              onShowToast={showToast}
              initialTab="jadwal"
            />
          ) : (
            <JadwalScreen onShowToast={showToast} user={activeUser} />
          )
        )}

        {currentTab === 'absensi' && (
          activeUser.role === 'operator' ? (
            <OperatorDashboard
              user={activeUser}
              onLogout={handleLogout}
              onShowToast={showToast}
              initialTab="wali_kelas"
            />
          ) : (activeUser.role === 'guru' || activeUser.role === 'wali_kelas' || activeUser.is_wali_kelas) ? (
            <PerangkatKelasScreen
              user={activeUser}
              initialClassId={activeUser.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626'}
              onNavigateHome={() => setCurrentTab('beranda')}
              onShowToast={showToast}
            />
          ) : (effectiveRole === 'siswa' || effectiveRole === 'sekretaris') ? (
              <div className="w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto pb-24 px-3 sm:px-4">
                <AttendanceScreen
                  readOnly={!wewenangPengabsen.canInputAttendance}
                  officerInfo={{
                    canInput: wewenangPengabsen.canInputAttendance,
                    officerRole: (wewenangPengabsen.officerRole === 'sekretaris_2' ? 'sekretaris' : wewenangPengabsen.officerRole) as any,
                    title: wewenangPengabsen.officerTitle,
                    name: wewenangPengabsen.activeOfficerName,
                    reason: wewenangPengabsen.officerReason,
                    isDelegated: wewenangPengabsen.isDelegated,
                    hierarchyStep: wewenangPengabsen.hierarchyStep,
                    sekretarisAbsent: wewenangPengabsen.sekretarisAbsent,
                    ketuaAbsent: wewenangPengabsen.ketuaAbsent,
                  }}
                  classTitle={activeUser.kelas?.nama}
                  students={oldStudents}
                  onUpdateStudentStatus={handleUpdateStudentStatus}

                  onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                  onSaveOfflineDraft={handleSaveOfflineDraft}
                  onViewAttachment={(student) => {
                    setSelectedStudentForAttachment(student);
                    setAttachmentModalMode('view');
                  }}
                  onEditNote={(student) => {
                    setSelectedStudentForAttachment(student);
                    setAttachmentModalMode(wewenangPengabsen.canInputAttendance ? 'edit' : 'view');
                  }}
                  isDraftSavedOffline={isDraftSavedOffline}
                  onNavigateHome={() => setCurrentTab('beranda')}
                  containerWidthClass="w-full"
                />
              </div>
            ) : (
            <ValidasiGuruScreen
              user={activeUser}
              initialClassId={activeUser.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626'}
              onClose={() => setCurrentTab('beranda')}
              onShowToast={showToast}
            />
          )
        )}

        {currentTab === 'wali-kelas' && (
          <WaliKelasDashboard
            user={activeUser}
            onNavigateHome={() => setCurrentTab('beranda')}
            onNavigateToTab={(tab) => setCurrentTab(tab as any)}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'guru-piket' && (
          <GuruPiketDashboard
            user={activeUser}
            onNavigateHome={() => setCurrentTab('beranda')}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'edit-profil' && (
          <EditProfileScreen
            onBack={() => setCurrentTab('profil')}
            user={activeUser}
            onProfileUpdated={(updated) => {
              if (updated.avatarUrl) {
                setAvatarOverride(updated.avatarUrl);
              }
              if (auth.profile) {
                if (updated.name) auth.profile.nama = updated.name;
                if (updated.phone) auth.profile.phone = updated.phone;
                if (updated.avatarUrl) auth.profile.avatar_url = updated.avatarUrl;
              }
            }}
          />
        )}
        {currentTab === 'profil' && (
          <ProfileScreen
            user={activeUser}
            onLogout={handleLogout}
            onShowToast={showToast}
            onEditProfile={() => setCurrentTab('edit-profil')}
              onChangePassword={() => setCurrentTab('ganti-password')}
          />
        )}
        {currentTab === 'ganti-password' && (
          <ChangePasswordScreen onBack={() => setCurrentTab('profil')} />
        )}
      </main>

      {!isGuestPublic && currentTab !== 'edit-profil' && currentTab !== 'ganti-password' && (
        <BottomNav
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab as any)}
          userRole={activeUser.role}
          pendingValidationCount={classSummary.validationStatus === 'menunggu_acc' ? 1 : 0}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Modals for Old Attendance Screen */}
      <SubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        students={oldStudents}
        onConfirmSuccess={handleConfirmSubmit}
      />
      <AttachmentModal
        student={selectedStudentForAttachment}
        mode={attachmentModalMode}
        isOpen={Boolean(selectedStudentForAttachment)}
        onClose={() => setSelectedStudentForAttachment(null)}
        onSaveNote={handleSaveNote}
      />
      <NotificationsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={handleMarkAllNotificationsRead}
        onAddNotification={handleAddNotification}
        userRole={
          currentUser.role === 'superadmin' ? 'superadmin'
          : currentUser.role === 'operator' || (currentUser.role as any) === 'admin' ? 'admin'
          : currentUser.role === 'guru' || currentUser.role === 'wali_kelas' || currentUser.role === 'guru_piket' ? 'guru'
          : 'siswa'
        }
      />
    </div>
  );
}




