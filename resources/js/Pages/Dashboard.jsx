import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import axios from 'axios';

// Komponen Loading Spinner
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function Dashboard({ auth, projects, serverIp = '34.50.74.177' }) {
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

    // Modals Re-upload & Editor
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [editorFilename, setEditorFilename] = useState('');
    const [isSavingCode, setIsSavingCode] = useState(false);
    const [isLoadingCode, setIsLoadingCode] = useState(false);

    const updateForm = useForm({
        uploaded_file: null,
    });

    // State Modal Konfirmasi Kustom
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        confirmText: 'Yakin',
        cancelText: 'Batal',
        isDanger: false
    });

    const triggerConfirm = ({ title, message, onConfirm, confirmText = 'Yakin', cancelText = 'Batal', isDanger = false }) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                closeConfirm();
            },
            confirmText,
            cancelText,
            isDanger
        });
    };

    const closeConfirm = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

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

    // --- DETEKSI UPDATE & REDEPLOY MANUAL ---
    const [updates, setUpdates] = useState({});

    useEffect(() => {
        if (!projects || projects.length === 0) return;

        const githubProjects = projects.filter(p => p.github_repo && p.status.toLowerCase() === 'active');
        
        githubProjects.forEach(async (project) => {
            try {
                const response = await axios.get(route('projects.check-update', project.id));
                setUpdates(prev => ({
                    ...prev,
                    [project.id]: response.data
                }));
            } catch (err) {
                console.error("Gagal mengecek update untuk " + project.name, err);
            }
        });
    }, [projects]);

    const handleRedeploy = (projectId) => {
        triggerConfirm({
            title: 'Redeploy Proyek',
            message: 'Apakah Anda yakin ingin menarik kode terbaru dari GitHub dan mendeploy ulang proyek ini?',
            confirmText: 'Redeploy Sekarang',
            cancelText: 'Batal',
            isDanger: false,
            onConfirm: () => {
                router.post(route('projects.redeploy', projectId), {}, {
                    preserveScroll: true
                });
            }
        });
    };

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
        triggerConfirm({
            title: 'Hapus Proyek',
            message: 'Yakin ingin menghapus proyek ini? Semua berkas di server, database, SSL, dan riwayat deployment proyek ini akan terhapus secara permanen.',
            confirmText: 'Hapus Permanen',
            cancelText: 'Batal',
            isDanger: true,
            onConfirm: () => {
                router.delete(route('projects.destroy', id));
            }
        });
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

    const openUpdateModal = (project) => {
        setSelectedProject(project);
        updateForm.setData('uploaded_file', null);
        updateForm.clearErrors();
        setIsUpdateModalOpen(true);
    };

    const submitUpdate = (e) => {
        e.preventDefault();
        updateForm.post(route('projects.update-files', selectedProject.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsUpdateModalOpen(false);
                updateForm.reset();
            }
        });
    };

    // Modals Edit Domain
    const [isDomainModalOpen, setIsDomainModalOpen] = useState(false);
    const domainForm = useForm({
        subdomain: '',
        custom_domain: '',
    });

    const openDomainModal = (project) => {
        setSelectedProject(project);
        domainForm.setData({
            subdomain: project.subdomain,
            custom_domain: project.custom_domain || '',
        });
        domainForm.clearErrors();
        setIsDomainModalOpen(true);
    };

    const submitDomain = (e) => {
        e.preventDefault();
        domainForm.post(route('projects.update-domain', selectedProject.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsDomainModalOpen(false);
            }
        });
    };

    // Modals View Logs
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [logContent, setLogContent] = useState('');
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    const openLogModal = async (project) => {
        setSelectedProject(project);
        setIsLogModalOpen(true);
        setIsLoadingLogs(true);
        setLogContent('');

        try {
            const response = await axios.get(route('projects.logs', project.id));
            setLogContent(response.data.logs);
        } catch (error) {
            setLogContent('Gagal memuat log: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const openEditorModal = async (project) => {
        setSelectedProject(project);
        setIsEditorModalOpen(true);
        setIsLoadingCode(true);
        setEditorContent('');
        setEditorFilename('');

        try {
            const response = await axios.get(route('projects.read-file', project.id));
            setEditorContent(response.data.content);
            setEditorFilename(response.data.filename);
        } catch (error) {
            alert('Gagal membaca berkas: ' + (error.response?.data?.error || error.message));
            setIsEditorModalOpen(false);
        } finally {
            setIsLoadingCode(false);
        }
    };

    const saveCode = async () => {
        setIsSavingCode(true);
        try {
            const response = await axios.post(route('projects.save-file', selectedProject.id), {
                filename: editorFilename,
                content: editorContent
            });
            if (response.data.success) {
                setIsEditorModalOpen(false);
                alert('Kode berhasil disimpan secara langsung!');
            } else {
                alert('Gagal menyimpan: ' + response.data.message);
            }
        } catch (error) {
            alert('Gagal menyimpan kode: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSavingCode(false);
        }
    };

    const handleEditorScroll = (e) => {
        const textarea = e.target;
        const lineNumbersDiv = document.getElementById('editor-line-numbers');
        if (lineNumbersDiv) {
            lineNumbersDiv.scrollTop = textarea.scrollTop;
        }
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
                                    <TextInput id="custom_domain" className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white" value={data.custom_domain} onChange={(e) => setData('custom_domain', e.target.value)} placeholder="Misal: domainku.com" />
                                    <InputError className="mt-2 text-xs text-red-400" message={errors.custom_domain} />
                                    {data.custom_domain && (
                                        <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 leading-relaxed space-y-1">
                                            <div className="text-cyan-400 font-bold uppercase tracking-wider text-[9px] mb-1">📍 Panduan Konfigurasi DNS:</div>
                                            <div>Harap arahkan domain Anda di Registrar DNS Anda sebelum deploy:</div>
                                            <ul className="list-disc pl-4 text-zinc-500 space-y-0.5 mt-1">
                                                <li>Tipe: <span className="text-zinc-300">A Record</span> | Host: <span className="text-zinc-300">@</span> (atau subdomain) | IP Target: <span className="text-cyan-400 font-bold">{serverIp}</span></li>
                                                <li>Atau CNAME Record ke: <span className="text-zinc-300">kodaidev.my.id</span></li>
                                            </ul>
                                            <div className="text-[9px] text-zinc-500 mt-1 italic">
                                                * DNS harus sudah mengarah sepenuhnya ke IP VPS Kodai Dev agar sertifikat SSL (HTTPS) dapat diterbitkan secara sukses.
                                            </div>
                                        </div>
                                    )}
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
                                                        <div className="space-y-1">
                                                            <div>
                                                                {project.github_repo} <span className="text-cyan-500/60 font-bold">#{project.branch}</span>
                                                            </div>
                                                            {updates[project.id] && (
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                                    {updates[project.id].has_update ? (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                                            ⚠️ Update Tersedia
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-green-500/10 text-green-450 border border-green-500/20">
                                                                            ✓ Up to date
                                                                        </span>
                                                                    )}
                                                                    {(updates[project.id].current_commit || updates[project.id].latest_commit) && (
                                                                        <span className="text-[9px] text-zinc-650">
                                                                            ({updates[project.id].current_commit || 'none'} → {updates[project.id].latest_commit})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
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
                                                        {project.github_repo && project.status.toLowerCase() === 'active' && updates[project.id]?.has_update && (
                                                            <button
                                                                onClick={() => handleRedeploy(project.id)}
                                                                className="text-[10px] uppercase tracking-wider text-yellow-400 hover:text-yellow-300 font-bold border border-yellow-500/20 hover:border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 transition-all active:scale-95 animate-pulse"
                                                            >
                                                                🚀 Redeploy
                                                            </button>
                                                        )}
                                                        {project.status.toLowerCase() === 'active' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openEnvModal(project)}
                                                                    className="text-[10px] uppercase tracking-wider text-cyan-400 hover:text-cyan-300 font-bold border border-cyan-500/20 hover:border-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                                >
                                                                    ⚙️ Config .env
                                                                </button>
                                                                <button
                                                                    onClick={() => openDomainModal(project)}
                                                                    className="text-[10px] uppercase tracking-wider text-purple-400 hover:text-purple-300 font-bold border border-purple-500/20 hover:border-purple-500 bg-purple-500/5 hover:bg-purple-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                                >
                                                                    🔗 Edit Domain
                                                                </button>
                                                            </>
                                                        )}
                                                        {!project.github_repo && project.status.toLowerCase() === 'active' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openUpdateModal(project)}
                                                                    className="text-[10px] uppercase tracking-wider text-yellow-400 hover:text-yellow-300 font-bold border border-yellow-500/20 hover:border-yellow-500 bg-yellow-500/5 hover:bg-yellow-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                                >
                                                                    📁 Update
                                                                </button>
                                                                {project.project_type !== 'nodejs' && (
                                                                    <button
                                                                        onClick={() => openEditorModal(project)}
                                                                        className="text-[10px] uppercase tracking-wider text-green-400 hover:text-green-300 font-bold border border-green-500/20 hover:border-green-500 bg-green-500/5 hover:bg-green-500/10 px-3 py-1.5 transition-all active:scale-95"
                                                                    >
                                                                        📝 Edit Code
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                        {project.status.toLowerCase() !== 'pending' && (
                                                            <button
                                                                onClick={() => openLogModal(project)}
                                                                className="text-[10px] uppercase tracking-wider text-zinc-300 hover:text-white font-bold border border-zinc-800 hover:border-zinc-700 bg-zinc-900/5 hover:bg-zinc-900 px-3 py-1.5 transition-all active:scale-95"
                                                            >
                                                                📋 Lihat Log
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

            {/* --- MODAL UPDATE FILES (RE-UPLOAD) --- */}
            <Modal show={isUpdateModalOpen} onClose={() => { setIsUpdateModalOpen(false); updateForm.clearErrors(); }}>
                <div className="p-6 bg-zinc-950 border border-zinc-800">
                    <header className="mb-4">
                        <span className="text-[9px] tracking-[0.3em] uppercase text-yellow-400 font-medium">04. Update Project Files</span>
                        <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                            Perbarui File ({selectedProject?.name})
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 font-light">Unggah berkas baru (.zip, .html, .php) untuk menimpa file lama.</p>
                    </header>

                    <form onSubmit={submitUpdate}>
                        <div className="mt-4">
                            <div className="relative border border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 p-8 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                                <input
                                    type="file"
                                    accept=".zip,.html,.php"
                                    onChange={(e) => updateForm.setData('uploaded_file', e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    required
                                />
                                <div className="text-center space-y-2">
                                    <div className="text-zinc-400 group-hover:text-yellow-400 transition-colors text-lg">
                                        {updateForm.data.uploaded_file ? '📄' : '📤'}
                                    </div>
                                    <div className="text-xs font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors">
                                        {updateForm.data.uploaded_file ? updateForm.data.uploaded_file.name : 'Pilih berkas baru atau seret kemari'}
                                    </div>
                                    <div className="text-[10px] text-zinc-600 font-mono">
                                        {updateForm.data.uploaded_file ? `${(updateForm.data.uploaded_file.size / 1024 / 1024).toFixed(2)} MB` : 'Mendukung .zip, .html, atau .php'}
                                    </div>
                                </div>
                            </div>
                            <InputError className="mt-2 text-xs text-red-400" message={updateForm.errors.uploaded_file} />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => { setIsUpdateModalOpen(false); updateForm.clearErrors(); }}>Batal</SecondaryButton>
                            <PrimaryButton disabled={updateForm.processing} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold uppercase tracking-wider text-[10px]">
                                {updateForm.processing ? <><Spinner /> Memproses...</> : 'Unggah & Deploy Ulang'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* --- MODAL EDIT DOMAIN --- */}
            <Modal show={isDomainModalOpen} onClose={() => { setIsDomainModalOpen(false); domainForm.clearErrors(); }}>
                <div className="p-6 bg-zinc-950 border border-zinc-800 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                    <header className="mb-4">
                        <span className="text-[9px] tracking-[0.3em] uppercase text-purple-400 font-medium font-mono">06. Domain Settings</span>
                        <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                            Ubah Domain ({selectedProject?.name})
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 font-light">
                            Ubah subdomain dasar atau tambahkan domain kustom eksternal untuk proyek ini.
                        </p>
                    </header>

                    <form onSubmit={submitDomain} className="space-y-6 mt-6">
                        <div>
                            <InputLabel htmlFor="edit_subdomain" value="Subdomain Dasar" />
                            <div className="flex mt-1">
                                <TextInput
                                    id="edit_subdomain"
                                    type="text"
                                    value={domainForm.data.subdomain}
                                    onChange={(e) => domainForm.setData('subdomain', e.target.value)}
                                    className="block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white focus:border-purple-500 focus:ring-purple-500/50"
                                    required
                                />
                                <span className="inline-flex items-center px-4 bg-zinc-900 border border-l-0 border-zinc-800 text-zinc-500 font-mono text-xs select-none">
                                    .kodaidev.my.id
                                </span>
                            </div>
                            <InputError className="mt-2 text-xs text-red-400" message={domainForm.errors.subdomain} />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_custom_domain" value="Domain Kustom (Opsional)" />
                            <TextInput
                                id="edit_custom_domain"
                                type="text"
                                value={domainForm.data.custom_domain}
                                onChange={(e) => domainForm.setData('custom_domain', e.target.value)}
                                className="mt-1 block w-full text-xs font-mono py-2.5 px-4 bg-zinc-900 border-zinc-800 text-white focus:border-purple-500 focus:ring-purple-500/50"
                                placeholder="domainku.com"
                            />
                            <InputError className="mt-2 text-xs text-red-400" message={domainForm.errors.custom_domain} />
                            
                            {domainForm.data.custom_domain && (
                                <div className="mt-2 p-3 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 leading-relaxed space-y-1">
                                    <div className="text-purple-400 font-bold uppercase tracking-wider text-[9px] mb-1">📍 Panduan Konfigurasi DNS:</div>
                                    <div>Harap arahkan domain Anda di Registrar DNS Anda sebelum menyimpan:</div>
                                    <ul className="list-disc pl-4 text-zinc-500 space-y-0.5 mt-1">
                                        <li>Tipe: <span className="text-zinc-300">A Record</span> | Host: <span className="text-zinc-300">@</span> (atau subdomain) | IP Target: <span className="text-purple-400 font-bold">{serverIp}</span></li>
                                        <li>Atau CNAME Record ke: <span className="text-zinc-300">kodaidev.my.id</span></li>
                                    </ul>
                                    <div className="text-[9px] text-zinc-500 mt-1 italic">
                                        * DNS harus sudah mengarah sepenuhnya ke IP VPS Kodai Dev agar sertifikat SSL (HTTPS) dapat diterbitkan secara sukses.
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <SecondaryButton onClick={() => { setIsDomainModalOpen(false); domainForm.clearErrors(); }}>Batal</SecondaryButton>
                            <PrimaryButton disabled={domainForm.processing} className="bg-purple-600 hover:bg-purple-500 font-bold uppercase tracking-wider text-[10px]">
                                {domainForm.processing ? <><Spinner /> Memproses...</> : 'Simpan Perubahan'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* --- MODAL VIEW LOGS --- */}
            <Modal show={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} maxWidth="3xl">
                <div className="p-6 bg-zinc-950 border border-zinc-800 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-zinc-500 via-cyan-500 to-zinc-500" />
                    <header className="mb-4 flex justify-between items-center">
                        <div>
                            <span className="text-[9px] tracking-[0.3em] uppercase text-cyan-400 font-medium font-mono">07. Deployment Terminal Logs</span>
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                                Log Proyek ({selectedProject?.name})
                            </h2>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                            Status: <span className="uppercase text-cyan-400">{selectedProject?.status}</span>
                        </div>
                    </header>

                    {isLoadingLogs ? (
                        <div className="h-[350px] flex items-center justify-center border border-zinc-900 bg-black text-zinc-500 font-mono text-xs">
                            <Spinner /> Membaca log dari server...
                        </div>
                    ) : (
                        <div className="border border-zinc-900 bg-black p-4 font-mono text-xs text-green-450 h-[350px] overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                            {logContent || 'Tidak ada catatan log.'}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <SecondaryButton onClick={() => setIsLogModalOpen(false)}>Tutup</SecondaryButton>
                    </div>
                </div>
            </Modal>

            {/* --- MODAL CLOUD CODE EDITOR --- */}
            <Modal show={isEditorModalOpen} onClose={() => setIsEditorModalOpen(false)} maxWidth="4xl">
                <div className="p-6 bg-zinc-950 border border-zinc-800 text-white relative overflow-hidden">
                    <header className="mb-4 flex justify-between items-center">
                        <div>
                            <span className="text-[9px] tracking-[0.3em] uppercase text-green-400 font-medium">05. Cloud Code Editor</span>
                            <h2 className="text-xl font-light tracking-tight text-white uppercase mt-1">
                                Edit: <span className="text-green-400 font-mono font-bold text-sm lowercase">{editorFilename}</span>
                            </h2>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                            {selectedProject?.name}
                        </div>
                    </header>

                    {isLoadingCode ? (
                        <div className="h-[400px] flex items-center justify-center border border-zinc-900 bg-zinc-950 text-zinc-500 font-mono text-xs">
                            <Spinner /> Membaca berkas dari server...
                        </div>
                    ) : (
                        <div className="border border-zinc-800 flex bg-zinc-950 overflow-hidden rounded-md shadow-2xl relative h-[350px] md:h-[450px]">
                            {/* Line Numbers */}
                            <div 
                                id="editor-line-numbers" 
                                className="w-10 bg-zinc-900 border-r border-zinc-800 text-right pr-2.5 py-4 select-none overflow-hidden text-[10px] font-mono text-zinc-600 leading-[20px] h-full"
                            >
                                {Array.from({ length: editorContent.split('\n').length }, (_, i) => i + 1).map(line => (
                                    <div key={line} className="h-[20px] leading-[20px]">{line}</div>
                                ))}
                            </div>

                            {/* Text Area Code Editor */}
                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                onScroll={handleEditorScroll}
                                className="flex-1 bg-zinc-950 text-green-400 font-mono text-[10px] py-4 px-3.5 focus:outline-none focus:ring-0 border-0 resize-none leading-[20px] h-full overflow-auto whitespace-pre"
                                placeholder="// Mulai ketik kode di sini..."
                                spellCheck="false"
                            />
                        </div>
                    )}

                    <div className="mt-6 flex justify-between items-center">
                        <div className="text-[10px] text-zinc-500 font-mono">
                            Menyimpan langsung ke root aplikasi
                        </div>
                        <div className="flex gap-3">
                            <SecondaryButton onClick={() => setIsEditorModalOpen(false)}>Batal</SecondaryButton>
                            <PrimaryButton 
                                onClick={saveCode} 
                                disabled={isSavingCode || isLoadingCode} 
                                className="bg-green-600 hover:bg-green-500 text-black font-bold uppercase tracking-wider text-[10px]"
                            >
                                {isSavingCode ? <><Spinner /> Menyimpan...</> : 'Simpan Kode'}
                            </PrimaryButton>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* --- MODAL KONFIRMASI CUSTOM --- */}
            <Modal show={confirmModal.isOpen} onClose={closeConfirm} maxWidth="md">
                <div className="p-6 bg-zinc-950 border border-zinc-800 text-white relative overflow-hidden">
                    {/* Top border highlight gradient */}
                    <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${confirmModal.isDanger ? 'from-red-500 via-orange-500 to-red-500' : 'from-cyan-500 via-blue-500 to-cyan-500'}`} />
                    
                    <h2 className="text-base font-light uppercase tracking-widest text-white flex items-center gap-2">
                        <span className={`${confirmModal.isDanger ? 'text-red-500 animate-pulse' : 'text-cyan-400'} font-bold`}>
                            {confirmModal.isDanger ? '⚠️' : '⚡'}
                        </span>
                        {confirmModal.title}
                    </h2>
                    
                    <p className="mt-4 text-xs text-zinc-400 font-mono leading-relaxed">
                        {confirmModal.message}
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeConfirm}>{confirmModal.cancelText}</SecondaryButton>
                        <PrimaryButton 
                            onClick={confirmModal.onConfirm}
                            className={confirmModal.isDanger ? '!bg-red-600 hover:!bg-red-500 !text-white border-red-700 font-bold uppercase tracking-wider text-[10px]' : '!bg-cyan-500 hover:!bg-cyan-400 !text-black border-cyan-600 font-bold uppercase tracking-wider text-[10px]'}
                        >
                            {confirmModal.confirmText}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}