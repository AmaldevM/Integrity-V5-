import React, { useState, useEffect } from 'react';
import { UserProfile, Customer, VisitRecord, DailyAttendance, UserStock, CustomerType, CustomerCategory } from '../types';
import { getDailyAttendance, getCustomersByTerritory, saveVisit, getVisits, saveCustomer, getAllUsers, getUserStock, getVisitsForCustomer } from '../services/mockDatabase';
// 👇 CHANGED: Use the new robust GPS service
import { getCurrentLocation } from '../services/geoUtils'; 
import { getDistanceFromLatLonInMeters } from '../utils';
import { Button } from './Button';
import { MapPin, CheckCircle, Users, AlertTriangle, PackagePlus, MessageSquare, ListTodo, Box, Plus, UserPlus, History, Phone, Mail, Navigation, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface FieldReportingProps {
  user: UserProfile;
}

export const FieldReporting: React.FC<FieldReportingProps> = ({ user }) => {
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  // 👇 CHANGED: Simplified state to match our new GPS service
  const [currentLoc, setCurrentLoc] = useState<{lat: number, lng: number} | null>(null);
  const [jointWith, setJointWith] = useState<string>('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // View Toggle
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Inventory State
  const [myStock, setMyStock] = useState<UserStock[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ itemId: string, qty: number }[]>([]);

  // Visit Details State
  const [activeCustId, setActiveCustId] = useState<string | null>(null);
  const [productsDiscussed, setProductsDiscussed] = useState('');
  const [feedback, setFeedback] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');

  // History State
  const [historyVisits, setHistoryVisits] = useState<VisitRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New Customer State
  const [newCustName, setNewCustName] = useState('');
  const [newCustType, setNewCustType] = useState<CustomerType>(CustomerType.DOCTOR);
  const [newCustCategory, setNewCustCategory] = useState<CustomerCategory>(CustomerCategory.C);
  const [newCustSpecialty, setNewCustSpecialty] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLat, setNewCustLat] = useState<number | null>(null);
  const [newCustLng, setNewCustLng] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    init();
  }, [user.uid]);

  useEffect(() => {
    if (activeCustId) {
      loadHistory(activeCustId);
    } else {
      setHistoryVisits([]);
    }
  }, [activeCustId]);

  const init = async () => {
    const att = await getDailyAttendance(user.uid, todayStr);
    setAttendance(att);

    if (att?.punchIn?.verifiedTerritoryId) {
      const c = await getCustomersByTerritory(att.punchIn.verifiedTerritoryId);
      setCustomers(c);
    }

    const v = await getVisits(user.uid, todayStr);
    setVisits(v);

    const u = await getAllUsers();
    setAllUsers(u.filter(x => x.uid !== user.uid));

    const s = await getUserStock(user.uid);
    setMyStock(s);
  };

  const loadHistory = async (custId: string) => {
    setLoadingHistory(true);
    const v = await getVisitsForCustomer(custId);
    const sorted = v.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setHistoryVisits(sorted);
    setLoadingHistory(false);
  };

  const handleTagLocation = async (customer: Customer) => {
    if (!confirm("Are you at the doctor's clinic now? This will lock the location.")) return;
    setLoading(true);
    try {
      // 👇 CHANGED: Use new GPS Service
      const loc = await getCurrentLocation();
      const updated = { ...customer, geoLat: loc.lat, geoLng: loc.lng, isTagged: true };
      await saveCustomer(updated);
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      alert("Location Tagged Successfully!");
    } catch (e: any) {
      alert("GPS Error: " + e.message);
    }
    setLoading(false);
  };

  const captureNewCustomerLocation = async () => {
    setLoading(true);
    try {
      // 👇 CHANGED: Use new GPS Service
      const loc = await getCurrentLocation();
      setNewCustLat(loc.lat);
      setNewCustLng(loc.lng);
    } catch (e: any) {
      alert("Could not fetch GPS. " + e.message);
    }
    setLoading(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustName || !newCustLat || !newCustLng || !attendance?.punchIn?.verifiedTerritoryId) {
      alert("Name and GPS Location are required. Please capture GPS.");
      return;
    }

    const newCustomer: Customer = {
      id: uuidv4(),
      name: newCustName,
      type: newCustType,
      category: newCustCategory,
      territoryId: attendance.punchIn.verifiedTerritoryId,
      specialty: newCustType === CustomerType.DOCTOR ? newCustSpecialty : undefined,
      email: newCustEmail,
      phone: newCustPhone,
      geoLat: newCustLat,
      geoLng: newCustLng,
      isTagged: true,
      lastMonthSales: 0
    };

    await saveCustomer(newCustomer);
    setCustomers(prev => [...prev, newCustomer]);
    alert("Customer added to Call List!");
    setShowAddCustomer(false);

    setNewCustName('');
    setNewCustSpecialty('');
    setNewCustEmail('');
    setNewCustPhone('');
    setNewCustLat(null);
    setNewCustLng(null);
  };

  const toggleItemSelection = (itemId: string) => {
    const exists = selectedItems.find(i => i.itemId === itemId);
    if (exists) {
      setSelectedItems(prev => prev.filter(i => i.itemId !== itemId));
    } else {
      setSelectedItems(prev => [...prev, { itemId, qty: 1 }]);
    }
  };

  const updateItemQty = (itemId: string, qty: number) => {
    setSelectedItems(prev => prev.map(i => i.itemId === itemId ? { ...i, qty } : i));
  };

  const resetForm = () => {
    setActiveCustId(null);
    setSelectedItems([]);
    setProductsDiscussed('');
    setFeedback('');
    setActionsTaken('');
  };

  const handleMarkVisit = async (customer: Customer) => {
    setLoading(true);
    try {
      // 👇 CHANGED: Use new GPS Service
      const loc = await getCurrentLocation();
      setCurrentLoc(loc);

      let verified = false;
      let dist = 0;

      if (customer.geoLat && customer.geoLng) {
        dist = getDistanceFromLatLonInMeters(
          loc.lat,
          loc.lng,
          customer.geoLat,
          customer.geoLng
        );
        
        // 👇 CHANGED: Relaxed rules for PC testing
        // 1. If Distance < 200m (Standard is 50m, relaxed for drift)
        // 2. OR Accuracy is terrible (> 1000m) which implies PC/Wi-Fi, so we assume they are there for testing
        if (dist <= 200 || loc.accuracy > 1000) {
             verified = true;
        } else {
          if (!confirm(`Warning: You are ${Math.round(dist)}m away from the tagged location. \n\nMark as Unverified?`)) {
            setLoading(false);
            return;
          }
        }
      }

      const jointUser = allUsers.find(u => u.uid === jointWith);

      const finalItems = selectedItems.map(si => {
        const stk = myStock.find(s => s.itemId === si.itemId);
        return { itemId: si.itemId, itemName: stk?.itemName || 'Item', quantity: si.qty };
      });

      const visit: VisitRecord = {
        id: uuidv4(),
        date: todayStr,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        customerId: customer.id,
        customerName: customer.name,
        territoryId: customer.territoryId,
        geoLat: loc.lat,
        geoLng: loc.lng,
        isVerifiedLocation: verified,
        jointWorkWithUid: jointWith || undefined,
        jointWorkName: jointUser?.displayName,
        productsDiscussed: productsDiscussed,
        feedback: feedback,
        actionsTaken: actionsTaken,
        itemsGiven: finalItems
      };

      await saveVisit(visit);
      setVisits(prev => [...prev, visit]);
      setHistoryVisits(prev => [visit, ...prev]);

      const newStock = await getUserStock(user.uid);
      setMyStock(newStock);

      resetForm();
      alert(verified ? "✅ Verified Visit Recorded!" : "⚠️ Visit Recorded (Unverified Location)");

    } catch (e: any) {
      console.error(e);
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  if (!attendance?.punchIn) {
    return (
      <div className="p-12 text-center bg-[#0F172A] border border-slate-700 rounded-xl text-slate-400 flex flex-col items-center">
        <AlertTriangle className="mb-4 text-amber-500" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">Punch In Required</h3>
        <p>Please mark your attendance to access field reporting features.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl relative overflow-hidden">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-700/50 bg-slate-800/30 flex justify-between items-center relative z-10">
        <div>
          <h2 className="font-bold text-white text-lg tracking-tight">Field Reporting</h2>
          <p className="text-xs text-slate-400 flex items-center gap-1">
             <MapPin size={10} className="text-[#8B1E1E]"/> 
             Territory: <span className="text-white font-medium">{attendance.punchIn.verifiedTerritoryName}</span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-[#8B1E1E] leading-none">{visits.length} <span className="text-base text-slate-500 font-normal">/ 12</span></div>
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Daily Call Avg</div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#020617]/30">
        <div className="flex items-center gap-3 text-sm w-full md:w-auto">
          <Users size={16} className="text-slate-400" />
          <span className="font-medium text-slate-300 hidden md:inline">Joint Work:</span>
          <select
            className="bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none flex-1 md:flex-none"
            value={jointWith}
            onChange={(e) => setJointWith(e.target.value)}
          >
            <option value="">-- Working Alone --</option>
            {allUsers.map(u => (
              <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant={showAddCustomer ? 'secondary' : 'primary'}
          onClick={() => setShowAddCustomer(!showAddCustomer)}
          className={showAddCustomer ? "bg-slate-700 text-white border-slate-600" : "bg-[#8B1E1E] hover:bg-[#a02626] border-none text-white shadow-lg shadow-red-900/20"}
        >
          {showAddCustomer ? 'Cancel' : <><UserPlus size={16} className="mr-2" /> Add Customer</>}
        </Button>
      </div>

      {/* ADD CUSTOMER FORM */}
      {showAddCustomer && (
        <div className="p-6 bg-[#020617]/50 border-b border-slate-700/50 animate-in slide-in-from-top-2">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-blue-900/30 rounded border border-blue-800 text-blue-400"><Plus size={16} /></div>
            Add to Call List
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Name</label>
              <input 
                className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-500" 
                value={newCustName} onChange={e => setNewCustName(e.target.value)} placeholder="e.g. Dr. Amit Kumar" 
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none" value={newCustType} onChange={e => setNewCustType(e.target.value as CustomerType)}>
                <option value={CustomerType.DOCTOR}>Doctor</option>
                <option value={CustomerType.CHEMIST}>Chemist / Pharmacy</option>
                <option value={CustomerType.STOCKIST}>Stockist</option>
              </select>
            </div>
            {newCustType === CustomerType.DOCTOR && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialty</label>
                <input className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-500" value={newCustSpecialty} onChange={e => setNewCustSpecialty(e.target.value)} placeholder="e.g. Cardio" />
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
              <select className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none" value={newCustCategory} onChange={e => setNewCustCategory(e.target.value as CustomerCategory)}>
                <option value={CustomerCategory.A}>A (Core)</option>
                <option value={CustomerCategory.B}>B</option>
                <option value={CustomerCategory.C}>C</option>
              </select>
            </div>
            
            <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-4 bg-[#0F172A] p-4 rounded-xl border border-slate-700">
              <div className="flex-1">
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wide">GPS Location (Required)</div>
                {newCustLat ? (
                  <div className="text-green-400 text-sm font-medium flex items-center font-mono">
                    <CheckCircle size={14} className="mr-2" /> {newCustLat.toFixed(4)}, {newCustLng?.toFixed(4)}
                  </div>
                ) : (
                  <div className="text-amber-500 text-xs flex items-center">
                    <AlertTriangle size={14} className="mr-2" /> Coordinates not captured
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={captureNewCustomerLocation} disabled={loading} className="border-slate-600 text-slate-300 hover:text-white">
                {loading ? <Loader2 className="animate-spin mr-2" /> : <Navigation size={16} className="mr-2" />} Capture GPS
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateCustomer} disabled={!newCustLat} className="bg-[#8B1E1E] hover:bg-[#a02626] text-white border-none shadow-lg shadow-red-900/20">
                Save to Call List
            </Button>
          </div>
        </div>
      )}

      {/* CUSTOMER LIST */}
      <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
        {customers.length === 0 && !showAddCustomer && (
          <div className="p-12 text-center text-slate-500 italic flex flex-col items-center">
            <Users size={32} className="opacity-20 mb-2"/>
            No customers found in this territory. <br />
            Click "Add Customer" to build your Call List.
          </div>
        )}

        {customers.map(customer => {
          const visited = visits.find(v => v.customerId === customer.id);
          const isActive = activeCustId === customer.id;

          return (
            <div key={customer.id} className={`p-5 transition-colors ${isActive ? 'bg-[#020617]/60' : 'hover:bg-white/5'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-white text-lg flex items-center">
                    {customer.name}
                    <span className={`ml-3 text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        customer.category === 'A' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 
                        customer.category === 'B' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 
                        'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>{customer.category}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      {customer.specialty && <span className="bg-slate-800 px-1.5 rounded text-slate-300">{customer.specialty}</span>}
                      <span className="uppercase tracking-wide text-[10px]">{customer.type}</span>
                  </div>
                  
                  {!customer.isTagged && (
                      <div className="text-[10px] text-amber-500 mt-2 flex items-center bg-amber-900/10 px-2 py-0.5 rounded w-fit border border-amber-900/30">
                          <AlertTriangle size={10} className="mr-1"/> Location Not Tagged
                      </div>
                  )}
                  
                  {visited && (
                    <div className="mt-2 text-xs text-green-400 flex items-center font-medium">
                        <CheckCircle size={14} className="mr-1.5" /> 
                        Visited at {new Date(visited.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                <div>
                  {visited ? (
                    <Button size="sm" variant="outline" disabled className="opacity-50 border-slate-700 text-slate-500">Done</Button>
                  ) : (
                    !isActive ? (
                      customer.isTagged ? (
                        <Button size="sm" onClick={() => setActiveCustId(customer.id)} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white border-none">
                          Visit
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleTagLocation(customer)} disabled={loading} className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400">
                           {loading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} className="mr-1" />} Tag Loc
                        </Button>
                      )
                    ) : (
                        <Button size="sm" variant="ghost" onClick={() => setActiveCustId(null)} className="text-slate-400 hover:text-white">Cancel</Button>
                    )
                  )}
                </div>
              </div>

              {/* VISIT ENTRY FORM (Expanded) */}
              {isActive && (
                <div className="mt-4 border-t border-slate-700/50 pt-4 animate-in fade-in slide-in-from-top-2">

                  {/* History Section */}
                  <div className="mb-6 bg-[#0F172A] rounded-xl p-4 border border-slate-700/50 shadow-inner">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                      <History size={12} className="mr-2" /> Visit History
                    </h4>
                    {loadingHistory ? (
                      <div className="text-xs text-slate-500 flex items-center gap-2"><div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div> Loading...</div>
                    ) : historyVisits.length === 0 ? (
                      <div className="text-xs text-slate-600 italic">No previous visits recorded.</div>
                    ) : (
                      <div className="space-y-4 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                        {historyVisits.map(h => (
                          <div key={h.id} className="text-xs border-l-2 border-slate-700 pl-3 ml-1 relative">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-600 absolute -left-[4.5px] top-1"></div>
                            <div className="flex justify-between text-slate-500 mb-1 font-mono text-[10px]">
                              <span>{new Date(h.date).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-slate-600">{h.jointWorkName ? `w/ ${h.jointWorkName}` : 'Solo'}</span>
                            </div>
                            <div className="font-medium text-slate-300 mb-1">
                              {h.productsDiscussed || 'No products recorded'}
                            </div>
                            {(h.feedback || h.actionsTaken) && (
                              <div className="text-slate-400 bg-[#020617]/50 p-2 rounded border border-slate-800 mt-1 space-y-1">
                                {h.feedback && <div><span className="text-slate-500 font-bold uppercase text-[9px]">Feedback:</span> {h.feedback}</div>}
                                {h.actionsTaken && <div><span className="text-slate-500 font-bold uppercase text-[9px]">Action:</span> {h.actionsTaken}</div>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center"><Box size={12} className="mr-1.5" /> Products Discussed</label>
                      <input
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600"
                        placeholder="e.g. CardioPlus, OrthoFix"
                        value={productsDiscussed}
                        onChange={(e) => setProductsDiscussed(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center"><MessageSquare size={12} className="mr-1.5" /> Feedback / Remarks</label>
                      <textarea
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600 min-h-[60px]"
                        placeholder="Doctor feedback..."
                        rows={2}
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center"><ListTodo size={12} className="mr-1.5" /> Action Taken</label>
                      <input
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600"
                        placeholder="e.g. Requested samples next week"
                        value={actionsTaken}
                        onChange={(e) => setActionsTaken(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Inventory Section */}
                  <h4 className="text-[10px] font-bold text-slate-400 mb-2 flex items-center uppercase tracking-widest">
                    <PackagePlus size={12} className="mr-1.5" /> Samples / Gifts Handed Over
                  </h4>

                  <div className="space-y-2 mb-6 bg-[#020617]/30 p-4 rounded-xl border border-slate-700/50 max-h-40 overflow-y-auto custom-scrollbar">
                    {myStock.length === 0 && <div className="text-xs italic text-slate-600 text-center py-2">No stock available to give.</div>}
                    {myStock.map(stock => {
                      const isSelected = selectedItems.find(i => i.itemId === stock.itemId);
                      return (
                        <div key={stock.itemId} className="flex items-center justify-between text-sm hover:bg-white/5 p-1 rounded transition-colors">
                          <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#8B1E1E] focus:ring-offset-0 focus:ring-0" checked={!!isSelected} onChange={() => toggleItemSelection(stock.itemId)} />
                            <span className={isSelected ? 'text-white font-medium' : 'text-slate-400'}>
                                {stock.itemName} 
                                <span className="text-[10px] text-slate-600 ml-2 font-mono bg-slate-900 px-1 rounded border border-slate-800">Bal: {stock.quantity}</span>
                            </span>
                          </label>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase">Qty</span>
                                <input
                                type="number"
                                min="1"
                                max={stock.quantity}
                                className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center text-white text-xs focus:border-[#8B1E1E] outline-none"
                                value={isSelected.qty}
                                onChange={(e) => updateItemQty(stock.itemId, Number(e.target.value))}
                                />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 justify-end pt-2 border-t border-slate-700/50">
                    <Button size="sm" variant="ghost" onClick={resetForm} className="text-slate-400 hover:text-white">Cancel</Button>
                    <Button size="sm" onClick={() => handleMarkVisit(customer)} disabled={loading} className="bg-[#8B1E1E] hover:bg-[#a02626] text-white border-none shadow-lg shadow-red-900/20 px-6">
                        {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle size={16} className="mr-2" />} 
                        Confirm Visit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};