import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-[11px] uppercase tracking-[0.2em] font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-cyan-400 text-cyan-400 focus:border-cyan-300'
                    : 'border-transparent text-zinc-400 hover:border-zinc-800 hover:text-white focus:border-zinc-800 focus:text-white') +
                ' ' + className
            }
        >
            {children}
        </Link>
    );
}
