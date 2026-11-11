import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { SCHEDULE_DAYS, SCHEDULES_BY_DAY } from '../data/samakan/scheduleData';
import { ScheduleItem } from '../types';
import { supabase } from '../lib/supabase';
import { ValidasiGuruScreen } from './ValidasiGuruScreen';

interface JadwalScreenProps {
  user?: UserProfile;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
  onNavigateToTab?: (tab: string) => void;
}

// ============================================================
// ABSENSI MODAL - Popup saat kelas di-klik
// ============================================================
export interface AbsensiModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwalItem: any;
  guruId: string;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
}

export type StatusAbsen = 'Hadir' | 'Izin' | 'Sakit' | 'Alfa' | 'Terlambat';

export const statusColors: Record<StatusAbsen, string> = {
  Hadir: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Terlambat: 'bg-amber-100 text-amber-700 border-amber-200',
  Izin: 'bg-sky-100 text-sky-700 border-sky-200',
  Sakit: 'bg-purple-100 text-purple-700 border-purple-200',
  Alfa: 'bg-red-100 text-red-700 border-red-200',
};

export const statusBg: Record<StatusAbsen, string> = {
  Hadir: 'bg-emerald-500',
  Terlambat: 'bg-amber-500',
  Izin: 'bg-sky-500',
  Sakit: 'bg-purple-500',
  Alfa: 'bg-red-500',
};

