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
        return currentUser.displayName; // Returns the full name
    };

    const handleNavigation = (id: string) => {
        setView(id);
        // Auto-close sidebar on mobile when a link is clicked
        if (window.innerWidth < 768 && onClose) {
            onClose();
        }
    };

    const NavItem = ({ id, icon: Icon, label, badge }: any) => {
        const isActive = view === id;
        return (
            <button
                onClick={() => handleNavigation(id)}
                className={`flex items-center w-full px-3 py-3 rounded-lg mb-1 transition-all duration-200 group ${isActive
                        ? "bg-[#8B1E1E] text-white shadow-lg shadow-red-900/20 font-medium"
                        : "hover:bg-white/10 text-slate-300 hover:text-white"
                    }`}
            >
                <Icon
                    size={18}
                    className={`mr-3 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        }`}
                />
                {label}
                {badge && (
                    <span
                        className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white text-[#8B1E1E]" : "bg-[#8B1E1E] text-white"
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
            {/* Mobile Overlay (Backdrop) */}
            <div
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside
                className={`
                fixed md:relative top-0 left-0 h-full w-64 bg-[#0F172A] text-slate-300 
                flex flex-col z-50 transition-transform duration-300 ease-out shadow-2xl md:shadow-none flex-shrink-0 no-print
                pt-14 md:pt-0  /* 👈 FIXED: Added Top Padding for Mobile Notch */
                ${isOpen
                        ? "translate-x-0"
                        : "-translate-x-full md:translate-x-0"
                    }
            `}
            >
                {/* Background Accent Gradient */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#8B1E1E]/10 to-transparent pointer-events-none" />

                <div className="p-6 relative z-10">
                    {/* Header with Logo & Close Button */}
                    <div className="mb-8 flex justify-between items-start">
                        <Logo className="h-8" variant="light" />
                        <button
                            onClick={onClose}
                            className="md:hidden p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/10"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Profile Card */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                            Logged in as
                        </div>
                        <div className="text-white font-medium truncate">
                            {getFullName()}
                        </div>
                        <div className="flex items-center mt-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                                {currentUser.role}
                            </div>
                        </div>
                    </div>
                </div>

                {/* FIXED: Removed 'scrollbar-hide' so your new custom scrollbar CSS works.
                    Added 'custom-scrollbar' class just in case you want to target it specifically.
                */}
                <nav className="mt-2 space-y-0.5 px-3 pb-6 flex-1 overflow-y-auto relative z-10">
                    <NavItem id="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />

                    {!isAdmin && (
                        <>
                            <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Field Work
                            </div>
                            <NavItem id="ATTENDANCE" icon={MapPin} label="Attendance" />
                            <NavItem
                                id="TOUR_PLAN"
                                icon={CalendarDays}
                                label="Tour Planner"
                            />
                            <NavItem
                                id="REPORTING"
                                icon={Briefcase}
                                label="Field Reporting"
                            />
                            <NavItem id="SHEET" icon={FileText} label="My Expenses" />
                        </>
                    )}

                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Business
                    </div>
                    <NavItem id="SALES" icon={TrendingUp} label="Sales Analytics" />
                    <NavItem id="INVENTORY" icon={Package} label="My Inventory" />
                    <NavItem id="STOCKISTS" icon={Truck} label="Stockists" />

                    {isManager && (
                        <>
                            <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Management
                            </div>
                            <NavItem
                                id="APPROVALS"
                                icon={CheckSquare}
                                label="Approvals"
                                badge={
                                    pendingApprovals.length > 0 ? pendingApprovals.length : null
                                }
                            />
                        </>
                    )}

                    <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Performance
                    </div>
                    <NavItem id="PERFORMANCE" icon={Award} label="My Performance" />
                    {isAdmin && (
                        <NavItem
                            id="APPRAISALS"
                            icon={TrendingUp}
                            label="Staff Appraisals"
                        />
                    )}

                    {isAdmin && (
                        <>
                            <div className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                Admin Control
                            </div>
                            <NavItem id="USERS" icon={UserCog} label="Users" />
                            <NavItem id="CLIENTS" icon={Database} label="Clients" />
                            <NavItem id="SETTINGS" icon={Settings} label="Global Settings" />
                        </>
                    )}

                    <button
                        onClick={onInstallApp}
                        className="flex items-center w-full px-3 py-3 rounded-lg text-slate-300 hover:bg-white/5 mt-6 border border-dashed border-slate-600 hover:border-slate-400 transition-colors"
                    >
                        <Smartphone size={18} className="mr-3" />
                        <span className="text-sm">Install App</span>
                    </button>
                </nav>

                <div className="p-4 mt-auto border-t border-white/5 text-center bg-black/20">
                    <button
                        onClick={onLogout}
                        className="flex items-center justify-center text-slate-400 hover:text-white w-full mb-3 transition-colors"
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