import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { SCHOOL_LOGO } from '../data/samakan/mockData';

interface OperatorDashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
  initialTab?: OperatorTab;
}

export type OperatorTab = 'jadwal' | 'wali_kelas' | 'guru_piket';
export type HariJadwal = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';

const HARI_LIST: HariJadwal[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  user,
  onLogout,
  onShowToast,
  initialTab = 'jadwal',
}) => {
  const [activeTab, setActiveTab] = useState<OperatorTab>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Master Data
  const [classes, setClasses] = useState<{ id: string; nama: string; wali_kelas_id?: string | null }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; nama: string; username?: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; nama: string }[]>([]);

  // Tab 1: Jadwal State
  const [selectedDay, setSelectedDay] = useState<HariJadwal>('Senin');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);

  // Form Schedule Modal
  const [formMapelId, setFormMapelId] = useState('');
  const [formGuruId, setFormGuruId] = useState('');
  const [formJamMulai, setFormJamMulai] = useState('07:15');
  const [formJamSelesai, setFormJamSelesai] = useState('08:35');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Tab 2: Wali Kelas State
  const [searchWaliQuery, setSearchWaliQuery] = useState('');
  const [savingWaliClassId, setSavingWaliClassId] = useState<string | null>(null);
  const [selectedWaliMap, setSelectedWaliMap] = useState<Record<string, string>>({});

  // Tab 3: Guru Piket State
  const [selectedPiketDay, setSelectedPiketDay] = useState<HariJadwal>('Senin');
  const [selectedNewPiketGuruId, setSelectedNewPiketGuruId] = useState('');
  const [piketSchedule, setPiketSchedule] = useState<Record<HariJadwal, string[]>>(() => {
    const saved = localStorage.getItem('smkn1_jadwal_piket_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
      Jumat: [],
      Sabtu: [],
    };
  });

  // 1. Load Master Data (Classes, Teachers, Subjects)
  useEffect(() => {
    async function loadMasterData() {
      try {
        // Classes (All TKJ & DKV classes)
        const { data: clsData } = await supabase
          .from('kelas')
          .select('id, nama, wali_kelas_id')
          .order('nama', { ascending: true });
        if (clsData) {
          setClasses(clsData);
          if (clsData.length > 0 && !selectedClassId) {
            setSelectedClassId(clsData[0].id);
          }
          // Initialize wali map
          const wMap: Record<string, string> = {};
          clsData.forEach(c => {
            if (c.wali_kelas_id) wMap[c.id] = c.wali_kelas_id;
          });
          setSelectedWaliMap(wMap);
        }

        // Teachers (All registered teachers)
        const { data: tchData } = await supabase
          .from('profiles')
          .select('id, nama, username')
          .eq('role', 'guru')
          .order('nama', { ascending: true });
        if (tchData) setTeachers(tchData);

        // Subjects (mata_pelajaran)
        const { data: mplData } = await supabase
          .from('mata_pelajaran')
          .select('id, nama')
          .order('nama', { ascending: true });
        if (mplData) setSubjects(mplData);

      } catch (err) {
        console.error('Error loading master data for operator:', err);
      }
    }
    loadMasterData();
  }, []);

  // Initialize default duty teachers if empty
  useEffect(() => {
    if (teachers.length > 0) {
      const hasAnyPiket = Object.values(piketSchedule).some(arr => arr.length > 0);
      if (!hasAnyPiket) {
        const initialPiket: Record<HariJadwal, string[]> = {
          Senin: [teachers[0]?.id, teachers[1]?.id, teachers[2]?.id].filter(Boolean),
          Selasa: [teachers[3]?.id, teachers[4]?.id, teachers[5]?.id].filter(Boolean),
          Rabu: [teachers[6]?.id, teachers[7]?.id, teachers[8]?.id].filter(Boolean),
          Kamis: [teachers[9]?.id, teachers[10]?.id, teachers[11]?.id].filter(Boolean),
          Jumat: [teachers[12]?.id, teachers[13]?.id].filter(Boolean),
          Sabtu: [teachers[14]?.id, teachers[15]?.id].filter(Boolean),
        };
        setPiketSchedule(initialPiket);
        localStorage.setItem('smkn1_jadwal_piket_v2', JSON.stringify(initialPiket));
      }
    }
  }, [teachers]);

  // 2. Load Schedules for selected class and day
  useEffect(() => {
    if (!selectedClassId) return;

    async function loadSchedules() {
      setLoadingSchedule(true);
      try {
        const { data } = await supabase
          .from('jadwal')
          .select('id, kelas_id, mapel_id, guru_id, hari, jam_mulai, jam_selesai, mapel:mapel_id(nama), guru:guru_id(nama)')
          .eq('kelas_id', selectedClassId)
          .eq('hari', selectedDay)
          .order('jam_mulai', { ascending: true });

        setSchedules(data || []);
      } catch (err) {
        console.error('Error fetching schedules:', err);
      } finally {
        setLoadingSchedule(false);
      }
    }

    loadSchedules();
  }, [selectedClassId, selectedDay]);

  // Handle Save / Add Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !formMapelId || !formGuruId) {
      onShowToast('Lengkapi Data', 'Pilih mata pelajaran dan guru pengajar.', 'warning');
      return;
    }

    setSavingSchedule(true);
    try {
      const payload = {
        kelas_id: selectedClassId,
        mapel_id: formMapelId,
        guru_id: formGuruId,
        hari: selectedDay,
        jam_mulai: formJamMulai,
        jam_selesai: formJamSelesai,
      };

      if (editingSchedule) {
        // Update
        const { error } = await supabase
          .from('jadwal')
          .update(payload)
          .eq('id', editingSchedule.id);
        if (error) throw error;
        onShowToast('Jadwal Diperbarui', 'Jadwal pelajaran berhasil diubah di database.', 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('jadwal')
          .insert([payload]);
        if (error) throw error;
        onShowToast('Jadwal Ditambahkan', 'Jadwal pelajaran baru berhasil disimpan ke database.', 'success');
      }

      // Reload schedules
      setIsScheduleModalOpen(false);
      setEditingSchedule(null);
      // Refetch
      const { data } = await supabase
        .from('jadwal')
        .select('id, kelas_id, mapel_id, guru_id, hari, jam_mulai, jam_selesai, mapel:mapel_id(nama), guru:guru_id(nama)')
        .eq('kelas_id', selectedClassId)
        .eq('hari', selectedDay)
        .order('jam_mulai', { ascending: true });
      setSchedules(data || []);
    } catch (err: any) {
      console.error('Save schedule error:', err);
      onShowToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.', 'warning');
    } finally {
      setSavingSchedule(false);
    }
  };

  // Handle Delete Schedule
  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    try {
      const { error } = await supabase.from('jadwal').delete().eq('id', id);
      if (error) throw error;
      setSchedules(prev => prev.filter(s => s.id !== id));
      onShowToast('Jadwal Dihapus', 'Jadwal telah berhasil dihapus dari sistem.', 'info');
    } catch (err: any) {
      console.error('Delete schedule error:', err);
      onShowToast('Gagal Menghapus', err.message || 'Terjadi kesalahan.', 'warning');
    }
  };

  const handleOpenAddSchedule = () => {
    setEditingSchedule(null);
    setFormMapelId(subjects[0]?.id || '');
    setFormGuruId(teachers[0]?.id || '');
    setFormJamMulai('07:15');
    setFormJamSelesai('08:35');
    setIsScheduleModalOpen(true);
  };

  const handleOpenEditSchedule = (item: any) => {
    setEditingSchedule(item);
    setFormMapelId(item.mapel_id);
    setFormGuruId(item.guru_id);
    setFormJamMulai(item.jam_mulai?.substring(0, 5) || '07:15');
    setFormJamSelesai(item.jam_selesai?.substring(0, 5) || '08:35');
    setIsScheduleModalOpen(true);
  };

  // Handle Save Wali Kelas
  const handleSaveWaliKelas = async (kelasId: string) => {
    const newGuruId = selectedWaliMap[kelasId];
    if (!newGuruId) {
      onShowToast('Pilih Wali Kelas', 'Silakan pilih guru wali kelas terlebih dahulu.', 'warning');
      return;
    }

    setSavingWaliClassId(kelasId);
    try {
      const { error } = await supabase
        .from('kelas')
        .update({ wali_kelas_id: newGuruId })
        .eq('id', kelasId);

      if (error) throw error;

      // Update local classes state
      setClasses(prev => prev.map(c => c.id === kelasId ? { ...c, wali_kelas_id: newGuruId } : c));
      const guruName = teachers.find(t => t.id === newGuruId)?.nama || 'Guru';
      onShowToast('Wali Kelas Diperbarui', `Wali kelas berhasil ditetapkan kepada ${guruName}.`, 'success');
    } catch (err: any) {
      console.error('Save wali kelas error:', err);
      onShowToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'warning');
    } finally {
      setSavingWaliClassId(null);
    }
  };

  // Handle Add Duty Teacher (Guru Piket)
  const handleAddPiketGuru = () => {
    if (!selectedNewPiketGuruId) {
      onShowToast('Pilih Guru', 'Pilih guru yang ingin ditugaskan piket.', 'warning');
      return;
    }
    const currentList = piketSchedule[selectedPiketDay] || [];
    if (currentList.includes(selectedNewPiketGuruId)) {
      onShowToast('Sudah Terdaftar', 'Guru ini sudah ada di daftar piket hari tersebut.', 'info');
      return;
    }

    const updated = {
      ...piketSchedule,
      [selectedPiketDay]: [...currentList, selectedNewPiketGuruId],
    };
    setPiketSchedule(updated);
    localStorage.setItem('smkn1_jadwal_piket_v2', JSON.stringify(updated));
    setSelectedNewPiketGuruId('');
    const guruName = teachers.find(t => t.id === selectedNewPiketGuruId)?.nama || 'Guru';
    onShowToast('Petugas Piket Ditambahkan', `${guruName} berhasil ditugaskan pada hari ${selectedPiketDay}.`, 'success');
  };

  const handleRemovePiketGuru = (guruId: string) => {
    const currentList = piketSchedule[selectedPiketDay] || [];
    const updated = {
      ...piketSchedule,
      [selectedPiketDay]: currentList.filter(id => id !== guruId),
    };
    setPiketSchedule(updated);
    localStorage.setItem('smkn1_jadwal_piket_v2', JSON.stringify(updated));
    onShowToast('Dihapus dari Piket', 'Guru telah dihapus dari daftar piket hari ini.', 'info');
  };

  const filteredWaliClasses = useMemo(() => {
    if (!searchWaliQuery) return classes;
    const q = searchWaliQuery.toLowerCase();
    return classes.filter(c => c.nama.toLowerCase().includes(q));
  }, [classes, searchWaliQuery]);

  const activeClassName = classes.find(c => c.id === selectedClassId)?.nama || 'Kelas';

  return (
    <div className="flex flex-col w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto pb-32 min-h-screen bg-slate-50 font-body">
      {/* Header Operator */}
      <div className="bg-gradient-to-br from-slate-900 via-[#003d73] to-primary pt-5 pb-6 px-4 sm:px-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <img src={SCHOOL_LOGO} alt="SMKN 1 Sorong" className="w-10 h-10 object-contain drop-shadow" />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-headline font-bold text-base leading-tight">Panel Operator (TU)</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-sky-200 text-xs">Tata Usaha &amp; Administrasi Sekolah</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white text-xs font-bold transition flex items-center gap-1 border border-white/20"
            title="Keluar dari Akun"
          >
            <span className="material-symbols-outlined notranslate text-[16px]">logout</span>
            <span>Keluar</span>
          </button>
        </div>

        {/* Global Stats Counter */}
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-white/10 rounded-xl p-2 border border-white/15">
            <span className="text-[10px] text-sky-200 block font-semibold">Total Kelas</span>
            <span className="text-base font-bold font-headline">{classes.length} Kelas</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 border border-white/15">
            <span className="text-[10px] text-sky-200 block font-semibold">Total Guru</span>
            <span className="text-base font-bold font-headline">{teachers.length} Guru</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2 border border-white/15">
            <span className="text-[10px] text-sky-200 block font-semibold">Mata Pelajaran</span>
            <span className="text-base font-bold font-headline">{subjects.length} Mapel</span>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="px-4 -mt-3 relative z-10">
        <div className="bg-white rounded-2xl p-1 shadow-md border border-slate-100 flex gap-1">
          <button
            onClick={() => setActiveTab('jadwal')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'jadwal'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">calendar_month</span>
            <span>Jadwal Mapel</span>
          </button>
          <button
            onClick={() => setActiveTab('wali_kelas')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'wali_kelas'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">supervisor_account</span>
            <span>Wali Kelas</span>
          </button>
          <button
            onClick={() => setActiveTab('guru_piket')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
              activeTab === 'guru_piket'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">security</span>
            <span>Guru Piket</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="px-4 mt-4">
        {activeTab === 'jadwal' && (
          /* TAB 1: KELOLA JADWAL PELAJARAN */
          <div className="flex flex-col gap-3">
            {/* Class & Day Selector */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Pilih Kelas:
                </span>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:border-primary max-w-[200px]"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar pt-1 border-t border-slate-100">
                {HARI_LIST.map(h => (
                  <button
                    key={h}
                    onClick={() => setSelectedDay(h)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      selectedDay === h
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-sm text-slate-800">
                  Jadwal {activeClassName} • Hari {selectedDay}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {schedules.length} Sesi Terjadwal di Database
                </p>
              </div>

              <button
                onClick={handleOpenAddSchedule}
                className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
              >
                <span className="material-symbols-outlined notranslate text-[16px]">add</span>
                <span>Tambah Jadwal</span>
              </button>
            </div>

            {/* Schedules List */}
            {loadingSchedule ? (
              <div className="bg-white p-8 rounded-2xl flex flex-col items-center justify-center gap-3 border border-slate-100 shadow-sm">
                <span className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-slate-400 text-xs font-semibold">Memuat jadwal...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center shadow-sm">
                <span className="material-symbols-outlined notranslate text-slate-300 text-4xl mb-1">
                  event_busy
                </span>
                <h4 className="font-bold text-xs text-slate-700">Belum Ada Jadwal</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Klik tombol "+ Tambah Jadwal" untuk mengisi jam pelajaran kelas ini.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {schedules.map((item, idx) => {
                  const jMulai = item.jam_mulai?.substring(0, 5);
                  const jSelesai = item.jam_selesai?.substring(0, 5);

                  return (
                    <div
                      key={item.id}
                      className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-primary font-bold text-xs flex flex-col items-center justify-center shrink-0 border border-sky-100">
                          <span className="leading-tight">{jMulai}</span>
                          <span className="text-[9px] text-slate-400 font-normal">{jSelesai}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {item.mapel?.nama || 'Mata Pelajaran'}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Guru: <strong>{item.guru?.nama || 'Belum Ditentukan'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditSchedule(item)}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition"
                          title="Edit Jadwal"
                        >
                          <span className="material-symbols-outlined notranslate text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSchedule(item.id)}
                          className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                          title="Hapus Jadwal"
                        >
                          <span className="material-symbols-outlined notranslate text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wali_kelas' && (
          /* TAB 2: ATUR WALI KELAS */
          <div className="flex flex-col gap-3">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3 text-xs text-indigo-900">
              <span className="font-bold block mb-0.5">👨‍🏫 Penetapan Wali Kelas SMKN 1 Sorong:</span>
              Pilih guru pembimbing untuk setiap kelas. Perubahan langsung tersimpan di database dan otomatis mengaktifkan hak akses Dashboard Wali Kelas untuk guru tersebut.
            </div>

            {/* Search Class */}
            <div className="relative">
              <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Cari kelas (contoh: X TKJ 1, XII RPL)..."
                value={searchWaliQuery}
                onChange={(e) => setSearchWaliQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600"
              />
            </div>

            {/* Classes List with Wali Selector Responsif */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredWaliClasses.map((cls) => {
                const currentWaliId = selectedWaliMap[cls.id] || cls.wali_kelas_id || '';
                const isSavingThis = savingWaliClassId === cls.id;

                return (
                  <div
                    key={cls.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                          {cls.nama.substring(0, 2)}
                        </span>
                        <h4 className="font-headline font-bold text-xs text-slate-900">
                          Kelas {cls.nama}
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {currentWaliId ? 'Sudah Ada Wali' : 'Belum Ditentukan'}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center pt-1 border-t border-slate-50">
                      <select
                        value={currentWaliId}
                        onChange={(e) => setSelectedWaliMap(prev => ({ ...prev, [cls.id]: e.target.value }))}
                        className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:border-indigo-600"
                      >
                        <option value="">-- Pilih Guru Wali Kelas --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.nama}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleSaveWaliKelas(cls.id)}
                        disabled={isSavingThis || !selectedWaliMap[cls.id]}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                        {isSavingThis ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined notranslate text-[16px]">save</span>
                        )}
                        <span>Simpan</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'guru_piket' && (
          /* TAB 3: ATUR GURU PIKET HARIAN */
          <div className="flex flex-col gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-900">
              <span className="font-bold block mb-0.5">🛡️ Pengaturan Jadwal Guru Piket Harian:</span>
              Tugaskan guru-guru yang berjaga piket pada setiap hari sekolah (Senin s/d Sabtu). Guru yang bertugas akan otomatis memiliki akses ke Portal Guru Piket.
            </div>

            {/* Day Selector */}
            <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
              {HARI_LIST.map(h => (
                <button
                  key={h}
                  onClick={() => setSelectedPiketDay(h)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedPiketDay === h
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {h} ({piketSchedule[h]?.length || 0})
                </button>
              ))}
            </div>

            {/* Add Piket Form */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-2">
              <label className="text-[11px] font-bold text-slate-700">
                Tugaskan Guru Piket Hari {selectedPiketDay}:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedNewPiketGuruId}
                  onChange={(e) => setSelectedNewPiketGuruId(e.target.value)}
                  className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- Pilih Guru Pengajar --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddPiketGuru}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined notranslate text-[16px]">add</span>
                  <span>Tugaskan</span>
                </button>
              </div>
            </div>

            {/* Duty Teachers List for Selected Day */}
            <div className="flex flex-col gap-2">
              <h4 className="font-headline font-bold text-xs text-slate-800 uppercase tracking-wider">
                Petugas Piket Hari {selectedPiketDay} ({piketSchedule[selectedPiketDay]?.length || 0})
              </h4>

              {(piketSchedule[selectedPiketDay] || []).length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
                  Belum ada guru yang ditugaskan piket pada hari {selectedPiketDay}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {piketSchedule[selectedPiketDay].map((guruId) => {
                  const teacherObj = teachers.find(t => t.id === guruId);

                  return (
                    <div
                      key={guruId}
                      className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {teacherObj?.nama?.substring(0, 1) || 'G'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {teacherObj?.nama || 'Guru Pengajar'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            NIP/Username: {teacherObj?.username || '-'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemovePiketGuru(guruId)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-bold p-1"
                        title="Hapus dari jadwal piket"
                      >
                        Hapus
                      </button>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Schedule */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-5 my-auto flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-headline font-bold text-sm text-slate-900">
                {editingSchedule ? 'Edit Jadwal Pelajaran' : 'Tambah Jadwal Pelajaran'}
              </h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <span className="material-symbols-outlined notranslate text-[16px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                <input
                  type="text"
                  disabled
                  value={`Kelas ${activeClassName}`}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hari</label>
                <input
                  type="text"
                  disabled
                  value={`Hari ${selectedDay}`}
                  className="w-full p-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                <select
                  required
                  value={formMapelId}
                  onChange={(e) => setFormMapelId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="">-- Pilih Mapel --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Guru Pengajar</label>
                <select
                  required
                  value={formGuruId}
                  onChange={(e) => setFormGuruId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                >
                  <option value="">-- Pilih Guru --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={formJamSelesai}
                    onChange={(e) => setFormJamSelesai(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold flex items-center justify-center gap-1"
                >
                  {savingSchedule ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Simpan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
