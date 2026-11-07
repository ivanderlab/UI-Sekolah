import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface GuruPiketDashboardProps {
  user: UserProfile;
  onNavigateHome?: () => void;
  onShowToast: (title: string, desc: string, type?: 'success' | 'warning' | 'info') => void;
}

export type PiketTab = 'gerbang' | 'bolos' | 'kelas';

interface LateEntry {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  jam: string;
  alasan: string;
  pembinaan: string;
  waktuDibuat: string;
}

interface BolosEntry {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  mapel: string;
  guruPelapor: string;
  jam: string;
}

export const GuruPiketDashboard: React.FC<GuruPiketDashboardProps> = ({
  user,
  onNavigateHome,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<PiketTab>('gerbang');
  const [loading, setLoading] = useState(false);

  // Search student for Gate Tardiness Logger
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  // Form input for gate tardiness
  const [jamTiba, setJamTiba] = useState(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'));
  const [alasan, setAlasan] = useState('Macet di Perjalanan');
  const [customAlasan, setCustomAlasan] = useState('');
  const [pembinaan, setPembinaan] = useState('Pembinaan Karakter di Gerbang (5 Menit)');
  const [savingLate, setSavingLate] = useState(false);

  // Live Lists
  const [lateList, setLateList] = useState<LateEntry[]>([]);
  const [bolosList, setBolosList] = useState<BolosEntry[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; nama: string; isValidated?: boolean }[]>([]);
  const [filterTingkat, setFilterTingkat] = useState<'semua' | 'X' | 'XI' | 'XII'>('semua');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Initial Load: classes, today's late entries, today's bolos
  useEffect(() => {
    async function loadPiketData() {
      setLoading(true);
      try {
        // Fetch all 12 TKJ & DKV classes
        const { data: clsData } = await supabase
          .from('kelas')
          .select('id, nama')
          .order('nama', { ascending: true });
        
        // Fetch today's harian attendance to check validation status and late entries
        const { data: harianRows } = await supabase
          .from('absen_harian')
          .select('id, siswa_id, kelas_id, status, keterangan, created_at, profiles:siswa_id(nama, username), kelas:kelas_id(nama)')
          .eq('tanggal', todayStr);

        const lateRows: LateEntry[] = [];
        const validatedClassIds = new Set<string>();

        (harianRows || []).forEach((row: any) => {
          if (row.status === 'Terlambat') {
            const timeMatch = (row.keterangan || '').match(/(\d{2}:\d{2})/);
            lateRows.push({
              id: row.id,
              nama: row.profiles?.nama || 'Siswa',
              nisn: row.profiles?.username?.replace(/^s_?/, '') || '-',
              kelas: row.kelas?.nama || 'Kelas',
              jam: timeMatch ? timeMatch[1] : '07:20',
              alasan: row.keterangan || 'Terlambat Gerbang',
              pembinaan: 'Pengarahan Petugas Piket',
              waktuDibuat: new Date(row.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            });
          }
          if (row.kelas_id) {
            validatedClassIds.add(row.kelas_id);
          }
        });

        // Set classes with validation status
        if (clsData) {
          setAllClasses(clsData.map(c => ({
            id: c.id,
            nama: c.nama,
            isValidated: validatedClassIds.has(c.id),
          })));
        }

        // Fetch bolos mapel reports from absen_mapel where status is Alfa or bolos
        const { data: mapelAlfa } = await supabase
          .from('absen_mapel')
          .select('id, siswa_id, jadwal_id, created_at, profiles:siswa_id(nama, username, kelas_id), jadwal:jadwal_id(mapel:mapel_id(nama), guru:guru_id(nama), kelas:kelas_id(nama))')
          .eq('tanggal', todayStr)
          .eq('status', 'Alfa')
          .limit(20);

        const bolosRows: BolosEntry[] = (mapelAlfa || []).map((b: any) => ({
          id: b.id,
          nama: b.profiles?.nama || 'Siswa',
          nisn: b.profiles?.username?.replace(/^s_?/, '') || '-',
          kelas: b.jadwal?.kelas?.nama || 'Kelas',
          mapel: b.jadwal?.mapel?.nama || 'Mata Pelajaran',
          guruPelapor: b.jadwal?.guru?.nama || 'Guru Mapel',
          jam: new Date(b.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }));

        setLateList(lateRows);
        setBolosList(bolosRows);
      } catch (err) {
        console.error('Error loading piket data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPiketData();
  }, [todayStr]);

  // 2. Search student dynamically
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, nama, username, kelas_id, kelas:kelas_id(nama)')
          .eq('role', 'siswa')
          .or(`nama.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(8);

        setSearchResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Record Tardiness at the Gate
  const handleSaveLateStudent = async () => {
    if (!selectedStudent) {
      onShowToast('Pilih Siswa Terlebih Dahulu', 'Silakan cari dan pilih siswa yang terlambat.', 'warning');
      return;
    }

    setSavingLate(true);
    const finalAlasan = customAlasan.trim() ? customAlasan : alasan;
    const keteranganFull = `Terlambat gerbang pukul ${jamTiba} WIT (${finalAlasan}) - ${pembinaan}`;

    try {
      // Upsert into absen_harian
      const { data, error } = await supabase.from('absen_harian').upsert({
        tanggal: todayStr,
        siswa_id: selectedStudent.id,
        kelas_id: selectedStudent.kelas_id,
        status: 'Terlambat',
        keterangan: keteranganFull,
        diinput_oleh: user.id,
        status_validasi: 'tervalidasi',
      }, { onConflict: 'tanggal,siswa_id' }).select('id, created_at').single();

      if (error) throw error;

      // Add to local late list
      const newEntry: LateEntry = {
        id: data?.id || String(Date.now()),
        nama: selectedStudent.nama,
        nisn: selectedStudent.username?.replace(/^s_?/, '') || '-',
        kelas: selectedStudent.kelas?.nama || 'Kelas',
        jam: jamTiba,
        alasan: finalAlasan,
        pembinaan,
        waktuDibuat: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      setLateList(prev => [newEntry, ...prev]);
      onShowToast(
        'Keterlambatan Dicatat & Izin Masuk Diberikan',
        `${selectedStudent.nama} (${selectedStudent.kelas?.nama}) berhasil dicatat. Status tersimpan di sistem.`,
        'success'
      );

      // Reset form
      setSelectedStudent(null);
      setSearchQuery('');
      setCustomAlasan('');
    } catch (err: any) {
      console.error('Error saving late student:', err);
      onShowToast('Gagal Mencatat', err.message || 'Terjadi kesalahan sistem.', 'warning');
    } finally {
      setSavingLate(false);
    }
  };

  // KPIs
  const totalClasses = allClasses.length || 54;
  const validatedCount = allClasses.filter(c => c.isValidated).length;
  const pendingCount = totalClasses - validatedCount;
  const totalLateCount = lateList.length;
  const totalBolosCount = bolosList.length;

  const filteredClasses = useMemo(() => {
    if (filterTingkat === 'semua') return allClasses;
    return allClasses.filter(c => c.nama.startsWith(filterTingkat + ' '));
  }, [allClasses, filterTingkat]);

  return (
    <div className="flex flex-col w-full max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto pb-28 min-h-screen bg-slate-50 font-body">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-700 via-primary to-slate-900 pt-5 pb-6 px-4 sm:px-6 shadow-lg text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-md">
              <span className="material-symbols-outlined notranslate text-amber-300 text-2xl">
                security
              </span>
            </div>
            <div>
              <h1 className="font-headline font-bold text-lg leading-tight">Portal Live Guru Piket</h1>
              <p className="text-amber-200 text-xs">Piket Ketertiban Sekolah • {user.name}</p>
            </div>
          </div>

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
            >
              <span className="material-symbols-outlined notranslate text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Live Schoolwide Metrics */}
        <div className="grid grid-cols-3 gap-2 mt-2 text-center">
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
            <span className="text-[10px] text-amber-200 font-semibold block">Terlambat Gerbang</span>
            <span className="text-xl font-bold font-headline text-amber-300">{totalLateCount}</span>
          </div>
          <div className="bg-rose-500/25 rounded-xl p-2.5 border border-rose-400/30">
            <span className="text-[10px] text-rose-200 font-semibold block">Bolos Mapel</span>
            <span className="text-xl font-bold font-headline text-rose-300">{totalBolosCount}</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 border border-white/15">
            <span className="text-[10px] text-sky-200 font-semibold block">Kelas Tervalidasi</span>
            <span className="text-xl font-bold font-headline text-emerald-300">{validatedCount}/{totalClasses}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 -mt-3 relative z-10">
        <div className="bg-white rounded-2xl p-1 shadow-md border border-slate-100 flex gap-1">
          <button
            onClick={() => setActiveTab('gerbang')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'gerbang'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">door_sliding</span>
            <span>Catat Gerbang</span>
          </button>
          <button
            onClick={() => setActiveTab('bolos')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'bolos'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">crisis_alert</span>
            <span>Radar Bolos ({totalBolosCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('kelas')}
            className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'kelas'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[16px]">domain</span>
            <span>Status 54 Kelas</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="px-4 mt-4">
        {activeTab === 'gerbang' && (
          /* TAB 1: PENCATATAN GERBANG */
          <div className="flex flex-col gap-4">
            {/* Input Card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined notranslate text-amber-600 text-lg">
                  badge
                </span>
                <h3 className="font-headline font-bold text-sm text-slate-800">
                  Formulir Keterlambatan Gerbang
                </h3>
              </div>

              {/* Search Student Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Cari Siswa Terlambat (Nama atau NISN):
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined notranslate absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Ketik minimal 2 huruf nama siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Dropdown Suggestions */}
                {searchResults.length > 0 && !selectedStudent && (
                  <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 z-20">
                    {searchResults.map((std) => (
                      <div
                        key={std.id}
                        onClick={() => {
                          setSelectedStudent(std);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900">{std.nama}</p>
                          <p className="text-[10px] text-slate-500">
                            Kelas {std.kelas?.nama} • NISN: {std.username?.replace(/^s_?/, '')}
                          </p>
                        </div>
                        <span className="material-symbols-outlined notranslate text-amber-600 text-sm">
                          check_circle
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Student Pill */}
              {selectedStudent && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                      Siswa Terpilih
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{selectedStudent.nama}</h4>
                    <p className="text-[10px] text-slate-600">
                      Kelas: <strong>{selectedStudent.kelas?.nama}</strong> • NISN: {selectedStudent.username?.replace(/^s_?/, '')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="text-xs text-slate-400 hover:text-rose-600 p-1"
                  >
                    Ganti
                  </button>
                </div>
              )}

              {/* Form details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Jam Tiba (WIT)</label>
                  <input
                    type="time"
                    value={jamTiba}
                    onChange={(e) => setJamTiba(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Alasan</label>
                  <select
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Macet di Perjalanan">Macet / Lalu Lintas</option>
                    <option value="Bangun Kesiangan">Bangun Kesiangan</option>
                    <option value="Kendaraan Rusak / Bocor Ban">Kendaraan Rusak</option>
                    <option value="Cuaca Hujan Deras">Hujan Deras</option>
                    <option value="Lainnya">Alasan Lainnya</option>
                  </select>
                </div>
              </div>

              {alasan === 'Lainnya' && (
                <div>
                  <input
                    type="text"
                    placeholder="Tulis alasan keterlambatan..."
                    value={customAlasan}
                    onChange={(e) => setCustomAlasan(e.target.value)}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Bentuk Pembinaan / Sanksi Ringan:
                </label>
                <select
                  value={pembinaan}
                  onChange={(e) => setPembinaan(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="Pembinaan Karakter di Gerbang (5 Menit)">Pembinaan Karakter di Gerbang (5 Menit)</option>
                  <option value="Operasi Semut / Bersihkan Halaman (10 Menit)">Operasi Semut / Bersih Lingkungan (10 Menit)</option>
                  <option value="Pengarahan Langsung Masuk Kelas">Pengarahan Langsung Masuk Kelas</option>
                </select>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSaveLateStudent}
                disabled={savingLate || !selectedStudent}
                className="w-full mt-1 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition active:scale-98"
              >
                {savingLate ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined notranslate text-[18px]">
                      how_to_reg
                    </span>
                    <span>Catat Keterlambatan &amp; Izinkan Masuk</span>
                  </>
                )}
              </button>
            </div>

            {/* Live Feed List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-headline font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Log Siswa Terlambat Hari Ini ({lateList.length})
                </h3>
              </div>

              {lateList.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
                  Belum ada siswa yang dicatat terlambat pagi ini.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {lateList.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center shrink-0">
                          {entry.jam}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 truncate">{entry.nama}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            Kelas {entry.kelas} • {entry.alasan}
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Diizinkan Masuk
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bolos' && (
          /* TAB 2: RADAR BOLOS MAPEL SE-SEKOLAH */
          <div className="flex flex-col gap-3">
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-xs text-rose-900 leading-snug">
              <span className="font-bold block mb-0.5">🚨 Pantauan Terpusat Bolos Mapel:</span>
              Daftar siswa dari seluruh 54 kelas yang dilaporkan tidak hadir di ruang kelas oleh Guru Mata Pelajaran pada saat jam pelajaran berlangsung.
            </div>

            {bolosList.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center shadow-sm">
                <span className="material-symbols-outlined notranslate text-emerald-500 text-4xl mb-1">
                  verified_user
                </span>
                <h3 className="font-bold text-slate-800 text-sm">Nihil Laporan Bolos!</h3>
                <p className="text-slate-400 text-xs mt-1">Seluruh siswa tertib berada di kelas masing-masing.</p>
              </div>
            ) : (
              bolosList.map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-4 rounded-2xl border border-rose-300 bg-rose-50/15 shadow-sm flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase">
                        BOLOS MAPEL
                      </span>
                      <h4 className="font-bold text-xs text-slate-900 mt-1">{b.nama}</h4>
                      <p className="text-[10px] text-slate-500">
                        Kelas: <strong>{b.kelas}</strong> • Mapel: <strong>{b.mapel}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{b.jam} WIT</span>
                  </div>

                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                    Dilaporkan oleh guru pengajar: <strong>{b.guruPelapor}</strong>
                  </p>

                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => {
                        onShowToast('Patroli Dikirim', `Petugas piket dikerahkan mencari ${b.nama} ke kantin & area luar.`, 'warning');
                      }}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined notranslate text-[14px]">local_police</span>
                      <span>Patroli Kantin/Toilet</span>
                    </button>
                    <button
                      onClick={() => {
                        onShowToast('Panggilan Diaktifkan', `Nama ${b.nama} diumumkan lewat speaker sentral sekolah.`, 'info');
                      }}
                      className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span className="material-symbols-outlined notranslate text-[14px]">campaign</span>
                      <span>Panggil Speaker</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'kelas' && (
          /* TAB 3: STATUS 54 KELAS */
          <div className="flex flex-col gap-3">
            {/* Filter by Grade */}
            <div className="flex gap-1.5">
              {(['semua', 'X', 'XI', 'XII'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setFilterTingkat(g)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterTingkat === g ? 'bg-primary text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {g === 'semua' ? 'Semua (54)' : `Kelas ${g}`}
                </button>
              ))}
            </div>

            {/* Grid of Classes Responsif */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className={`p-3 rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                    cls.isValidated
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-headline font-bold text-xs text-slate-900">
                      {cls.nama}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${cls.isValidated ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block w-fit ${
                    cls.isValidated
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {cls.isValidated ? 'Sudah Valid' : 'Belum Valid'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
