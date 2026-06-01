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
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Pusat Kendali Kodaidev</h2>}
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* --- KOTAK DEPLOY (Sama seperti sebelumnya) --- */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg border-t-4 border-indigo-600">
                        <header>
                            <h2 className="text-lg font-bold text-gray-900">🚀 Deploy Proyek Baru</h2>
                            <p className="mt-1 text-sm text-gray-600">Hubungkan repositori GitHub Anda.</p>
                        </header>
                        <form onSubmit={submit} className="mt-6 space-y-6 max-w-xl">
                            <div>
                                <InputLabel htmlFor="name" value="Nama Proyek" />
                                <TextInput id="name" className="mt-1 block w-full" value={data.name} onChange={(e) => setData('name', e.target.value)} required placeholder="Misal: Sanjai E-Commerce" />
                                <InputError className="mt-2" message={errors.name} />
                            </div>
                            <div>
                                <InputLabel htmlFor="github_repo" value="Path Repositori GitHub" />
                                <TextInput id="github_repo" className="mt-1 block w-full" value={data.github_repo} onChange={(e) => setData('github_repo', e.target.value)} required placeholder="Misal: fathurrangga/sanjai-app" />
                                <InputError className="mt-2" message={errors.github_repo} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="branch" value="Branch GitHub" />
                                    <TextInput id="branch" className="mt-1 block w-full" value={data.branch} onChange={(e) => setData('branch', e.target.value)} required />
                                </div>
                                <div>
                                    <InputLabel htmlFor="custom_domain" value="Domain Kustom" />
                                    <TextInput id="custom_domain" className="mt-1 block w-full" value={data.custom_domain} onChange={(e) => setData('custom_domain', e.target.value)} placeholder="Opsional" />
                                </div>
                            </div>
                            <PrimaryButton disabled={processing}>Mulai Deploy</PrimaryButton>
                        </form>
                    </div>

                    {/* --- DAFTAR PROYEK --- */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Daftar Proyek Aktif</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100 rounded-lg">
                                    <tr>
                                        <th className="px-6 py-4">Nama Proyek</th>
                                        <th className="px-6 py-4">Repositori</th>
                                        <th className="px-6 py-4">URL Akses</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.length === 0 ? (
                                        <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Belum ada proyek.</td></tr>
                                    ) : (
                                        projects.map((project) => (
                                            <tr key={project.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900">{project.name}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{project.github_repo} ({project.branch})</td>
                                                <td className="px-6 py-4 font-mono text-xs">
                                                    <a href={`http://${project.custom_domain || project.subdomain + '.kodaidev.my.id'}`} target="_blank" className="text-indigo-600 hover:underline">
                                                        {project.custom_domain || project.subdomain + '.kodaidev.my.id'}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${project.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {project.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    {/* TOMBOL BARU: SET ENV */}
                                                    {project.status === 'active' && (
                                                        <button onClick={() => openEnvModal(project)} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 hover:border-indigo-500 px-3 py-1 rounded-md transition-all">
                                                            ⚙️ Konfigurasi .env
                                                        </button>
                                                    )}
                                                    <button onClick={() => deleteProject(project.id)} className="text-red-500 hover:text-red-700 font-medium text-xs border border-red-200 hover:border-red-500 px-3 py-1 rounded-md transition-all">
                                                        Hapus
                                                    </button>
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
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        Konfigurasi Environment ({selectedProject?.name})
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Salin dan tempel isi file <code className="bg-gray-100 px-1 rounded">.env</code> lokal Anda ke sini. Kredensial Database akan dibuatkan dan disuntikkan secara otomatis.
                    </p>

                    <form onSubmit={submitEnv}>
                        <textarea
                            className="w-full h-64 font-mono text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-900 text-green-400 p-4"
                            value={envForm.data.env_text}
                            onChange={(e) => envForm.setData('env_text', e.target.value)}
                            required
                        ></textarea>
                        
                        <InputError className="mt-2" message={envForm.errors.env_text} />

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