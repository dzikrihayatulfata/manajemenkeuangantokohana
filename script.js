// Variabel Global
let pendapatan = [];
let suppliers = [];
let riwayatPembayaran = [];
let operasional = [];
let investasi = [];
let totalModalMasuk = 0; // Total modal masuk historically (gross)
let totalInvestasi = 0; // Ekuitas/modal saat ini (net setelah pengembalian)
let pinjamanKaryawan = [];
let totalPiutangKaryawan = 0; // Piutang dari karyawan (aset)
let totalCicilanDibayar = 0; // Total cicilan yang dibayar kembali (masuk kas)

// Fungsi Load dan Save Data
function loadData() {
    const pendStr = localStorage.getItem('pendapatan');
    pendapatan = pendStr ? JSON.parse(pendStr) : [];
    const supStr = localStorage.getItem('suppliers');
    suppliers = supStr ? JSON.parse(supStr) : [];
    const opStr = localStorage.getItem('operasional');
    operasional = opStr ? JSON.parse(opStr) : [];
    const riwayatStr = localStorage.getItem('riwayatPembayaran');
    riwayatPembayaran = riwayatStr ? JSON.parse(riwayatStr) : [];
    const invStr = localStorage.getItem('investasi');
    investasi = invStr ? JSON.parse(invStr) : [];
    // Validasi struktur investasi
    investasi = investasi.map(i => ({
        ...i,
        dibayar: i.dibayar || 0
    }));
    // Hitung total modal masuk (gross) dan total investasi (net)
    totalModalMasuk = investasi.reduce((s, i) => s + (i.jumlah || 0), 0);
    totalInvestasi = investasi.reduce((s, i) => s + ((i.jumlah || 0) - (i.dibayar || 0)), 0);
    // Validasi struktur suppliers
    suppliers = suppliers.map(s => ({
        id: s.id || Date.now().toString(),
        nama: s.nama || '',
        no_rek: s.no_rek || '',
        jenis_bank: s.jenis_bank || '',
        tagihan: Array.isArray(s.tagihan) ? s.tagihan.map(t => ({
            id: t.id || Date.now().toString(),
            tgl_kirim: t.tgl_kirim || '',
            nominal: t.nominal || 0,
            tgl_jatuh_tempo: t.tgl_jatuh_tempo || '',
            dibayar: t.dibayar || 0,
            bukti_foto: t.bukti_foto || null,
            toko: t.toko || '',
            no_faktur: t.no_faktur || null
        })) : []
    }));
    // Load pinjaman harus di awal sebelum populate
    loadPinjaman();
    recalcTotals();
    setDefaultDates();
    updateDashboard();
    renderSuppliers();
    populateSupplierSelect();
    updateTrenPendapatan();
    renderRiwayatOperasional();
    populatePinjamanSelect();
    renderInvestasi(); // Tambah ini untuk render tabel investasi saat load
}
function saveInvestasi() {
    localStorage.setItem('investasi', JSON.stringify(investasi));
    totalModalMasuk = investasi.reduce((s, i) => s + (i.jumlah || 0), 0);
    totalInvestasi = investasi.reduce((s, i) => s + ((i.jumlah || 0) - (i.dibayar || 0)), 0);
    recalcTotals();
    updateDashboard();
    renderInvestasi(); // Update tabel setelah save
}
function saveRiwayat() {
    localStorage.setItem('riwayatPembayaran', JSON.stringify(riwayatPembayaran));
}
function savePendapatan() {
    localStorage.setItem('pendapatan', JSON.stringify(pendapatan));
    recalcTotals();
}
function saveSuppliers() {
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
    recalcTotals();
}
function saveOperasional() {
    localStorage.setItem('operasional', JSON.stringify(operasional));
    recalcTotals();
}
function loadPinjaman() {
    const str = localStorage.getItem('pinjamanKaryawan');
    pinjamanKaryawan = str ? JSON.parse(str) : [];
    // Validasi data pinjaman untuk menghindari NaN
    pinjamanKaryawan = pinjamanKaryawan.map(p => ({
        ...p,
        jumlahAwal: p.jumlahAwal || p.jumlah || 0,
        sisa: p.sisa || 0
    }));
    hitungTotalPiutangKaryawan();
}
function savePinjaman() {
    localStorage.setItem('pinjamanKaryawan', JSON.stringify(pinjamanKaryawan));
    hitungTotalPiutangKaryawan();
    recalcTotals();
}
function hitungTotalPiutangKaryawan() {
    totalPiutangKaryawan = pinjamanKaryawan.reduce((sum, p) => sum + (p.sisa || 0), 0);
    totalCicilanDibayar = pinjamanKaryawan.reduce((sum, p) => sum + ((p.jumlahAwal || 0) - (p.sisa || 0)), 0);
}
function recalcTotals() {
    // 1. Total pembayaran ke supplier (dari riwayat)
    const tagihanDibayar = riwayatPembayaran.reduce((sum, r) => sum + (r.jumlah || 0), 0) || 0;

    // 2. Total pengeluaran operasional
    const operasionalTotal = operasional.reduce((sum, o) => sum + (o.jumlah || 0), 0) || 0;

    // 3. Total pinjaman yang dikeluarkan ke karyawan
    const pinjamanDikeluarkan = pinjamanKaryawan.reduce((sum, p) => sum + (p.jumlahAwal || 0), 0) || 0;

    // TOTAL KELUAR (pengeluaran kas)
    const totalKeluar = tagihanDibayar + operasionalTotal + pinjamanDikeluarkan;

    // 4. Total pendapatan kotor (hanya tunai + non-tunai)
    const totalPendapatanKotor = pendapatan.reduce((sum, p) => sum + (p.saldoakhir || 0), 0) || 0;

    // 5. Total cicilan yang dibayar kembali karyawan (masuk kas)
    //    totalCicilanDibayar dihitung di hitungTotalPiutangKaryawan()
    //    = jumlahAwal - sisa

    // 6. Total modal masuk historically (gross)
    //    totalModalMasuk dihitung saat saveInvestasi()

    // TOTAL MASUK
    const totalMasuk = totalPendapatanKotor + totalCicilanDibayar + totalModalMasuk;

    // SALDO KAS FINAL = TOTAL MASUK - TOTAL KELUAR
    // Penarikan TIDAK lagi mengurangi kas
    window.totalPenghasilan = isNaN(totalMasuk - totalKeluar) ? 0 : totalMasuk - totalKeluar;

    // DEBUG (bisa dihapus nanti)
    // console.log({ totalMasuk, totalKeluar, totalPenghasilan: window.totalPenghasilan });
}
// Fungsi Navigasi Halaman
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
  
    document.querySelectorAll('.nav button').forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(pageId)) {
            btn.classList.add('active');
        }
    });
    if (pageId === 'pendapatan') {
        updateTrenPendapatan();
    } else if (pageId === 'pengeluaran') {
        renderInvestasi(); // Render tabel investasi saat buka halaman pengeluaran
    }
}
// Fungsi Pendapatan
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    ['hana1-date', 'hana2-date', 'tgl-kirim', 'tgl-jatuh', 'tgl-operasional'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = today;
    });
}
function calculateHana1() {
    const tunai = parseFloat(document.getElementById('hana1-tunai').value) || 0;
    const nontunai = parseFloat(document.getElementById('hana1-nontunai').value) || 0;
    document.getElementById('hana1-saldo').textContent =
        `Saldo Akhir: Rp ${(tunai + nontunai).toLocaleString()}`;
}
function calculateHana2() {
    const tunai = parseFloat(document.getElementById('hana2-tunai').value) || 0;
    const nontunai = parseFloat(document.getElementById('hana2-nontunai').value) || 0;
    document.getElementById('hana2-saldo').textContent =
        `Saldo Akhir: Rp ${(tunai + nontunai).toLocaleString()}`;
}
function simpanHana(prefix) {
    const date = document.getElementById(prefix + '-date').value;
    if (!date) return alert('Pilih tanggal!');
    const tunai = parseFloat(document.getElementById(prefix + '-tunai').value) || 0;
    const nontunai = parseFloat(document.getElementById(prefix + '-nontunai').value) || 0;
    const penarikan = parseFloat(document.getElementById(prefix + '-pembayaran').value) || 0;
    const saldoakhir = tunai + nontunai;

    pendapatan.push({
        id: Date.now().toString(),
        toko: prefix === 'hana1' ? 'Toko Hana 1' : 'Toko Hana 2',
        tanggal: date,
        tunai,
        nontunai,
        penarikan,
        saldoakhir
    });

    savePendapatan();           // Simpan ke localStorage
    recalcTotals();             // Hitung ulang saldo kas
    updateDashboard();          // Update dashboard (include updatePenarikanHarian)
    updateTrenPendapatan();     // Update tren
    renderRiwayatPendapatan();  // Refresh riwayat

    // Reset form
    document.getElementById(prefix + '-tunai').value = '';
    document.getElementById(prefix + '-nontunai').value = '';
    document.getElementById(prefix + '-pembayaran').value = '';
    document.getElementById(prefix + '-saldo').textContent = 'Saldo Akhir: Rp 0';
    alert('Data pendapatan disimpan!');
}
function editPendapatan(id) {
    const entry = pendapatan.find(p => p.id === id);
    if (!entry) return;
    const prefix = entry.toko === 'Toko Hana 1' ? 'hana1' : 'hana2';
    document.getElementById(prefix + '-date').value = entry.tanggal;
    document.getElementById(prefix + '-tunai').value = entry.tunai;
    document.getElementById(prefix + '-nontunai').value = entry.nontunai;
    document.getElementById(prefix + '-pembayaran').value = entry.penarikan;
    calculateHana1(); // Atau calculateHana2 berdasarkan prefix
    const idx = pendapatan.indexOf(entry);
    if (idx !== -1) pendapatan.splice(idx, 1);  // Hapus dulu, simpan ulang saat save

    // PERBAIKAN: Save & update dashboard langsung setelah hapus entri lama (agar penarikan harian update)
    savePendapatan();
    recalcTotals();
    updateDashboard();  // Ini akan update penarikan harian
    updateTrenPendapatan();
    renderRiwayatPendapatan();

    alert('Edit mode aktif. Ubah data lalu simpan lagi.');
}
function hapusPendapatan(id) {
    if (confirm('Yakin hapus entri pendapatan ini?')) {
        pendapatan = pendapatan.filter(p => p.id !== id);
        savePendapatan();
        recalcTotals();
        updateDashboard();  // Sudah include updatePenarikanHarian
        updateTrenPendapatan();
        renderRiwayatPendapatan();
        alert('Entri dihapus!');
    }
}
function hapusSemuaRiwayatPendapatan() {
    if (confirm('Yakin ingin hapus SEMUA riwayat pendapatan? Ini akan menghapus semua data pendapatan dan mempengaruhi perhitungan dashboard.')) {
        pendapatan = [];
        savePendapatan();
        recalcTotals(); // Recalc setelah hapus
        updateDashboard();  // Sudah include updatePenarikanHarian
        updateTrenPendapatan();
        renderRiwayatPendapatan();
        alert('Semua riwayat pendapatan telah dihapus!');
    }
}
// Fungsi Dashboard dan Tren
function updateDashboard() {
    recalcTotals();
    // Sisa Tagihan Belum Dibayar (Hutang)
    const totalSisaTagihan = suppliers.reduce((sum, sup) =>
        sum + sup.tagihan.reduce((tsum, tag) => tsum + ((tag.nominal || 0) - (tag.dibayar || 0)), 0), 0
    ) || 0;
    // Kewajiban = Hutang supplier saja
    const totalKewajiban = totalSisaTagihan || 0;
    // Tangani NaN di totalPenghasilan
    let penghasilan = window.totalPenghasilan;
    if (isNaN(penghasilan)) penghasilan = 0;
    // Update UI
    document.getElementById('total-pendapatan').textContent = `Rp ${penghasilan.toLocaleString()}`;
    document.getElementById('total-kewajiban').textContent = `Rp ${totalKewajiban.toLocaleString()}`;
    document.getElementById('total-investasi').textContent = `Rp ${totalInvestasi.toLocaleString()}`;
    // Update Penarikan Harian
    updatePenarikanHarian();
}
// Fungsi: Hitung total penarikan harian dari kedua toko
function updatePenarikanHarian() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let totalPenarikan = 0;
    let found = false;
    pendapatan.forEach(entry => {
        if (entry.tanggal === today) {
            found = true;
            totalPenarikan += parseInt(entry.penarikan || 0) || 0;
        }
    });
    const elTotal = document.getElementById('total-pembayaran-harian');
    const elTanggal = document.getElementById('tanggal-pembayaran-harian');
    if (elTotal && elTanggal) {
        elTotal.textContent = `Rp ${totalPenarikan.toLocaleString('id-ID')}`;
        elTanggal.textContent = found
            ? `Tanggal: ${formatTanggal(today)}`
            : 'Tanggal: - (Belum ada data hari ini)';
    }
}
// Format tanggal jadi: 2 November 2025
function formatTanggal(dateStr) {
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}
function updateTrenPendapatan() {
    const trenEl = document.getElementById('tren-pendapatan');
    if (!trenEl) return;
    const { data: monthlyData } = getMonthlyData();
    const now = new Date();
    // Tren 7 Hari
    const last7Start = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const prev7Start = new Date(now - 14 * 24 * 60 * 60 * 1000);
    const last7End = now;
    const prev7End = last7Start;
    const sumLast7 = pendapatan.reduce((sum, p) => {
        const pDate = new Date(p.tanggal);
        return (pDate >= last7Start && pDate < last7End) ? sum + (p.saldoakhir || 0) : sum;
    }, 0);
    const sumPrev7 = pendapatan.reduce((sum, p) => {
        const pDate = new Date(p.tanggal);
        return (pDate >= prev7Start && pDate < prev7End) ? sum + (p.saldoakhir || 0) : sum;
    }, 0);
    let tren7Hari = '';
    if (sumLast7 > 0 && sumPrev7 > 0) {
        const change7 = ((sumLast7 - sumPrev7) / sumPrev7) * 100;
        const arah7 = change7 > 0 ? 'meningkat' : change7 < 0 ? 'menurun' : 'stabil';
        tren7Hari = `7 hari terakhir: <strong>${arah7}</strong> ${Math.abs(change7).toFixed(1)}%`;
    } else {
        tren7Hari = '7 hari terakhir: belum cukup data';
    }
    // Tren 1 Bulan
    const currentMonthSum = monthlyData[11] ? (monthlyData[11].sum || 0) : 0;
    const prevMonthSum = monthlyData[10] ? (monthlyData[10].sum || 0) : 0;
    let tren1Bulan = '';
    if (currentMonthSum > 0 && prevMonthSum > 0) {
        const change1 = ((currentMonthSum - prevMonthSum) / prevMonthSum) * 100;
        const arah1 = change1 > 0 ? 'meningkat' : change1 < 0 ? 'menurun' : 'stabil';
        tren1Bulan = `1 bulan terakhir: <strong>${arah1}</strong> ${Math.abs(change1).toFixed(1)}%`;
    } else {
        tren1Bulan = '1 bulan terakhir: belum cukup data';
    }
    // Tren 12 Bulan
    let tren12Bulan = '';
    const last12Sum = monthlyData.slice(0, 12).reduce((s, d) => s + (d.sum || 0), 0);
    const prev12Sum = pendapatan.reduce((s, p) => {
        const pDate = new Date(p.tanggal);
        const cutoff = new Date(now);
        cutoff.setMonth(cutoff.getMonth() - 24);
        return (pDate < (monthlyData[0] ? monthlyData[0].startDate : now) && pDate >= cutoff) ? s + (p.saldoakhir || 0) : s;
    }, 0);
    if (last12Sum > 0 && prev12Sum > 0) {
        const change12 = ((last12Sum - prev12Sum) / prev12Sum) * 100;
        const arah12 = change12 > 0 ? 'meningkat' : change12 < 0 ? 'menurun' : 'stabil';
        tren12Bulan = `12 bulan terakhir: <strong>${arah12}</strong> ${Math.abs(change12).toFixed(1)}%`;
    } else if (monthlyData.filter(d => (d.sum || 0) > 0).length >= 12) {
        tren12Bulan = '12 bulan terakhir: data lengkap, tapi belum ada periode sebelumnya untuk dibandingkan';
    } else {
        tren12Bulan = '12 bulan terakhir: belum cukup data (perlu 12 bulan penuh)';
    }
    // Tampilkan
    trenEl.innerHTML = `
        <div style="margin-bottom: 0.75rem; font-size: 0.95rem;">${tren7Hari}</div>
        <div style="margin-bottom: 0.75rem; font-size: 0.95rem;">${tren1Bulan}</div>
        <div style="font-size: 0.95rem;">${tren12Bulan}</div>
    `;
}
function getMonthlyData() {
    const now = new Date();
    const data = [];
    let tempDate = new Date(now);
    for (let i = 0; i < 12; i++) {
        const y = tempDate.getFullYear();
        const m = tempDate.getMonth() + 1;
        const ym = `${y}-${String(m).padStart(2, '0')}`;
        const label = tempDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' });
        const startDate = new Date(y, tempDate.getMonth(), 1);
        data.push({ ym, label, sum: 0, startDate });
        tempDate.setMonth(tempDate.getMonth() - 1);
    }
    data.reverse();
    const monthlyMap = pendapatan.reduce((map, p) => {
        const key = p.tanggal.slice(0, 7);
        map[key] = (map[key] || 0) + (p.saldoakhir || 0);
        return map;
    }, {});
    data.forEach(d => {
        d.sum = monthlyMap[d.ym] || 0;
    });
    const labels = data.map(d => d.label);
    const sums = data.map(d => d.sum);
    return { labels, sums, data };
}
function drawMonthlyChart() {
    const canvas = document.getElementById('chart12bulan');
    const noData = document.getElementById('no-data-chart');
    const { labels, sums } = getMonthlyData();
    // Responsive canvas
    canvas.width = canvas.parentElement.clientWidth - 40;
    if (canvas.width < 320) canvas.width = 320;
    canvas.height = 340;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const maxSum = Math.max(...sums, 1000);
    if (maxSum === 1000 && sums.every(s => s === 0)) {
        canvas.style.display = 'none';
        noData.style.display = 'block';
        return;
    }
    canvas.style.display = 'block';
    noData.style.display = 'none';
    const paddingLeft = 50;
    const paddingBottom = 50;
    const chartWidth = canvas.width - paddingLeft - 20;
    const chartHeight = canvas.height - paddingBottom - 40;
    const barWidth = chartWidth / 12 * 0.7;
    const barSpacing = chartWidth / 12 * 0.3;
    // Sumbu
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, 20);
    ctx.lineTo(paddingLeft, canvas.height - paddingBottom);
    ctx.lineTo(canvas.width - 20, canvas.height - paddingBottom);
    ctx.stroke();
    // Bar & label
    sums.forEach((sum, i) => {
        const x = paddingLeft + i * (barWidth + barSpacing);
        const barHeight = (sum / maxSum) * chartHeight;
        const y = canvas.height - paddingBottom - barHeight;
        // Bar
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(x, y, barWidth, barHeight);
        // Nilai di atas bar
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        if (sum > 0) {
            ctx.fillText('Rp ' + sum.toLocaleString(), x + barWidth / 2, y - 8);
        }
        // Label bulan
        ctx.font = '10px sans-serif';
        ctx.fillText(labels[i], x + barWidth / 2, canvas.height - paddingBottom + 18);
    });
    // Judul sumbu Y
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.save();
    ctx.translate(20, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Pendapatan (Rp)', 0, 0);
    ctx.restore();
}
function tutupModalTren12() {
    document.getElementById('modal-tren-12bulan').style.display = 'none';
}
function refreshDashboard() {
    recalcTotals();
    updateDashboard();
}
// Fungsi Investasi (Kontribusi Modal Masuk, Tambah Kas/Aset)
function simpanInvestasi() {
    const toko = document.getElementById('toko-investasi').value;
    const tgl = document.getElementById('tgl-investasi').value;
    const ket = document.getElementById('ket-investasi').value.trim();
    const jumlah = parseFloat(document.getElementById('jumlah-investasi').value) || 0;
    if (!toko || !tgl || !ket || jumlah <= 0) return alert('Isi semua field!');
    investasi.push({
        id: Date.now().toString(),
        toko: toko === 'hana1' ? 'Toko Hana 1' : 'Toko Hana 2',
        tanggal: tgl,
        keterangan: ket,
        jumlah,
        dibayar: 0
    });
    // Reset form
    document.getElementById('toko-investasi').value = 'hana1';
    document.getElementById('tgl-investasi').value = '';
    document.getElementById('ket-investasi').value = '';
    document.getElementById('jumlah-investasi').value = '';
    saveInvestasi();
    recalcTotals(); // Recalc setelah simpan
    updateDashboard();
    renderInvestasi();
    alert('Investasi disimpan!');
}
function editInvestasi(id) {
    const inv = investasi.find(i => i.id === id);
    if (!inv) return;
    document.getElementById('toko-investasi').value = inv.toko === 'Toko Hana 1' ? 'hana1' : 'hana2';
    document.getElementById('tgl-investasi').value = inv.tanggal;
    document.getElementById('ket-investasi').value = inv.keterangan;
    document.getElementById('jumlah-investasi').value = inv.jumlah;
    const idx = investasi.indexOf(inv);
    if (idx !== -1) investasi.splice(idx, 1);  // Hapus dulu, simpan ulang saat save
    alert('Edit mode aktif. Ubah data lalu simpan lagi.');
}
function hapusInvestasi(id) {
    if (confirm('Yakin hapus investasi ini?')) {
        investasi = investasi.filter(i => i.id !== id);
        saveInvestasi();
        recalcTotals();
        renderInvestasi();
        updateDashboard();
        alert('Investasi dihapus!');
    }
}
function renderInvestasi() {
    const tbody = document.getElementById('body-investasi');
    if (!tbody) return;
    const sorted = [...investasi]
        .filter(i => (i.jumlah - (i.dibayar || 0)) > 0)
        .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    let html = '';
    sorted.forEach(i => {
        const sisa = (i.jumlah || 0) - (i.dibayar || 0);
        html += `<tr>
            <td>${i.toko}</td>
            <td>${i.tanggal}</td>
            <td>${i.keterangan}</td>
            <td style="text-align:right; font-weight:bold; color:#2e7d32;">
                Rp ${sisa.toLocaleString()}
            </td>
            <td>
                <button onclick="editInvestasi('${i.id}')">Edit</button>
                <button class="danger" onclick="hapusInvestasi('${i.id}')">Hapus</button>
                <button class="small" style="background:#ff9800; color:white;" onclick="bayarInvestasi('${i.id}', '${i.toko}', '${i.keterangan}', ${sisa})">
                    Bayar
                </button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center; color:#999;">Belum ada data investasi</td></tr>';
}
// Fungsi Bayar Investasi (Pengembalian Modal)
function bayarInvestasi(id, toko, keterangan, sisa) {
    const jumlahBayar = parseFloat(prompt(
        `Pengembalian Modal\n\nToko: ${toko}\nKeterangan: ${keterangan}\nSisa Modal: Rp ${sisa.toLocaleString()}\n\nMasukkan jumlah yang dikembalikan:`,
        sisa
    )) || 0;

    if (jumlahBayar <= 0 || jumlahBayar > sisa) {
        return alert('Jumlah pengembalian tidak valid!');
    }

    recalcTotals();
    const kasTersedia = window.totalPenghasilan || 0;
    if (jumlahBayar > kasTersedia) {
        return alert(`Kas tidak cukup! Tersedia: Rp ${kasTersedia.toLocaleString()}`);
    }

    if (!confirm(`Kembalikan Rp ${jumlahBayar.toLocaleString()} dari investasi "${keterangan}"?`)) {
        return;
    }

    // 1. Update dibayar di investasi (untuk update ekuitas, tanpa mempengaruhi gross masuk)
    const inv = investasi.find(i => i.id === id);
    if (!inv) return alert('Data investasi tidak ditemukan!');
    inv.dibayar = (inv.dibayar || 0) + jumlahBayar;

    // 2. Catat ke operasional (pengeluaran kas)
    operasional.push({
        id: Date.now().toString(),
        toko: toko,
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Pengembalian Modal - ${keterangan} (Rp ${jumlahBayar.toLocaleString()})`,
        jumlah: jumlahBayar
    });

    // 3. Simpan & update
    saveInvestasi();
    saveOperasional();
    recalcTotals();
    updateDashboard();
    renderInvestasi();
    renderRiwayatOperasional();
    alert(`Pengembalian modal Rp ${jumlahBayar.toLocaleString()} berhasil dicatat!`);
}
// Fungsi Bayar Semua Modal (Opsional)
function bayarSemuaModal() {
    recalcTotals();
    const totalModal = totalInvestasi;
    const kasTersedia = window.totalPenghasilan || 0;

    if (totalModal === 0) return alert('Tidak ada modal untuk dikembalikan.');

    if (totalModal > kasTersedia) {
        return alert(`Kas tidak cukup! Dibutuhkan: Rp ${totalModal.toLocaleString()}, Tersedia: Rp ${kasTersedia.toLocaleString()}`);
    }

    if (!confirm(`Kembalikan SEMUA modal Rp ${totalModal.toLocaleString()} ke pemilik?`)) return;

    // Update semua investasi menjadi lunas (dibayar = jumlah)
    investasi.forEach(i => {
        if ((i.jumlah - (i.dibayar || 0)) > 0) {
            i.dibayar = i.jumlah;
        }
    });

    // Catat sebagai satu transaksi operasional
    operasional.push({
        id: Date.now().toString(),
        toko: 'Semua Toko',
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: `Pengembalian Seluruh Modal (Rp ${totalModal.toLocaleString()})`,
        jumlah: totalModal
    });

    // Simpan
    saveInvestasi();
    saveOperasional();
    recalcTotals();
    updateDashboard();
    renderInvestasi();
    renderRiwayatOperasional();

    alert(`Semua modal Rp ${totalModal.toLocaleString()} telah dikembalikan ke pemilik!`);
}
// Fungsi Supplier dan Tagihan
function tambahSupplier() {
    const nama = document.getElementById('pt-nama').value.trim();
    const noRek = document.getElementById('no-rek').value.trim();
    const jenisBank = document.getElementById('jenis-bank').value.trim();
    if (!nama || !noRek || !jenisBank) {
        return alert('Isi semua field dengan benar!');
    }
    suppliers.push({
        id: Date.now().toString(),
        nama,
        no_rek: noRek,
        jenis_bank: jenisBank,
        tagihan: []
    });
    saveSuppliers();
    populateSupplierSelect();
    renderSuppliers();
    updateFilterOptions();
    document.getElementById('pt-nama').value = '';
    document.getElementById('no-rek').value = '';
    document.getElementById('jenis-bank').value = '';
    alert('Supplier ditambahkan!');
}
function editSupplier(id) {
    const sup = suppliers.find(s => s.id === id);
    if (!sup) return;
    document.getElementById('pt-nama').value = sup.nama;
    document.getElementById('no-rek').value = sup.no_rek;
    document.getElementById('jenis-bank').value = sup.jenis_bank;
    const idx = suppliers.indexOf(sup);
    if (idx !== -1) suppliers.splice(idx, 1);  // Hapus dulu, simpan ulang saat tambah
    alert('Edit mode aktif. Ubah data lalu tambah lagi sebagai supplier baru.');
}
function hapusSupplier(id) {
    if (confirm('Yakin hapus supplier ini dan semua tagihannya?')) {
        suppliers = suppliers.filter(s => s.id !== id);
        saveSuppliers();
        recalcTotals();
        renderSuppliers();
        populateSupplierSelect();
        updateFilterOptions();
        updateDashboard();
        alert('Supplier dihapus!');
    }
}
function populateSupplierSelect() {
    const select = document.getElementById('select-supplier');
    select.innerHTML = '<option value="">Pilih Supplier</option>';
    suppliers.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.nama;
        select.appendChild(option);
    });
}
function tambahTagihan() {
    const supplierId = document.getElementById('select-supplier').value;
    const toko = document.getElementById('select-toko').value;
    const noFaktur = document.getElementById('no-faktur').value.trim();
    const tglKirim = document.getElementById('tgl-kirim').value;
    const nominal = parseFloat(document.getElementById('nominal').value) || 0;
    const tglJatuh = document.getElementById('tgl-jatuh').value;
    if (!supplierId || !toko || !tglKirim || !nominal || !tglJatuh) {
        return alert('Semua field harus diisi!');
    }
    const sup = suppliers.find(s => s.id === supplierId);
    if (!sup) return;
    sup.tagihan.push({
        id: Date.now().toString(),
        tgl_kirim: tglKirim,
        nominal: nominal,
        tgl_jatuh_tempo: tglJatuh,
        dibayar: 0,
        bukti_foto: null,
        toko: toko,
        no_faktur: noFaktur || null
    });
    document.getElementById('no-faktur').value = '';
    document.getElementById('select-toko').value = '';
    document.getElementById('tgl-kirim').value = '';
    document.getElementById('nominal').value = '';
    document.getElementById('tgl-jatuh').value = '';
    saveSuppliers();
    recalcTotals(); // Recalc setelah tambah
    renderSuppliers();
    updateDashboard();
    alert('Tagihan ditambahkan!');
}
function editTagihan(supId, tagId) {
    const sup = suppliers.find(s => s.id === supId);
    if (!sup) return;
    const tag = sup.tagihan.find(t => t.id === tagId);
    if (!tag) return;
    document.getElementById('select-supplier').value = supId;
    document.getElementById('select-toko').value = tag.toko;
    document.getElementById('no-faktur').value = tag.no_faktur;
    document.getElementById('tgl-kirim').value = tag.tgl_kirim;
    document.getElementById('nominal').value = tag.nominal;
    document.getElementById('tgl-jatuh').value = tag.tgl_jatuh_tempo;
    const tagIdx = sup.tagihan.indexOf(tag);
    if (tagIdx !== -1) sup.tagihan.splice(tagIdx, 1);  // Hapus dulu, simpan ulang saat tambah
    alert('Edit mode aktif. Ubah data lalu tambah lagi sebagai tagihan baru.');
}
function hapusTagihan(supId, tagId) {
    if (confirm('Yakin hapus tagihan ini?')) {
        const sup = suppliers.find(s => s.id === supId);
        if (!sup) return;
        sup.tagihan = sup.tagihan.filter(t => t.id !== tagId);
        saveSuppliers();
        recalcTotals();
        renderSuppliers();
        updateDashboard();
        alert('Tagihan dihapus!');
    }
}
function renderSuppliers() {
    const tbody = document.getElementById('table-body');
    const tfoot = document.getElementById('tfoot-total');
    const noData = document.getElementById('no-data');
    const filterId = document.getElementById('filter-supplier').value;
    const searchQuery = document.getElementById('search-tagihan').value.toLowerCase().trim();
    let html = '';
    const today = new Date();
    let hasData = false;
    let totalSisa = 0;
    let filteredSupplier = null;
    const suppliersToShow = filterId ? suppliers.filter(s => s.id === filterId) : suppliers;
    suppliersToShow.forEach(s => {
        if (filterId) filteredSupplier = s;
        s.tagihan.forEach(t => {
            const sisa = (t.nominal || 0) - (t.dibayar || 0);
            if (sisa <= 0) return;
            const fakturMatch = !searchQuery || (t.no_faktur && t.no_faktur.toLowerCase().includes(searchQuery));
            if (!fakturMatch) return;
            hasData = true;
            const jatuhTempo = new Date(t.tgl_jatuh_tempo);
            const overdue = today > jatuhTempo && sisa > 0;
            if (!filterId || filterId === s.id) totalSisa += sisa;
            html += `
                <tr style="border-bottom: 1px solid #eee; ${overdue ? 'background:#ffebee;' : ''}">
                    <td style="padding: 0.75rem; font-weight: bold; color: #1976d2;">
                        ${t.toko === 'hana1' ? 'Hana 1' : 'Hana 2'}
                    </td>
                    <td style="padding: 0.75rem;">
                        ${s.nama}<br>
                        <small style="color:#666;">${s.no_rek} - ${s.jenis_bank}</small>
                    </td>
                    <td style="padding: 0.75rem;">${t.no_faktur || '-'}</td>
                    <td style="padding: 0.75rem;">${t.tgl_kirim}</td>
                    <td style="padding: 0.75rem; text-align: right;">Rp ${(t.nominal || 0).toLocaleString()}</td>
                    <td style="padding: 0.75rem;">
                        ${t.tgl_jatuh_tempo} ${overdue ? '<span style="color:#f44336; font-weight:bold;">OVERDUE</span>' : ''}
                    </td>
                    <td style="padding: 0.75rem; text-align: right; font-weight: bold; color: #f44336;">
                        Rp ${sisa.toLocaleString()}
                    </td>
                    <td style="padding: 0.75rem; text-align: center;">
                        <button class="small danger" onclick="bayarSupplier('${s.id}', '${t.id}', '${s.nama}', ${sisa})">
                            Bayar
                        </button>
                        <button class="small" onclick="editTagihan('${s.id}', '${t.id}')">Edit</button>
                        <button class="small danger" onclick="hapusTagihan('${s.id}', '${t.id}')">Hapus</button>
                    </td>
                </tr>
            `;
        });
        // Tambah tombol edit/hapus supplier jika filterId
        if (filterId && s.tagihan.length === 0) {
            html += `
                <tr>
                    <td colspan="8" style="text-align:center;">
                        Tidak ada tagihan. <button onclick="editSupplier('${s.id}')">Edit Supplier</button> <button class="danger" onclick="hapusSupplier('${s.id}')">Hapus Supplier</button>
                    </td>
                </tr>
            `;
        }
    });
    tbody.innerHTML = html;
    if (hasData) {
        noData.style.display = 'none';
        if (filterId && filteredSupplier) {
            document.getElementById('total-supplier-name').textContent = filteredSupplier.nama;
            document.getElementById('total-sisa-supplier').textContent = `Rp ${totalSisa.toLocaleString()}`;
            tfoot.style.display = 'table-footer-group';
        } else {
            tfoot.style.display = 'none';
        }
    } else {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        noData.textContent = searchQuery
            ? 'Nomor faktur tidak ditemukan'
            : filterId
                ? 'Tidak ada tagihan untuk supplier ini'
                : 'Belum ada tagihan';
        tfoot.style.display = 'none';
    }
    updateFilterOptions();
    populateSupplierSelect();
}
let currentSupplierId = null;
let currentTagihanId = null;
function bayarSupplier(supId, tagId, nama, sisa) {
    currentSupplierId = supId;
    currentTagihanId = tagId;
    recalcTotals();
    let kasTersedia = window.totalPenghasilan;
    if (isNaN(kasTersedia)) kasTersedia = 0;
    document.getElementById('modal-nama').textContent = nama;
    document.getElementById('modal-sisa').textContent = `Rp ${sisa.toLocaleString()}`;
    document.getElementById('modal-pendapatan').textContent = `Rp ${kasTersedia.toLocaleString()}`;
    document.getElementById('jumlah-bayar').value = '';
    document.getElementById('modal-bayar').style.display = 'flex';
}
function konfirmasiBayar() {
    const jumlah = parseFloat(document.getElementById('jumlah-bayar').value) || 0;
    if (jumlah <= 0) return alert('Masukkan jumlah yang valid!');
    const sup = suppliers.find(s => s.id === currentSupplierId);
    if (!sup) return;
    const tagIndex = sup.tagihan.findIndex(t => t.id === currentTagihanId);
    if (tagIndex === -1) return;
    const tag = sup.tagihan[tagIndex];
    const sisaSebelum = (tag.nominal || 0) - (tag.dibayar || 0);
    if (jumlah > sisaSebelum) {
        return alert(`Jumlah bayar melebihi sisa tagihan: Rp ${sisaSebelum.toLocaleString()}`);
    }
    recalcTotals();
    let kasTersedia = window.totalPenghasilan;
    if (isNaN(kasTersedia)) kasTersedia = 0;
    if (jumlah > kasTersedia) {
        return alert(`Tidak bisa bayar! Melebihi kas tersedia: Rp ${kasTersedia.toLocaleString()}`);
    }
    const fileInput = document.getElementById('input-foto');
    if (fileInput.files[0]) {
        compressImage(fileInput.files[0], prosesPembayaran);
    } else {
        prosesPembayaran(null);
    }
    function prosesPembayaran(bukti) {
        tag.dibayar = (tag.dibayar || 0) + jumlah;
        riwayatPembayaran.push({
            id: Date.now().toString(),
            supplier: sup.nama,
            jumlah: jumlah,
            tanggal: new Date().toISOString().split('T')[0],
            bukti_foto: bukti,
            toko: tag.toko,
            no_faktur: tag.no_faktur
        });
        if (tag.dibayar >= (tag.nominal || 0)) {
            sup.tagihan.splice(tagIndex, 1);
        }
        saveSuppliers();
        saveRiwayat();
        recalcTotals();
        updateDashboard();  // Tambahkan ini untuk memastikan dashboard update langsung
        renderSuppliers();
        renderRiwayatModal();
        renderRiwayatOperasional();  // Refresh riwayat operasional
        tutupModal();
        const sisaBaru = sisaSebelum - jumlah;
        const status = sisaBaru <= 0 ? 'LUNAS & DIHAPUS!' : 'diperbarui.';
        alert(`Berhasil dibayar Rp ${jumlah.toLocaleString()}. Tagihan ${status}`);
    }
}
function tutupModal() {
    document.getElementById('modal-bayar').style.display = 'none';
    document.getElementById('preview-foto').style.display = 'none';
    document.getElementById('input-foto').value = '';
}
function hapusSemua() {
    if (confirm('Yakin ingin hapus semua data supplier dan tagihan?')) {
        suppliers = [];
        saveSuppliers();
        recalcTotals(); // Recalc setelah hapus
        updateDashboard();
        renderSuppliers();
        populateSupplierSelect();
        alert('Semua data dihapus!');
    }
}
function updateFilterOptions() {
    const select = document.getElementById('filter-supplier');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Semua Supplier</option>';
  
    suppliers.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.nama;
        if (s.id === currentValue) option.selected = true;
        select.appendChild(option);
    });
}
// Fungsi Riwayat Pembayaran
function tutupModalRiwayat() {
    document.getElementById('modal-riwayat').style.display = 'none';
}
let currentPage = 1;
const itemsPerPage = 10;
function renderRiwayatModal(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('riwayat-body');
    const noData = document.getElementById('no-riwayat');
    const paginationEl = document.getElementById('pagination');
    const searchQuery = document.getElementById('search-riwayat').value.toLowerCase().trim();
    if (!tbody || !noData || !paginationEl) return;
    let html = '';
    const sorted = [...riwayatPembayaran].reverse();
    let filtered = sorted;
    if (searchQuery) {
        filtered = filtered.filter(r => r.no_faktur && r.no_faktur.toLowerCase().includes(searchQuery));
    }
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filtered.slice(start, end);
    if (riwayatPembayaran.length === 0) {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        paginationEl.innerHTML = '';
        return;
    }
    noData.style.display = 'none';
    pageData.forEach(r => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem;">${r.supplier}</td>
                <td style="padding: 0.75rem;">${r.toko === 'hana1' ? 'Hana 1' : 'Hana 2'}</td>
                <td style="padding: 0.75rem;">${r.tanggal}</td>
                <td style="padding: 0.75rem;">${r.no_faktur || '-'}</td>
                <td style="padding: 0.75rem; text-align: right; font-weight: bold;">
                    Rp ${(r.jumlah || 0).toLocaleString()}
                </td>
                <td style="padding: 0.75rem; text-align: center;">
                    ${r.bukti_foto ? `
                        <button class="small" style="background:#4CAF50;" onclick="lihatFoto('${r.bukti_foto}')">
                            Lihat
                        </button>
                    ` : '<span style="color:#aaa;">Tidak ada</span>'}
                </td>
                <td>
                    <button class="small danger" onclick="hapusRiwayatPembayaran('${r.id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    let pagination = '';
    for (let i = 1; i <= totalPages; i++) {
        pagination += `
            <button onclick="renderRiwayatModal(${i})"
                    style="margin:0.25rem; padding:0.5rem 1rem; border:1px solid #2196F3; background:${i===page?'#2196F3':'white'}; color:${i===page?'white':'#2196F3'}; border-radius:4px; font-size:0.9rem;">
                ${i}
            </button>
        `;
    }
    paginationEl.innerHTML = pagination;
}
function hapusRiwayatPembayaran(id) {
    if (confirm('Yakin hapus riwayat pembayaran ini?')) {
        riwayatPembayaran = riwayatPembayaran.filter(r => r.id !== id);
        saveRiwayat();
        renderRiwayatModal(currentPage);
        alert('Riwayat dihapus!');
    }
}
function hapusSemuaRiwayat() {
    if (confirm('Yakin ingin hapus SEMUA riwayat pembayaran? Ini tidak bisa dibatalkan dan hanya menghapus log riwayat (bukan tagihan atau pembayaran aktual).')) {
        riwayatPembayaran = [];
        saveRiwayat();
        renderRiwayatModal();
        alert('Semua riwayat pembayaran telah dihapus!');
    }
}
// Fungsi Operasional
function simpanOperasional() {
    const toko = document.getElementById('select-toko-operasional').value;
    const tgl = document.getElementById('tgl-operasional').value;
    const keterangan = document.getElementById('keterangan-operasional').value.trim();
    const jumlah = parseFloat(document.getElementById('jumlah-operasional').value) || 0;
    if (!toko || !tgl || !keterangan || jumlah <= 0) {
        return alert('Isi semua field dengan benar!');
    }
    operasional.push({
        id: Date.now().toString(),
        toko: toko === 'hana1' ? 'Toko Hana 1' : 'Toko Hana 2',
        tanggal: tgl,
        keterangan,
        jumlah
    });
    // Reset form
    document.getElementById('select-toko-operasional').value = '';
    document.getElementById('tgl-operasional').value = '';
    document.getElementById('keterangan-operasional').value = '';
    document.getElementById('jumlah-operasional').value = '';
    saveOperasional();
    recalcTotals(); // Recalc setelah simpan
    updateDashboard();
    renderRiwayatOperasional();
    alert('Pengeluaran operasional disimpan!');
}
function editOperasional(id) {
    const op = operasional.find(o => o.id === id);
    if (!op) return;
    document.getElementById('select-toko-operasional').value = op.toko === 'Toko Hana 1' ? 'hana1' : 'hana2';
    document.getElementById('tgl-operasional').value = op.tanggal;
    document.getElementById('keterangan-operasional').value = op.keterangan;
    document.getElementById('jumlah-operasional').value = op.jumlah;
    const idx = operasional.indexOf(op);
    if (idx !== -1) operasional.splice(idx, 1);  // Hapus dulu, simpan ulang saat save
    alert('Edit mode aktif. Ubah data lalu simpan lagi.');
}
function hapusOperasional(id) {
    if (confirm('Yakin hapus pengeluaran operasional ini?')) {
        operasional = operasional.filter(o => o.id !== id);
        saveOperasional();
        recalcTotals();
        updateDashboard();
        renderRiwayatOperasional();
        alert('Pengeluaran dihapus!');
    }
}
function renderRiwayatOperasional() {
    const tbody = document.getElementById('riwayat-operasional-body');
    const noData = document.getElementById('no-riwayat-operasional');
    let html = '';
    if (operasional.length === 0) {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        return;
    }
    noData.style.display = 'none';
    const sorted = [...operasional].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    sorted.forEach(o => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem;">${o.toko}</td>
                <td style="padding: 0.75rem;">${o.tanggal}</td>
                <td style="padding: 0.75rem;">${o.keterangan}</td>
                <td style="padding: 0.75rem; text-align: right; font-weight: bold; color: #e65100;">
                    Rp ${(o.jumlah || 0).toLocaleString()}
                </td>
                <td>
                    <button onclick="editOperasional('${o.id}')">Edit</button>
                    <button class="danger" onclick="hapusOperasional('${o.id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}
function hapusSemuaOperasional() {
    if (confirm('Yakin ingin hapus SEMUA riwayat pengeluaran operasional?')) {
        operasional = [];
        saveOperasional();
        recalcTotals(); // Recalc setelah hapus
        updateDashboard();
        renderRiwayatOperasional();
        alert('Semua riwayat operasional dihapus!');
    }
}
function tutupModalRiwayatOperasional() {
    document.getElementById('modal-riwayat-operasional').style.display = 'none';
}
// Fungsi Pinjaman Karyawan
function tambahPinjaman() {
    const nama = document.getElementById('nama-karyawan').value.trim();
    const jumlah = parseFloat(document.getElementById('jumlah-pinjaman').value) || 0;
    const tgl = document.getElementById('tgl-pinjaman').value;
    const ket = document.getElementById('keterangan-pinjaman').value.trim();
    if (!nama || !tgl || jumlah <= 0) return alert('Isi nama, jumlah, dan tanggal!');
    pinjamanKaryawan.push({
        id: Date.now().toString(),
        nama,
        jumlahAwal: jumlah,
        sisa: jumlah,
        tglPinjam: tgl,
        keterangan: ket,
        cicilan: []
    });
    // Reset form
    document.getElementById('nama-karyawan').value = '';
    document.getElementById('jumlah-pinjaman').value = '';
    document.getElementById('tgl-pinjaman').value = '';
    document.getElementById('keterangan-pinjaman').value = '';
    savePinjaman();
    recalcTotals(); // Recalc setelah tambah
    populatePinjamanSelect();
    updateDashboard();
    renderRiwayatPinjaman();
    alert('Pinjaman karyawan ditambahkan!');
}
function editPinjaman(id) {
    const p = pinjamanKaryawan.find(p => p.id === id);
    if (!p) return;
    document.getElementById('nama-karyawan').value = p.nama;
    document.getElementById('jumlah-pinjaman').value = p.jumlahAwal;
    document.getElementById('tgl-pinjaman').value = p.tglPinjam;
    document.getElementById('keterangan-pinjaman').value = p.keterangan;
    const idx = pinjamanKaryawan.indexOf(p);
    if (idx !== -1) pinjamanKaryawan.splice(idx, 1);  // Hapus dulu, simpan ulang saat tambah
    alert('Edit mode aktif. Ubah data lalu tambah lagi.');
}
function hapusPinjaman(id) {
    if (confirm('Yakin hapus pinjaman ini?')) {
        pinjamanKaryawan = pinjamanKaryawan.filter(p => p.id !== id);
        savePinjaman();
        recalcTotals();
        populatePinjamanSelect();
        updateDashboard();
        renderRiwayatPinjaman();
        alert('Pinjaman dihapus!');
    }
}
function bayarCicilan() {
    const pinjamId = document.getElementById('select-pinjaman').value;
    const jumlah = parseFloat(document.getElementById('jumlah-cicilan').value) || 0;
    const tgl = document.getElementById('tgl-cicilan').value;
    if (!pinjamId || jumlah <= 0 || !tgl) return alert('Pilih pinjaman, jumlah, dan tanggal!');
    const pinjam = pinjamanKaryawan.find(p => p.id === pinjamId);
    if (!pinjam) return;
    if (jumlah > pinjam.sisa) return alert(`Cicilan melebihi sisa piutang: Rp ${pinjam.sisa.toLocaleString()}`);
    pinjam.sisa -= jumlah;
    pinjam.cicilan.push({
        jumlah,
        tgl,
        waktu: new Date().toISOString()
    });
    // Hapus jika lunas
    if (pinjam.sisa <= 0) {
        const idx = pinjamanKaryawan.indexOf(pinjam);
        if (idx !== -1) pinjamanKaryawan.splice(idx, 1);
    }
    savePinjaman();
    recalcTotals(); // Recalc setelah bayar
    populatePinjamanSelect();
    updateDashboard();
    renderRiwayatPinjaman();
    document.getElementById('jumlah-cicilan').value = '';
    document.getElementById('tgl-cicilan').value = '';
    alert('Cicilan berhasil dibayar!');
}
function populatePinjamanSelect() {
    const select = document.getElementById('select-pinjaman');
    select.innerHTML = '<option value="">Pilih Pinjaman untuk Dibayar</option>';
    pinjamanKaryawan.forEach(p => {
        if (p.sisa > 0) {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `${p.nama} - Sisa: Rp ${(p.sisa || 0).toLocaleString()}`;
            select.appendChild(opt);
        }
    });
}
function renderRiwayatPinjaman() {
    const container = document.getElementById('riwayat-pinjaman-body');
    let html = '';
    if (pinjamanKaryawan.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Belum ada pinjaman</td></tr>';
        return;
    }
    const sorted = [...pinjamanKaryawan].sort((a, b) => new Date(b.tglPinjam) - new Date(a.tglPinjam));
    sorted.forEach(p => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem;">${p.nama}</td>
                <td style="padding: 0.75rem;">${p.tglPinjam}</td>
                <td style="padding: 0.75rem; text-align: right;">Rp ${(p.jumlahAwal || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; text-align: right; color: #2e7d32;">Rp ${(p.sisa || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem;">
                    ${p.cicilan.length > 0 ? `<button class="small" style="background:#2196F3;" onclick="lihatCicilan('${p.id}')">Lihat Cicilan</button>` : '-'}
                </td>
                <td>
                    <button onclick="editPinjaman('${p.id}')">Edit</button>
                    <button class="danger" onclick="hapusPinjaman('${p.id}')">Hapus</button>
                </td>
            </tr>`;
    });
    container.innerHTML = html;
}
function lihatCicilan(id) {
    const p = pinjamanKaryawan.find(x => x.id === id);
    if (!p) return;
    let html = `<h4>Cicilan - ${p.nama}</h4><table style="width:100%; margin-top:0.5rem;"><thead style="background:#ff8f00; color:white;"><tr><th>Tanggal</th><th>Jumlah</th></tr></thead><tbody>`;
    p.cicilan.forEach(c => {
        html += `<tr><td style="padding:0.5rem;">${c.tgl}</td><td style="padding:0.5rem; text-align:right;">Rp ${(c.jumlah || 0).toLocaleString()}</td></tr>`;
    });
    html += `</tbody></table>`;
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;justify-content:center;align-items:center;z-index:1000;padding:1rem;';
    modal.innerHTML = `<div style="background:white;padding:1.5rem;border-radius:12px;max-width:90%;max-height:80%;overflow:auto;">${html}<br><button onclick="this.closest('[style]').remove()" style="width:100%;padding:0.75rem;background:#f44336;color:white;border:none;border-radius:8px;">Tutup</button></div>`;
    document.body.appendChild(modal);
}
// Fungsi Riwayat Pendapatan
function tutupModalRiwayatPendapatan() {
    document.getElementById('modal-riwayat-pendapatan').style.display = 'none';
}
function renderRiwayatPendapatan() {
    const tbody = document.getElementById('riwayat-pendapatan-body');
    const noData = document.getElementById('no-riwayat-pendapatan');
    let html = '';
    if (pendapatan.length === 0) {
        tbody.innerHTML = '';
        noData.style.display = 'block';
        return;
    }
    noData.style.display = 'none';
    const sorted = [...pendapatan].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    sorted.forEach(p => {
        html += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 0.75rem;">${p.toko}</td>
                <td style="padding: 0.75rem;">${p.tanggal}</td>
                <td style="padding: 0.75rem; text-align: right;">Rp ${(p.tunai || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; text-align: right;">Rp ${(p.nontunai || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; text-align: right; color:#e65100;">Rp ${(p.penarikan || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; text-align: right; font-weight: bold; color:#2e7d32;">
                    Rp ${(p.saldoakhir || 0).toLocaleString()}
                </td>
                <td>
                    <button onclick="editPendapatan('${p.id}')">Edit</button>
                    <button class="danger" onclick="hapusPendapatan('${p.id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}
function hapusSemuaInvestasi() {
    if (confirm('Yakin ingin hapus SEMUA riwayat investasi modal? Ini akan menghapus semua data investasi.')) {
        investasi = [];
        saveInvestasi();
        recalcTotals(); // Recalc setelah hapus
        renderInvestasi();
        updateDashboard();
        alert('Semua riwayat investasi telah dihapus!');
    }
}
// Fungsi Utilitas
function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 800;
            let width = img.width;
            let height = img.height;
            if (width > height && width > maxSize) {
                height *= maxSize / width;
                width = maxSize;
            } else if (height > maxSize) {
                width *= maxSize / height;
                height = maxSize;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            callback(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}
function lihatFoto(base64) {
    if (document.getElementById('modal-foto')) {
        document.getElementById('modal-foto').remove();
    }
    const modal = document.createElement('div');
    modal.id = 'modal-foto';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 300; display: flex;
        justify-content: center; align-items: center; padding: 1rem;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 1rem; border-radius: 12px; max-width: 90%; max-height: 90%; overflow: auto; text-align: center;">
            <img src="${base64}" style="max-width: 100%; max-height: 60vh; border-radius: 8px; margin-bottom: 1rem;">
            <br>
            <button id="tutup-foto" style="width: 100%; padding: 0.75rem; background: #f44336; color: white; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;">
                Tutup
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('tutup-foto').addEventListener('click', () => {
        modal.remove();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}
// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    // Event listener input foto
    const inputFoto = document.getElementById('input-foto');
    if (inputFoto) {
        inputFoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('preview-foto');
            const img = document.getElementById('img-preview');
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    img.src = ev.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                preview.style.display = 'none';
            }
        });
    }
    // Modal Riwayat Pinjaman
    const btnRiwayatPinjaman = document.getElementById('btn-lihat-riwayat-pinjaman');
    if (btnRiwayatPinjaman) {
        btnRiwayatPinjaman.addEventListener('click', () => {
            renderRiwayatPinjaman();
            populatePinjamanSelect();
            document.getElementById('modal-riwayat-pinjaman').style.display = 'flex';
        });
    }
    // Modal Riwayat Pembayaran
    const btnLihatRiwayat = document.getElementById('btn-lihat-riwayat');
    if (btnLihatRiwayat) {
        btnLihatRiwayat.addEventListener('click', () => {
            renderRiwayatModal();
            document.getElementById('modal-riwayat').style.display = 'flex';
        });
    }
    // Modal Riwayat Pendapatan
    const btnLihatRiwayatPendapatan = document.getElementById('btn-lihat-riwayat-pendapatan');
    if (btnLihatRiwayatPendapatan) {
        btnLihatRiwayatPendapatan.addEventListener('click', () => {
            renderRiwayatPendapatan();
            document.getElementById('modal-riwayat-pendapatan').style.display = 'flex';
        });
    }
    // Modal Tren 12 Bulan
    const btnTren12Bulan = document.getElementById('btn-tren-12bulan');
    if (btnTren12Bulan) {
        btnTren12Bulan.addEventListener('click', () => {
            drawMonthlyChart();
            document.getElementById('modal-tren-12bulan').style.display = 'flex';
        });
    }
    // Modal Riwayat Operasional
    const btnLihatRiwayatOperasional = document.getElementById('btn-lihat-riwayat-operasional');
    if (btnLihatRiwayatOperasional) {
        btnLihatRiwayatOperasional.addEventListener('click', () => {
            renderRiwayatOperasional();
            document.getElementById('modal-riwayat-operasional').style.display = 'flex';
        });
    }
});