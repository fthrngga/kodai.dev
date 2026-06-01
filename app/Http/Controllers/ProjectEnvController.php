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
        // 1. Validasi Keamanan
        if (auth()->id() !== $project->user_id) {
            abort(403, 'Akses ditolak.');
        }

        $request->validate(['env_text' => 'required|string']);

        $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $project->subdomain;
        
        // Buat nama database yang aman (contoh: kodai_sanjaisaiyoo)
        $dbName = 'kodai_' . str_replace('-', '_', $project->subdomain);

        try {
            // 2. Otomatisasi Pembuatan Database MySQL di Server GCP
            // Kita menggunakan sudo mysql langsung agar tidak butuh password root
            Process::run("sudo mysql -e \"CREATE DATABASE IF NOT EXISTS \`{$dbName}\`; GRANT ALL PRIVILEGES ON \`{$dbName}\`.* TO 'fathur'@'localhost'; FLUSH PRIVILEGES;\"");

            // 3. Injeksi & Manipulasi Isi .env
            $envContent = $request->env_text;
            
            // Hapus konfigurasi DB bawaan pengguna (jika ada) agar tidak bentrok
            $envContent = preg_replace('/^DB_.*$/m', '', $envContent);
            
            // Suntikkan konfigurasi DB milik Server Kodaidev
            $dbConfig = "\n\n# --- AUTO INJECTED BY KODAIDEV ---\n";
            $dbConfig .= "DB_CONNECTION=mysql\n";
            $dbConfig .= "DB_HOST=127.0.0.1\n";
            $dbConfig .= "DB_PORT=3306\n";
            $dbConfig .= "DB_DATABASE={$dbName}\n";
            $dbConfig .= "DB_USERNAME=fathur\n"; // Asumsi default MySQL Ubuntu
            $dbConfig .= "DB_PASSWORD=11223344\n";     // Asumsi tanpa password untuk user root localhost
            
            $finalEnv = trim($envContent) . $dbConfig;

            // 4. Tanamkan file .env ke dalam folder proyek
            File::put($projectDir . '/.env', $finalEnv);

            // 5. Eksekusi Perintah Artisan Layaknya Manusia
            $commands = [
                "php artisan optimize:clear",      // Bersihkan cache lama dulu
                "php artisan key:generate --force",// Buat kunci baru
                "php artisan migrate --force",     // Migrasi database
                "php artisan storage:link",        // Link folder storage
                "php artisan optimize:clear"       // Bersihkan cache lagi setelah kunci baru terbuat
            ];

            foreach ($commands as $cmd) {
                $process = Process::path($projectDir)->run($cmd);
                if ($process->failed()) {
                    // Jika perintah terminal gagal, lemparkan errornya ke Dasbor!
                    throw new \Exception("Gagal saat mengeksekusi [{$cmd}]: " . $process->errorOutput());
                }
            }

            return back()->with('success', 'Lingkungan berhasil diatur dan Database sukses dimigrasi!');
            
        } catch (\Exception $e) {
            return back()->withErrors(['env_text' => 'Gagal: ' . $e->getMessage()]);
        }
    }
}