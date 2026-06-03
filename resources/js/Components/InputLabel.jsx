export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}) {
    return (
        <label
            {...props}
            className={
                `block text-xs uppercase tracking-[0.15em] font-medium text-zinc-400 ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}
