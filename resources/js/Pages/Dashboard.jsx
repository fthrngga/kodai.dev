import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';

// Komponen Loading Spinner
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function Dashboard({ auth, projects }) {
    // --- State untuk Form Deploy Baru & Password Master ---
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        name: '',
        github_repo: '',
        branch: 'main',
        custom_domain: '',
        deploy_password: '', // Tambahan untuk keamanan
        project_type: 'laravel',
        run_migration: false,
        source_type: 'github',
        uploaded_file: null,
    });

    // --- State Modal ---
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const envForm = useForm({ env_text: '' });

    // --- REALTIME POLLING: Cek otomatis tanpa refresh ---
    const isDeploying = projects?.some(project => project.status.toLowerCase() === 'pending');

    useEffect(() => {
        let interval;
        if (isDeploying) {
            // Ping server tiap 3 detik hanya di balik layar
            interval = setInterval(() => {
                router.reload({ only: ['projects'], preserveScroll: true, preserveState: true });
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isDeploying]);

    // Buka Modal Password
    const openPasswordModal = (e) => {
        e.preventDefault();
        setIsPasswordModalOpen(true);
    };

    // Eksekusi Deploy setelah masukin password
    const executeDeploy = (e) => {
        e.preventDefault();
        post(route('projects.store'), { 
            preserveScroll: true,
            onSuccess: () => {
                setIsPasswordModalOpen(false);
                reset();
            },
            onError: () => {
                setData('deploy_password', ''); // Kosongkan sandi jika salah
            }
        });
    };

    // Fungsi Hapus
    const deleteProject = (id) => {
        if (confirm('Yakin ingin menghapus proyek ini? Semua riwayat akan ikut terhapus.')) {
            router.delete(route('projects.destroy', id));
        }
    };

    // Fungsi Membuka Modal .env
    const openEnvModal = (project) => {
        setSelectedProject(project);
        const domain = project.custom_domain ? project.custom_domain : `${project.subdomain}.kodaidev.my.id`;
        let template = '';
        
        if (project.project_type === 'laravel') {
            template = `APP_NAME="${project.name}"\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=http://${domain}\n\n# PASTE SISA .ENV ANDA DI BAWAH INI:\n# (TIDAK PERLU memasukkan DB_DATABASE dll, Kodaidev akan membuatnya otomatis!)\n\n`;
        } else if (project.project_type === 'nodejs') {
            template = `PORT=${project.node_port || 3000}\nNODE_ENV=production\n\n# PASTE SISA .ENV ANDA DI BAWAH INI:\n# (Kodaidev secara otomatis menginjeksi variabel DB_HOST, DB_DATABASE, dll. jika Anda butuh MySQL)\n\n`;
        } else {
            template = `# PASTE CONFIG .ENV STATIS ANDA DI BAWAH INI:\n# (Variabel ini akan di-inject saat build time oleh bundler seperti Vite)\n\n`;
        }

        envForm.setData('env_text', template);
        setIsEnvModalOpen(true);
    };

    // Fungsi Submit .env
    const submitEnv = (e) => {
        e.preventDefault();
        envForm.post(route('projects.env.store', selectedProject.id), {
            onSuccess: () => {
                setIsEnvModalOpen(false);
                // Alert bawaan dihapus, diganti oleh Sonner di Layout!
            }
        });
    };    

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="text-sm font-light tracking-[0.2em] uppercase text-white">Pusat Kendali <span className="text-cyan-400 font-bold">Kodaidev</span></h2>}
        >
            <Head title="Dashboard" />

            <div className="py-12 relative z-10">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-8">
                    
                    {/* --- KOTAK DEPLOY --- */}
                    <div className="p-6 sm:p-8 bg-zinc-900/10 border border-zinc-900 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-50" />
                        <header className="mb-6">
                            <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-medium">01. Code Deployment</span>
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">Deploy Proyek Baru</h2>
                            <p className="mt-1 text-xs text-zinc-500 font-light">Hubungkan repositori GitHub Anda untuk proses integrasi dan migrasi otomatis.</p>
                        </header>
                        
                        <form onSubmit={openPasswordModal} className="mt-6 space-y-6 max-w-xl">
                            <div>
                                <InputLabel htmlFor="name" value="Nama Proyek" />
                                <TextInput id="name" className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white" value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Misal: Sanjai E-Commerce" />
                                <InputError className="mt-2 text-xs text-red-400" message={errors.name} />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Metode Deployment</label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setData('source_type', 'github')}
                                        className={`py-3 px-4 text-xs font-mono text-center border font-bold uppercase transition-all tracking-wider ${data.source_type === 'github' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'bg-zinc-950 text-zinc-600 border-zinc-900 hover:border-zinc-800'}`}
                                    >
                                        🐱 GitHub Repository
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setData('source_type', 'upload')}
                                        className={`py-3 px-4 text-xs font-mono text-center border font-bold uppercase transition-all tracking-wider ${data.source_type === 'upload' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]' : 'bg-zinc-950 text-zinc-600 border-zinc-900 hover:border-zinc-800'}`}
                                    >
                                        📁 Direct File Upload
                                    </button>
                                </div>
                            </div>

                            {data.source_type === 'github' ? (
                                <>
                                    <div>
                                        <InputLabel htmlFor="github_repo" value="Path Repositori GitHub" />
                                        <TextInput id="github_repo" className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white" value={data.github_repo} onChange={(e) => setData('github_repo', e.target.value)} required placeholder="Misal: fathurrangga/sanjai-app" />
                                        <InputError className="mt-2 text-xs text-red-400" message={errors.github_repo} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="project_type" value="Tipe Proyek" />
                                            <select
                                                id="project_type"
                                                className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white rounded-none focus:border-cyan-500 focus:ring-cyan-500/50"
                                                value={data.project_type}
                                                onChange={(e) => setData('project_type', e.target.value)}
                                                required
                                            >
                                                <option value="laravel">Laravel (Inertia/Blade/API)</option>
                                                <option value="static">Static Web (HTML Native)</option>
                                                <option value="spa">Single Page App (React/Vue SPA)</option>
                                                <option value="nodejs">Node.js Server App (Express/NestJS)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="branch" value="Branch GitHub" />
                                            <TextInput id="branch" className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white" value={data.branch} onChange={(e) => setData('branch', e.target.value)} required />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <InputLabel htmlFor="uploaded_file" value="Pilih File (.zip, .html, .php)" />
                                        <div className="mt-1 relative border border-dashed border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950 p-6 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                            <input
                                                id="uploaded_file"
                                                type="file"
                                                accept=".zip,.html,.php"
                                                onChange={(e) => setData('uploaded_file', e.target.files[0])}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                required
                                            />
                                            <div className="text-center space-y-2">
                                                <div className="text-zinc-400 group-hover:text-cyan-400 transition-colors text-lg">
                                                    {data.uploaded_file ? '📄' : '📤'}
                                                </div>
                                                <div className="text-xs font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                                    {data.uploaded_file ? data.uploaded_file.name : 'Pilih berkas atau seret kemari'}
                                                </div>
                                                <div className="text-[10px] text-zinc-600 font-mono">
                                                    {data.uploaded_file ? `${(data.uploaded_file.size / 1024 / 1024).toFixed(2)} MB` : 'Maksimal 50MB (.zip, .html, .php)'}
                                                </div>
                                            </div>
                                        </div>
                                        <InputError className="mt-2 text-xs text-red-400" message={errors.uploaded_file} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="project_type" value="Tipe Proyek (Deteksi Otomatis)" />
                                            <select
                                                id="project_type"
                                                className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white rounded-none focus:border-cyan-500 focus:ring-cyan-500/50"
                                                value={data.project_type}
                                                onChange={(e) => setData('project_type', e.target.value)}
                                            >
                                                <option value="">Auto-Detect</option>
                                                <option value="laravel">PHP Native / Laravel</option>
                                                <option value="static">Static Web (HTML Native)</option>
                                                <option value="spa">Single Page App (React/Vue SPA)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-zinc-500 text-xs font-medium font-mono select-none">&nbsp;</label>
                                            <div className="mt-2.5 text-[10px] text-zinc-500 font-light leading-relaxed">
                                                * ZIP otomatis diekstrak. File PHP akan berjalan menggunakan PHP-FPM.
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="custom_domain" value="Domain Kustom" />
                                    <TextInput id="custom_domain" className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white" value={data.custom_domain} onChange={(e) => setData('custom_domain', e.target.value)} placeholder="Opsional" />
                                </div>
                                {data.project_type === 'laravel' && (
                                    <div className="flex items-center mt-6">
                                        <input
                                            id="run_migration"
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-cyan-500 focus:ring-cyan-500/50"
                                            checked={data.run_migration}
                                            onChange={(e) => setData('run_migration', e.target.checked)}
                                        />
                                        <label htmlFor="run_migration" className="ml-2 text-xs font-light text-zinc-400 select-none cursor-pointer">
                                            Jalankan Migrasi Database (`artisan migrate`)
                                        </label>
                                    </div>
                                )}
                            </div>
                            <PrimaryButton type="submit">Siapkan Deployment</PrimaryButton>
                        </form>
                    </div>

                    {/* --- DAFTAR PROYEK --- */}
                    <div className="p-6 sm:p-8 bg-zinc-900/10 border border-zinc-900 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50" />
                        <header className="mb-6 flex justify-between items-center">
                            <div>
                                <span className="text-[9px] tracking-[0.3em] uppercase text-purple-400 font-medium">02. Active Instances</span>
                                <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">Daftar Proyek Aktif</h2>
                            </div>
                            {isDeploying && (
                                <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-2">
                                    <Spinner /> Syncing with Server...
                                </div>
                            )}
                        </header>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left text-zinc-400 border-collapse">
                                <thead className="text-[10px] text-zinc-500 uppercase tracking-wider border-b border-zinc-900">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Nama Proyek</th>
                                        <th className="px-6 py-4 font-semibold">Repositori</th>
                                        <th className="px-6 py-4 font-semibold">URL Akses</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-900/50">
                                    {projects.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-12 text-center text-zinc-600 font-mono">
                                                [ NO_ACTIVE_DEPLOYMENTS ]
                                            </td>
                                        </tr>
                                    ) : (
                                        projects.map((project) => (
                                            <tr key={project.id} className="hover:bg-zinc-900/20 transition-colors group/row">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-white text-sm">{project.name}</div>
                                                    <div className="text-[9px] tracking-wider text-zinc-500 uppercase mt-0.5 flex gap-2 items-center">
                                                        <span className="px-1.5 py-0.5 border border-zinc-800 bg-zinc-900/50 text-zinc-400 font-mono font-bold">{project.project_type}</span>
                                                        {project.project_type === 'nodejs' && project.node_port && (
                                                            <span className="text-cyan-400 font-mono">Port: {project.node_port}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-zinc-500 text-[11px] group-hover/row:text-zinc-400 transition-colors">
                                                    {project.github_repo ? (
                                                        <>
                                                            {project.github_repo} <span className="text-cyan-500/60 font-bold">#{project.branch}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-zinc-600 font-light">[ DIRECT_UPLOAD ]</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[11px]">
                                                    {project.status === 'pending' ? (
                                                        <span className="text-zinc-600">Menunggu IP...</span>
                                                    ) : (
                                                        <a
                                                            href={`https://${project.custom_domain || project.subdomain + '.kodaidev.my.id'}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                                                        >
                                                            {project.custom_domain || project.subdomain + '.kodaidev.my.id'}
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${project.status.toLowerCase() === 'active' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'}`}>
                                                        {project.status.toLowerCase() === 'pending' && <Spinner />}
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex gap-2">
                                                        {project.status.toLowerCase() === 'active' && (
                                                            <button
                                                                onClick={() => openEnvModal(project)}
                                                                className="text-[10px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-500/20 hover:border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                            >
                                                                ⚙️ Config .env
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteProject(project.id)}
                                                            className="text-[10px] uppercase tracking-wider text-red-400 hover:text-red-300 font-bold border border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                        >
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODAL PASSWORD MASTER --- */}
            <Modal show={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); clearErrors(); }}>
                <div className="p-6 bg-zinc-950 border border-zinc-800 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500" />
                    <h2 className="text-lg font-light uppercase tracking-widest text-white">
                        <span className="text-red-500 font-bold mr-2">!</span>Otorisasi Keamanan
                    </h2>
                    <p className="mt-2 text-xs text-zinc-400 font-mono leading-relaxed">
                        Sistem mendeteksi upaya eksekusi pembuatan server baru. Harap masukkan Password Master Kodaidev untuk mengotorisasi perintah.
                    </p>

                    <form onSubmit={executeDeploy} className="mt-6">
                        <InputLabel htmlFor="deploy_password" value="Password Master" className="sr-only" />
                        <TextInput
                            id="deploy_password"
                            type="password"
                            name="deploy_password"
                            value={data.deploy_password}
                            onChange={(e) => setData('deploy_password', e.target.value)}
                            className="mt-1 block w-full bg-black border-zinc-800 text-red-400 text-center tracking-[0.5em] font-mono focus:border-red-500 focus:ring-red-500/50"
                            isFocused
                            placeholder="••••••••"
                        />
                        <InputError message={errors.deploy_password} className="mt-2 text-center text-red-500 bg-red-500/10 py-1" />

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => { setIsPasswordModalOpen(false); clearErrors(); }}>Batal</SecondaryButton>
                            <PrimaryButton disabled={processing} className="bg-red-600 hover:bg-red-500">
                                {processing ? <><Spinner /> Memverifikasi...</> : 'Otorisasi & Deploy'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* --- MODAL POP-UP ENVIRONMENT --- */}
            <Modal show={isEnvModalOpen} onClose={() => setIsEnvModalOpen(false)}>
                <div className="p-6 bg-zinc-950 border border-zinc-800">
                    <header className="mb-4">
                        <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-medium">03. Environment Setup</span>
                        <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                            Konfigurasi ({selectedProject?.name})
                        </h2>
                    </header>

                    <form onSubmit={submitEnv}>
                        <textarea
                            className="w-full h-64 font-mono text-xs border border-zinc-800 rounded-none shadow-sm focus:border-cyan-500 focus:ring-cyan-500/50 bg-black text-green-400 p-4"
                            value={envForm.data.env_text}
                            onChange={(e) => envForm.setData('env_text', e.target.value)}
                            required
                        ></textarea>
                        
                        <InputError className="mt-2 text-xs text-red-400" message={envForm.errors.env_text} />

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => setIsEnvModalOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton disabled={envForm.processing}>
                                {envForm.processing ? <><Spinner /> Merakit Sistem...</> : 'Simpan & Migrasi'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}