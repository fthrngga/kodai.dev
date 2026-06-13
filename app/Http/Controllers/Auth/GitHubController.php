<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GitHubController extends Controller
{
    public function redirect()
    {
        return Socialite::driver('github')->stateless()->redirect();
    }

    public function callback()
    {
        try {
            $githubUser = Socialite::driver('github')->stateless()->user();
            
            // PERBAIKAN: Cari berdasarkan email, BUKAN github_id
            $user = User::updateOrCreate([
                'email' => $githubUser->email,
            ], [
                'name' => $githubUser->name ?? $githubUser->nickname,
                'github_id' => $githubUser->id,
                'github_token' => $githubUser->token,
                'github_refresh_token' => $githubUser->refreshToken,
                // Pastikan password diisi string acak jika kolom password di tabel Anda sifatnya wajib (NOT NULL)
                'password' => bcrypt(Str::random(24)),
            ]);

            Auth::login($user);
            
            return redirect()->route('dashboard');

        } catch (\Exception $e) {
            Log::error('GitHub OAuth callback failed', [
                'message' => $e->getMessage(),
                'code' => request()->query('code'),
                'host' => request()->getHost(),
                'ip' => request()->ip(),
            ]);

            return redirect()->route('login')
                ->with('error', 'Login dengan GitHub gagal. Silakan coba lagi nanti.');
        }
    }
}