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
            $dbConfig .= "DB_CONNECTION=mysql\nDB_HOST=localhost\nDB_PORT=3306\n"; // Ubah 127.0.0.1 jadi localhost untuk bypass TCP
            $dbConfig .= "DB_DATABASE={$dbName}\nDB_USERNAME=fathur\nDB_PASSWORD=11223344\n";
            
            File::put($projectDir . '/.env', trim($envContent) . $dbConfig);

            // 3. Eksekusi Artisan Terstruktur (Ditambah Composer & NPM)
            $commands = [
                "composer install --no-interaction --prefer-dist --optimize-autoloader",
                "php artisan config:clear",           
                "php artisan key:generate --force",
                "php artisan migrate --force",  
                "php artisan storage:link",
                "npm install",
                "npm run build",
                "php artisan optimize:clear"            
            ];

            foreach ($commands as $cmd) {
                $process = Process::path($projectDir)
                    ->env([
                        'APP_ENV' => 'production',
                        'DB_CONNECTION' => 'mysql',
                        'DB_HOST' => 'localhost', // Ubah juga disini
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

            // 4. SELF-HEALING NGINX: Buat server block jika belum ada
            $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
            if (!File::exists($nginxAvailable)) {
                $nginxConfig = "server {\n listen 80;\n server_name {$domain};\n root {$projectDir}/public;\n index index.php index.html index.htm;\n location / {\n try_files \$uri \$uri/ /index.php?\$query_string;\n }\n location ~ \\.php$ {\n include snippets/fastcgi-php.conf;\n fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;\n }\n}\n";
                
                $tmpPath = storage_path("app/tmp_nginx_{$domain}");
                File::put($tmpPath, $nginxConfig);
                Process::run("sudo cp {$tmpPath} {$nginxAvailable} && sudo ln -s {$nginxAvailable} /etc/nginx/sites-enabled/ && sudo systemctl reload nginx");
                @unlink($tmpPath); 
            }

            // 5. Otomatisasi SSL (Certbot) dengan Error Handling
            $sslCmd = "sudo certbot --nginx -d {$domain} --non-interactive --agree-tos --register-unsafely-without-email";
            $processSsl = Process::run($sslCmd); 

            if ($processSsl->failed()) {
                return back()->with('success', 'Sistem berhasil di-deploy, namun SSL (HTTPS) gagal dipasang. Error: ' . $processSsl->errorOutput());
            }

            return back()->with('success', 'Sistem otomatisasi sukses: Composer, NPM, DB, Migrasi, dan SSL terpasang sempurna!');
            
        } catch (\Exception $e) {
            return back()->withErrors(['env_text' => 'Gagal: ' . $e->getMessage()]);
        }
    }
}