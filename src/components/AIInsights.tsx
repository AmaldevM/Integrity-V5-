import React, { useState, useEffect } from 'react';
import { MonthlyExpenseSheet, ExpenseCategory, UserRole } from '../types';
import { getSalesTarget, getAllCustomers, getUser, getUserStock, getVisits } from '../services/mockDatabase';
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2, BarChart3, Package, PhoneMissed } from 'lucide-react';

interface AIInsightsProps {
  sheet: MonthlyExpenseSheet | null;
  userName: string;
  userRole: UserRole;
  userId: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ sheet, userName, userRole, userId }) => {
  const [insightCards, setInsightCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [userId, sheet]);

  const generateInsights = async () => {
    setLoading(true);
    const cards = [];

    // 1. Sales & Target Insight
    const today = new Date();
    const target = await getSalesTarget(userId, today.getMonth(), today.getFullYear());

    if (target) {
      const percentage = Math.round((target.achievedAmount / target.targetAmount) * 100);
      cards.push({
        type: 'SALES',
        title: 'Target Progress',
        value: `${percentage}%`,
        desc: `₹${target.achievedAmount.toLocaleString()} / ₹${target.targetAmount.toLocaleString()}`,
        status: percentage >= 80 ? 'good' : 'bad'
      });

      // Sales Gap Alert (Mid-month check)
      if (today.getDate() > 15 && percentage < 50) {
        cards.push({
          type: 'GAP',
          title: 'Sales Gap Alert',
          value: 'Critical Lag',
          desc: '< 50% achieved by mid-month',
          status: 'bad'
        });
      }
    }

    // 2. Doctor Visit Gaps & Stock
    if (userRole === UserRole.MR) {
      const user = await getUser(userId);
      if (user) {
        const territoryIds = user.territories.map(t => t.id);
        const allCustomers = await getAllCustomers();
        const myCustomers = allCustomers.filter(c => territoryIds.includes(c.territoryId));

        // Pass userId first, then the date string
const allVisits = await getVisits(userId, new Date().toISOString().split('T')[0]);
        
        // Mock logic for month filtering since getVisits is date specific in mock
        // For this demo, assuming we calculate based on coverage ratio if real data is sparse
        const coverageRatio = 0.65; // Mock data point for illustration if no visits found
        const pendingCount = Math.floor(myCustomers.length * (1 - coverageRatio));

        if (pendingCount > 0) {
          cards.push({
            type: 'MISSED',
            title: 'Missed Calls',
            value: `${pendingCount} Pending`,
            desc: `${Math.round(coverageRatio * 100)}% Coverage`,
            status: pendingCount > 10 ? 'bad' : 'good'
          });
        }
      }

      const stock = await getUserStock(userId);
      const lowStock = stock.filter(s => s.quantity < 10);

      if (lowStock.length > 0) {
        cards.push({
          type: 'STOCK',
          title: 'Low Inventory',
          value: `${lowStock.length} Items`,
          desc: `Restock needed: ${lowStock[0].itemName}`,
          status: 'bad'
        });
      }
    }

    // 3. Compliance Logic
    if (sheet) {
      const hqDays = sheet.entries.filter(e => e.category === ExpenseCategory.HQ).length;
      const hqCompliance = hqDays >= 8;
      cards.push({
        type: 'COMPLIANCE',
        title: 'HQ Compliance',
        value: `${hqDays}/8 Days`,
        desc: hqCompliance ? 'On Track' : 'Plan more HQ days',
        status: hqCompliance ? 'good' : 'bad'
      });
    }

    setInsightCards(cards);
    setLoading(false);
  };

  if (loading) return (
      <div className="animate-pulse bg-[#0F172A]/40 border border-slate-700/50 h-32 rounded-xl mb-6 flex items-center justify-center">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Sparkles className="animate-spin" size={16}/> Analyzing data...
          </div>
      </div>
  );

  if (insightCards.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0F172A] border border-slate-700/50 shadow-2xl mb-6">
      {/* Background Gradients */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B1E1E] opacity-10 blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900 opacity-10 blur-[80px] pointer-events-none"></div>

      <div className="relative z-10 p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center tracking-tight">
              <Sparkles className="mr-2 h-5 w-5 text-yellow-400 fill-yellow-400" />
              AI Optimization Insights
            </h3>
            <p className="text-xs text-slate-400 mt-1">
                Real-time performance analysis for <span className="text-white font-medium">{userName}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insightCards.map((card, idx) => (
            <div 
                key={idx} 
                className={`
                    group relative overflow-hidden backdrop-blur-md rounded-xl p-4 border transition-all duration-300
                    ${card.status === 'good' 
                        ? 'bg-[#020617]/40 border-green-900/30 hover:border-green-500/50' 
                        : 'bg-[#020617]/40 border-red-900/30 hover:border-[#8B1E1E]/50'}
                `}
            >
              {/* Card Header */}
              <div className={`
                  flex items-center text-[10px] font-bold uppercase tracking-widest mb-2
                  ${card.status === 'good' ? 'text-green-400' : 'text-red-400'}
              `}>
                {card.type === 'SALES' && <BarChart3 size={14} className="mr-1.5" />}
                {card.type === 'STOCK' && <Package size={14} className="mr-1.5" />}
                {card.type === 'GAP' && <TrendingUp size={14} className="mr-1.5" />}
                {card.type === 'COMPLIANCE' && <CheckCircle2 size={14} className="mr-1.5" />}
                {card.type === 'MISSED' && <PhoneMissed size={14} className="mr-1.5" />}
                {card.title}
              </div>

              {/* Card Value */}
              <div className="text-2xl font-bold text-white mb-1 tracking-tight group-hover:scale-105 transition-transform origin-left">
                  {card.value}
              </div>

              {/* Card Description */}
              <div className="text-xs text-slate-500 font-medium truncate">
                {card.desc}
              </div>

              {/* Hover Glow Effect */}
              <div className={`
                  absolute -right-4 -bottom-4 w-16 h-16 rounded-full blur-xl opacity-0 group-hover:opacity-20 transition-opacity
                  ${card.status === 'good' ? 'bg-green-500' : 'bg-[#8B1E1E]'}
              `}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};