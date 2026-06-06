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
        // Env vars yang dioper langsung ke setiap subprocess
        // (putenv() TIDAK diwarisi oleh subprocess Process::run)
        $env = [
            'HOME'              => '/home/fathurrangga92',
            'COMPOSER_HOME'     => '/home/fathurrangga92/.composer',
            'PATH'              => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/node/bin',
            'KODAIDEV_BUILD'    => 'true',   // Sinyal ke vite.config agar disable plugin yg butuh DB (mis: wayfinder)
            'CI'                => 'true',   // Flag standar CI/CD - beberapa plugin juga respek ini
        ];

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
                    $composer = Process::path($projectDir)->env($env)->run("composer install --no-interaction --prefer-dist --optimize-autoloader --ignore-platform-reqs");
                    if ($composer->failed()) {
                        throw new \Exception("Gagal menginstal dependensi Composer: " . $composer->errorOutput());
                    }
                }

                if (File::exists($projectDir . '/package.json')) {
                    $this->appendLog($deployment, "Menginstal dependensi NPM dan melakukan kompilasi Build...\n");
                    $npmInstall = Process::path($projectDir)->env($env)->run("npm install --engine-strict false");
                    if ($npmInstall->failed()) {
                        throw new \Exception("Gagal menginstal dependensi NPM: " . $npmInstall->errorOutput());
                    }
                    $build = Process::path($projectDir)->env($env)->run("npm run build");
                    if ($build->failed()) {
                        throw new \Exception("Gagal mengkompilasi aset frontend: " . $build->errorOutput());
                    }
                }
            } elseif ($this->project->project_type === 'nodejs') {
                if (File::exists($projectDir . '/package.json')) {
                    $this->appendLog($deployment, "Menginstal dependensi NPM...\n");
                    $install = Process::path($projectDir)->env($env)->run("npm install --engine-strict false");
                    if ($install->failed()) {
                        throw new \Exception("Gagal menginstal dependensi npm: " . $install->errorOutput());
                    }

                    // Cek jika ada script build di package.json
                    $pkgContent = json_decode(File::get($projectDir . '/package.json'), true);
                    if (isset($pkgContent['scripts']['build'])) {
                        $this->appendLog($deployment, "Melakukan kompilasi Build NPM...\n");
                        $build = Process::path($projectDir)->env($env)->run("npm run build");
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
                $pm2Restart = Process::path($projectDir)->env($env)->run("pm2 restart kodai_{$this->project->subdomain}");
                if ($pm2Restart->failed()) {
                    $runFile = "npm -- run start";
                    if (!File::exists($projectDir . '/package.json')) {
                        $runFile = File::exists($projectDir . '/server.js') ? 'server.js' : (File::exists($projectDir . '/app.js') ? 'app.js' : 'index.js');
                    }
                    $startCmd = "pm2 start " . ($runFile === "npm -- run start" ? "npm --name \"kodai_{$this->project->subdomain}\" -- run start" : "{$runFile} --name \"kodai_{$this->project->subdomain}\"");
                    $pm2Start = Process::path($projectDir)->env($env)->run($startCmd);
                    if ($pm2Start->failed()) {
                        throw new \Exception("Gagal menjalankan aplikasi Node.js via PM2: " . $pm2Start->errorOutput());
                    }
                }
            } else {
                // Tipe static atau spa
                if (File::exists($projectDir . '/package.json')) {
                    $this->appendLog($deployment, "Menginstal dependensi NPM dan melakukan kompilasi Build...\n");
                    $npmInstall = Process::path($projectDir)->env($env)->run("npm install --engine-strict false");
                    if ($npmInstall->failed()) {
                        throw new \Exception("Gagal menginstal dependensi NPM: " . $npmInstall->errorOutput());
                    }
                    $build = Process::path($projectDir)->env($env)->run("npm run build");
                    if ($build->failed()) {
                        throw new \Exception("Gagal mengkompilasi aset frontend: " . $build->errorOutput());
                    }
                }
            }

            // ==========================================
            // TAHAP: OTOMATISASI NGINX & ROUTING & SSL
            // ==========================================
            $this->project->configureNginxAndSsl($deployment);

            $domain = $this->project->custom_domain ?: $this->project->subdomain . '.kodaidev.my.id';
            $this->project->update(['status' => 'active']);
            $deployment->update([
                'status' => 'success',
                'log_output' => $deployment->log_output . "\n🎉 DEPLOYMENT SUKSES! Situs telah aktif dan siap diakses di https://{$domain}"
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