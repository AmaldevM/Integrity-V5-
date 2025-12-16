import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, SalesTarget, Customer } from '../types';
import { getAllUsers, getSalesTarget, setSalesTarget, getCustomersByTerritory, updateCustomerSales, getDashboardStats, getAllAttendance } from '../services/mockDatabase';
import { getDownstreamUserIds } from '../utils';
import { Button } from './Button';
import { BarChart3, TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, CalendarRange, Clock, Phone, Target, User, Search, MapPin, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ManagerDashboardProps {
  user: UserProfile;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user }) => {
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [targets, setTargets] = useState<Record<string, SalesTarget>>({});
  const [stats, setStats] = useState<Record<string, any>>({});
  const [teamStatus, setTeamStatus] = useState<any[]>([]);

  // Aggregate State
  const [totalTarget, setTotalTarget] = useState(0);
  const [totalAchieved, setTotalAchieved] = useState(0);
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Sales Input State
  const [selectedMR, setSelectedMR] = useState('');
  const [mrCustomers, setMrCustomers] = useState<Customer[]>([]);
  const [selectedCust, setSelectedCust] = useState('');
  const [salesAmount, setSalesAmount] = useState(0);

  // Quarterly Target State
  const [targetUser, setTargetUser] = useState('');
  const [targetQuarter, setTargetQuarter] = useState('Q1');
  const [quarterAmount, setQuarterAmount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [user.uid]);

  const loadTeamData = async () => {
    setLoading(true);
    const all = await getAllUsers();
    let members: UserProfile[] = [];

    if (user.role === UserRole.ADMIN) {
      members = all.filter(u => u.role !== UserRole.ADMIN);
    } else {
      const subordinateIds = getDownstreamUserIds(user.uid, all);
      members = all.filter(u => subordinateIds.includes(u.uid));
    }

    setTeam(members);

    const now = new Date();
    const tMap: Record<string, SalesTarget> = {};
    const statsMap: Record<string, any> = {};
    let tTarget = 0;
    let tAchieved = 0;

    for (const m of members) {
      const t = await getSalesTarget(m.uid, now.getMonth(), now.getFullYear());
      if (t) {
        tMap[m.uid] = t;
        tTarget += t.targetAmount;
        tAchieved += t.achievedAmount;
      }
      const s = await getDashboardStats(m.uid);
      statsMap[m.uid] = s;
    }
    setTargets(tMap);
    setStats(statsMap);
    setTotalTarget(tTarget);
    setTotalAchieved(tAchieved);

    // Load Live Status
    const dStats = await getDashboardStats(user.uid);
    setDashboardStats(dStats);

    const todayStr = new Date().toISOString().split('T')[0];
    const allAtt = await getAllAttendance();
    const todaysPunches = allAtt.filter(a => a.date === todayStr);

    const staffStatus = members
      .filter(u => u.role === UserRole.MR || u.role === UserRole.ASM)
      .map(u => {
        const att = todaysPunches.find(a => a.userId === u.uid);
        let status = 'ABSENT';
        let location = 'Not Started';
        let lastActive = null;

        if (att?.punchIn) {
          status = att.punchOuts.length > 0 ? 'COMPLETED' : 'WORKING';
          location = att.punchIn.verifiedTerritoryName || 'Field';
          lastActive = att.punchIn.timestamp;
        }

        return {
          uid: u.uid,
          name: u.displayName,
          role: u.role,
          status,
          location,
          lastActive
        };
      });
    setTeamStatus(staffStatus);
    setLoading(false);
  };

  const handleFetchCustomers = async (mrId: string) => {
    setSelectedMR(mrId);
    const mr = team.find(u => u.uid === mrId);
    if (mr && mr.territories.length > 0) {
      const c = await getCustomersByTerritory(mr.territories[0].id);
      setMrCustomers(c);
    } else {
      setMrCustomers([]);
    }
  };

  const handleUpdateSales = async () => {
    if (!selectedCust || salesAmount < 0) return;
    await updateCustomerSales(selectedCust, salesAmount);

    const tgt = targets[selectedMR];
    if (tgt) {
      const newAchieved = tgt.achievedAmount + salesAmount;
      const updatedTgt = { ...tgt, achievedAmount: newAchieved };
      await setSalesTarget(updatedTgt);
      setTargets(prev => ({ ...prev, [selectedMR]: updatedTgt }));
    } else {
      const now = new Date();
      const newTgt = {
        id: 'new', userId: selectedMR, month: now.getMonth(), year: now.getFullYear(),
        targetAmount: 200000, achievedAmount: salesAmount
      };
      await setSalesTarget(newTgt);
      setTargets(prev => ({ ...prev, [selectedMR]: newTgt }));
    }
    setTotalAchieved(prev => prev + salesAmount);
    alert("Sales Recorded!");
    setSalesAmount(0);
  };

  const handleSetQuarterlyTarget = async () => {
    if (!targetUser || !targetQuarter || quarterAmount <= 0) return;
    const monthlyAmount = Math.floor(quarterAmount / 3);
    const year = new Date().getFullYear();
    let startMonth = 0;
    if (targetQuarter === 'Q1') startMonth = 0;
    if (targetQuarter === 'Q2') startMonth = 3;
    if (targetQuarter === 'Q3') startMonth = 6;
    if (targetQuarter === 'Q4') startMonth = 9;

    for (let i = 0; i < 3; i++) {
      const month = startMonth + i;
      const existing = await getSalesTarget(targetUser, month, year);
      const newTgt: SalesTarget = {
        id: existing ? existing.id : `tgt_${targetUser}_${month}`,
        userId: targetUser,
        month,
        year,
        targetAmount: monthlyAmount,
        achievedAmount: existing ? existing.achievedAmount : 0
      };
      await setSalesTarget(newTgt);
    }
    alert(`Target set for ${targetQuarter}!`);
    setQuarterAmount(0);
    loadTeamData();
  };

  const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
  const isPositive = overallPct >= 80;

  if (loading) return <div className="p-12 text-center text-slate-500">Loading Dashboard...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex justify-between items-center bg-[#0F172A]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B1E1E] opacity-10 blur-[80px] pointer-events-none"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white flex items-center tracking-tight">
            <PieChart className="mr-3 text-[#8B1E1E]" />
            Command Center
          </h2>
          <p className="text-sm text-slate-400 mt-1">Real-time overview of field force and sales.</p>
        </div>
      </div>

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={64} className="text-green-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-white">₹{(totalAchieved / 100000).toFixed(1)}L</div>
          <div className="flex items-center text-green-400 text-xs mt-2">
            <ArrowUpRight size={12} className="mr-1" /> Target: ₹{(totalTarget / 100000).toFixed(1)}L
          </div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users size={64} className="text-blue-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Active Field Force</div>
          <div className="text-3xl font-bold text-white">
            {teamStatus.filter(t => t.status === 'WORKING').length} <span className="text-lg text-slate-500 font-normal">/ {teamStatus.length}</span>
          </div>
          <div className="flex items-center text-blue-400 text-xs mt-2">
            <CheckCircle size={12} className="mr-1" /> Live Now
          </div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle size={64} className="text-amber-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Pending Actions</div>
          <div className="text-3xl font-bold text-white">{dashboardStats?.pendingApprovals || 0}</div>
          <div className="text-amber-400 text-xs mt-2">Requires attention</div>
        </div>

        <div className="bg-[#0F172A] p-5 rounded-2xl border border-slate-800 shadow-lg relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <MapPin size={64} className="text-purple-500" />
          </div>
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Avg Daily Calls</div>
          <div className="text-3xl font-bold text-white">{dashboardStats?.avgCalls || 0}</div>
          <div className="flex items-center text-purple-400 text-xs mt-2">
            Target: 12 calls/day
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 2. Live Team Status Table */}
        <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[500px]">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Field Status
            </h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-semibold sticky top-0">
                <tr>
                  <th className="p-4">Employee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Last Location</th>
                  <th className="p-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {teamStatus.map((staff) => (
                  <tr key={staff.uid} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{staff.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{staff.role}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold border ${staff.status === 'WORKING' ? 'bg-green-900/30 text-green-400 border-green-800' :
                          staff.status === 'COMPLETED' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                            'bg-slate-800 text-slate-500 border-slate-700'
                        }`}>
                        {staff.status === 'WORKING' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>}
                        {staff.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 flex items-center gap-2">
                      <MapPin size={14} className="text-slate-500" /> {staff.location}
                    </td>
                    <td className="p-4 text-right text-slate-400 font-mono text-xs">
                      {staff.lastActive ? new Date(staff.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
                {teamStatus.length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">No field staff found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Performance Chart */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl shadow-xl p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BarChart3 className="text-[#8B1E1E]" size={18} /> Sales vs Target
            </h3>
            <p className="text-xs text-slate-400">Team Performance Breakdown</p>
          </div>

          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={team.slice(0, 5).map(m => ({ // Show top 5 to fit
                  name: m.displayName.split(' ')[0],
                  Target: targets[m.uid]?.targetAmount || 0,
                  Achieved: targets[m.uid]?.achievedAmount || 0
                }))}
                margin={{ top: 20, right: 0, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={{ stroke: '#334155' }} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="Target" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Achieved" fill="#8B1E1E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. Sales Input & Targets (Admin Only Area) */}
      {(user.role === UserRole.ADMIN || user.role === UserRole.ZM) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sales Recording */}
          <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <h2 className="text-sm font-bold text-slate-400 flex items-center mb-6 uppercase tracking-widest border-b border-slate-700/50 pb-4">
              <DollarSign className="mr-2 text-[#8B1E1E]" size={16} /> Record Sales
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">MR</label>
                  <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-[#8B1E1E] outline-none"
                    value={selectedMR} onChange={e => handleFetchCustomers(e.target.value)}>
                    <option value="">Select MR</option>
                    {team.filter(t => t.role === UserRole.MR).map(t => (<option key={t.uid} value={t.uid}>{t.displayName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer</label>
                  <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-[#8B1E1E] outline-none"
                    value={selectedCust} onChange={e => setSelectedCust(e.target.value)} disabled={!selectedMR}>
                    <option value="">Select Customer</option>
                    {mrCustomers.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (₹)</label>
                <input type="number" className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-[#8B1E1E] outline-none"
                  value={salesAmount} onChange={e => setSalesAmount(Number(e.target.value))} />
              </div>
              <Button onClick={handleUpdateSales} disabled={!selectedCust} className="w-full bg-[#8B1E1E] hover:bg-[#a02626] text-white border-none">Submit Sales Record</Button>
            </div>
          </div>

          {/* Target Setting */}
          <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 p-6">
            <h2 className="text-sm font-bold text-slate-400 flex items-center mb-6 uppercase tracking-widest border-b border-slate-700/50 pb-4">
              <Target className="mr-2 text-indigo-500" size={16} /> Set Targets
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Employee</label>
                  <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                    value={targetUser} onChange={e => setTargetUser(e.target.value)}>
                    <option value="">Select</option>
                    {team.map(t => (<option key={t.uid} value={t.uid}>{t.displayName}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quarter</label>
                  <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                    value={targetQuarter} onChange={e => setTargetQuarter(e.target.value)}>
                    <option value="Q1">Q1 (Jan-Mar)</option>
                    <option value="Q2">Q2 (Apr-Jun)</option>
                    <option value="Q3">Q3 (Jul-Sep)</option>
                    <option value="Q4">Q4 (Oct-Dec)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Target Amount (₹)</label>
                <input type="number" className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                  value={quarterAmount} onChange={e => setQuarterAmount(Number(e.target.value))} />
              </div>
              <Button onClick={handleSetQuarterlyTarget} disabled={!targetUser || quarterAmount <= 0} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white border-none">Set Quarterly Target</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};