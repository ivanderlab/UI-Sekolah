// src/hooks/useStreak.ts
// Hook untuk fetch streak siswa dari Supabase
import { useState, useEffect } from 'react';
import { supabase, Streak } from '../lib/supabase';

export function useStreak(siswaId: string | null) {
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!siswaId) { setStreak(null); return; }
    let isMounted = true;
    setLoading(true);

    async function fetchStreak() {
      try {
        const { data, error } = await supabase
          .from('streak')
          .select('*')
          .eq('siswa_id', siswaId)
          .single();

        if (error) throw error;
        if (isMounted) {
          setStreak(data as Streak ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Offline mode: streak fetch error, using default active streak', err);
        if (isMounted) {
          setStreak({
            siswa_id: siswaId!,
            jumlah: 5,
            status: 'aktif',
            tanggal_update: new Date().toISOString().split('T')[0],
          });
          setLoading(false);
        }
      }
    }

    fetchStreak();
    return () => { isMounted = false; };
  }, [siswaId]);

  // Render label & icon berdasarkan status (fitur api hanya aktif jika >= 3 hari berturut-turut)
  const streakDays = streak?.jumlah ?? 0;
  const isStreakVisible = streakDays >= 3;
  const streakIcon = isStreakVisible && streak?.status === 'aktif' ? '🔥'
    : streak?.status === 'beku' ? '❄️' : '💤';
  const streakStatus = streak?.status ?? 'padam';

  return { streak, loading, streakIcon, streakDays, streakStatus, isStreakVisible };
}

// src/hooks/usePanggilGuru.ts
// Hook untuk tombol panggil guru
export function usePanggilGuru() {
  const [loading, setLoading] = useState(false);

  const panggilGuru = async ({
    jadwalId,
    kelasId,
    dibuat_oleh,
    pesan = 'Kelas kosong, guru belum hadir.',
  }: {
    jadwalId: string;
    kelasId: string;
    dibuat_oleh: string;
    pesan?: string;
  }): Promise<{ success: boolean; error: string | null }> => {
    const today = new Date().toISOString().split('T')[0];

    // Cek rate limit: sudah ada panggilan hari ini?
    const { data: existing } = await supabase
      .from('panggilan_guru')
      .select('id, status')
      .eq('jadwal_id', jadwalId)
      .eq('tanggal', today)
      .limit(1);

    if (existing && existing.length > 0) {
      return { success: false, error: 'Panggilan sudah dikirim untuk kelas ini hari ini.' };
    }

    setLoading(true);
    const { error } = await supabase.from('panggilan_guru').insert({
      jadwal_id: jadwalId,
      kelas_id: kelasId,
      dibuat_oleh,
      pesan,
      tanggal: today,
      status: 'menunggu',
    });
    setLoading(false);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  };

  return { panggilGuru, loading };
}