export const AbsensiModal: React.FC<AbsensiModalProps> = ({ isOpen, onClose, jadwalItem, guruId, onShowToast }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, StatusAbsen>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSiswaId, setEditingSiswaId] = useState<string | null>(null);

  const kelasId = jadwalItem?.kelas_id || jadwalItem?.kelas?.id;
  const kelasNama = jadwalItem?.kelas?.nama || 'Kelas';
  const mapelNama = jadwalItem?.mapel?.nama || 'Mata Pelajaran';
  const jadwalId = jadwalItem?.id;
  const today = new Date().toISOString().split('T')[0];

  // Fetch students + existing attendance
  useEffect(() => {
    if (!isOpen || !kelasId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch siswa di kelas ini
        const { data: siswaList, error: siswaErr } = await supabase
          .from('profiles')
          .select('id, nama, username')
          .eq('kelas_id', kelasId)
          .eq('role', 'siswa')
          .order('nama');

        if (siswaErr) throw siswaErr;
        setStudents(siswaList || []);

        // Fetch existing absen_mapel for this jadwal + today
        const { data: absenData } = await supabase
          .from('absen_mapel')
          .select('siswa_id, status')
          .eq('jadwal_id', jadwalId)
          .eq('tanggal', today);

        // Build attendance map: default Hadir
        const att: Record<string, StatusAbsen> = {};
        (siswaList || []).forEach((s: any) => {
          att[s.id] = 'Hadir'; // default
        });
        // Override with existing data
        (absenData || []).forEach((a: any) => {
          att[a.siswa_id] = a.status as StatusAbsen;
        });
        setAttendance(att);
      } catch (err: any) {
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, kelasId, jadwalId, today]);

  const handleStatusChange = (siswaId: string, status: StatusAbsen) => {
    setAttendance(prev => ({ ...prev, [siswaId]: status }));
    setEditingSiswaId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertData = students.map(s => ({
        tanggal: today,
        jadwal_id: jadwalId,
        siswa_id: s.id,
        status: attendance[s.id] || 'Hadir',
        diinput_oleh: guruId,
      }));

      const { error } = await supabase
        .from('absen_mapel')
        .upsert(upsertData, { onConflict: 'tanggal,jadwal_id,siswa_id' });

      if (error) throw error;
      onShowToast('Berhasil Disimpan', `Absensi ${kelasNama} berhasil diperbarui`, 'success');
      onClose();
    } catch (err: any) {
      onShowToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan', 'warning');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = {
    Hadir: Object.values(attendance).filter(s => s === 'Hadir').length,
    Terlambat: Object.values(attendance).filter(s => s === 'Terlambat').length,
    Izin: Object.values(attendance).filter(s => s === 'Izin').length,
    Sakit: Object.values(attendance).filter(s => s === 'Sakit').length,
    Alfa: Object.values(attendance).filter(s => s === 'Alfa').length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-md max-h-[92vh] rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-primary px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined notranslate text-white">fact_check</span>
              <h2 className="text-white font-headline font-bold text-base">Absensi Kelas</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined notranslate">close</span>
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {kelasNama}
            </span>
            <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
              {mapelNama}
            </span>
            <span className="bg-white/10 text-white/80 text-[10px] px-2 py-0.5 rounded-full">
              {today}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 overflow-x-auto">
          {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa'] as StatusAbsen[]).map(status => (
            <div key={status} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${statusColors[status]}`}>
              <div className={`w-2 h-2 rounded-full ${statusBg[status]}`} />
              {status}: {stats[status]}
            </div>
          ))}
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-semibold">Memuat data siswa...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <span className="material-symbols-outlined notranslate text-4xl text-slate-300">group_off</span>
              <p className="text-slate-400 text-sm font-semibold mt-2">Belum ada siswa di kelas ini</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {students.map((siswa, idx) => {
                const currentStatus = attendance[siswa.id] || 'Hadir';
                const isEditing = editingSiswaId === siswa.id;

                return (
                  <div key={siswa.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setEditingSiswaId(isEditing ? null : siswa.id)}
                    >
                      {/* Number */}
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{siswa.nama}</p>
                      </div>

                      {/* Status Badge */}
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[currentStatus]}`}>
                        {currentStatus}
                      </div>

                      {/* Expand Icon */}
                      <span className={`material-symbols-outlined notranslate text-slate-300 text-[18px] transition-transform ${isEditing ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </div>

                    {/* Status Selector (expanded) */}
                    {isEditing && (
                      <div className="px-3 pb-3 pt-1 bg-slate-50 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-semibold mb-2">Ubah status kehadiran:</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['Hadir', 'Terlambat', 'Izin', 'Sakit', 'Alfa'] as StatusAbsen[]).map(status => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(siswa.id, status)}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                                currentStatus === status
                                  ? `${statusBg[status]} text-white border-transparent shadow-sm`
                                  : `bg-white ${statusColors[status]} hover:opacity-80`
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold text-sm transition-all active:scale-[0.98] hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-[2] py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined notranslate text-[18px]">save</span>
                Simpan Absensi
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


// ============================================================
// JADWAL GURU VIEW (DB CONNECTED)
// ============================================================
const JadwalGuruView: React.FC<{ user: UserProfile; onShowToast: any; onNavigateToTab?: any }> = ({ user, onShowToast, onNavigateToTab }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000); // 5s tick
    return () => clearInterval(timer);
  }, []);

  let today = new Date();
  if ((window as any).DEBUG_TIME) {
    const [h,m] = (window as any).DEBUG_TIME.split(':').map(Number);
    today.setHours(h, m, 0);
  }
  
  const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  let currentDayIndex = today.getDay();
  if ((window as any).DEBUG_DAY_INDEX !== undefined) {
    currentDayIndex = ((window as any).DEBUG_DAY_INDEX + 1) % 7; // map 0=Senin to Sunday=0 format? 
    // Wait, the select has value="0" for Senin.
    // getDay: 0=Minggu, 1=Senin. So if DEBUG=0 (Senin), it should be 1.
    currentDayIndex = ((window as any).DEBUG_DAY_INDEX === 6) ? 0 : (window as any).DEBUG_DAY_INDEX + 1;
  }
  
  const hariIni = hariNames[currentDayIndex];

  const [selectedDay, setSelectedDay] = useState(hariIni === 'Minggu' ? 'Senin' : hariIni);
  const [dbSchedules, setDbSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [selectedJadwal, setSelectedJadwal] = useState<any>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoading(true);
      setDbError(null);

      try {
        let query = supabase
          .from('jadwal')
          .select(`
            id, jam_mulai, jam_selesai, hari, kelas_id,
            kelas:kelas_id(id, nama),
            mapel:mapel_id(nama)
          `)
          .eq('guru_id', user.id)
          .eq('hari', selectedDay)
          .order('jam_mulai', { ascending: true });

        const { data, error } = await query;
        if (error) throw error;

        // Group consecutive same-class sessions (even if there are breaks)
        const grouped: any[] = [];
        (data || []).forEach((item: any) => {
          const lastGroup = grouped[grouped.length - 1];
          
          // Calculate item duration
          const [sh, sm] = (item.jam_mulai || '00:00').split(':').map(Number);
          const [eh, em] = (item.jam_selesai || '00:00').split(':').map(Number);
          const itemDuration = (eh * 60 + em) - (sh * 60 + sm);

          if (
            lastGroup &&
            lastGroup.kelas_id === item.kelas_id &&
            lastGroup.mapel?.nama === item.mapel?.nama
          ) {
            // Merge: extend the end time and add to total duration
            lastGroup.jam_selesai = item.jam_selesai;
            lastGroup.sessionCount = (lastGroup.sessionCount || 1) + 1;
            lastGroup.actualDuration = (lastGroup.actualDuration || 0) + itemDuration;
          } else {
            grouped.push({ ...item, sessionCount: 1, actualDuration: itemDuration });
          }
        });

        if (grouped.length > 0) {
          setDbSchedules(grouped);
          setIsOfflineFallback(false);
        } else {
          // Fallback to local schedules for this teacher
          const dayKey = selectedDay.toLowerCase();
          const fallbackList = SCHEDULES_BY_DAY[dayKey] || [];
          const mappedFallback = fallbackList.map((item, idx) => {
            const parts = (item.time || '08.15 - 10.15').split(' - ');
            const jamMulai = (parts[0] || '08:15').replace('.', ':') + ':00';
            const jamSelesai = (parts[1] || '10:15').replace('.', ':') + ':00';
            const [sh, sm] = jamMulai.split(':').map(Number);
            const [eh, em] = jamSelesai.split(':').map(Number);
            const duration = (eh * 60 + em) - (sh * 60 + sm);
            return {
              id: item.id || `fb-guru-${idx}`,
              jam_mulai: jamMulai,
              jam_selesai: jamSelesai,
              hari: selectedDay,
              kelas_id: user.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626',
              kelas: { id: user.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626', nama: user.kelas?.nama || 'XII TKJ 1' },
              mapel: { nama: item.subject },
              sessionCount: 2,
              actualDuration: duration,
            };
          });
          setDbSchedules(mappedFallback);
          setIsOfflineFallback(false);
        }
      } catch (err: any) {
        console.warn('Supabase offline/paused, loading local fallback schedule for teacher:', err);
        const dayKey = selectedDay.toLowerCase();
        const fallbackList = SCHEDULES_BY_DAY[dayKey] || [];
        const mappedFallback = fallbackList.map((item, idx) => {
          const parts = (item.time || '08.15 - 10.15').split(' - ');
          const jamMulai = (parts[0] || '08:15').replace('.', ':') + ':00';
          const jamSelesai = (parts[1] || '10:15').replace('.', ':') + ':00';
          const [sh, sm] = jamMulai.split(':').map(Number);
          const [eh, em] = jamSelesai.split(':').map(Number);
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          return {
            id: item.id || `fb-guru-${idx}`,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            hari: selectedDay,
            kelas_id: user.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626',
            kelas: { id: user.kelas_id || 'e88128be-8fc3-4973-8d69-00ef17571626', nama: user.kelas?.nama || 'XII TKJ 1' },
            mapel: { nama: item.subject },
            sessionCount: 2,
            actualDuration: duration,
          };
        });
        setDbSchedules(mappedFallback);
        setIsOfflineFallback(true);
        setDbError(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSchedules();
  }, [user.id, selectedDay]);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // Calculate duration in minutes
  const calcDuration = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  return (
    <>
      <div className="flex flex-col w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto pb-28 min-h-screen bg-slate-50 font-body">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-[#003d73] pt-6 pb-6 px-4 sm:px-6 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-white font-headline font-bold text-lg flex items-center gap-2">
                <span className="material-symbols-outlined notranslate">calendar_month</span>
                Jadwal Mengajar
              </h1>
              <p className="text-sky-200 text-[11px] mt-0.5">
                {today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-white/15 rounded-2xl px-3 py-2 backdrop-blur-sm text-center">
              <p className="text-white font-headline font-bold text-xl leading-none">
                {dbSchedules.length}
              </p>
              <p className="text-sky-200 text-[9px] font-semibold">Sesi Hari Ini</p>
            </div>
          </div>
        </div>

        {/* Day Selector */}
        <div className="px-3 sm:px-4 mt-4">
        {/* Fluid Animated Slidebar: Hari Mengajar Guru */}
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined notranslate text-[15px] text-primary">calendar_today</span>
            Hari Mengajar
          </span>
          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>Geser fluid</span>
            <span className="material-symbols-outlined notranslate text-[13px]">swipe</span>
          </div>
        </div>

        <div className="relative flex items-center w-full mb-3">
          <div
            className="flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar py-1 px-0.5 w-full touch-pan-x"
            style={{ scrollSnapType: 'x proximity' }}
          >
            {days.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = day === hariIni;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => {
                    setSelectedDay(day);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary to-[#003d73] text-white shadow-md shadow-primary/30 scale-[1.03] ring-2 ring-primary/25'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <span>{day.toUpperCase()}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#6ffbbe] shadow-[0_0_8px_#6ffbbe] animate-pulse" />
                  )}
                  {!isSelected && isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

          {/* Schedule Cards */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {isOfflineFallback && (
              <div className="col-span-full bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between shadow-sm mb-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined notranslate text-amber-600 text-[18px]">cloud_off</span>
                  <span className="font-semibold">Mode Cadangan Offline (Database Supabase sedang istirahat)</span>
                </div>
                <span className="bg-amber-200/60 text-amber-950 font-bold px-2 py-0.5 rounded-md text-[10px]">
                  Jadwal Lokal Aktif
                </span>
              </div>
            )}
            {isLoading ? (
              <div className="bg-white p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-100 shadow-sm">
                <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-slate-400 text-xs font-bold">Mengambil jadwal...</p>
              </div>
            ) : dbError ? (
              <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-xs text-center font-semibold">
                Gagal mengambil jadwal: {dbError}
              </div>
            ) : dbSchedules.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-100 shadow-sm">
                <span className="material-symbols-outlined notranslate text-4xl text-slate-300">event_busy</span>
                <p className="text-slate-500 text-sm font-bold">Tidak ada jadwal hari {selectedDay}</p>
                <p className="text-slate-400 text-[11px]">Anda tidak memiliki kelas pada hari ini</p>
              </div>
            ) : (
              dbSchedules.map((item: any, idx: number) => {
                const jamMulai = item.jam_mulai ? item.jam_mulai.substring(0, 5) : '';
                const jamSelesai = item.jam_selesai ? item.jam_selesai.substring(0, 5) : '';
                const duration = item.actualDuration || calcDuration(jamMulai, jamSelesai);

                // Check if this session is currently active
                const now = today.getHours() * 60 + today.getMinutes();
                const [startH, startM] = jamMulai.split(':').map(Number);
                const [endH, endM] = jamSelesai.split(':').map(Number);
                const startMin = startH * 60 + startM;
                const endMin = endH * 60 + endM;
                const isLive = selectedDay === hariIni && now >= startMin && now < endMin;
                const isDone = selectedDay === hariIni && now >= endMin;

                return (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedJadwal(item)}
                    className={`bg-white rounded-[20px] border shadow-sm flex overflow-hidden cursor-pointer transition-all hover:shadow-md active:scale-[0.99] ${
                      isLive
                        ? 'border-primary ring-2 ring-primary/20 shadow-primary/10'
                        : isDone
                        ? 'border-slate-100 opacity-60'
                        : 'border-slate-100'
                    }`}
                  >
                    {/* Accent Line */}
                    <div className={`w-1.5 shrink-0 ${isLive ? 'bg-primary animate-pulse' : isDone ? 'bg-slate-300' : 'bg-primary'}`} />

                    <div className="p-4 flex-1 flex gap-3">
                      {/* Left: Time */}
                      <div className="w-14 flex flex-col items-center shrink-0">
                        <span className="font-headline font-bold text-[15px] text-slate-900 leading-none">{jamMulai}</span>
                        <div className="w-px bg-slate-200 h-3 mx-auto my-1" />
                        <span className="text-[11px] font-semibold text-slate-400 leading-none mb-1.5">{jamSelesai}</span>
                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {duration} Mnt
                        </span>
                      </div>

                      {/* Right: Details */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="bg-sky-50 text-primary text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-sky-100">
                            {item.kelas?.nama || 'Kelas'}
                          </span>
                          {isLive && (
                            <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>

                        <h3 className="font-headline font-bold text-sm text-slate-800 leading-snug mb-1">
                          {item.mapel?.nama || 'Mata Pelajaran'}
                        </h3>

                        <p className="flex items-center gap-1 text-slate-400 text-[10px] mb-3 font-medium">
                          <span className="material-symbols-outlined notranslate text-[14px]">schedule</span>
                          {item.sessionCount || 1} jam pelajaran
                        </p>

                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-1 text-slate-400">
                            <span className="material-symbols-outlined notranslate text-[14px]">group</span>
                            <span className="text-[10px]">Ketuk untuk absensi</span>
                          </div>

                          <span className="text-primary font-bold text-[11px] flex items-center gap-0.5">
                            Kelola
                            <span className="material-symbols-outlined notranslate text-[14px]">arrow_forward</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    
      {selectedJadwal && (
        <ValidasiGuruScreen
          user={user}
          initialClassId={selectedJadwal.kelas_id || selectedJadwal.kelas?.id}
          initialJadwalItem={selectedJadwal}
          isModal={true}
          onClose={() => setSelectedJadwal(null)}
          onShowToast={onShowToast}
        />
      )}
    </>
  );
};




// ============================================================
// MAIN EXPORT - JADWAL SCREEN (CONNECTED TO SUPABASE)
// ============================================================
export const JadwalScreen: React.FC<JadwalScreenProps> = ({ onShowToast, user, onNavigateToTab }) => {
  if (user?.role === 'guru' || user?.role === 'wali_kelas' || user?.role === 'guru_piket') {
    return <JadwalGuruView user={user} onShowToast={onShowToast} onNavigateToTab={onNavigateToTab} />;
  }

  const hariNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = new Date();
  let hariIni = hariNames[today.getDay()];
  if (hariIni === 'Minggu') hariIni = 'Senin';

  const [selectedDay, setSelectedDay] = useState(hariIni);
  const [searchQuery, setSearchQuery] = useState('');
  const [classes, setClasses] = useState<{ id: string; nama: string }[]>([
    { id: 'e88128be-8fc3-4973-8d69-00ef17571626', nama: 'XII TKJ 1' },
    { id: 'class-dkv-1', nama: 'XII DKV 1' },
    { id: 'class-dkv-2', nama: 'XII DKV 2' },
  ]);
  const [selectedKelasId, setSelectedKelasId] = useState<string>(
    user?.kelas_id || (user as any)?.kelas?.id || 'e88128be-8fc3-4973-8d69-00ef17571626'
  );
  const [dbSchedules, setDbSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  // 1. Fetch available classes
  useEffect(() => {
    async function loadClasses() {
      try {
        const { data } = await supabase
          .from('kelas')
          .select('id, nama')
          .order('nama', { ascending: true });

        if (data && data.length > 0) {
          setClasses(data);
          if (!selectedKelasId) {
            const userClass = data.find(c => c.id === (user as any)?.kelas_id || c.nama === (user as any)?.kelas?.nama);
            setSelectedKelasId(userClass ? userClass.id : data[0].id);
          }
        }
      } catch (err) {
        console.warn('Offline mode: Using default classes list', err);
      }
    }
    loadClasses();
  }, [user]);

  // 2. Fetch schedules for selected class & day from Supabase
  useEffect(() => {
    if (!selectedKelasId) return;

    async function fetchClassSchedule() {
      setIsLoading(true);
      setDbError(null);

      try {
        const { data, error } = await supabase
          .from('jadwal')
          .select(`
            id, jam_mulai, jam_selesai, hari, kelas_id,
            kelas:kelas_id(id, nama),
            mapel:mapel_id(nama),
            guru:guru_id(id, nama)
          `)
          .eq('kelas_id', selectedKelasId)
          .eq('hari', selectedDay)
          .order('jam_mulai', { ascending: true });

        if (error) throw error;

        // Group consecutive sessions of same subject and teacher
        const grouped: any[] = [];
        (data || []).forEach((item: any) => {
          const lastGroup = grouped[grouped.length - 1];
          const [sh, sm] = (item.jam_mulai || '00:00').split(':').map(Number);
          const [eh, em] = (item.jam_selesai || '00:00').split(':').map(Number);
          const itemDuration = (eh * 60 + em) - (sh * 60 + sm);

          if (
            lastGroup &&
            lastGroup.mapel?.nama === item.mapel?.nama &&
            lastGroup.guru?.id === item.guru?.id
          ) {
            lastGroup.jam_selesai = item.jam_selesai;
            lastGroup.sessionCount = (lastGroup.sessionCount || 1) + 1;
            lastGroup.actualDuration = (lastGroup.actualDuration || 0) + itemDuration;
          } else {
            grouped.push({ ...item, sessionCount: 1, actualDuration: itemDuration });
          }
        });

        if (grouped.length > 0) {
          setDbSchedules(grouped);
          setIsOfflineFallback(false);
        } else {
          const dayKey = selectedDay.toLowerCase();
          const fallbackList = SCHEDULES_BY_DAY[dayKey] || [];
          const currentClassObj = classes.find(c => c.id === selectedKelasId) || { id: selectedKelasId, nama: 'XII TKJ 1' };
          const mappedFallback = fallbackList.map((item, idx) => {
            const parts = (item.time || '08.15 - 10.15').split(' - ');
            const jamMulai = (parts[0] || '08:15').replace('.', ':') + ':00';
            const jamSelesai = (parts[1] || '10:15').replace('.', ':') + ':00';
            const [sh, sm] = jamMulai.split(':').map(Number);
            const [eh, em] = jamSelesai.split(':').map(Number);
            const duration = (eh * 60 + em) - (sh * 60 + sm);
            return {
              id: item.id || `fb-std-${idx}`,
              jam_mulai: jamMulai,
              jam_selesai: jamSelesai,
              hari: selectedDay,
              kelas_id: selectedKelasId,
              kelas: currentClassObj,
              mapel: { nama: item.subject },
              guru: { id: `guru-fb-${idx}`, nama: item.teacher },
              sessionCount: 2,
              actualDuration: duration,
            };
          });
          setDbSchedules(mappedFallback);
          setIsOfflineFallback(false);
        }
      } catch (err: any) {
        console.warn('Supabase offline/paused, loading local fallback schedule for students:', err);
        const dayKey = selectedDay.toLowerCase();
        const fallbackList = SCHEDULES_BY_DAY[dayKey] || [];
        const currentClassObj = classes.find(c => c.id === selectedKelasId) || { id: selectedKelasId, nama: 'XII TKJ 1' };
        const mappedFallback = fallbackList.map((item, idx) => {
          const parts = (item.time || '08.15 - 10.15').split(' - ');
          const jamMulai = (parts[0] || '08:15').replace('.', ':') + ':00';
          const jamSelesai = (parts[1] || '10:15').replace('.', ':') + ':00';
          const [sh, sm] = jamMulai.split(':').map(Number);
          const [eh, em] = jamSelesai.split(':').map(Number);
          const duration = (eh * 60 + em) - (sh * 60 + sm);
          return {
            id: item.id || `fb-std-${idx}`,
            jam_mulai: jamMulai,
            jam_selesai: jamSelesai,
            hari: selectedDay,
            kelas_id: selectedKelasId,
            kelas: currentClassObj,
            mapel: { nama: item.subject },
            guru: { id: `guru-fb-${idx}`, nama: item.teacher },
            sessionCount: 2,
            actualDuration: duration,
          };
        });
        setDbSchedules(mappedFallback);
        setIsOfflineFallback(true);
        setDbError(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchClassSchedule();
  }, [selectedKelasId, selectedDay, classes]);

  const selectedClassObj = classes.find(c => c.id === selectedKelasId);
  const activeClassName = selectedClassObj?.nama || (user as any)?.kelas?.nama || 'Pilih Kelas';

  // Filter by search query
  const filteredSchedules = dbSchedules.filter((item: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const mapel = (item.mapel?.nama || '').toLowerCase();
    const guru = (item.guru?.nama || '').toLowerCase();
    return mapel.includes(q) || guru.includes(q);
  });

  return (
    <div className="flex flex-col w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto pb-28 min-h-screen bg-slate-50 font-body">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-[#003d73] pt-5 pb-5 px-4 sm:px-6 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-white font-headline font-bold text-lg flex items-center gap-2">
              <span className="material-symbols-outlined notranslate">calendar_month</span>
              Jadwal Pelajaran
            </h1>
            <p className="text-sky-200 text-[11px] mt-0.5">SMKN 1 Sorong - Semester Ganjil 2026/2027</p>
          </div>
          <div className="bg-white/15 rounded-2xl px-3 py-1.5 backdrop-blur-sm text-center">
            <p className="text-white font-headline font-bold text-base leading-none">
              {filteredSchedules.length}
            </p>
            <p className="text-sky-200 text-[9px] font-semibold">Mapel</p>
          </div>
        </div>

        {/* Dynamic Class Selector */}
        <div className="bg-white/15 w-full py-2 px-3 rounded-xl text-white text-sm font-semibold backdrop-blur-sm flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="material-symbols-outlined notranslate text-[18px]">school</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer border-none py-0.5 focus:ring-0 [&>option]:text-slate-800"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>Kelas {c.nama}</option>
              ))}
            </select>
          </div>
          <span className="text-[11px] bg-white/20 px-2.5 py-0.5 rounded-full text-white font-bold flex items-center gap-1 shadow-xs shrink-0">
            <span className="material-symbols-outlined notranslate text-[13px]">verified</span>
            Live Database
          </span>
        </div>
      </div>

      {/* Fluid Animated Slidebar: Hari Pembelajaran */}
      <div className="px-3 sm:px-4 mt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined notranslate text-[15px] text-primary">calendar_today</span>
            Hari Pembelajaran
          </span>
          <div className="flex items-center gap-1 text-[10px] text-primary font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            <span>Geser fluid</span>
            <span className="material-symbols-outlined notranslate text-[13px]">swipe</span>
          </div>
        </div>

        <div className="relative flex items-center w-full mb-3">
          <div
            className="flex items-center gap-2 overflow-x-auto scroll-smooth no-scrollbar py-1 px-0.5 w-full touch-pan-x"
            style={{ scrollSnapType: 'x proximity' }}
          >
            {days.map((day) => {
              const isSelected = selectedDay === day;
              const isToday = day === hariIni;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => {
                    setSelectedDay(day);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  }}
                  className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 ease-out shrink-0 flex items-center gap-1.5 cursor-pointer active:scale-95 select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-primary to-[#003d73] text-white shadow-md shadow-primary/30 scale-[1.03] ring-2 ring-primary/25'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  style={{ scrollSnapAlign: 'center' }}
                >
                  <span>{day.toUpperCase()}</span>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#6ffbbe] shadow-[0_0_8px_#6ffbbe] animate-pulse" />
                  )}
                  {!isSelected && isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3 mt-1">
          <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Cari mata pelajaran atau nama guru..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
          />
        </div>

        {/* Schedule Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {isOfflineFallback && (
            <div className="col-span-full mb-1 bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/80 text-amber-900 text-xs flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-amber-600 text-[18px]">cloud_off</span>
                <span className="font-semibold">Mode Cadangan Offline (Database Supabase sedang istirahat)</span>
              </div>
              <span className="bg-amber-200/60 text-amber-950 font-bold px-2 py-0.5 rounded-md text-[10px]">
                Jadwal Lokal Aktif
              </span>
            </div>
          )}
          {isLoading ? (
            <div className="bg-white p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-100 shadow-sm">
              <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-slate-400 text-xs font-bold">Mengambil jadwal {activeClassName}...</p>
            </div>
          ) : dbError ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-xs text-center font-semibold">
              Gagal memuat jadwal: {dbError}
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-100 shadow-sm text-center">
              <span className="material-symbols-outlined notranslate text-4xl text-slate-300">event_busy</span>
              <p className="text-slate-600 text-sm font-bold">Tidak ada jadwal hari {selectedDay}</p>
              <p className="text-slate-400 text-xs">Tidak ada kegiatan belajar mengajar untuk {activeClassName}</p>
            </div>
          ) : (
            filteredSchedules.map((item: any, idx: number) => {
              const jamMulai = item.jam_mulai ? item.jam_mulai.substring(0, 5) : '';
              const jamSelesai = item.jam_selesai ? item.jam_selesai.substring(0, 5) : '';
              const duration = item.actualDuration || 40;

              // Check if session is live
              const nowMin = today.getHours() * 60 + today.getMinutes();
              const [startH, startM] = jamMulai.split(':').map(Number);
              const [endH, endM] = jamSelesai.split(':').map(Number);
              const sMin = startH * 60 + startM;
              const eMin = endH * 60 + endM;
              const isLive = selectedDay === hariIni && nowMin >= sMin && nowMin < eMin;
              const isDone = selectedDay === hariIni && nowMin >= eMin;

              return (
                <div
                  key={item.id || idx}
                  className={`bg-white rounded-2xl border shadow-sm p-4 flex gap-3.5 items-center transition-all hover:shadow-md ${
                    isLive
                      ? 'border-primary ring-2 ring-primary/20 shadow-primary/10'
                      : isDone
                      ? 'border-slate-100 opacity-60'
                      : 'border-slate-100'
                  }`}
                >
                  <div className={`w-1.5 self-stretch rounded-full shrink-0 ${isLive ? 'bg-primary animate-pulse' : isDone ? 'bg-slate-300' : 'bg-primary'}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-primary font-bold text-xs">{jamMulai} - {jamSelesai} WIT</span>
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-1.5 py-0.2 rounded border border-emerald-100">
                          {duration} Mnt
                        </span>
                      </div>
                      {isLive ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          LIVE
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 font-semibold shrink-0">
                          {item.sessionCount || 1} JP
                        </span>
                      )}
                    </div>

                    <h3 className="font-headline font-bold text-sm text-slate-800 leading-snug truncate">
                      {item.mapel?.nama || 'Mata Pelajaran'}
                    </h3>

                    <p className="text-slate-500 text-xs mt-1 flex items-center gap-1 truncate font-medium">
                      <span className="material-symbols-outlined notranslate text-[15px] text-slate-400 shrink-0">person</span>
                      <span className="truncate">{item.guru?.nama || 'Guru Belum Terjadwal'}</span>
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
