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
    $serverIp = gethostbyname('kodaidev.my.id');
    if ($serverIp === 'kodaidev.my.id') {
        $serverIp = '34.50.74.177';
    }
    return Inertia::render('Dashboard', [
        'projects' => auth()->user()->projects()->latest()->get(),
        'serverIp' => $serverIp
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
Route::get('/projects/{project}/check-update', [ProjectController::class, 'checkUpdate'])->middleware('auth')->name('projects.check-update');
Route::post('/projects/{project}/redeploy', [ProjectController::class, 'redeploy'])->middleware('auth')->name('projects.redeploy');
Route::post('/projects/{project}/update-domain', [ProjectController::class, 'updateDomain'])->middleware('auth')->name('projects.update-domain');
Route::get('/projects/{project}/logs', [ProjectController::class, 'getLogs'])->middleware('auth')->name('projects.logs');

use App\Http\Controllers\AiBuilderController;

Route::middleware('auth')->group(function () {
    Route::get('/ai-builder', [AiBuilderController::class, 'index'])->name('ai-builder.index');
    Route::post('/ai-builder', [AiBuilderController::class, 'store'])->name('ai-builder.store');
    Route::get('/ai-builder/{id}', [AiBuilderController::class, 'show'])->name('ai-builder.show');
    Route::post('/ai-builder/{id}/stream', [AiBuilderController::class, 'generateStream'])->name('ai-builder.stream');
    Route::post('/ai-builder/{id}/host', [AiBuilderController::class, 'hostToKodaidev'])->name('ai-builder.host');
});

require __DIR__.'/auth.php';
