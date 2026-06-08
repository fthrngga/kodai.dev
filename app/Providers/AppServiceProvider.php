<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Force HTTPS agar form POST (seperti Login) tidak di-redirect menjadi GET (301)
        // yang menyebabkan request seakan-akan "tidak terjadi apa-apa".
        if (str_contains(config('app.url'), 'https://') || $this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
