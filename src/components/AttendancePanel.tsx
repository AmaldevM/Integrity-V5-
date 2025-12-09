import React, { useState, useEffect } from 'react';
import { UserProfile, DailyAttendance, PunchRecord } from '../types';
import { getCurrentLocation } from '../services/geoUtils';
import { getDistanceFromLatLonInMeters } from '../utils';
import { saveDailyAttendance, getDailyAttendance, syncAttendanceToGoogleSheets } from '../services/mockDatabase';
import { Button } from './Button';
import { MapPin, Clock, AlertOctagon, CheckCircle2, Navigation, ShieldCheck, History, Loader2, Map as MapIcon, Compass } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AttendancePanelProps {
  user: UserProfile;
}

export const AttendancePanel: React.FC<AttendancePanelProps> = ({ user }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [attendance, setAttendance] = useState<DailyAttendance>({
    id: `${user.uid}_${todayStr}`,
    userId: user.uid,
    date: todayStr,
    punchIn: null,
    punchOuts: [],
    isSyncedToSheets: false
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info');

  // New State for Map & Address
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [mapUrl, setMapUrl] = useState<string>('');
  const [nearbyTerritories, setNearbyTerritories] = useState<any[]>([]);

  useEffect(() => {
    loadAttendance();
  }, [user.uid]);

  const loadAttendance = async () => {
    try {
      const record = await getDailyAttendance(user.uid, todayStr);
      if (record) setAttendance(record);

      // If already punched in, load the address for that location
      if (record?.punchIn?.location) {
        const { latitude, longitude } = record.punchIn.location;
        fetchAddress(latitude, longitude);
        generateMapPreview(latitude, longitude);
      }
    } catch (e) {
      console.warn("Starting fresh attendance.");
    }
  };

  // Convert Coords to Human Address (Reverse Geocoding)
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        // Simplify the address (first 3 parts)
        const parts = data.display_name.split(',').slice(0, 3).join(',');
        setCurrentAddress(parts);
      }
    } catch (error) {
      setCurrentAddress("Address unavailable (Offline)");
    }
  };

  const generateMapPreview = (lat: number, lng: number) => {
    // Create an OpenStreetMap Embed URL
    const bbox = `${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}`;
    setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`);
  };

  const handlePunch = async (type: 'IN' | 'OUT') => {
    setLoading(true);
    setStatusMessage('Acquiring GPS & Map data...');
    setStatusType('info');

    try {
      // 1. Get GPS
      const loc = await getCurrentLocation();
      const { lat, lng, accuracy } = loc;

      // 2. Update Visuals (Map & Address)
      fetchAddress(lat, lng);
      generateMapPreview(lat, lng);

      // 3. Accuracy Check
      if (accuracy > 200000) { // Keep your PC testing limit for now
        setStatusMessage(`Weak GPS Signal (${Math.round(accuracy)}m). Move outdoors.`);
        setStatusType('error');
        setLoading(false);
        return;
      }

      // 4. Territory Logic & Nearby Highlights
      let matchedTerritoryId = undefined;
      let matchedTerritoryName = undefined;

      // Calculate distances to ALL territories to find "Nearby" ones
      const territoriesWithDist = (user.territories || []).map(t => {
        if (!t.geoLat || !t.geoLng) return { ...t, distance: Infinity };
        return {
          ...t,
          distance: getDistanceFromLatLonInMeters(lat, lng, t.geoLat, t.geoLng)
        };
      }).sort((a, b) => a.distance - b.distance); // Sort by closest

      // Check if inside the closest one
      if (territoriesWithDist.length > 0) {
        const closest = territoriesWithDist[0];
        if (closest.distance <= (closest.geoRadius || 2000)) {
          matchedTerritoryId = closest.id;
          matchedTerritoryName = closest.name;
        }
        // Save the top 2 nearby for display
        setNearbyTerritories(territoriesWithDist.slice(0, 2));
      }

      if (type === 'IN') {
        if (!matchedTerritoryId) {
          setStatusMessage('Warning: You are outside your assigned territory.');
          setStatusType('info');
        } else {
          setStatusMessage(`Verified: Inside ${matchedTerritoryName}`);
          setStatusType('success');
        }
      }

      // 5. Create & Save Record
      const punch: PunchRecord = {
        id: uuidv4(),
        type,
        timestamp: new Date().toISOString(),
        location: { latitude: lat, longitude: lng, accuracy, timestamp: Date.now() },
        verifiedTerritoryId: matchedTerritoryId,
        verifiedTerritoryName: matchedTerritoryName
      };

      const updated = { ...attendance };
      if (type === 'IN') updated.punchIn = punch;
      else updated.punchOuts = [...updated.punchOuts, punch];

      updated.isSyncedToSheets = false;

      setAttendance(updated);
      await saveDailyAttendance(updated);
      await syncAttendanceToGoogleSheets(updated);
      setAttendance(prev => ({ ...prev, isSyncedToSheets: true }));

    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || 'GPS Error.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden relative">

      {/* Header */}
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

        {/* NEW: MAP & LOCATION HIGHLIGHTS CARD */}
        {(mapUrl || loading) && (
          <div className="mb-6 bg-slate-900/50 rounded-xl overflow-hidden border border-slate-700 relative">
            {loading && !mapUrl ? (
              <div className="h-32 flex items-center justify-center text-slate-500 gap-2">
                <Loader2 className="animate-spin" /> Locating you on map...
              </div>
            ) : (
              <>
                {/* Map Iframe */}
                <iframe
                  width="100%"
                  height="160"
                  frameBorder="0"
                  scrolling="no"
                  src={mapUrl}
                  className="opacity-80 grayscale hover:grayscale-0 transition-all"
                ></iframe>

                {/* Address Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3">
                  <div className="flex items-start gap-2">
                    <MapIcon size={16} className="text-[#8B1E1E] mt-1 shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Location</div>
                      <div className="text-sm text-white font-medium leading-tight">
                        {currentAddress || 'Fetching address...'}
                      </div>
                      {/* Coordinates */}
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {attendance.punchIn?.location.latitude.toFixed(5)}, {attendance.punchIn?.location.longitude.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* NEARBY TERRITORIES HIGHLIGHTS */}
        {nearbyTerritories.length > 0 && !attendance.punchIn?.verifiedTerritoryId && (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {nearbyTerritories.map(t => (
              <div key={t.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 min-w-[140px] flex items-center gap-2">
                <Compass size={14} className="text-blue-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Nearby</div>
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{Math.round(t.distance / 1000)} km away</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex items-center font-medium border shadow-inner ${statusType === 'error' ? 'bg-red-900/20 text-red-200 border-red-900/50' :
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
          {/* PUNCH IN BUTTON */}
          <div className="bg-[#020617]/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="text-slate-400 font-bold mb-4 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
              <Clock size={12} /> Start Day
            </div>

            {attendance.punchIn ? (
              <div className="w-full">
                <div className="text-4xl font-bold text-white mb-2 tracking-tighter">
                  {new Date(attendance.punchIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 border border-green-500/30 mb-2">
                  <CheckCircle2 size={12} className="mr-1.5" /> Punched In
                </div>
              </div>
            ) : (
              <Button
                onClick={() => handlePunch('IN')}
                disabled={loading}
                className="w-full h-24 text-lg font-bold bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] border-none transition-all hover:scale-[1.02]"
              >
                {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Locating...</span> : 'PUNCH IN'}
              </Button>
            )}
          </div>

          {/* PUNCH OUT BUTTON */}
          <div className="bg-[#020617]/50 border border-slate-700/50 rounded-xl p-6 flex flex-col items-center justify-center text-center shadow-lg">
            <div className="text-slate-400 font-bold mb-4 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
              <History size={12} /> End Work
            </div>

            {!attendance.punchIn ? (
              <div className="text-slate-500 text-sm flex flex-col items-center py-8">
                <AlertOctagon size={24} className="mb-2 opacity-50" />
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

                {/* Simplified History for space */}
                {attendance.punchOuts.length > 0 && (
                  <div className="text-xs text-slate-400 border-t border-slate-700/50 pt-3 mt-auto">
                    <span className="font-bold uppercase text-[9px]">Last Out:</span> {new Date(attendance.punchOuts[attendance.punchOuts.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};