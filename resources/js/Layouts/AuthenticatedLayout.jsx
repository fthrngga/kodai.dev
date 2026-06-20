import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { Toaster, toast } from 'sonner';
import { useEffect, useState } from 'react';

export default function AuthenticatedLayout({ header, children }) {
    const { auth, flash = {}, errors = {} } = usePage().props;
    const user = auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        
        if (errors && Object.keys(errors).length > 0) {
            Object.values(errors).forEach(errMsg => toast.error(errMsg));
        }
    }, [flash, errors]);

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden font-sans relative">
            
            <Toaster position="top-right" richColors theme="dark" />
            
            {/* ADVANCED BACKGROUND OVERLAY (Persis seperti Welcome.jsx) */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1e293b_0%,transparent_50%)] opacity-40" />
                <div className="absolute inset-0 bg-[url('/assets/images/noise.svg')] opacity-20 brightness-100 contrast-150" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
            </div>

            <nav className="relative z-50 border-b border-zinc-900 bg-zinc-950/40 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center gap-3 group cursor-pointer">
                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                        <div className="relative flex items-center justify-center w-8 h-8 bg-black border border-zinc-800 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition-colors">
                                                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
                                                <line x1="12" y1="22" x2="12" y2="15.5" />
                                                <polyline points="22 8.5 12 15.5 2 8.5" />
                                                <polyline points="2 15.5 12 8.5 22 15.5" />
                                                <line x1="12" y1="2" x2="12" y2="8.5" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="flex flex-col leading-none pt-1">
                                        <span className="text-base font-light tracking-[0.2em] uppercase">kodai<span className="text-cyan-500 font-bold">.dev</span></span>
                                    </div>
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Pusat Kendali
                                </NavLink>
                                <NavLink
                                    href={route('ai-builder.index')}
                                    active={route().current('ai-builder.*')}
                                >
                                    Laboratorium AI
                                </NavLink>
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center">
                            <div className="relative ms-3">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex">
                                            <button
                                                type="button"
                                                className="inline-flex items-center border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-xs uppercase tracking-wider text-zinc-400 transition duration-150 ease-in-out hover:text-white hover:border-zinc-700 focus:outline-none"
                                            >
                                                {user.name}

                                                <svg
                                                    className="-me-0.5 ms-2 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profil</Dropdown.Link>
                                        <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-none p-2 text-zinc-400 transition duration-150 ease-in-out hover:bg-zinc-900 hover:text-white focus:bg-zinc-900 focus:text-white focus:outline-none border border-zinc-800"
                            >
                                <svg className="h-5 w-5" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-lg'}>
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                            Pusat Kendali
                        </ResponsiveNavLink>
                    </div>

                    <div className="border-t border-zinc-900 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-xs uppercase tracking-wider font-medium text-white">{user.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{user.email}</div>
                        </div>
                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profil</ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button">Log Out</ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="relative z-10 border-b border-zinc-900 bg-zinc-950/20 backdrop-blur-md">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="relative z-10">{children}</main>
        </div>
    );
}