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
                'APP_ENV' => 'production',
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
                $commands[] = "composer install --no-interaction --prefer-dist --optimize-autoloader";
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

            // 4. SELF-HEALING NGINX: Buat server block jika belum ada
            $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
            if (!File::exists($nginxAvailable)) {
                $nginxConfig = "";
                
                if ($project->project_type === 'laravel') {
                    $nginxConfig = "server {\n"
                        . "    listen 80;\n"
                        . "    server_name {$domain};\n"
                        . "    root {$projectDir}/public;\n"
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
                } elseif ($project->project_type === 'nodejs') {
                    $port = $project->node_port ?: 3000;
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
                    
                    $fallback = $project->project_type === 'spa' ? '/index.html' : '=404';
                    
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

                $tmpPath = storage_path("app/tmp_nginx_{$domain}");
                File::put($tmpPath, $nginxConfig);
                Process::run("sudo cp {$tmpPath} {$nginxAvailable} && sudo ln -sf {$nginxAvailable} /etc/nginx/sites-enabled/{$domain} && sudo systemctl reload nginx");
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