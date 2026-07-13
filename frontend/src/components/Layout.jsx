import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import { Wallet } from "lucide-react";
import { useThemeStore } from "../context/themeStore";
import { usePermissions } from "../hooks/usePermissions";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Clock,
  Settings,
  LogOut,
  Sun,
  Moon,
  Award,
  Bell,
  CloudLightning,
  DollarSign,
  Building2,
  UserCog,
  Contact,
  CalendarClock,
  Store as StoreIcon,
  ShoppingCart, // ← new
} from "lucide-react";
import logo from "./logo.png";
import logoLight from "./logolightmode.png";
import Centerlogo from "./Centerlogo.png";

const MAIN_NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboardRead" },
  { to: "/students", label: "Students", icon: Users, perm: "studentsRead" },
  {
    to: "/instructors",
    label: "Instructors",
    icon: UserCheck,
    perm: "instructorsRead",
  },
  {
    to: "/instructor-profile",
    label: "Instructor Profile",
    icon: Contact,
    perm: "isSuperAdmin",
  },
  { to: "/groups", label: "Groups", icon: BookOpen, perm: "groupsRead" },
  {
    to: "/sessions",
    label: "Sessions",
    icon: CalendarDays,
    perm: "sessionsRead",
  },
  { to: "/exams", label: "Exams", icon: ClipboardList, perm: "examsRead" },
  {
    to: "/payments",
    label: "Payments",
    icon: CreditCard,
    perm: "paymentsRead",
  },
  {
    to: "/center-deductions",
    label: "Deductions",
    icon: Wallet,
    perm: "closingsRead",
  },

  { to: "/closing", label: "Closing", icon: DollarSign, perm: "closingsRead" },
  {
    to: "/certificates",
    label: "Certificates",
    icon: Award,
    perm: "certificatesRead",
  },
  {
    to: "/waiting",
    label: "Waiting List",
    icon: Clock,
    perm: "waitingListRead",
  },
  {
    to: "/resource-scheduler",
    label: "Scheduler",
    icon: CalendarClock,
    perm: "resourceSchedulerRead",
  },
  {
    to: "/branch-overview",
    label: "Branch Overview",
    icon: Building2,
    perm: "branchOverviewRead",
  },
  {
    to: "/store",
    label: "Store",
    icon: StoreIcon,
    perm: "storeRead",
  },
  {
    to: "/sales",
    label: "Sales",
    icon: ShoppingCart,
    perm: "salesRead",
  },
];

const SYS_NAV = [
  { to: "/users", label: "Users", icon: UserCog, perm: "usersManage" },
  { to: "/settings", label: "Settings", icon: Settings, perm: "settingsRead" },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    perm: "notificationsRead",
  },
];

function navClass({ isActive }) {
  return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium
          transition-all duration-150 cursor-pointer
          ${
            isActive
              ? "bg-gray-900 dark:bg-white/10 text-white dark:text-white"
              : "text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white/80"
          }`;
}

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { dark, toggle } = useThemeStore();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const visibleMain = MAIN_NAV.filter(({ perm }) => !perm || can[perm]);
  const visibleSys = SYS_NAV.filter(({ perm }) => !perm || can[perm]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f0f0] dark:bg-[#0a0a0a]">
      <aside
        className="w-64 flex flex-col flex-shrink-0
                   bg-white dark:bg-[#111111]
                   border-r border-gray-100 dark:border-white/5
                   shadow-[2px_0_12px_rgba(0,0,0,0.04)]"
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            {/* Centerlogo — free, no box, no background */}
            <img
              src={Centerlogo}
              alt="Berliner Mauer"
              className="h-20 w-auto object-contain flex-shrink-0
             bg-white rounded-lg p-1.5"
            />
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white tracking-wide leading-none font-display">
                Berliner Mauer
              </h1>
              <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5 font-medium tracking-wider uppercase">
                Center
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-none space-y-0.5">
          {visibleMain.length > 0 && (
            <>
              <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 dark:text-white/25">
                Main
              </p>
              {visibleMain.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === "/"} className={navClass}>
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="flex-1 text-[16px]">{label}</span>
                </NavLink>
              ))}
            </>
          )}

          {visibleSys.length > 0 && (
            <>
              <p className="px-3 pt-4 pb-2 text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400 dark:text-white/25">
                System
              </p>
              {visibleSys.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={navClass}>
                  <Icon size={16} className="flex-shrink-0" />
                  <span className="flex-1 text-[16px]">{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-white/5 space-y-1">
          <button
            onClick={toggle}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full
                       text-[13px] font-medium transition-all duration-150
                       text-gray-500 dark:text-white/40
                       hover:bg-gray-100 dark:hover:bg-white/5
                       hover:text-gray-900 dark:hover:text-white/80"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            <span className="text-[14px]">
              {dark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
          <button
            onClick={() => navigate(`/users/${user?.id}`)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl w-full text-left
             hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-150"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00d4ff, #0055cc)",
              }}
            >
              <span className="text-[12px] font-bold text-white">
                {user?.name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 dark:text-white/30 leading-none mb-0.5">
                {user?.roleName ?? "User"}
              </p>
              <p className="text-[14px] font-semibold text-gray-800 dark:text-white/80 truncate">
                {user?.name}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                logout();
                navigate("/login");
              }}
              className="text-gray-300 dark:text-white/20 hover:text-red-400 dark:hover:text-red-400 transition-colors p-1"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </button>

          <div className="px-2 pt-2 border-t border-gray-100 dark:border-white/5">
            <img
              src={dark ? logo : logoLight}
              alt="Novexus Solutions"
              className="h-45 object-contain opacity-100 dark:opacity-100 dark:brightness-200"
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
