import InputError from '@/Components/InputError';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Login" />

            <div className="mb-8 text-center">
                <h2 className="text-2xl font-extralight tracking-tight uppercase mb-2">Access Portal</h2>
                <p className="text-zinc-500 text-sm font-light tracking-wide">Enter your credentials to proceed.</p>
            </div>

            {status && (
                <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs tracking-widest uppercase text-center">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-xs uppercase tracking-[0.2em] text-zinc-400 font-bold mb-2">
                        Email Address
                    </label>
                    <input
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        autoComplete="username"
                        autoFocus
                        onChange={(e) => setData('email', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-700"
                        placeholder="admin@kodai.dev"
                    />
                    <InputError message={errors.email} className="mt-2 text-red-400" />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="password" className="block text-xs uppercase tracking-[0.2em] text-zinc-400 font-bold">
                            Password
                        </label>
                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="text-[10px] uppercase tracking-[0.1em] text-cyan-500 hover:text-cyan-400 transition-colors"
                            >
                                Forgot?
                            </Link>
                        )}
                    </div>
                    <input
                        id="password"
                        type="password"
                        name="password"
                        value={data.password}
                        autoComplete="current-password"
                        onChange={(e) => setData('password', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white px-4 py-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-zinc-700"
                        placeholder="••••••••"
                    />
                    <InputError message={errors.password} className="mt-2 text-red-400" />
                </div>

                <div className="flex items-center">
                    <label className="flex items-center cursor-pointer group">
                        <div className="relative flex items-center justify-center w-4 h-4 mr-3 bg-zinc-900 border border-zinc-700 group-hover:border-cyan-500 transition-colors">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) => setData('remember', e.target.checked)}
                                className="absolute opacity-0 cursor-pointer w-full h-full z-10"
                            />
                            {data.remember && (
                                <div className="w-2 h-2 bg-cyan-500" />
                            )}
                        </div>
                        <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors uppercase tracking-[0.1em]">
                            Remember Session
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center h-12 bg-white text-black hover:bg-cyan-500 hover:text-white transition-all duration-500 group disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                >
                    <span className="text-xs uppercase tracking-[0.2em] font-bold">Authorize Access</span>
                    <ArrowUpRight className="ml-2 w-4 h-4 group-hover:rotate-45 transition-transform" />
                </button>
            </form>
        </GuestLayout>
    );
}
