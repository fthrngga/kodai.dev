import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-[11px] uppercase tracking-[0.2em] font-medium transition duration-150 ease-in-out focus:outline-none ${
                active
                    ? 'border-cyan-400 bg-cyan-950/20 text-cyan-400 focus:border-cyan-300'
                    : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/50 hover:text-white focus:border-zinc-800 focus:bg-zinc-900/50 focus:text-white'
            } ${className}`}
        >
            {children}
        </Link>
    );
}
