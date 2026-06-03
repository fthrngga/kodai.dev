export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center rounded-none border border-zinc-800 bg-transparent px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 shadow-sm transition duration-150 ease-in-out hover:bg-zinc-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-25 active:scale-[0.98] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
