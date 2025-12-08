import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, InventoryItem, UserStock, StockTransaction } from '../types';
import { getInventoryItems, getUserStock, getAllUsers, distributeStock, getStockTransactions } from '../services/mockDatabase';
import { Button } from './Button';
import { Package, Send, Plus, History, ArrowRight, User, Box, ShieldCheck, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface InventoryPanelProps {
  currentUser: UserProfile;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ currentUser }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [myStock, setMyStock] = useState<UserStock[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  // Admin Distribution State
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [qty, setQty] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentUser.uid]);

  const loadData = async () => {
    const i = await getInventoryItems();
    setItems(i);
    const s = await getUserStock(currentUser.uid);
    setMyStock(s);

    if (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ASM) {
      const u = await getAllUsers();
      setAllUsers(u);
    }

    // Load History
    const tx = await getStockTransactions(currentUser.role === UserRole.ADMIN ? '' : currentUser.uid);
    setTransactions(tx);
  };

  const handleIssueStock = async () => {
    if (!selectedUser || !selectedItem || qty <= 0) {
      alert("Please select user, item and quantity");
      return;
    }
    await distributeStock({ userId: selectedUser, itemId: selectedItem, quantity: qty });
    alert("Stock Issued Successfully!");
    setQty(0);
    loadData(); // Refresh history
  };

  const isAdminOrAsm = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.ASM;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center bg-[#0F172A]/90 backdrop-blur-xl p-6 rounded-2xl shadow-2xl border border-slate-700/50 relative overflow-hidden">
         {/* Glow */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B1E1E] opacity-10 blur-[80px] pointer-events-none"></div>

         <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white flex items-center tracking-tight">
                <Package className="mr-3 text-[#8B1E1E]" /> 
                {isAdminOrAsm ? 'Inventory Master' : 'My Inventory'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">Manage stock, samples, and promotional materials.</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. My Hand Stock */}
        <div className={`bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 p-6 ${isAdminOrAsm ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                <Box size={16} className="mr-2" /> Current Stock on Hand
            </h3>

            {myStock.length === 0 ? (
                <div className="p-12 text-center text-slate-500 italic border border-dashed border-slate-700 rounded-xl bg-[#020617]/30">
                    <Package size={32} className="mx-auto mb-3 opacity-20" />
                    No stock currently assigned to you.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {myStock.map(s => (
                        <div key={s.itemId} className="bg-[#020617]/40 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-all hover:bg-[#020617]/60 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full -mr-4 -mt-4"></div>
                            
                            <div className="relative z-10">
                                <div className="font-bold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors">{s.itemName}</div>
                                <div className="text-[10px] text-slate-500 font-mono mb-4 uppercase">ID: {s.itemId}</div>
                                
                                <div className="flex items-end justify-between">
                                    <div className="text-3xl font-bold text-white tracking-tighter">{s.quantity}</div>
                                    <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded">Units</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* 2. Issue Stock (Admin/ASM Only) */}
        {isAdminOrAsm && (
          <div className="lg:col-span-1 bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 p-6 h-fit">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center border-b border-slate-700/50 pb-4">
              <Send size={16} className="mr-2 text-[#8B1E1E]" />
              Distribute Stock
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Recipient (MR/Manager)</label>
                <div className="relative">
                    <select
                        className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] outline-none appearance-none"
                        value={selectedUser}
                        onChange={e => setSelectedUser(e.target.value)}
                    >
                        <option value="">-- Select Recipient --</option>
                        {allUsers.filter(u => u.uid !== 'admin1').map(u => (
                        <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
                        ))}
                    </select>
                    <User size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Select Item</label>
                <div className="relative">
                    <select
                        className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] outline-none appearance-none"
                        value={selectedItem}
                        onChange={e => setSelectedItem(e.target.value)}
                    >
                        <option value="">-- Select Item --</option>
                        {items.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                        ))}
                    </select>
                    <Box size={16} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Quantity</label>
                <input
                  type="number"
                  className="w-full bg-[#020617]/50 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] outline-none"
                  value={qty}
                  onChange={e => setQty(Number(e.target.value))}
                  min="1"
                />
              </div>

              <Button 
                onClick={handleIssueStock} 
                disabled={!selectedUser || !selectedItem}
                className="w-full bg-[#8B1E1E] hover:bg-[#a02626] text-white border-none shadow-lg shadow-red-900/20 mt-2"
              >
                <Plus size={16} className="mr-2" /> Issue Stock
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Transaction History (Ledger) */}
      <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/30">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center">
                <History size={16} className="mr-2" />
                Stock Ledger
            </h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic text-sm">No transaction history available.</div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#020617] text-slate-500 uppercase text-xs font-semibold tracking-wider">
                <tr>
                  <th className="p-4 border-b border-slate-800">Date & Time</th>
                  <th className="p-4 border-b border-slate-800">Transaction Type</th>
                  <th className="p-4 border-b border-slate-800">Item</th>
                  <th className="p-4 border-b border-slate-800 text-right">Qty</th>
                  <th className="p-4 border-b border-slate-800">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {transactions.map(tx => {
                  const isIssue = tx.type === 'ISSUE';
                  return (
                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-300 font-mono text-xs">
                        {new Date(tx.date).toLocaleDateString()} <span className="text-slate-500 ml-1">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                            isIssue 
                            ? 'bg-green-900/20 text-green-400 border-green-900/50' 
                            : 'bg-blue-900/20 text-blue-400 border-blue-900/50'
                        }`}>
                          {isIssue ? <ArrowDownLeft size={10} className="mr-1"/> : <ArrowUpRight size={10} className="mr-1"/>}
                          {isIssue ? 'Stock In' : 'Stock Out'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white">{tx.itemName}</td>
                      <td className="p-4 text-right font-bold text-white font-mono">{tx.quantity}</td>
                      <td className="p-4 text-slate-400 text-xs">
                        {isIssue ? (
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-slate-500"/>
                            <span>Admin</span> 
                            <ArrowRight size={10} className="text-slate-600" /> 
                            <span className="text-white">{allUsers.find(u => u.uid === tx.toUserId)?.displayName || 'User'}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>Given to Customer ID:</span>
                            <span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">{tx.toUserId.split('-')[0]}...</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};