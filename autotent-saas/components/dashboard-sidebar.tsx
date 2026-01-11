"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
    userEmail?: string;
}

export default function DashboardSidebar({ userEmail }: SidebarProps) {
    const pathname = usePathname();

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: "📊" },
        { name: "Projects", href: "/dashboard/projects", icon: "📁" },
        { name: "Jobs", href: "/dashboard/jobs", icon: "⚡" },
        { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <Link href="/dashboard" className="flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-2xl">A</span>
                    </div>
                    <div>
                        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                            AutoTent
                        </span>
                        <p className="text-xs text-gray-500">AI Content Generator</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isActive
                                    ? "gradient-primary text-white shadow-lg"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center space-x-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full gradient-info flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                            {userEmail?.charAt(0).toUpperCase() || "U"}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {userEmail || "User"}
                        </p>
                        <p className="text-xs text-gray-500">Free Plan</p>
                    </div>
                </div>
                <form action="/auth/signout" method="post" className="mt-2">
                    <button
                        type="submit"
                        className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        Sign Out
                    </button>
                </form>
            </div>
        </aside>
    );
}
