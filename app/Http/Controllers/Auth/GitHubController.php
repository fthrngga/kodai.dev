<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Exception;

class GitHubController extends Controller
{
    public function redirect()
    {
        // Meminta izin 'repo' agar Kodaidev bisa membaca repositori pengguna nantinya
        return Socialite::driver('github')->scopes(['repo', 'read:user'])->redirect();
    }

    public function callback()
    {
        try {
            $githubUser = Socialite::driver('github')->user();

            // Cari user berdasarkan github_id, jika tidak ada, buat user baru
            $user = User::updateOrCreate([
                'github_id' => $githubUser->id,
            ], [
                'name' => $githubUser->name ?? $githubUser->nickname,
                'email' => $githubUser->email,
                'github_token' => $githubUser->token,
                'github_refresh_token' => $githubUser->refreshToken,
            ]);

            // Login otomatis ke dalam aplikasi
            Auth::login($user);

            return redirect()->route('dashboard');

        } catch (Exception $e) {
            return redirect('/login')->withErrors(['error' => 'Gagal login menggunakan GitHub.']);
        }
    }
}