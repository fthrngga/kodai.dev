<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\File;

class ProjectEnvController extends Controller
{
    public function store(Request $request, Project $project)
    {
        if (auth()->id() !== $project->user_id) {
            abort(403, 'Akses ditolak.');
        }

        $request->validate(['env_text' => 'required|string']);

        $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $project->subdomain;
        $dbName = 'kodai_' . str_replace('-', '_', $project->subdomain);
        $domain = $project->custom_domain ?: $project->subdomain . '.kodaidev.my.id';

        try {
            // 1. Eksekusi Database (Dibuat & Diberi Hak Akses secara Otomatis)
            $dbCmd = "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS \`{$dbName}\`; GRANT ALL PRIVILEGES ON \`{$dbName}\`.* TO 'fathur'@'localhost'; FLUSH PRIVILEGES;\"";
            $processDb = Process::run($dbCmd);
            if ($processDb->failed()) {
                throw new \Exception("Gagal Setup DB: " . $processDb->errorOutput());
            }

            // 2. Injeksi .ENV
            $envContent = preg_replace('/^DB_.*$/m', '', $request->env_text);
            
            $dbConfig = "\n\n# --- AUTO INJECTED BY KODAIDEV ---\n";
            $dbConfig .= "DB_CONNECTION=mysql\nDB_HOST=127.0.0.1\nDB_PORT=3306\n";
            $dbConfig .= "DB_DATABASE={$dbName}\nDB_USERNAME=fathur\nDB_PASSWORD=11223344\n";
            
            File::put($projectDir . '/.env', trim($envContent) . $dbConfig);

            // 3. Eksekusi Artisan Terstruktur
            $commands = [
                "php artisan optimize:clear",           // WAJIB: Hapus cache agar .env baru terbaca
                "php artisan key:generate --force",
                "php artisan migrate --force ",  
                "php artisan storage:link",
                "php artisan optimize:clear"            // Cache ulang untuk kecepatan produksi
            ];

            foreach ($commands as $cmd) {
                $process = Process::path($projectDir)
                    ->env([
                        'APP_ENV' => 'production',
                        'DB_CONNECTION' => 'mysql',
                        'DB_HOST' => '127.0.0.1',
                        'DB_PORT' => '3306',
                        'DB_DATABASE' => $dbName,
                        'DB_USERNAME' => 'fathur',
                        'DB_PASSWORD' => '11223344',
                    ])
                    ->run($cmd);

                if ($process->failed()) {
                    $errorDetail = $process->errorOutput() ?: $process->output();
                    throw new \Exception("Gagal saat mengeksekusi [{$cmd}]: " . $errorDetail);
                }
            }

            // 4. Otomatisasi SSL (Certbot)
            $sslCmd = "sudo certbot --nginx -d {$domain} --non-interactive --agree-tos --register-unsafely-without-email";
            Process::run($sslCmd); 

            return back()->with('success', 'Sistem otomatisasi sukses: DB, Migrasi (serta Seed), dan SSL terpasang!');
            
        } catch (\Exception $e) {
            return back()->withErrors(['env_text' => 'Gagal: ' . $e->getMessage()]);
        }
    }
}