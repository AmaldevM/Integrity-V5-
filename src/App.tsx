import React, { useState, useEffect } from 'react';
import {
  UserRole, UserProfile, Rates, MonthlyExpenseSheet, ExpenseStatus, ExpenseEntry, Notification, MonthlyTourPlan
} from './types';
import {
  getRates, getUser, getExpenseSheet, saveExpenseSheet, saveRates,
  getPendingSheetsForAsm, getPendingSheetsForAdmin, getAllUsers, getNotifications,
  getPendingTourPlansForAsm, getPendingTourPlansForAdmin
} from './services/mockDatabase';
import { ExpenseTable } from './components/ExpenseTable';
import { getMonthName } from './utils';
import { AdminSettings } from './components/AdminSettings';
import { UserManagement } from './components/UserManagement';
import { ClientManagement } from './components/ClientManagement';
import { AttendancePanel } from './components/AttendancePanel';
import { AIInsights } from './components/AIInsights';
import { TourPlanner } from './components/TourPlanner';
import { FieldReporting } from './components/FieldReporting';
import { MRAnalytics } from './components/MRAnalytics';
import { InventoryPanel } from './components/InventoryPanel';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { AdminAppraisalView } from './components/AdminAppraisalView';
import { StockistPanel } from './components/StockistPanel';
import { ManagerDashboard } from './components/ManagerDashboard';
import { NetworkStatus } from './components/NetworkStatus';
import { Button } from './components/Button';
import { Logo } from './components/Logo';
import {
  LogOut, Menu
} from 'lucide-react';
import { LoadingScreen } from './components/LoadingScreen';
import { LoginPage } from './components/LoginPage';
import { Sidebar } from './components/layout/Sidebar';

