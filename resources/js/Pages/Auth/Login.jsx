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
                <div className="mt-8">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">
                            </span>
                        </div>
                    </div>

                    <div className="mt-6">
                        <a
                            // Sesuaikan URL ini dengan route Socialite Anda (contoh: /auth/github)
                            href="/auth/github/redirect"
                            className="w-full inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                            </svg>
                            GitHub
                        </a>
                    </div>
                </div>
            </form>
        </GuestLayout>
    );
}
