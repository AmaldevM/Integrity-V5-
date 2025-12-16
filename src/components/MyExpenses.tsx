import React, { useState, useEffect } from 'react';
import { UserProfile, MonthlyExpenseSheet, Rates, ExpenseStatus, ExpenseEntry } from '../types';
import { getExpenseSheet, saveExpenseSheet, getRates } from '../services/mockDatabase';
import { ExpenseTable } from './ExpenseTable'; // Import the UI we just built
import { Button } from './Button';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { getMonthName } from '../utils'; // Ensure this utility exists or use generic date format

interface MyExpensesProps {
    user: UserProfile;
}

export const MyExpenses: React.FC<MyExpensesProps> = ({ user }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sheet, setSheet] = useState<MonthlyExpenseSheet | null>(null);
    const [rates, setRates] = useState<Rates | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize Data
    useEffect(() => {
        loadData();
    }, [user.uid, currentDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            // 1. Fetch Rates (Global Config)
            const r = await getRates();
            setRates(r);

            // 2. Fetch User's Sheet for this month
            const s = await getExpenseSheet(user.uid, year, month);
            setSheet(s);

        } catch (e) {
            console.error("Failed to load expenses", e);
        } finally {
            setLoading(false);
        }
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const handleSave = async (updatedEntries: ExpenseEntry[]) => {
        if (!sheet) return;
        const updatedSheet = { ...sheet, entries: updatedEntries };
        await saveExpenseSheet(updatedSheet);
        setSheet(updatedSheet); // Update local state
    };

    const handleSubmit = async () => {
        if (!sheet) return;
        if (!confirm("Are you sure you want to submit? This will lock the sheet.")) return;

        const updatedSheet = {
            ...sheet,
            status: ExpenseStatus.SUBMITTED,
            submittedAt: new Date().toISOString()
        };

        await saveExpenseSheet(updatedSheet);
        setSheet(updatedSheet);
        alert("Expense Sheet Submitted Successfully!");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500 gap-3">
                <Loader2 className="animate-spin text-[#8B1E1E]" size={32} />
                <p>Loading Expense Records...</p>
            </div>
        );
    }

    if (!sheet || !rates) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3 border border-dashed border-slate-700 rounded-xl m-4">
                <AlertCircle size={48} />
                <p>Could not load expense data. Please check connection.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] p-4 md:p-6 space-y-4">

            {/* Month Selector Control */}
            <div className="flex items-center justify-between bg-[#0F172A] p-4 rounded-xl border border-slate-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="text-xl font-bold text-white w-48 text-center">
                        {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                    </div>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Status Badge (Quick View) */}
                <div className="hidden md:block">
                    <span className="text-slate-500 text-xs mr-2 uppercase font-bold">Sheet Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase
                  ${sheet.status === ExpenseStatus.APPROVED_ADMIN ? 'bg-green-900/30 text-green-400 border-green-800' :
                            sheet.status === ExpenseStatus.SUBMITTED ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                'bg-amber-900/30 text-amber-400 border-amber-800'}`}>
                        {sheet.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {/* The Actual Table Component */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-slate-700 shadow-2xl">
                <ExpenseTable
                    sheet={sheet}
                    rates={rates}
                    userRole={user.role}
                    userStatus={user.status}
                    isOwner={true} // Since this is "My Expenses"
                    territories={user.territories}
                    onSave={handleSave}
                    onSubmit={handleSubmit}
                />
            </div>
        </div>
    );
};