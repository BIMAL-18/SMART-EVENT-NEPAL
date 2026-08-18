import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { QrCode, CheckCircle2, XCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { io } from 'socket.io-client';
import { api, apiErrorMessage } from '../../api/client.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export default function EventAttendance() {
  const { id } = useParams();
  const [manualPayload, setManualPayload] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [live, setLive] = useState({ totalConfirmed: 0, totalCheckedIn: 0 });
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', id],
    queryFn: () => api.get(`/attendance/event/${id}/summary`).then(r => r.data),
  });

  useEffect(() => {
    if (summary) setLive({ totalConfirmed: summary.registered, totalCheckedIn: summary.checkedIn });
  }, [summary]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const socket = io(SOCKET_URL, { auth: { token } });
    socket.emit('event:join', id);
    socket.on('attendance.checkedIn', (payload) => setLive({ totalConfirmed: payload.totalConfirmed, totalCheckedIn: payload.totalCheckedIn }));
    return () => socket.disconnect();
  }, [id]);

  const checkInMutation = useMutation({
    mutationFn: (qrPayload) => api.post('/attendance/check-in', { qrPayload, eventId: id }),
    onSuccess: ({ data }) => { setLastResult({ ok: true, message: data.message }); toast.success(data.message); },
    onError: (err) => { setLastResult({ ok: false, message: apiErrorMessage(err) }); toast.error(apiErrorMessage(err)); },
  });

  const startScanner = async () => {
    setScanning(true);
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          checkInMutation.mutate(decodedText);
          scanner.pause(true);
          setTimeout(() => scanner.resume(), 2500);
        },
        () => {}
      );
    } catch (err) {
      toast.error('Could not access camera. You can paste the QR payload manually instead.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); scannerRef.current.clear(); } catch (_) {}
    }
    setScanning(false);
  };

  useEffect(() => () => { if (scannerRef.current) scannerRef.current.stop().catch(() => {}); }, []);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><QrCode /> Check-in</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Registered</p><p className="text-2xl font-bold">{live.totalConfirmed}</p></div>
        <div className="card p-4 text-center"><p className="text-xs text-slate-500">Checked In</p><p className="text-2xl font-bold text-emerald-400">{live.totalCheckedIn}</p></div>
      </div>

      <div className="card p-5 space-y-3">
        <div id="qr-reader" className="rounded-xl overflow-hidden bg-slate-900" style={{ minHeight: scanning ? 250 : 0 }} />
        {!scanning ? (
          <button className="btn-primary w-full" onClick={startScanner}>Start camera scan</button>
        ) : (
          <button className="btn-secondary w-full" onClick={stopScanner}>Stop scanning</button>
        )}
      </div>

      <div className="card p-5 space-y-3">
        <p className="text-sm font-medium">Or paste ticket QR payload manually</p>
        <textarea className="input" rows={2} value={manualPayload} onChange={e => setManualPayload(e.target.value)} placeholder="SEN-XXXX|eventId|registrationId|signature" />
        <button className="btn-secondary w-full" disabled={!manualPayload} onClick={() => checkInMutation.mutate(manualPayload)}>Check in</button>
      </div>

      {lastResult && (
        <div className={`card p-4 flex items-center gap-3 ${lastResult.ok ? 'border-emerald-600' : 'border-red-600'}`}>
          {lastResult.ok ? <CheckCircle2 className="text-emerald-400" /> : <XCircle className="text-red-400" />}
          <p className="text-sm">{lastResult.message}</p>
        </div>
      )}
    </div>
  );
}
