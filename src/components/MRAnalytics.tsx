import React, { useEffect, useState } from 'react';
import { getVisits, getDailyAttendance, getUserStock, getAllAttendance } from '../services/mockDatabase';
import { VisitRecord, UserStock, DailyAttendance } from '../types';
import { Users, Package, CalendarCheck, TrendingUp, AlertCircle, MapPin } from 'lucide-react';

export const MRAnalytics = () => {
  const [stats, setStats] = useState({
    callCount: 0,
    doctorsMet: 0,
    chemistsMet: 0,
    stockistsMet: 0,
    samplesGiven: 0,
    workingDays: 0,
    lastPunchTime: '',
    currentTerritory: ''
  });

  const [stockSummary, setStockSummary] = useState<UserStock[]>([]);
  const [loading, setLoading] = useState(true);

  // We assume the logged-in user ID is passed or retrieved. 
  // For this component, we'll fetch 'mr1' or use a prop in a real scenario.
  // Ideally, pass 'user' as a prop. For now, we fetch generic data for demo.
  const userId = 'mr1';
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    // 1. Get Today's Visits
    const visits = await getVisits(userId, todayStr);

    // 2. Get Attendance to calculate Working Days (Month)
    const allAtt = await getAllAttendance(); // In real app, filter by Month & User
    const myAtt = allAtt.filter(a => a.userId === userId);

    // 3. Get Current Day Status
    const todayAtt = await getDailyAttendance(userId, todayStr);

    // 4. Get Stock
    const stock = await getUserStock(userId);

    // Calculations
    const doctors = visits.filter(v => !v.customerName.includes('Chemist') && !v.customerName.includes('Stockist')).length; // Rough logic
    const chemists = visits.filter(v => v.customerName.includes('Chemist')).length;

    // Calculate total samples given today
    const samples = visits.reduce((total, visit) => {
      return total + (visit.itemsGiven ? visit.itemsGiven.reduce((t, i) => t + i.quantity, 0) : 0);
    }, 0);

    setStats({
      callCount: visits.length,
      doctorsMet: doctors,
      chemistsMet: chemists,
      stockistsMet: 0,
      samplesGiven: samples,
      workingDays: myAtt.length,
      lastPunchTime: todayAtt?.punchIn?.timestamp ? new Date(todayAtt.punchIn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      currentTerritory: todayAtt?.punchIn?.verifiedTerritoryName || 'Not Started'
    });

    setStockSummary(stock.slice(0, 3)); // Top 3 items
    setLoading(false);
  };

  if (loading) return <div className="p-4 text-center text-slate-500 text-xs">Loading Analytics...</div>;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* 1. DAILY HIGHLIGHTS ROW */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calls Today */}
        <div className="bg-[#0F172A]/80 border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={40} className="text-blue-500" />
          </div>
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Calls Today</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.callCount}</div>
          <div className="text-[10px] text-blue-400 mt-1 flex items-center">
            <TrendingUp size={10} className="mr-1" /> Target: 12
          </div>
        </div>

        {/* Working Days */}
        <div className="bg-[#0F172A]/80 border border-slate-700/50 p-4 rounded-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 p-3 opacity-10">
            <CalendarCheck size={40} className="text-green-500" />
          </div>
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Working Days</div>
          <div className="text-3xl font-bold text-white mt-1">{stats.workingDays}</div>
          <div className="text-[10px] text-green-400 mt-1">
            Month: {new Date().toLocaleString('default', { month: 'short' })}
          </div>
        </div>
      </div>

      {/* 2. CURRENT STATUS CARD */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 flex justify-between items-center shadow-lg">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Current Status</div>
          <div className="flex items-center text-white font-medium">
            <MapPin size={16} className="text-[#8B1E1E] mr-2" />
            {stats.currentTerritory}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Punch In</div>
          <div className="text-xl font-mono text-white">{stats.lastPunchTime}</div>
        </div>
      </div>

      {/* 3. STOCK SUMMARY */}
      <div className="bg-[#0F172A]/80 border border-slate-700/50 rounded-2xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center">
            <Package size={14} className="mr-2 text-purple-400" /> Inventory Snapshot
          </h3>
          <span className="text-[10px] bg-purple-900/20 text-purple-300 px-2 py-0.5 rounded border border-purple-800">
            Given Today: {stats.samplesGiven}
          </span>
        </div>

        <div className="space-y-3">
          {stockSummary.length === 0 ? (
            <div className="text-xs text-slate-500 italic">No stock data available.</div>
          ) : (
            stockSummary.map(item => (
              <div key={item.itemId}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{item.itemName}</span>
                  <span className={item.quantity < 10 ? "text-red-400 font-bold" : "text-white"}>{item.quantity} left</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.quantity < 10 ? 'bg-red-500' : 'bg-purple-500'}`}
                    style={{ width: `${Math.min(100, (item.quantity / 50) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};