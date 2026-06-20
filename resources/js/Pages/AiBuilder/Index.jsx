import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import InputLabel from '@/Components/InputLabel';

export default function Index({ auth, projects }) {
    const { data, setData, post, processing, errors } = useForm({
        prompt: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('ai-builder.store'));
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-sm font-light tracking-[0.2em] uppercase text-white">Laboratorium <span className="text-cyan-400 font-bold">AI Kodaidev</span></h2>}
        >
            <Head title="AI App Builder" />

            <div className="py-12 relative z-10">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    
                    {/* --- KOTAK GENERATE --- */}
                    <div className="p-6 sm:p-8 bg-zinc-900/10 border border-zinc-900 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-50" />
                        
                        <header className="mb-6">
                            <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-medium">01. Initialization</span>
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">Sintesis Proyek Baru</h2>
                            <p className="mt-1 text-xs text-zinc-500 font-light">
                                Deskripsikan visi web/aplikasi Anda, biarkan AI Gemini Kodaidev merangkainya untuk Anda.
                            </p>
                        </header>

                        <form onSubmit={submit} className="mt-6 space-y-6">
                            <div>
                                <InputLabel htmlFor="prompt" value="Instruksi Pembangunan" className="text-xs text-zinc-400 font-mono uppercase tracking-wider" />
                                <textarea
                                    id="prompt"
                                    className="mt-2 block w-full text-xs font-mono py-4 px-4 bg-zinc-900 border-zinc-800 text-cyan-50 focus:border-cyan-500 focus:ring-cyan-500/50 shadow-inner h-32"
                                    value={data.prompt}
                                    onChange={(e) => setData('prompt', e.target.value)}
                                    required
                                    placeholder="Contoh: Buatkan saya landing page rumah sakit modern berwarna gelap lengkap dengan fitur pendaftaran..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="px-6 py-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500 transition-all font-mono text-xs uppercase tracking-wider font-bold shadow-[0_0_15px_rgba(6,182,212,0.1)] active:scale-95 disabled:opacity-50"
                            >
                                {processing ? 'Memulai Proses...' : '⚙️ Generate Engine'}
                            </button>
                        </form>
                    </div>

                    {/* --- DAFTAR PROYEK AI --- */}
                    {projects && projects.length > 0 && (
                        <div className="p-6 sm:p-8 bg-zinc-900/10 border border-zinc-900 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50" />
                            <header className="mb-6">
                                <span className="text-[9px] tracking-[0.3em] uppercase text-purple-400 font-medium">02. Archives</span>
                                <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">Riwayat Eksperimen AI</h2>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map((project) => (
                                    <div key={project.id} className="border border-zinc-800 bg-zinc-900/50 p-5 hover:border-purple-500/50 transition-colors flex flex-col justify-between group/card relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                        <div className="relative z-10">
                                            <h3 className="font-mono font-bold text-white text-sm truncate">{project.name}</h3>
                                            <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-wider flex items-center gap-2">
                                                Status: 
                                                <span className={`px-2 py-0.5 border ${project.status === 'draft' ? 'border-zinc-700 text-zinc-400' : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10'}`}>
                                                    {project.status}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="mt-6 relative z-10">
                                            <Link 
                                                href={route('ai-builder.show', project.id)}
                                                className="inline-flex items-center text-[10px] font-mono text-purple-400 hover:text-purple-300 uppercase tracking-widest group-hover/card:underline"
                                            >
                                                Buka Workspace &rarr;
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