const App = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 1. ADDED: State for Mobile Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [view, setView] = useState<'DASHBOARD' | 'SHEET' | 'SETTINGS' | 'APPROVALS' | 'USERS' | 'CLIENTS' | 'ATTENDANCE' | 'TOUR_PLAN' | 'REPORTING' | 'INVENTORY' | 'SALES' | 'TOUR_PLAN_APPROVAL' | 'PERFORMANCE' | 'APPRAISALS' | 'STOCKISTS'>('DASHBOARD');
  const [activeSheet, setActiveSheet] = useState<MonthlyExpenseSheet | null>(null);

  const [currentMonthSheet, setCurrentMonthSheet] = useState<MonthlyExpenseSheet | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<MonthlyExpenseSheet[]>([]);
  const [pendingTourPlans, setPendingTourPlans] = useState<MonthlyTourPlan[]>([]);
  const [activeTourPlan, setActiveTourPlan] = useState<MonthlyTourPlan | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSheet(null);
    setCurrentMonthSheet(null);
    setPendingApprovals([]);
  };

  const handleInstallApp = () => {
    alert("Install Android App:\n1. Tap the browser menu (3 dots)\n2. Select 'Add to Home Screen'\n3. Tap 'Install'");
  };

  useEffect(() => {
    const init = async () => {
      try {
        const r = await getRates();
        setRates(r);
        const u = await getAllUsers();
        setAllUsers(u);
      } catch (e) {
        console.warn("Offline initialization fallback", e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    refreshDashboardData();
  }, [currentUser?.uid, view]);

  const refreshDashboardData = async () => {
    if (!currentUser) return;

    const freshUser = await getUser(currentUser.uid);
    if (freshUser) setCurrentUser(freshUser);

    const u = await getAllUsers();
    setAllUsers(u);

    let pending: MonthlyExpenseSheet[] = [];
    let pendingPlans: MonthlyTourPlan[] = [];
    if (currentUser.role === UserRole.ASM) {
      pending = await getPendingSheetsForAsm(currentUser.uid);
      pendingPlans = await getPendingTourPlansForAsm(currentUser.uid);
    } else if (currentUser.role === UserRole.ADMIN) {
      pending = await getPendingSheetsForAdmin();
      pendingPlans = await getPendingTourPlansForAdmin();
    }
    setPendingApprovals(pending);
    setPendingTourPlans(pendingPlans);

    const now = new Date();
    const sheet = await getExpenseSheet(currentUser.uid, now.getFullYear(), now.getMonth());
    setCurrentMonthSheet(sheet);

    const notifs = await getNotifications(currentUser.uid);
    setNotifications(notifs);
  };

  const openApprovalSheet = (sheet: MonthlyExpenseSheet) => {
    setActiveSheet(sheet);
    setView('SHEET');
  };

  const openApprovalTourPlan = (plan: MonthlyTourPlan) => {
    setActiveTourPlan(plan);
    setView('TOUR_PLAN_APPROVAL');
  };

  const handleSaveSheet = async (updatedEntries: ExpenseEntry[]) => {
    if (!activeSheet) return;
    const updatedSheet = { ...activeSheet, entries: updatedEntries };
    await saveExpenseSheet(updatedSheet);
    setActiveSheet(updatedSheet);
    if (currentMonthSheet && activeSheet.id === currentMonthSheet.id) setCurrentMonthSheet(updatedSheet);
  };

  const handleSubmitSheet = async () => {
    if (!activeSheet) return;
    const updatedSheet = { ...activeSheet, status: ExpenseStatus.SUBMITTED, submittedAt: new Date().toISOString() };
    await saveExpenseSheet(updatedSheet);
    setActiveSheet(updatedSheet);
    alert('Sheet submitted successfully!');
    refreshDashboardData();
  };

  const handleApproveSheet = async () => {
    if (!activeSheet || !currentUser) return;
    let newStatus = ExpenseStatus.APPROVED_ASM;
    if (currentUser.role === UserRole.ADMIN) newStatus = ExpenseStatus.APPROVED_ADMIN;

    const updatedSheet = { ...activeSheet, status: newStatus, [currentUser.role === UserRole.ADMIN ? 'approvedByAdminAt' : 'approvedByAsmAt']: new Date().toISOString() };
    await saveExpenseSheet(updatedSheet);
    setActiveSheet(updatedSheet);
    alert('Sheet approved!');
    refreshDashboardData();
    setView('APPROVALS');
  };

  const handleRejectSheet = async (reason: string) => {
    if (!activeSheet) return;
    const updatedSheet = { ...activeSheet, status: ExpenseStatus.REJECTED, rejectionReason: reason };
    await saveExpenseSheet(updatedSheet);
    setActiveSheet(updatedSheet);
    alert('Sheet rejected.');
    refreshDashboardData();
    setView('APPROVALS');
  };

  const handleSaveRates = async (newRates: Rates) => {
    await saveRates(newRates);
    setRates(newRates);
    alert('Master data updated.');
  };

  const getFirstName = () => {
    if (!currentUser || !currentUser.displayName) return 'User';
    return currentUser.displayName.split(' ')[0] || 'User';
  };

  const handleLoginAs = (user: UserProfile) => {
    if (!confirm(`Are you sure you want to login as ${user.displayName}?`)) return;
    setCurrentUser(user);
    setView('DASHBOARD');
    alert(`Logged in as ${user.displayName}`);
  };

  if (loading && !currentUser) return <LoadingScreen />;

  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => { setCurrentUser(user); setView('DASHBOARD'); }} />;
  }

  let tableTerritories = currentUser.territories;
  if (activeSheet && activeSheet.userId !== currentUser.uid) {
    const sheetOwner = allUsers.find(u => u.uid === activeSheet.userId);
    if (sheetOwner) tableTerritories = sheetOwner.territories;
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isManager = [UserRole.ASM, UserRole.RM, UserRole.ZM, UserRole.ADMIN].includes(currentUser.role);

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <NetworkStatus />
      
      {/* 2. FIXED: Pass state and handler to Sidebar */}
      <Sidebar
        currentUser={currentUser}
        view={view}
        setView={setView}
        pendingApprovals={pendingApprovals}
        onLogout={handleLogout}
        onInstallApp={handleInstallApp}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* 3. ADDED: Mobile Header Bar */}
        <header className="md:hidden bg-[#0F172A] border-b border-slate-700/50 p-4 flex items-center justify-between z-20">
           <div className="flex items-center">
             <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 mr-4">
               <Menu size={24} />
             </button>
             <Logo className="h-6" variant="light"/>
           </div>
           <button onClick={handleLogout} className="text-slate-400">
             <LogOut size={20} />
           </button>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#020617]">
          {view === 'DASHBOARD' && (
            <div className="max-w-6xl space-y-6 mx-auto">
              <h2 className="text-2xl font-bold text-white tracking-tight">Welcome, {getFirstName()}</h2>
              <AIInsights sheet={currentMonthSheet} userName={getFirstName()} userRole={currentUser.role} userId={currentUser.uid} />
              {isManager && <ManagerDashboard user={currentUser} />}
              {currentUser.role === UserRole.MR && <><MRAnalytics /><AttendancePanel user={currentUser} /></>}
            </div>
          )}
          
          {view === 'ATTENDANCE' && <AttendancePanel user={currentUser} />}
          {view === 'TOUR_PLAN' && <TourPlanner user={currentUser} canApprove={false} />}
          {view === 'REPORTING' && <FieldReporting user={currentUser} />}
          {view === 'INVENTORY' && <InventoryPanel currentUser={currentUser} />}
          {view === 'SALES' && <ManagerDashboard user={currentUser} />}
          
          {view === 'SETTINGS' && isAdmin && rates && <AdminSettings currentRates={rates} onSave={handleSaveRates} />}
          {view === 'USERS' && isAdmin && <UserManagement onLoginAs={handleLoginAs} />}
          {view === 'CLIENTS' && isAdmin && <ClientManagement />}
          
          {view === 'PERFORMANCE' && <PerformanceDashboard user={currentUser} />}
          {view === 'APPRAISALS' && isAdmin && <AdminAppraisalView />}
          
          {/* 4. FIXED: Conditional rendering for StockistPanel */}
          {view === 'STOCKISTS' && <StockistPanel />} 
          
          {view === 'SHEET' && activeSheet && rates && (
            <ExpenseTable 
                sheet={activeSheet} 
                rates={rates} 
                userRole={currentUser.role} 
                userStatus={currentUser.status} 
                isOwner={currentUser.uid === activeSheet.userId} 
                territories={tableTerritories} 
                onSave={handleSaveSheet} 
                onSubmit={handleSubmitSheet} 
                onApprove={handleApproveSheet} 
                onReject={handleRejectSheet} 
            />
          )}

          {view === 'APPROVALS' && isManager && (
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-white">Pending Approvals</h2>

              {pendingApprovals.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Expense Sheets</h3>
                  {pendingApprovals.map(s => (
                    <div key={s.id} className="p-4 border border-slate-700 bg-[#0F172A] rounded-xl mb-3 flex justify-between items-center shadow-lg">
                      <span className="text-slate-200 font-medium">{allUsers.find(u => u.uid === s.userId)?.displayName} <span className="text-slate-500 mx-2">|</span> ₹{s.entries.reduce((a, b) => a + b.totalAmount, 0)}</span>
                      <Button size="sm" onClick={() => openApprovalSheet(s)} className="bg-blue-600 hover:bg-blue-500 border-none text-white">Review</Button>
                    </div>
                  ))}
                </div>
              )}

              {pendingTourPlans.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Tour Plans</h3>
                  {pendingTourPlans.map(p => (
                    <div key={p.id} className="p-4 border border-slate-700 bg-[#0F172A] rounded-xl mb-3 flex justify-between items-center shadow-lg">
                      <span className="text-slate-200 font-medium">{allUsers.find(u => u.uid === p.userId)?.displayName} <span className="text-slate-500 mx-2">|</span> {getMonthName(p.month)} {p.year}</span>
                      <Button size="sm" onClick={() => openApprovalTourPlan(p)} className="bg-purple-600 hover:bg-purple-500 border-none text-white">Review</Button>
                    </div>
                  ))}
                </div>
              )}

              {pendingApprovals.length === 0 && pendingTourPlans.length === 0 && (
                <div className="text-slate-500 italic p-8 text-center border border-dashed border-slate-800 rounded-xl">No pending approvals.</div>
              )}
            </div>
          )}

          {view === 'TOUR_PLAN_APPROVAL' && activeTourPlan && (
            <div className="max-w-5xl mx-auto">
              <Button variant="outline" size="sm" onClick={() => setView('APPROVALS')} className="mb-4 text-slate-400 border-slate-600 hover:text-white">Back to Approvals</Button>
              {(() => {
                const planOwner = allUsers.find(u => u.uid === activeTourPlan.userId);
                if (!planOwner) return <div className="text-red-400">User not found</div>;
                return <TourPlanner user={planOwner} canApprove={true} />;
              })()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;