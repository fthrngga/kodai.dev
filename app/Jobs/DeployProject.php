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

            // Ambil commit hash terbaru dari repositori yang dikloning
            $revParse = Process::path($projectDir)->run("git rev-parse HEAD");
            if ($revParse->successful()) {
                $commitHash = trim($revParse->output());
                $deployment->update(['commit_hash' => $commitHash]);
                $this->appendLog($deployment, "Berhasil mengunduh commit hash: {$commitHash}\n");
            }

            $this->appendLog($deployment, "Menganalisis arsitektur proyek...\n");

            // 1. Eksekusi dependensi dan build sesuai tipe proyek
            if ($this->project->project_type === 'laravel') {
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
            } elseif ($this->project->project_type === 'nodejs') {
                if (File::exists($projectDir . '/package.json')) {
                    $this->appendLog($deployment, "Menginstal dependensi NPM...\n");
                    $install = Process::path($projectDir)->run("npm install");
                    if ($install->failed()) {
                        throw new \Exception("Gagal menginstal dependensi npm: " . $install->errorOutput());
                    }

                    // Cek jika ada script build di package.json
                    $pkgContent = json_decode(File::get($projectDir . '/package.json'), true);
                    if (isset($pkgContent['scripts']['build'])) {
                        $this->appendLog($deployment, "Melakukan kompilasi Build NPM...\n");
                        $build = Process::path($projectDir)->run("npm run build");
                        if ($build->failed()) {
                            throw new \Exception("Gagal mengkompilasi build: " . $build->errorOutput());
                        }
                    }
                }

                // Kelola proses PM2
                $this->appendLog($deployment, "Menyiapkan proses latar belakang Node.js via PM2...\n");
                $checkPm2 = Process::run("which pm2");
                if ($checkPm2->failed()) {
                    $this->appendLog($deployment, "PM2 tidak ditemukan di server. Menginstal PM2 secara global...\n");
                    $installPm2 = Process::run("sudo npm install -g pm2");
                    if ($installPm2->failed()) {
                        throw new \Exception("Gagal menginstal PM2 secara global: " . $installPm2->errorOutput());
                    }
                }

                // Coba restart dulu, jika gagal/belum ada, daftarkan baru
                $pm2Restart = Process::path($projectDir)->run("pm2 restart kodai_{$this->project->subdomain}");
                if ($pm2Restart->failed()) {
                    $runFile = "npm -- run start";
                    if (!File::exists($projectDir . '/package.json')) {
                        $runFile = File::exists($projectDir . '/server.js') ? 'server.js' : (File::exists($projectDir . '/app.js') ? 'app.js' : 'index.js');
                    }
                    $startCmd = "pm2 start " . ($runFile === "npm -- run start" ? "npm --name \"kodai_{$this->project->subdomain}\" -- run start" : "{$runFile} --name \"kodai_{$this->project->subdomain}\"");
                    $pm2Start = Process::path($projectDir)->run($startCmd);
                    if ($pm2Start->failed()) {
                        throw new \Exception("Gagal menjalankan aplikasi Node.js via PM2: " . $pm2Start->errorOutput());
                    }
                }
            } else {
                // Tipe static atau spa
                if (File::exists($projectDir . '/package.json')) {
                    $this->appendLog($deployment, "Menginstal dependensi NPM dan melakukan kompilasi Build...\n");
                    $build = Process::path($projectDir)->run("npm install && npm run build");
                    if ($build->failed()) {
                        throw new \Exception("Gagal mengkompilasi aset frontend: " . $build->errorOutput());
                    }
                }
            }

            // ==========================================
            // TAHAP: OTOMATISASI NGINX & ROUTING
            // ==========================================
            $this->appendLog($deployment, "Mengonfigurasi Nginx dan Routing...\n");

            $domain = $this->project->custom_domain ? $this->project->custom_domain : $this->project->subdomain . '.kodaidev.my.id';
            $nginxConfig = "";

            if ($this->project->project_type === 'laravel') {
                $publicPath = $projectDir . '/public';
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
            } elseif ($this->project->project_type === 'nodejs') {
                $port = $this->project->node_port ?: 3000;
                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n\n"
                    . "    location / {\n"
                    . "        proxy_pass http://localhost:{$port};\n"
                    . "        proxy_http_version 1.1;\n"
                    . "        proxy_set_header Upgrade \$http_upgrade;\n"
                    . "        proxy_set_header Connection 'upgrade';\n"
                    . "        proxy_set_header Host \$host;\n"
                    . "        proxy_cache_bypass \$http_upgrade;\n"
                    . "    }\n"
                    . "}\n";
            } else {
                // static atau spa
                $publicPath = $projectDir;
                if (File::exists($projectDir . '/dist')) {
                    $publicPath = $projectDir . '/dist';
                } elseif (File::exists($projectDir . '/build')) {
                    $publicPath = $projectDir . '/build';
                }

                $fallback = $this->project->project_type === 'spa' ? '/index.html' : '=404';

                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n"
                    . "    root {$publicPath};\n"
                    . "    index index.html index.htm;\n\n"
                    . "    location / {\n"
                    . "        try_files \$uri \$uri/ {$fallback};\n"
                    . "    }\n"
                    . "}\n";
            }

            // Simpan ke storage sementara
            $tempPath = storage_path('app/nginx_' . $this->project->subdomain);
            File::put($tempPath, $nginxConfig);

            // Eksekusi symlink Nginx ala SysAdmin
            $nginxAvailable = '/etc/nginx/sites-available/' . $domain;
            $nginxEnabled = '/etc/nginx/sites-enabled/' . $domain;

            Process::run("sudo cp {$tempPath} {$nginxAvailable}");
            Process::run("sudo ln -sf {$nginxAvailable} {$nginxEnabled}");
            
            // Reload peladen agar mengenali domain baru
            $reload = Process::run("sudo systemctl reload nginx");
            if ($reload->failed()) {
                throw new \Exception("Gagal mereload Nginx: " . $reload->errorOutput());
            }

            File::delete($tempPath); // Bersihkan file sementara
            // ==========================================

            // Otomatisasi SSL (Certbot)
            $this->appendLog($deployment, "Memasang sertifikat SSL (HTTPS) via Certbot...\n");
            $sslCmd = "sudo certbot --nginx -d {$domain} --non-interactive --agree-tos --register-unsafely-without-email";
            $processSsl = Process::run($sslCmd);

            if ($processSsl->failed()) {
                $this->appendLog($deployment, "⚠️ Peringatan: SSL gagal dipasang. Situs tetap aktif dengan HTTP. Info: " . $processSsl->errorOutput() . "\n");
                $accessProtocol = "http://";
            } else {
                $this->appendLog($deployment, "🔒 SSL (HTTPS) berhasil dikonfigurasi secara aman.\n");
                $accessProtocol = "https://";
            }

            $this->project->update(['status' => 'active']);
            $deployment->update([
                'status' => 'success',
                'log_output' => $deployment->log_output . "\n🎉 DEPLOYMENT SUKSES! Situs telah aktif dan siap diakses di {$accessProtocol}{$domain}"
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