<?php

namespace App\Jobs;

use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\File;

class DeployProject implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $project;

    public function __construct(Project $project)
    {
        $this->project = $project;
    }

    public function handle(): void
    {
        $this->project->update(['status' => 'building']);
        $deployment = $this->project->deployments()->create([
            'status' => 'building',
            'log_output' => "Memulai proses otomatisasi deploy untuk {$this->project->name}...\n"
        ]);

        try {
            $baseDir = '/home/fathurrangga92/kodaidev-apps';
            $projectDir = $baseDir . '/' . $this->project->subdomain;

            if (!File::exists($baseDir)) {
                File::makeDirectory($baseDir, 0755, true);
            }

            if (File::exists($projectDir)) {
                File::deleteDirectory($projectDir);
            }

            $this->appendLog($deployment, "Menyiapkan direktori mesin ({$projectDir})...\n");

            $token = $this->project->user->github_token;
            // Format URL GitHub sudah diperbaiki
            $repoUrl = "https://{$token}@github.com/{$this->project->github_repo}.git";
            $branch = $this->project->branch;

            $this->appendLog($deployment, "Mengunduh kode sumber dari GitHub (Branch: {$branch})...\n");
            
            $clone = Process::run("git clone -b {$branch} {$repoUrl} {$projectDir}");
            if ($clone->failed()) {
                throw new \Exception("Gagal mengunduh repositori: " . $clone->errorOutput());
            }

            $this->appendLog($deployment, "Menganalisis arsitektur proyek...\n");

            if (File::exists($projectDir . '/composer.json')) {
                $this->appendLog($deployment, "Menginstal dependensi Composer...\n");
                Process::path($projectDir)->run("composer install --no-interaction --prefer-dist --optimize-autoloader");
            }

            if (File::exists($projectDir . '/package.json')) {
                $this->appendLog($deployment, "Menginstal dependensi NPM dan melakukan kompilasi Build...\n");
                $build = Process::path($projectDir)->run("npm install && npm run build");
                if ($build->failed()) {
                    throw new \Exception("Gagal mengkompilasi aset frontend: " . $build->errorOutput());
                }
            }

            // ==========================================
            // TAHAP BARU: OTOMATISASI NGINX & ROUTING
            // ==========================================
            $this->appendLog($deployment, "Mengonfigurasi Nginx dan Routing...\n");

            // 1. Cek folder root (Laravel pakai /public, React murni pakai /dist)
            $publicPath = $projectDir . '/public';
            if (!File::exists($publicPath) && File::exists($projectDir . '/dist')) {
                $publicPath = $projectDir . '/dist';
            }

            // 2. Tentukan domain
            $domain = $this->project->custom_domain ? $this->project->custom_domain : $this->project->subdomain . '.kodaidev.my.id';

            // 3. Buat file Nginx Virtual Host
            $nginxConfig = "server {\n"
                . "    listen 80;\n"
                . "    server_name {$domain};\n"
                . "    root {$publicPath};\n"
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

            // 4. Simpan ke storage sementara
            $tempPath = storage_path('app/nginx_' . $this->project->subdomain);
            File::put($tempPath, $nginxConfig);

            // 5. Eksekusi symlink Nginx ala SysAdmin
            $nginxAvailable = '/etc/nginx/sites-available/' . $this->project->subdomain;
            $nginxEnabled = '/etc/nginx/sites-enabled/' . $this->project->subdomain;

            Process::run("sudo cp {$tempPath} {$nginxAvailable}");
            Process::run("sudo ln -sf {$nginxAvailable} {$nginxEnabled}");
            
            // 6. Reload peladen agar mengenali domain baru
            $reload = Process::run("sudo systemctl reload nginx");
            if ($reload->failed()) {
                throw new \Exception("Gagal mereload Nginx: " . $reload->errorOutput());
            }

            File::delete($tempPath); // Bersihkan file sementara
            // ==========================================

            $this->project->update(['status' => 'active']);
            $deployment->update([
                'status' => 'success',
                'log_output' => $deployment->log_output . "\n🎉 DEPLOYMENT SUKSES! Situs telah aktif dan siap diakses di http://{$domain}"
            ]);

        } catch (\Exception $e) {
            $this->project->update(['status' => 'failed']);
            $deployment->update([
                'status' => 'failed',
                'log_output' => $deployment->log_output . "\n❌ ERROR: " . $e->getMessage()
            ]);
        }
    }

    private function appendLog($deployment, $message)
    {
        $deployment->update([
            'log_output' => $deployment->log_output . $message
        ]);
    }
}