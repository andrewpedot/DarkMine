'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        {
            name: 'DarkMine',
            path: '/',
            icon: (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        },
        {
            name: 'DarkHook',
            path: '/hook',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            name: 'Biblioteca',
            path: '/library',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            name: 'DarkScript',
            path: '/script',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            )
        }
    ];

    return (
        <aside className="fixed left-0 top-0 h-screen z-[100] bg-[#0a0a0a]/90 backdrop-blur-md border-r border-gray-800/40 transition-all duration-300 w-16 group hover:w-64 overflow-hidden flex flex-col">
            <div className="flex-1 pt-20 pb-8 flex flex-col gap-2 px-3">
                {menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                        <Link 
                            key={item.path} 
                            href={item.path}
                            className={`flex items-center gap-4 px-2.5 py-3 rounded-xl transition-all duration-200 whitespace-nowrap overflow-hidden
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
        </aside>
    );
}
