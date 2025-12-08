import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, Customer, CustomerType, CustomerCategory } from '../types';
import { getAllUsers, getAllCustomers, getAllVisits, saveCustomer, getAllAttendance } from '../services/mockDatabase';
import { Button } from './Button';
import { Download, Plus, MapPin, Database, FileSpreadsheet, Upload, Search, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const ClientManagement: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedMrId, setSelectedMrId] = useState('');
  const [selectedTerritoryId, setSelectedTerritoryId] = useState('');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  // New Client Form
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomerType>(CustomerType.DOCTOR);
  const [category, setCategory] = useState<CustomerCategory>(CustomerCategory.C);
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [selectedMrId, selectedTerritoryId, customers]);

  const loadData = async () => {
    const u = await getAllUsers();
    setUsers(u.filter(user => user.role === UserRole.MR));
    const c = await getAllCustomers();
    setCustomers(c);
  };

  const filterCustomers = () => {
    let filtered = customers;

    if (selectedMrId) {
      const mr = users.find(u => u.uid === selectedMrId);
      if (mr) {
        const tIds = mr.territories.map(t => t.id);
        filtered = filtered.filter(c => tIds.includes(c.territoryId));
      }
    }

    if (selectedTerritoryId) {
      filtered = filtered.filter(c => c.territoryId === selectedTerritoryId);
    }

    setFilteredCustomers(filtered);
  };

  const handleSaveClient = async () => {
    if (!selectedTerritoryId) {
      alert("Please select a Territory first.");
      return;
    }
    if (!name || !lat || !lng) {
      alert("Name, Latitude, and Longitude are required.");
      return;
    }

    const newClient: Customer = {
      id: uuidv4(),
      name,
      type,
      category,
      territoryId: selectedTerritoryId,
      specialty: type === CustomerType.DOCTOR ? specialty : undefined,
      email,
      phone,
      geoLat: parseFloat(lat),
      geoLng: parseFloat(lng),
      isTagged: true,
      lastMonthSales: 0
    };

    await saveCustomer(newClient);
    setCustomers(prev => [...prev, newClient]);
    alert("Client Added Successfully!");

    // Clear Form
    setName('');
    setLat('');
    setLng('');
    setPhone('');
    setEmail('');
    setSpecialty('');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r\n|\n/);
        if (lines.length < 2) {
          alert("CSV file is empty or missing headers.");
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const getIndex = (keys: string[]) => headers.findIndex(h => keys.some(k => h.includes(k)));

        const idxName = getIndex(['name', 'client name']);
        const idxType = getIndex(['type']);
        const idxCat = getIndex(['category']);
        const idxSpec = getIndex(['specialty']);
        const idxTid = getIndex(['territory', 'territory id', 'tid']);
        const idxLat = getIndex(['lat', 'latitude']);
        const idxLng = getIndex(['lng', 'longitude']);
        const idxEmail = getIndex(['email']);
        const idxPhone = getIndex(['phone']);

        if (idxName === -1 || idxTid === -1 || idxLat === -1 || idxLng === -1) {
          alert("CSV Error: Missing required columns (Name, Territory ID, Lat, Lng).");
          return;
        }

        let addedCount = 0;
        let errorCount = 0;
        const newCustomers: Customer[] = [];

        const allUsers = await getAllUsers();
        const allTerritoryIds = new Set<string>();
        allUsers.forEach(u => u.territories.forEach(t => allTerritoryIds.add(t.id)));

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const getVal = (idx: number) => idx > -1 && idx < cols.length ? cols[idx] : '';

          const nameVal = getVal(idxName);
          const tidVal = getVal(idxTid);
          const latVal = parseFloat(getVal(idxLat));
          const lngVal = parseFloat(getVal(idxLng));

          if (!nameVal || !tidVal || isNaN(latVal) || isNaN(lngVal)) {
            errorCount++;
            continue;
          }

          if (!allTerritoryIds.has(tidVal)) {
            errorCount++;
            continue;
          }

          const typeVal = getVal(idxType).toUpperCase();
          const validType = (Object.values(CustomerType) as string[]).includes(typeVal) ? typeVal as CustomerType : CustomerType.DOCTOR;
          const catVal = getVal(idxCat).toUpperCase();
          const validCat = (Object.values(CustomerCategory) as string[]).includes(catVal) ? catVal as CustomerCategory : CustomerCategory.C;

          const customer: Customer = {
            id: uuidv4(),
            name: nameVal,
            type: validType,
            category: validCat,
            territoryId: tidVal,
            specialty: getVal(idxSpec),
            email: getVal(idxEmail),
            phone: getVal(idxPhone),
            geoLat: latVal,
            geoLng: lngVal,
            isTagged: true,
            lastMonthSales: 0
          };
          newCustomers.push(customer);
          addedCount++;
        }

        if (addedCount > 0) {
          for (const c of newCustomers) {
            await saveCustomer(c);
          }
          setCustomers(prev => [...prev, ...newCustomers]);
          alert(`Import Complete!\nAdded: ${addedCount}\nErrors/Skipped: ${errorCount}`);
        } else {
          alert(`Import Failed. No valid rows found.\nErrors: ${errorCount}`);
        }

      } catch (err) {
        alert("Error parsing CSV file. Please check format.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const downloadCSV = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClients = async () => {
    let csv = 'Client ID,Name,Type,Category,Specialty,Territory ID,Lat,Lng,Last Month Sales,Email,Phone\n';
    const all = await getAllCustomers();
    all.forEach(c => {
      csv += `"${c.id}","${c.name}","${c.type}","${c.category}","${c.specialty || ''}","${c.territoryId}","${c.geoLat || ''}","${c.geoLng || ''}","${c.lastMonthSales}","${c.email || ''}","${c.phone || ''}"\n`;
    });
    downloadCSV(csv, `Client_Database_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportVisits = async () => {
    const allVisits = await getAllVisits();
    const allUsersList = await getAllUsers();
    let csv = 'Visit ID,Date,Time,MR Name,Customer Name,Type,Territory ID,Verified Loc,Products Discussed,Feedback,Actions Taken\n';
    allVisits.forEach(v => {
      const mr = allUsersList.find(u => u.uid === v.userId);
      const mrName = mr ? mr.displayName : v.userId;
      csv += `"${v.id}","${v.date}","${new Date(v.timestamp).toLocaleTimeString()}","${mrName}","${v.customerName}","${''}","${v.territoryId}","${v.isVerifiedLocation}","${v.productsDiscussed || ''}","${v.feedback || ''}","${v.actionsTaken || ''}"\n`;
    });
    downloadCSV(csv, `Visit_Report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const selectedMr = users.find(u => u.uid === selectedMrId);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header Panel */}
      <div className="flex justify-between items-center bg-[#0F172A]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B1E1E] opacity-10 blur-[80px] pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white flex items-center tracking-tight">
            <Database className="mr-3 text-[#8B1E1E]" /> Client Master Data
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage Doctors, Stockists & Pharmacies</p>
        </div>
        <div className="flex gap-2 relative z-10">
          <Button variant="outline" onClick={handleImportClick}>
            <Upload size={16} className="mr-2" /> Import CSV
          </Button>
          <Button variant="outline" onClick={handleExportClients}>
            <FileSpreadsheet size={16} className="mr-2" /> Export DB
          </Button>
          <Button variant="outline" onClick={handleExportVisits}>
            <Download size={16} className="mr-2" /> Visit Reports
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ADD NEW CLIENT FORM */}
        <div className="lg:col-span-1 bg-[#0F172A]/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-700/50 h-fit">
          <h3 className="font-bold text-white mb-6 flex items-center border-b border-slate-700/50 pb-4">
            <div className="p-2 bg-[#8B1E1E]/20 rounded-lg mr-3">
                <Plus size={16} className="text-[#8B1E1E]" /> 
            </div>
            Add New Client
          </h3>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">1. Select MR</label>
              <select
                className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none"
                value={selectedMrId}
                onChange={e => { setSelectedMrId(e.target.value); setSelectedTerritoryId(''); }}
              >
                <option value="">-- Select MR --</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">2. Select Territory</label>
              <select
                className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none disabled:opacity-50"
                value={selectedTerritoryId}
                onChange={e => setSelectedTerritoryId(e.target.value)}
                disabled={!selectedMrId}
              >
                <option value="">-- Select Territory --</option>
                {selectedMr?.territories.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-700/50 pt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Client Name</label>
              <input 
                className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="e.g. Dr. Ramesh" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Type</label>
                <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none" value={type} onChange={e => setType(e.target.value as CustomerType)}>
                  <option value={CustomerType.DOCTOR}>Doctor</option>
                  <option value={CustomerType.CHEMIST}>Chemist</option>
                  <option value={CustomerType.STOCKIST}>Stockist</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                <select className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none" value={category} onChange={e => setCategory(e.target.value as CustomerCategory)}>
                  <option value={CustomerCategory.A}>A</option>
                  <option value={CustomerCategory.B}>B</option>
                  <option value={CustomerCategory.C}>C</option>
                </select>
              </div>
            </div>

            {type === CustomerType.DOCTOR && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Specialty</label>
                <input 
                    className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none" 
                    value={specialty} 
                    onChange={e => setSpecialty(e.target.value)} 
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Latitude</label>
                <input type="number" step="0.000001" className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600" value={lat} onChange={e => setLat(e.target.value)} placeholder="28.1234" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Longitude</label>
                <input type="number" step="0.000001" className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] outline-none placeholder-slate-600" value={lng} onChange={e => setLng(e.target.value)} placeholder="77.5678" />
              </div>
            </div>

            <Button 
                className="w-full mt-4 bg-gradient-to-r from-[#6e1212] to-[#8B1E1E] hover:from-[#8B1E1E] hover:to-[#a02626] border-none shadow-lg shadow-red-900/20" 
                onClick={handleSaveClient} 
                disabled={!selectedTerritoryId}
            >
              Add Client
            </Button>
          </div>
        </div>

        {/* CLIENT LIST */}
        <div className="lg:col-span-2 bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden flex flex-col h-full">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 font-semibold text-slate-300 flex justify-between items-center">
            <span>Registered Clients {selectedMrId ? `under ${selectedMr?.displayName}` : '(All)'}</span>
            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">Total: {filteredCustomers.length}</span>
          </div>

          <div className="overflow-auto flex-1 p-0 custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#020617]/80 text-slate-500 border-b border-slate-700 sticky top-0 backdrop-blur-sm z-10">
                <tr>
                  <th className="p-4 font-semibold uppercase text-xs tracking-wider">Name</th>
                  <th className="p-4 font-semibold uppercase text-xs tracking-wider">Type</th>
                  <th className="p-4 font-semibold uppercase text-xs tracking-wider">Territory ID</th>
                  <th className="p-4 font-semibold uppercase text-xs tracking-wider text-right">GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
                        <User size={48} className="opacity-20 mb-3" />
                        No clients found matching filters.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="font-medium text-white group-hover:text-[#8B1E1E] transition-colors">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.specialty} {c.category ? `(Cat ${c.category})` : ''}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            c.type === CustomerType.DOCTOR ? 'bg-blue-900/30 text-blue-400 border border-blue-900/50' :
                            c.type === CustomerType.CHEMIST ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>{c.type}</span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-mono">{c.territoryId}</td>
                      <td className="p-4 text-right text-xs text-slate-500">
                        {c.geoLat ? (
                          <span className="flex items-center justify-end text-green-400 gap-1 bg-green-900/10 px-2 py-1 rounded w-fit ml-auto border border-green-900/20">
                            <MapPin size={10} /> 
                            {c.geoLat.toFixed(4)}, {c.geoLng?.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-amber-500 flex items-center justify-end gap-1">
                             <MapPin size={10} /> No GPS
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};