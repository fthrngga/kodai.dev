<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Auth\GitHubController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectEnvController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard', [
        'projects' => auth()->user()->projects()->latest()->get()
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::get('/auth/github/redirect', [GitHubController::class, 'redirect'])->name('github.login');
Route::get('/auth/github/callback', [GitHubController::class, 'callback']);

Route::post('/projects', [ProjectController::class, 'store'])->middleware('auth')->name('projects.store');
Route::delete('/projects/{project}', [ProjectController::class, 'destroy'])->middleware('auth')->name('projects.destroy');
Route::post('/projects/{project}/env', [ProjectEnvController::class, 'store'])->middleware('auth')->name('projects.env.store');
Route::post('/projects/{project}/update-files', [ProjectController::class, 'updateFiles'])->middleware('auth')->name('projects.update-files');
Route::get('/projects/{project}/read-file', [ProjectController::class, 'readFile'])->middleware('auth')->name('projects.read-file');
Route::post('/projects/{project}/save-file', [ProjectController::class, 'saveFile'])->middleware('auth')->name('projects.save-file');

require __DIR__.'/auth.php';
