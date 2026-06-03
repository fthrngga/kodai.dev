export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center rounded-none border border-transparent bg-white px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black transition duration-150 ease-in-out hover:bg-cyan-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 active:scale-[0.98] ${
                    disabled && 'opacity-25'
                } ` + className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}
