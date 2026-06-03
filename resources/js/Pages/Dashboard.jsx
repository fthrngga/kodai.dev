import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';

export default function Dashboard({ auth, projects }) {
    // --- State untuk Form Deploy Baru ---
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        github_repo: '',
        branch: 'main',
        custom_domain: '',
    });

    // --- State untuk Modal Environment (.env) ---
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const envForm = useForm({ env_text: '' });

    // Fungsi Submit Deploy
    const submit = (e) => {
        e.preventDefault();
        post(route('projects.store'), { onSuccess: () => reset() });
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
        
        // Buat template .env dasar agar pengguna tidak bingung
        const domain = project.custom_domain ? project.custom_domain : `${project.subdomain}.kodaidev.my.id`;
        const template = `APP_NAME="${project.name}"\nAPP_ENV=production\nAPP_KEY=\nAPP_DEBUG=false\nAPP_URL=http://${domain}\n\n# PASTE SISA .ENV ANDA DI BAWAH INI:\n# (TIDAK PERLU memasukkan DB_DATABASE dll, Kodaidev akan membuatnya otomatis!)\n\n`;
        
        envForm.setData('env_text', template);
        setIsEnvModalOpen(true);
    };

    // Fungsi Submit .env
    const submitEnv = (e) => {
        e.preventDefault();
        envForm.post(route('projects.env.store', selectedProject.id), {
            onSuccess: () => {
                setIsEnvModalOpen(false);
                alert('✨ Berhasil! Database telah terbuat dan migrasi selesai.');
            }
        });
    };    return (
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
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">🚀 Deploy Proyek Baru</h2>
                            <p className="mt-1 text-xs text-zinc-500 font-light">Hubungkan repositori GitHub Anda untuk proses integrasi dan migrasi otomatis.</p>
                        </header>
                        
                        <form onSubmit={submit} className="mt-6 space-y-6 max-w-xl">
                            <div>
                                <InputLabel htmlFor="name" value="Nama Proyek" />
                                <TextInput id="name" className="mt-1 block w-full text-xs font-mono py-2.5 px-4" value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Misal: Sanjai E-Commerce" />
                                <InputError className="mt-2 text-xs text-red-400" message={errors.name} />
                            </div>
                            <div>
                                <InputLabel htmlFor="github_repo" value="Path Repositori GitHub" />
                                <TextInput id="github_repo" className="mt-1 block w-full text-xs font-mono py-2.5 px-4" value={data.github_repo} onChange={(e) => setData('github_repo', e.target.value)} required placeholder="Misal: fathurrangga/sanjai-app" />
                                <InputError className="mt-2 text-xs text-red-400" message={errors.github_repo} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="branch" value="Branch GitHub" />
                                    <TextInput id="branch" className="mt-1 block w-full text-xs font-mono py-2.5 px-4" value={data.branch} onChange={(e) => setData('branch', e.target.value)} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="custom_domain" value="Domain Kustom" />
                                    <TextInput id="custom_domain" className="mt-1 block w-full text-xs font-mono py-2.5 px-4" value={data.custom_domain} onChange={(e) => setData('custom_domain', e.target.value)} placeholder="Opsional" />
                                </div>
                            </div>
                            <PrimaryButton disabled={processing}>Mulai Deploy</PrimaryButton>
                        </form>
                    </div>

                    {/* --- DAFTAR PROYEK --- */}
                    <div className="p-6 sm:p-8 bg-zinc-900/10 border border-zinc-900 backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent opacity-50" />
                        <header className="mb-6">
                            <span className="text-[9px] tracking-[0.3em] uppercase text-purple-400 font-medium">02. Active Instances</span>
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">Daftar Proyek Aktif</h2>
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
                                                <td className="px-6 py-4 font-medium text-white text-sm">{project.name}</td>
                                                <td className="px-6 py-4 font-mono text-zinc-500 text-[11px] group-hover/row:text-zinc-400 transition-colors">
                                                    {project.github_repo} <span className="text-cyan-500/60 font-bold">#{project.branch}</span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-[11px]">
                                                    <a
                                                        href={`http://${project.custom_domain || project.subdomain + '.kodaidev.my.id'}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-400 hover:text-cyan-300 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {project.custom_domain || project.subdomain + '.kodaidev.my.id'}
                                                        <svg className="w-3 h-3 opacity-50 group-hover/row:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border ${project.status === 'active' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-flex gap-2">
                                                        {/* TOMBOL BARU: SET ENV */}
                                                        {project.status === 'active' && (
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

            {/* --- MODAL POP-UP ENVIRONMENT --- */}
            <Modal show={isEnvModalOpen} onClose={() => setIsEnvModalOpen(false)}>
                <div className="p-6">
                    <header className="mb-4">
                        <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-medium">03. Environment Setup</span>
                        <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                            Konfigurasi Environment ({selectedProject?.name})
                        </h2>
                        <p className="text-xs text-zinc-500 font-light mt-1">
                            Salin dan tempel isi berkas <code className="bg-zinc-900 text-zinc-300 px-1.5 py-0.5 rounded font-mono text-[10px]">.env</code> lokal Anda ke sini. Database credentials akan disuntikkan otomatis oleh sistem.
                        </p>
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
                                {envForm.processing ? 'Memproses Database...' : 'Simpan & Jalankan Migrasi'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}