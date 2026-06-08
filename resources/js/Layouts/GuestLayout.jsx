import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans flex flex-col items-center pt-6 sm:justify-center sm:pt-0">
            {/* ADVANCED BACKGROUND OVERLAY */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,transparent_50%)] opacity-40" />
                <div className="absolute inset-0 bg-[url('/assets/images/noise.svg')] opacity-20 brightness-100 contrast-150" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center mb-8">
                <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        <div className="relative flex items-center justify-center w-12 h-12 bg-black border border-zinc-800 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-zinc-400 group-hover:text-cyan-400 transition-colors">
                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                <line x1="12" y1="22" x2="12" y2="15.5" />
                                <polyline points="22 8.5 12 15.5 2 8.5" />
                                <polyline points="2 15.5 12 8.5 22 15.5" />
                                <line x1="12" y1="2" x2="12" y2="8.5" />
                            </svg>
                        </div>
                    </div>
                    <div className="flex flex-col leading-none pt-1">
                        <span className="text-2xl font-light tracking-[0.2em] uppercase">kodai<span className="text-cyan-500 font-bold">.dev</span></span>
                    </div>
                </Link>
            </div>

            <div className="relative z-10 w-full overflow-hidden border border-zinc-800 bg-zinc-950/60 backdrop-blur-xl px-8 py-10 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] sm:max-w-md">
                {children}
            </div>
        </div>
    );
}
