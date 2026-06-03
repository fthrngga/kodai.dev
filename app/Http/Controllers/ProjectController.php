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
        $rules = [
            'deploy_password' => 'required|string',
            'name' => 'required|string|max:255',
            'source_type' => 'required|string|in:github,upload',
            'custom_domain' => 'nullable|string|max:255|unique:projects,custom_domain',
        ];

        if ($request->source_type === 'upload') {
            $rules['uploaded_file'] = 'required|file|mimes:zip,html,php|max:51200';
            $rules['project_type'] = 'nullable|string|in:laravel,static,spa,nodejs';
            $rules['run_migration'] = 'nullable|boolean';
        } else {
            $rules['github_repo'] = 'required|string|max:255';
            $rules['branch'] = 'required|string|max:50';
            $rules['project_type'] = 'required|string|in:laravel,static,spa,nodejs';
            $rules['run_migration'] = 'nullable|boolean';
        }

        $validated = $request->validate($rules, [
            'deploy_password.required' => 'Password Master wajib diisi untuk melakukan deploy.',
            'uploaded_file.mimes' => 'Format file harus berupa .zip, .html, atau .php.',
            'uploaded_file.max' => 'Ukuran berkas tidak boleh melebihi 50 MB.',
        ]);

        // Cek jika password salah
        if ($request->deploy_password !== '11223344') {
            return back()->withErrors(['deploy_password' => 'Akses Ditolak: Password Master Kodaidev salah!']);
        }

        // Hapus password dan source_type agar tidak disimpan ke tabel projects
        unset($validated['deploy_password']);
        unset($validated['source_type']);

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
        if (($validated['project_type'] ?? null) === 'nodejs') {
            $maxPort = Project::whereNotNull('node_port')->max('node_port');
            $validated['node_port'] = $maxPort ? $maxPort + 1 : 3000;
        }

        // Simpan data proyek
        if ($request->source_type === 'upload') {
            $fileToStore = $validated['uploaded_file'];
            unset($validated['uploaded_file']);
            $project = $request->user()->projects()->create($validated);

            $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $subdomain;
            $domain = $project->custom_domain ?: $subdomain . '.kodaidev.my.id';

            try {
                // Buat direktori jika belum ada
                if (!\Illuminate\Support\Facades\File::exists($projectDir)) {
                    \Illuminate\Support\Facades\File::makeDirectory($projectDir, 0755, true);
                }

                $extension = strtolower($fileToStore->getClientOriginalExtension());

                if ($extension === 'zip') {
                    $zipPath = $fileToStore->storeAs('temp', $subdomain . '.zip');
                    $fullZipPath = storage_path('app/' . $zipPath);

                    $zip = new \ZipArchive;
                    if ($zip->open($fullZipPath) === TRUE) {
                        $zip->extractTo($projectDir);
                        $zip->close();
                    } else {
                        \Illuminate\Support\Facades\Process::run("unzip -o {$fullZipPath} -d {$projectDir}");
                    }
                    @unlink($fullZipPath);
                } else {
                    $filename = 'index.' . $extension;
                    $fileToStore->move($projectDir, $filename);
                }

                // Deteksi otomatis jika terdapat berkas PHP untuk merubah tipe proyek ke PHP/Laravel
                $hasPhp = false;
                if (\Illuminate\Support\Facades\File::exists($projectDir . '/index.php')) {
                    $hasPhp = true;
                } else {
                    $files = \Illuminate\Support\Facades\File::files($projectDir);
                    foreach ($files as $f) {
                        if (strtolower($f->getExtension()) === 'php') {
                            $hasPhp = true;
                            break;
                        }
                    }
                }

                // Set project type otomatis jika user tidak memilih
                if (empty($project->project_type)) {
                    $project->project_type = $hasPhp ? 'laravel' : 'static';
                } elseif ($hasPhp && $project->project_type === 'static') {
                    $project->project_type = 'laravel';
                }
                $project->save();

                // Buat log deployment
                $project->deployments()->create([
                    'status' => 'success',
                    'log_output' => "Deploy instan via file upload berhasil!\n"
                        . "File terunggah & terekstrak di: {$projectDir}\n"
                        . "Deteksi PHP: " . ($hasPhp ? "Aktif (Mengaktifkan PHP-FPM Nginx)" : "Nonaktif (Nginx Static Mode)")
                ]);

                // Buat Server Block Nginx
                $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
                $nginxConfig = "";

                if ($project->project_type === 'laravel') {
                    $rootPath = $projectDir;
                    if (\Illuminate\Support\Facades\File::exists($projectDir . '/public')) {
                        $rootPath = $projectDir . '/public';
                    }
                    $nginxConfig = "server {\n"
                        . "    listen 80;\n"
                        . "    server_name {$domain};\n"
                        . "    root {$rootPath};\n"
                        . "    index index.php index.html index.htm;\n"
                        . "    charset utf-8;\n\n"
                        . "    location / {\n"
                        . "        try_files \$uri \$uri/ /index.php?\$query_string;\n"
                        . "    }\n\n"
                        . "    location ~ \.php$ {\n"
                        . "        include snippets/fastcgi-php.conf;\n"
                        . "        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;\n"
                        . "    }\n"
                        . "}\n";
                } else {
                    $fallback = $project->project_type === 'spa' ? '/index.html' : '=404';
                    $nginxConfig = "server {\n"
                        . "    listen 80;\n"
                        . "    server_name {$domain};\n"
                        . "    root {$projectDir};\n"
                        . "    index index.html index.htm;\n\n"
                        . "    location / {\n"
                        . "        try_files \$uri \$uri/ {$fallback};\n"
                        . "    }\n"
                        . "}\n";
                }

                $tmpPath = storage_path("app/tmp_nginx_{$domain}");
                \Illuminate\Support\Facades\File::put($tmpPath, $nginxConfig);
                \Illuminate\Support\Facades\Process::run("sudo cp {$tmpPath} {$nginxAvailable}");
                \Illuminate\Support\Facades\Process::run("sudo ln -sf {$nginxAvailable} /etc/nginx/sites-enabled/{$domain}");
                \Illuminate\Support\Facades\Process::run("sudo systemctl reload nginx");
                @unlink($tmpPath);

                // Jalankan SSL Certbot secara latar belakang/asinkron
                $sslCmd = "sudo certbot --nginx -d {$domain} --non-interactive --agree-tos --register-unsafely-without-email";
                \Illuminate\Support\Facades\Process::run($sslCmd);

                $project->update(['status' => 'active']);

            } catch (\Exception $e) {
                $project->update(['status' => 'failed']);
                $project->deployments()->create([
                    'status' => 'failed',
                    'log_output' => "Gagal melakukan deploy file: " . $e->getMessage()
                ]);
                return back()->withErrors(['uploaded_file' => 'Gagal deploy berkas: ' . $e->getMessage()]);
            }
        } else {
            $project = $request->user()->projects()->create($validated);
            // 5. Lempar tugas ke Pekerja Latar Belakang!
            DeployProject::dispatch($project);
        }

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