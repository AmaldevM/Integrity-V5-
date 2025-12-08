import React, { useState, useEffect } from 'react';
import { UserProfile, DailyAttendance, PunchRecord } from '../types';
import { getCurrentPosition, getDistanceFromLatLonInMeters } from '../utils';
import { saveDailyAttendance, getDailyAttendance, syncAttendanceToGoogleSheets } from '../services/mockDatabase';
import { Button } from './Button';
import { MapPin, Clock, UploadCloud, AlertOctagon, CheckCircle2, Navigation, ShieldCheck, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AttendancePanelProps {
  user: UserProfile;
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadAttendance();
  }, [user.uid]);

  const loadAttendance = async () => {
    const record = await getDailyAttendance(user.uid, todayStr);
    setAttendance(record);
  };

  const handlePunch = async (type: 'IN' | 'OUT') => {
    setLoading(true);
    setStatusMessage('Acquiring high-accuracy GPS signal...');
    setStatusType('info');

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude, accuracy } = position.coords;

      // Anti-spoofing check 1: Accuracy
      if (accuracy > 1000) { 
        setStatusMessage(`GPS signal too weak (Accuracy: ${Math.round(accuracy)}m). Please move outdoors.`);
        setStatusType('error');
        setLoading(false);
        return;
      }

      // Territory Verification
      let matchedTerritoryId = undefined;
      let matchedTerritoryName = undefined;
      let minDistance = Infinity;

      for (const t of user.territories) {
        if (t.geoLat && t.geoLng && t.geoRadius) {
          const dist = getDistanceFromLatLonInMeters(latitude, longitude, t.geoLat, t.geoLng);
          if (dist <= t.geoRadius) {
            matchedTerritoryId = t.id;
            matchedTerritoryName = t.name;
            break; 
          }
          if (dist < minDistance) minDistance = dist;
        }
      }

      if (type === 'IN') {
        if (!matchedTerritoryId) {
          const msg = minDistance < 10000
            ? `Warning: You are ${Math.round(minDistance)}m away from closest territory.`
            : 'Warning: You are not inside any assigned geofenced territory.';

          setStatusMessage(msg);
          setStatusType('error');
        } else {
          setStatusMessage(`Verified: Inside ${matchedTerritoryName}`);
          setStatusType('success');
        }
      }

      const punch: PunchRecord = {
        id: uuidv4(),
        type,
        timestamp: new Date().toISOString(),
        location: {
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp
        },
        verifiedTerritoryId: matchedTerritoryId,
        verifiedTerritoryName: matchedTerritoryName
      };

      const currentAttendance = attendance || {
        id: `${user.uid}_${todayStr}`,
        userId: user.uid,
        date: todayStr,
        punchIn: null,
        punchOuts: [],
        isSyncedToSheets: false
      };

      const updated = { ...currentAttendance };
      if (type === 'IN') {
        updated.punchIn = punch;
      } else {
        updated.punchOuts = [...updated.punchOuts, punch];
      }

      updated.isSyncedToSheets = false; 

      await saveDailyAttendance(updated);
      setAttendance(updated);

      if (statusType !== 'error') {
        setStatusMessage('Punch recorded. Syncing to cloud...');
      }

      await syncAttendanceToGoogleSheets(updated);
      setAttendance(prev => prev ? { ...prev, isSyncedToSheets: true } : null);

      if (type === 'IN' && matchedTerritoryId) {
        setStatusMessage(`Successfully Punched IN at ${matchedTerritoryName}`);
      } else if (type === 'OUT') {
        setStatusMessage(`Successfully Punched OUT at ${new Date().toLocaleTimeString()}`);
      }

    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || 'Failed to get location.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  if (!attendance) return (
      <div className="animate-pulse bg-[#0F172A]/40 border border-slate-700/50 h-64 rounded-xl flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500">
              <Navigation className="animate-spin" size={20}/> Acquiring GPS Status...
          </div>
      </div>
  );

  return (
    <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden relative">
      {/* Ambient Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900 opacity-10 blur-[80px] pointer-events-none"></div>

      <div className="p-5 border-b border-slate-700/50 flex justify-between items-center relative z-10">
        <h2 className="font-bold text-white flex items-center tracking-tight">
          <MapPin className="mr-2 text-blue-500" size={20} />
          GPS Attendance
        </h2>
        <div className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
            {new Date().toDateString()}
        </div>
      </div>

      <div className="p-6 relative z-10">
        {/* Status HUD Area */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex items-center font-medium border shadow-inner ${
              statusType === 'error' ? 'bg-red-900/20 text-red-200 border-red-900/50' :
              statusType === 'success' ? 'bg-green-900/20 text-green-200 border-green-900/50' :
                'bg-blue-900/20 text-blue-200 border-blue-900/50'
            }`}>
            {statusType === 'error' && <AlertOctagon size={18} className="mr-3 flex-shrink-0" />}
            {statusType === 'success' && <ShieldCheck size={18} className="mr-3 flex-shrink-0" />}
            {statusType === 'info' && <Navigation size={18} className="mr-3 flex-shrink-0 animate-pulse" />}
            {statusMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* PUNCH IN SECTION */}
          <div className="bg-[#020617]/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="text-slate-400 font-bold mb-4 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <Clock size={12} /> Start Day
            </div>
            
            {attendance.punchIn ? (
              <div className="w-full">
                <div className="text-4xl font-bold text-white mb-2 tracking-tighter">
                  {new Date(attendance.punchIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 mb-6">
                  <CheckCircle2 size={12} className="mr-1.5" /> Punched In
                </div>
                
                <div className="text-xs text-left text-slate-400 border-t border-slate-700/50 pt-4 space-y-2 font-mono">
                  <p className="flex justify-between">
                      <span className="text-slate-600">Lat/Lng:</span> 
                      <span>{attendance.punchIn.location.latitude.toFixed(4)}, {attendance.punchIn.location.longitude.toFixed(4)}</span>
                  </p>
                  <p className="flex justify-between items-center">
                      <span className="text-slate-600">Territory:</span>
                      <span className={`px-1.5 py-0.5 rounded ${attendance.punchIn.verifiedTerritoryId ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {attendance.punchIn.verifiedTerritoryName || 'Unverified'}
                      </span>
                  </p>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => handlePunch('IN')}
                disabled={loading}
                className="w-full h-24 text-lg font-bold bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] border-none transition-all hover:scale-[1.02]"
              >
                {loading ? <span className="flex items-center gap-2"><Navigation className="animate-spin"/> Locating...</span> : 'PUNCH IN'}
              </Button>
            )}
          </div>

          {/* PUNCH OUT SECTION */}
          <div className="bg-[#020617]/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="text-slate-400 font-bold mb-4 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                <History size={12} /> End Work / Visit
            </div>

            {!attendance.punchIn ? (
              <div className="text-slate-500 text-sm flex flex-col items-center py-8">
                  <AlertOctagon size={24} className="mb-2 opacity-50"/>
                  You must punch in first.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col">
                <Button
                  variant="danger"
                  onClick={() => handlePunch('OUT')}
                  disabled={loading}
                  className="w-full h-14 mb-4 font-bold tracking-wide shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                >
                  {loading ? 'Locating...' : 'PUNCH OUT'}
                </Button>

                {attendance.punchOuts.length > 0 && (
                  <div className="text-left text-xs text-slate-400 border-t border-slate-700/50 pt-3 mt-auto max-h-32 overflow-y-auto custom-scrollbar">
                    <p className="font-bold text-slate-500 uppercase text-[10px] mb-2 tracking-wider">History Today:</p>
                    {attendance.punchOuts.map((out, idx) => (
                      <div key={out.id} className="flex justify-between py-1.5 border-b border-slate-800 last:border-0 hover:bg-white/5 px-2 rounded transition-colors">
                        <span className="font-mono text-white">{new Date(out.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={out.verifiedTerritoryId ? 'text-green-400' : 'text-slate-500 italic'}>
                          {out.verifiedTerritoryName || 'Unknown Loc'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center text-[10px] font-mono text-slate-500 border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${attendance.isSyncedToSheets ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
            Sync: {attendance.isSyncedToSheets ? 'Cloud Connected' : 'Pending Upload'}
          </div>
          <div className="flex items-center gap-1">
             <Navigation size={10} /> GPS Accuracy &lt; 1000m
          </div>
        </div>
      </div>
    </div>
  );
};