<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Project; 
use App\Jobs\DeployProject;

class ProjectController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validasi input + Password Master Kodaidev
        $validated = $request->validate([
            'deploy_password' => 'required|string',
            'name' => 'required|string|max:255',
            'github_repo' => 'required|string|max:255',
            'branch' => 'required|string|max:50',
            'custom_domain' => 'nullable|string|max:255|unique:projects,custom_domain',
            'project_type' => 'required|string|in:laravel,static,spa,nodejs',
            'run_migration' => 'nullable|boolean',
        ], [
            'deploy_password.required' => 'Password Master wajib diisi untuk melakukan deploy.',
        ]);

        // Cek jika password salah
        if ($request->deploy_password !== '11223344') {
            return back()->withErrors(['deploy_password' => 'Akses Ditolak: Password Master Kodaidev salah!']);
        }

        // Hapus password dari array agar tidak ikut tersimpan ke tabel projects
        unset($validated['deploy_password']);

        // Set default run_migration jika tidak dikirim
        $validated['run_migration'] = $request->boolean('run_migration', false);

        // 2. Buat subdomain dasar yang "Bersih"
        $baseSlug = Str::slug($validated['name']);
        $subdomain = $baseSlug;
        
        // 3. Pengecekan Duplikasi Cerdas
        $counter = 1;
        while (Project::where('subdomain', $subdomain)->exists()) {
            $subdomain = $baseSlug . '-' . $counter;
            $counter++;
        }

        $validated['subdomain'] = $subdomain;

        // Alokasi Port Node otomatis jika tipe NodeJS
        if ($validated['project_type'] === 'nodejs') {
            $maxPort = Project::whereNotNull('node_port')->max('node_port');
            $validated['node_port'] = $maxPort ? $maxPort + 1 : 3000;
        }

        // 4. Simpan ke database
        $project = $request->user()->projects()->create($validated);

        // 5. Lempar tugas ke Pekerja Latar Belakang!
        DeployProject::dispatch($project);

        // 6. Kembali ke dashboard
        return back();
    }

    public function destroy(Project $project)
    {
        // Pastikan hanya pemilik yang bisa menghapus
        if (auth()->id() !== $project->user_id) {
            abort(403, 'Akses ditolak.');
        }

        $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $project->subdomain;
        $domain = $project->custom_domain ?: $project->subdomain . '.kodaidev.my.id';
        $dbName = 'kodai_' . str_replace('-', '_', $project->subdomain);

        try {
            // 0. Eksekusi Hapus PM2 jika Node.js
            if ($project->project_type === 'nodejs') {
                \Illuminate\Support\Facades\Process::run("pm2 delete kodai_{$project->subdomain}");
            }

            // 1. Eksekusi Hapus Folder (Source Code)
            if (\Illuminate\Support\Facades\File::exists($projectDir)) {
                \Illuminate\Support\Facades\Process::run("rm -rf {$projectDir}");
            }

            // 2. Eksekusi Hapus Nginx & Reload
            $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
            $nginxEnabled = "/etc/nginx/sites-enabled/{$domain}";
            $nginxAvailableSub = "/etc/nginx/sites-available/{$project->subdomain}";
            $nginxEnabledSub = "/etc/nginx/sites-enabled/{$project->subdomain}";
            \Illuminate\Support\Facades\Process::run("sudo rm -f {$nginxAvailable} {$nginxEnabled} {$nginxAvailableSub} {$nginxEnabledSub}");
            \Illuminate\Support\Facades\Process::run("sudo systemctl reload nginx");

            // 3. Eksekusi Hapus Database
            $dbCmd = "sudo mysql -e \"DROP DATABASE IF EXISTS \`{$dbName}\`;\"";
            \Illuminate\Support\Facades\Process::run($dbCmd);

            // 4. (Opsional) Bersihkan Sertifikat SSL dari Certbot agar tidak menumpuk
            \Illuminate\Support\Facades\Process::run("sudo certbot delete --cert-name {$domain} --non-interactive");

            // 5. Terakhir, Hapus Jejak dari Database Dasbor Kodaidev
            $project->delete();

            return back()->with('success', 'Proyek beserta file, database, dan jaringannya berhasil dihapus bersih!');
            
        } catch (\Exception $e) {
            return back()->withErrors(['error' => 'Gagal membersihkan proyek: ' . $e->getMessage()]);
        }
    }

}