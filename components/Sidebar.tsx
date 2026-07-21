'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        {
            name: 'Dark Miner',
            path: '/',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17V10m5 7V6m5 11v-4" />
                </svg>
            )
        },
        {
            name: 'Workflow',
            path: '/workflow',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="7" height="9" rx="1.5" />
                    <rect x="14" y="3" width="7" height="5" rx="1.5" />
                    <rect x="14" y="12" width="7" height="9" rx="1.5" />
                    <rect x="3" y="16" width="7" height="5" rx="1.5" />
                </svg>
            )
        },
        {
            name: 'DarkThumb',
            path: '/thumbnail',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Dark Media',
            path: '/media',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="7" y1="2" x2="7" y2="22" strokeLinecap="round" />
                    <line x1="17" y1="2" x2="17" y2="22" strokeLinecap="round" />
                    <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
                    <line x1="2" y1="7" x2="7" y2="7" strokeLinecap="round" />
                    <line x1="2" y1="17" x2="7" y2="17" strokeLinecap="round" />
                    <line x1="17" y1="17" x2="22" y2="17" strokeLinecap="round" />
                    <line x1="17" y1="7" x2="22" y2="7" strokeLinecap="round" />
                </svg>
            )
        }
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen z-[100] bg-[#0a0a0a]/90 backdrop-blur-md border-r border-gray-800/40 transition-all duration-300 w-14 group hover:w-56 overflow-hidden flex flex-col">
            <div className="flex-1 pt-16 pb-6 flex flex-col gap-1 px-2">
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden
                                ${isActive
                                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_0_12px_rgba(79,70,229,0.1)]'
                                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                                }
                            `}
                        >
                            <div className="flex-shrink-0">
                                {item.icon}
                            </div>
                            <span className={`text-sm font-semibold tracking-wide transition-opacity duration-300 ${isActive ? 'text-indigo-300' : 'text-gray-300'} opacity-0 group-hover:opacity-100`}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>

            <div className="p-2 mb-3">
                <form action={async () => {
                    // Import inside to avoid client/server issues or use a separate client component
                    // Actually, let's use a standard POST form to a route or just use the action
                    const { logout } = await import('../app/actions/auth');
                    await logout();
                }}>
                    <button type="submit" className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap overflow-hidden text-red-500/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20">
                        <div className="flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold tracking-wide transition-opacity duration-300 opacity-0 group-hover:opacity-100">
                            Sair do Sistema
                        </span>
                    </button>
                </form>
            </div>
        </aside>
    );
}

