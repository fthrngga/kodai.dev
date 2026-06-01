<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Models\Project; 
use App\Jobs\DeployProject;

class ProjectController extends Controller
{
    public function store(Request $request)
    {
        // 1. Validasi input
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'github_repo' => 'required|string|max:255',
            'branch' => 'required|string|max:50',
            'custom_domain' => 'nullable|string|max:255|unique:projects,custom_domain',
        ]);

        // 2. Buat subdomain dasar yang "Bersih"
        $baseSlug = Str::slug($validated['name']);
        $subdomain = $baseSlug;
        
        // 3. Pengecekan Duplikasi Cerdas
        $counter = 1;
        while (Project::where('subdomain', $subdomain)->exists()) {
            // Jika 'sanjai' sudah ada, ubah jadi 'sanjai-1', cek lagi, dst.
            $subdomain = $baseSlug . '-' . $counter;
            $counter++;
        }

        $validated['subdomain'] = $subdomain;

        // 4. Simpan ke database (Ubah bagian ini)
        $project = $request->user()->projects()->create($validated);

        // 5. Lempar tugas ke Pekerja Latar Belakang!
        DeployProject::dispatch($project);

        // 6. Kembali ke dashboard
        return back();
    }

    public function destroy(Project $project, Request $request)
    {
        // Fitur Keamanan: Pastikan proyek yang dihapus benar-benar milik user yang sedang login
        if ($project->user_id !== $request->user()->id) {
            abort(403, 'Anda tidak memiliki akses untuk menghapus proyek ini.');
        }

        // Hapus dari database (Data di tabel deployments akan otomatis terhapus 
        // berkat fitur cascadeOnDelete di file migration kita)
        $project->delete();

        return back();
    }

}