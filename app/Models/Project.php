<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    use HasFactory;

    protected $guarded = []; // Izinkan mass assignment

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function deployments()
    {
        return $this->hasMany(Deployment::class);
    }

    public function configureNginxAndSsl($deployment = null)
    {
        $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $this->subdomain;
        $domain = $this->custom_domain ?: $this->subdomain . '.kodaidev.my.id';
        
        $nginxAvailable = "/etc/nginx/sites-available/{$domain}";
        $nginxEnabled = "/etc/nginx/sites-enabled/{$domain}";

        $this->appendLog($deployment, "Mengonfigurasi Nginx dan Routing untuk domain: {$domain}...\n");

        // Tentukan root path Nginx
        $rootPath = $projectDir;
        if ($this->project_type === 'laravel') {
            if (\Illuminate\Support\Facades\File::exists($projectDir . '/public')) {
                $rootPath = $projectDir . '/public';
            }
        } else {
            if (\Illuminate\Support\Facades\File::exists($projectDir . '/dist')) {
                $rootPath = $projectDir . '/dist';
            } elseif (\Illuminate\Support\Facades\File::exists($projectDir . '/build')) {
                $rootPath = $projectDir . '/build';
            }
        }

        $isSubdomain = empty($this->custom_domain);
        
        // Prioritaskan path -0001 jika ada, lalu fallback ke path standar
        $wildcardCert = "/etc/letsencrypt/live/kodaidev.my.id-0001/fullchain.pem";
        $wildcardKey = "/etc/letsencrypt/live/kodaidev.my.id-0001/privkey.pem";

        // Cek menggunakan sudo karena folder /etc/letsencrypt/live/ biasanya milik root
        if (!\Illuminate\Support\Facades\Process::run("sudo test -f {$wildcardCert}")->successful()) {
            $wildcardCert = "/etc/letsencrypt/live/kodaidev.my.id/fullchain.pem";
            $wildcardKey = "/etc/letsencrypt/live/kodaidev.my.id/privkey.pem";
        }

        $checkCert = \Illuminate\Support\Facades\Process::run("sudo test -f {$wildcardCert}");
        $checkKey = \Illuminate\Support\Facades\Process::run("sudo test -f {$wildcardKey}");

        // Cek apakah wildcard SSL terpasang di server VPS
        $hasWildcard = $checkCert->successful() && $checkKey->successful();

        $nginxConfig = "";

        if ($isSubdomain && $hasWildcard) {
            $this->appendLog($deployment, "Mendeteksi domain utama. Menggunakan sertifikat SSL Wildcard (*.kodaidev.my.id)...\n");
            
            if ($this->project_type === 'laravel') {
                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n"
                    . "    return 301 https://\$host\$request_uri;\n"
                    . "}\n\n"
                    . "server {\n"
                    . "    listen 443 ssl;\n"
                    . "    server_name {$domain};\n"
                    . "    root {$rootPath};\n"
                    . "    index index.php index.html index.htm;\n"
                    . "    charset utf-8;\n\n"
                    . "    ssl_certificate {$wildcardCert};\n"
                    . "    ssl_certificate_key {$wildcardKey};\n\n"
                    . "    location / {\n"
                    . "        try_files \$uri \$uri/ /index.php?\$query_string;\n"
                    . "    }\n\n"
                    . "    location ~ \.php$ {\n"
                    . "        include snippets/fastcgi-php.conf;\n"
                    . "        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;\n"
                    . "    }\n"
                    . "}\n";
            } elseif ($this->project_type === 'nodejs') {
                $port = $this->node_port ?: 3000;
                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n"
                    . "    return 301 https://\$host\$request_uri;\n"
                    . "}\n\n"
                    . "server {\n"
                    . "    listen 443 ssl;\n"
                    . "    server_name {$domain};\n\n"
                    . "    ssl_certificate {$wildcardCert};\n"
                    . "    ssl_certificate_key {$wildcardKey};\n\n"
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
                $fallback = $this->project_type === 'spa' ? '/index.html' : '=404';
                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n"
                    . "    return 301 https://\$host\$request_uri;\n"
                    . "}\n\n"
                    . "server {\n"
                    . "    listen 443 ssl;\n"
                    . "    server_name {$domain};\n"
                    . "    root {$rootPath};\n"
                    . "    index index.html index.htm;\n\n"
                    . "    ssl_certificate {$wildcardCert};\n"
                    . "    ssl_certificate_key {$wildcardKey};\n\n"
                    . "    location / {\n"
                    . "        try_files \$uri \$uri/ {$fallback};\n"
                    . "    }\n"
                    . "}\n";
            }
        } else {
            $this->appendLog($deployment, "Menggunakan konfigurasi HTTP standar (Certbot SSL akan dipasang berikutnya)...\n");
            
            if ($this->project_type === 'laravel') {
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
            } elseif ($this->project_type === 'nodejs') {
                $port = $this->node_port ?: 3000;
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
                $fallback = $this->project_type === 'spa' ? '/index.html' : '=404';
                $nginxConfig = "server {\n"
                    . "    listen 80;\n"
                    . "    server_name {$domain};\n"
                    . "    root {$rootPath};\n"
                    . "    index index.html index.htm;\n\n"
                    . "    location / {\n"
                    . "        try_files \$uri \$uri/ {$fallback};\n"
                    . "    }\n"
                    . "}\n";
            }
        }

        $tmpPath = storage_path("app/tmp_nginx_{$domain}");
        \Illuminate\Support\Facades\File::put($tmpPath, $nginxConfig);
        \Illuminate\Support\Facades\Process::run("sudo cp {$tmpPath} {$nginxAvailable}");
        \Illuminate\Support\Facades\Process::run("sudo ln -sf {$nginxAvailable} {$nginxEnabled}");
        
        $reload = \Illuminate\Support\Facades\Process::run("sudo systemctl reload nginx");
        if ($reload->failed()) {
            $this->appendLog($deployment, "⚠️ Gagal mereload Nginx: " . $reload->errorOutput() . "\n");
        } else {
            $this->appendLog($deployment, "Berhasil mereload konfigurasi Nginx.\n");
        }
        
        @unlink($tmpPath);

        // Jika bukan subdomain atau wildcard tidak terpasang, jalankan Certbot
        if (!$isSubdomain || !$hasWildcard) {
            $this->appendLog($deployment, "Memasang sertifikat SSL via Certbot untuk {$domain}...\n");
            $sslCmd = "sudo certbot --nginx -d {$domain} --non-interactive --agree-tos --register-unsafely-without-email";
            $processSsl = \Illuminate\Support\Facades\Process::run($sslCmd);

            if ($processSsl->failed()) {
                $this->appendLog($deployment, "⚠️ Gagal memasang SSL Certbot: " . $processSsl->errorOutput() . "\n");
            } else {
                // Certbot --nginx bisa merusak try_files directive kita.
                // Timpa ulang config Nginx dengan SSL config yang benar setelah sertifikat diperoleh.
                $certBase = "/etc/letsencrypt/live/{$domain}";
                $sslCert  = \Illuminate\Support\Facades\Process::run("sudo test -f {$certBase}-0001/fullchain.pem")->successful() ? "{$certBase}-0001/fullchain.pem" : "{$certBase}/fullchain.pem";
                $sslKey   = \Illuminate\Support\Facades\Process::run("sudo test -f {$certBase}-0001/privkey.pem")->successful() ? "{$certBase}-0001/privkey.pem" : "{$certBase}/privkey.pem";

                $sslNginxConfig = "";
                if ($this->project_type === 'laravel') {
                    $sslNginxConfig = "server {\n"
                        . "    listen 80;\n    server_name {$domain};\n    return 301 https://\$host\$request_uri;\n}\n\n"
                        . "server {\n    listen 443 ssl;\n    server_name {$domain};\n    root {$rootPath};\n"
                        . "    index index.php index.html index.htm;\n    charset utf-8;\n\n"
                        . "    ssl_certificate {$sslCert};\n    ssl_certificate_key {$sslKey};\n\n"
                        . "    location / {\n        try_files \$uri \$uri/ /index.php?\$query_string;\n    }\n\n"
                        . "    location ~ \\.php$ {\n        include snippets/fastcgi-php.conf;\n        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;\n    }\n}\n";
                } elseif ($this->project_type === 'nodejs') {
                    $port = $this->node_port ?: 3000;
                    $sslNginxConfig = "server {\n"
                        . "    listen 80;\n    server_name {$domain};\n    return 301 https://\$host\$request_uri;\n}\n\n"
                        . "server {\n    listen 443 ssl;\n    server_name {$domain};\n\n"
                        . "    ssl_certificate {$sslCert};\n    ssl_certificate_key {$sslKey};\n\n"
                        . "    location / {\n        proxy_pass http://localhost:{$port};\n        proxy_http_version 1.1;\n"
                        . "        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection 'upgrade';\n"
                        . "        proxy_set_header Host \$host;\n        proxy_cache_bypass \$http_upgrade;\n    }\n}\n";
                } else {
                    $fallback = $this->project_type === 'spa' ? '/index.html' : '=404';
                    $sslNginxConfig = "server {\n"
                        . "    listen 80;\n    server_name {$domain};\n    return 301 https://\$host\$request_uri;\n}\n\n"
                        . "server {\n    listen 443 ssl;\n    server_name {$domain};\n    root {$rootPath};\n    index index.html index.htm;\n\n"
                        . "    ssl_certificate {$sslCert};\n    ssl_certificate_key {$sslKey};\n\n"
                        . "    location / {\n        try_files \$uri \$uri/ {$fallback};\n    }\n}\n";
                }

                $tmpSslPath = storage_path("app/tmp_nginx_ssl_{$domain}");
                \Illuminate\Support\Facades\File::put($tmpSslPath, $sslNginxConfig);
                \Illuminate\Support\Facades\Process::run("sudo cp {$tmpSslPath} {$nginxAvailable}");
                \Illuminate\Support\Facades\Process::run("sudo ln -sf {$nginxAvailable} {$nginxEnabled}");
                \Illuminate\Support\Facades\Process::run("sudo systemctl reload nginx");
                @unlink($tmpSslPath);

                $this->appendLog($deployment, "🔒 SSL Certbot aktif — HTTPS dikonfigurasi dengan benar.\n");
            }
        } else {
            $this->appendLog($deployment, "🔒 SSL Wildcard aktif untuk subdomain ini (HTTPS otomatis).\n");
        }
    }

    private function appendLog($deployment, $message)
    {
        if ($deployment) {
            $deployment->update([
                'log_output' => $deployment->log_output . $message
            ]);
        }
    }
}
