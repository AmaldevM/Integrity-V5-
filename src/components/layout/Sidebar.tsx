import React from 'react';
import {
    LayoutDashboard,
    MapPin,
    CalendarDays,
    Briefcase,
    FileText,
    TrendingUp,
    Package,
    CheckSquare,
    UserCog,
    Database,
    Settings,
    Smartphone,
    LogOut,
    Award,
    Truck,
    X,
} from 'lucide-react';
import { Logo } from '../Logo';
import { UserProfile, UserRole, MonthlyExpenseSheet } from '../../types';

interface SidebarProps {
    currentUser: UserProfile;
    view: string;
    setView: (view: any) => void;
    pendingApprovals: MonthlyExpenseSheet[];
    onLogout: () => void;
    onInstallApp: () => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentUser,
    view,
    setView,
    pendingApprovals,
    onLogout,
    onInstallApp,
    isOpen = true,
    onClose,
}) => {
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const isManager = [
        UserRole.ASM,
        UserRole.RM,
        UserRole.ZM,
        UserRole.ADMIN,
    ].includes(currentUser.role);
    const APP_VERSION = "1.5.0";

    const getFullName = () => {
        if (!currentUser || !currentUser.displayName) return 'User';
        return currentUser.displayName;
    };

    const handleNavigation = (id: string) => {
        setView(id);
        // Only close sidebar on mobile (screens narrower than 768px)
        if (window.innerWidth < 768 && onClose) {
            onClose();
        }
    };

    const NavItem = ({ id, icon: Icon, label, badge }: any) => {
        const isActive = view === id;
        return (
            <button
                onClick={() => handleNavigation(id)}
                className={`flex items-center w-full px-3 py-3 rounded-lg mb-1 transition-all duration-200 group relative ${
                    isActive
                        ? "bg-[#8B1E1E] text-white shadow-lg shadow-red-900/20 font-medium"
                        : "hover:bg-white/10 text-slate-300 hover:text-white"
                }`}
            >
                {/* Active Indicator Line (Left) */}
                {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-white/30 rounded-r-full"></div>
                )}

                <Icon
                    size={18}
                    className={`mr-3 flex-shrink-0 ${
                        isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                    }`}
                />
                <span className="truncate">{label}</span>
                
                {badge && (
                    <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                            isActive ? "bg-white text-[#8B1E1E]" : "bg-[#8B1E1E] text-white"
                        }`}
                    >
                        {badge}
                    </span>
                )}
            </button>
        );
    };

    return (
        <>
            {/* Mobile Overlay (Backdrop) - Only visible on small screens when open */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`
                fixed md:relative top-0 left-0 h-full w-64 bg-[#0F172A] text-slate-300 
                flex flex-col z-50 transition-transform duration-300 ease-out shadow-2xl md:shadow-none flex-shrink-0 no-print border-r border-slate-800
                pt-safe-top /* Safe area for mobiles */
                ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
            `}
            >
                {/* Background Accent Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#8B1E1E]/20 to-transparent pointer-events-none" />

                <div className="p-6 relative z-10">
                    {/* Header with Logo & Close Button */}
                    <div className="mb-8 flex justify-between items-start pt-4 md:pt-0">
                        <Logo className="h-8" variant="light" />
                        <button
                            onClick={onClose}
                            className="md:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm shadow-inner">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
                            Logged in as
                        </div>
                        <div className="text-white font-medium truncate text-sm">
                            {getFullName()}
                        </div>
                        <div className="flex items-center mt-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse shadow-[0_0_8px_#22c55e]"></span>
                            <div className="text-[10px] text-slate-300 font-mono uppercase tracking-wide bg-slate-800 px-1.5 rounded border border-slate-700">
                                {currentUser.role}
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="mt-2 space-y-0.5 px-3 pb-6 flex-1 overflow-y-auto relative z-10 custom-scrollbar">
                    <NavItem id="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />

                    {!isAdmin && (
                        <>
                            <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <span className="w-8 h-px bg-slate-700 mr-2"></span> Field Work
                            </div>
                            <NavItem id="ATTENDANCE" icon={MapPin} label="Attendance" />
                            <NavItem id="TOUR_PLAN" icon={CalendarDays} label="Tour Planner" />
                            <NavItem id="REPORTING" icon={Briefcase} label="Field Reporting" />
                            <NavItem id="EXPENSES" icon={FileText} label="My Expenses" />
                        </>
                    )}

                    <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <span className="w-8 h-px bg-slate-700 mr-2"></span> Business
                    </div>
                    <NavItem id="SALES" icon={TrendingUp} label="Sales Analytics" />
                    <NavItem id="INVENTORY" icon={Package} label="My Inventory" />
                    <NavItem id="STOCKISTS" icon={Truck} label="Stockists" />

                    {isManager && (
                        <>
                            <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <span className="w-8 h-px bg-slate-700 mr-2"></span> Management
                            </div>
                            <NavItem
                                id="APPROVALS"
                                icon={CheckSquare}
                                label="Approvals"
                                badge={pendingApprovals.length > 0 ? pendingApprovals.length : null}
                            />
                        </>
                    )}

                    <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                        <span className="w-8 h-px bg-slate-700 mr-2"></span> Performance
                    </div>
                    <NavItem id="PERFORMANCE" icon={Award} label="My Performance" />
                    {isAdmin && (
                        <NavItem id="APPRAISALS" icon={TrendingUp} label="Staff Appraisals" />
                    )}

                    {isAdmin && (
                        <>
                            <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center">
                                <span className="w-8 h-px bg-slate-700 mr-2"></span> Admin Control
                            </div>
                            <NavItem id="USERS" icon={UserCog} label="Users" />
                            <NavItem id="CLIENTS" icon={Database} label="Clients" />
                            <NavItem id="SETTINGS" icon={Settings} label="Global Settings" />
                        </>
                    )}

                    <button
                        onClick={onInstallApp}
                        className="flex items-center w-full px-3 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 mt-6 border border-dashed border-slate-700 hover:border-slate-500 transition-colors group"
                    >
                        <Smartphone size={18} className="mr-3 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <span className="text-sm">Install App</span>
                    </button>
                </nav>

                <div className="p-4 mt-auto border-t border-slate-800 text-center bg-black/20 backdrop-blur-md">
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg py-2 w-full mb-3 transition-all"
                    >
                        <LogOut size={16} className="mr-2" /> Sign Out
                    </button>
                    <div className="text-[10px] text-slate-600 font-mono">
                        Tertius v{APP_VERSION}
                    </div>
                </div>
            </aside>
        </>
    );
};