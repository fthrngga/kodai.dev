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
            $isPhp = in_array($project->project_type, ['laravel']);
            $isNode = $project->project_type === 'nodejs';

            // 1. Eksekusi Database jika Laravel/NodeJS
            if ($isPhp || $isNode) {
                $dbCmd = "sudo mysql -e \"CREATE DATABASE IF NOT EXISTS \`{$dbName}\`; GRANT ALL PRIVILEGES ON \`{$dbName}\`.* TO 'fathur'@'localhost'; FLUSH PRIVILEGES;\"";
                $processDb = Process::run($dbCmd);
                if ($processDb->failed()) {
                    throw new \Exception("Gagal Setup DB: " . $processDb->errorOutput());
                }

                // Injeksi .ENV untuk DB
                $envContent = preg_replace('/^DB_.*$/m', '', $request->env_text);
                
                $dbConfig = "\n\n# --- AUTO INJECTED BY KODAIDEV ---\n";
                $dbConfig .= "DB_CONNECTION=mysql\nDB_HOST=localhost\nDB_PORT=3306\n";
                $dbConfig .= "DB_DATABASE={$dbName}\nDB_USERNAME=fathur\nDB_PASSWORD=11223344\n";
                
                File::put($projectDir . '/.env', trim($envContent) . $dbConfig);
            } else {
                // Untuk statis/SPA, langsung tulis env saja tanpa modifikasi DB
                File::put($projectDir . '/.env', trim($request->env_text));
            }

            // 2. Tentukan daftar perintah build berdasarkan tipe proyek
            $commands = [];
            $envVariables = [
                'APP_ENV'           => 'production',
                'HOME'              => '/home/fathurrangga92',
                'COMPOSER_HOME'     => '/home/fathurrangga92/.composer',
                'PATH'              => '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/node/bin',
                'KODAIDEV_BUILD'    => 'true',
                'CI'                => 'true',
            ];

            if ($isPhp || $isNode) {
                $envVariables = array_merge($envVariables, [
                    'DB_CONNECTION' => 'mysql',
                    'DB_HOST' => 'localhost',
                    'DB_PORT' => '3306',
                    'DB_DATABASE' => $dbName,
                    'DB_USERNAME' => 'fathur',
                    'DB_PASSWORD' => '11223344',
                ]);
            }

            if ($project->project_type === 'laravel') {
                $commands[] = "composer install --no-interaction --prefer-dist --optimize-autoloader --ignore-platform-reqs";
                $commands[] = "php artisan config:clear";
                $commands[] = "php artisan key:generate --force";
                
                if ($project->run_migration) {
                    $commands[] = "php artisan migrate --force";
                }
                
                $commands[] = "php artisan storage:link";
                
                if (File::exists($projectDir . '/package.json')) {
                    $commands[] = "npm install";
                    $commands[] = "npm run build";
                }
                $commands[] = "php artisan optimize:clear";
            } elseif ($project->project_type === 'nodejs') {
                if (File::exists($projectDir . '/package.json')) {
                    $commands[] = "npm install";
                    $commands[] = "npm run build";
                }
                // Restart PM2 process
                $commands[] = "pm2 restart kodai_{$project->subdomain}";
            } else {
                // Static atau SPA
                if (File::exists($projectDir . '/package.json')) {
                    $commands[] = "npm install";
                    $commands[] = "npm run build";
                }
            }

            // 3. Jalankan semua perintah secara sekuensial
            foreach ($commands as $cmd) {
                $process = Process::path($projectDir)
                    ->env($envVariables)
                    ->run($cmd);

                if ($process->failed()) {
                    // Fallback jika pm2 restart gagal karena proses belum terdaftar
                    if ($cmd === "pm2 restart kodai_{$project->subdomain}") {
                        $startCmd = "pm2 start npm --name \"kodai_{$project->subdomain}\" -- run start";
                        if (!File::exists($projectDir . '/package.json')) {
                            $startFile = File::exists($projectDir . '/server.js') ? 'server.js' : (File::exists($projectDir . '/app.js') ? 'app.js' : 'index.js');
                            $startCmd = "pm2 start {$startFile} --name \"kodai_{$project->subdomain}\"";
                        }
                        $processStart = Process::path($projectDir)->env($envVariables)->run($startCmd);
                        if ($processStart->successful()) {
                            continue;
                        }
                    }

                    $errorDetail = $process->errorOutput() ?: $process->output();
                    throw new \Exception("Gagal saat mengeksekusi [{$cmd}]: " . $errorDetail);
                }
            }

            // 4. Konfigurasi Nginx dan SSL
            $project->configureNginxAndSsl();

            return back()->with('success', 'Sistem otomatisasi sukses: Composer, NPM, DB, Migrasi, dan SSL terpasang sempurna!');
            
        } catch (\Exception $e) {
            return back()->withErrors(['env_text' => 'Gagal: ' . $e->getMessage()]);
        }
    }
}