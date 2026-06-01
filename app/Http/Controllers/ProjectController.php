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
        // 1. Validasi input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'github_repo' => 'required|string|max:255',
            'branch' => 'required|string|max:50',
            'custom_domain' => 'nullable|string|max:255|unique:projects,custom_domain',
        ]);

        // 2. Buat subdomain dasar yang "Bersih"
        $baseSlug = Str::slug($validated['name']);
        $subdomain = $baseSlug;
        
        // 3. Pengecekan Duplikasi Cerdas
        $counter = 1;
        while (Project::where('subdomain', $subdomain)->exists()) {
            // Jika 'sanjai' sudah ada, ubah jadi 'sanjai-1', cek lagi, dst.
            $subdomain = $baseSlug . '-' . $counter;
            $counter++;
        }

        $validated['subdomain'] = $subdomain;

        // 4. Simpan ke database (Ubah bagian ini)
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
            // 1. Eksekusi Hapus Folder (Source Code)
            if (\Illuminate\Support\Facades\File::exists($projectDir)) {
                \Illuminate\Support\Facades\Process::run("rm -rf {$projectDir}");
            }

            // 2. Eksekusi Hapus Nginx & Reload
            $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
            $nginxEnabled = "/etc/nginx/sites-enabled/{$domain}";
            \Illuminate\Support\Facades\Process::run("sudo rm -f {$nginxAvailable} {$nginxEnabled}");
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