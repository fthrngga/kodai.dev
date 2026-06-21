<?php

namespace App\Http\Controllers;

use App\Models\AiProject;
use App\Models\AiChat;
use App\Services\AiWorkerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class AiBuilderController extends Controller
{
    protected AiWorkerService $aiWorkerService;

    public function __construct(AiWorkerService $aiWorkerService)
    {
        $this->aiWorkerService = $aiWorkerService;
    }

    public function index()
    {
        // View for creating a new project or listing recent ones
        $projects = auth()->user()->aiProjects()->latest()->get();
        return Inertia::render('AiBuilder/Index', [
            'projects' => $projects
        ]);
    }

    public function show($id)
    {
        $project = AiProject::with('chats')->findOrFail($id);

        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        return Inertia::render('AiBuilder/Show', [
            'project' => $project
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'prompt' => 'required|string',
        ]);

        // Create a new AI project
        $project = AiProject::create([
            'user_id' => auth()->id(),
            'name' => $request->name,
            'slug' => Str::slug($request->name . '-' . Str::random(5)),
            'status' => 'draft'
        ]);

        // Save the first chat prompt
        $chat = AiChat::create([
            'ai_project_id' => $project->id,
            'prompt' => $request->prompt,
            'status' => 'processing'
        ]);

        return redirect()->route('ai-builder.show', $project->id);
    }

    public function update(Request $request, $id)
    {
        $project = AiProject::findOrFail($id);
        if ($project->user_id !== auth()->id()) abort(403);

        $request->validate(['name' => 'required|string|max:255']);
        $project->update(['name' => $request->name]);
        
        return back()->with('success', 'Nama proyek AI berhasil diperbarui.');
    }

    public function destroy($id)
    {
        $project = AiProject::findOrFail($id);
        if ($project->user_id !== auth()->id()) abort(403);
        
        // AiProject model should have cascade delete for AiChats, but we can do it explicitly just in case
        $project->chats()->delete();
        $project->delete();
        
        return redirect()->route('ai-builder.index')->with('success', 'Proyek AI berhasil dihapus.');
    }

    public function generateStream(Request $request, $id)
    {
        $project = AiProject::findOrFail($id);
        
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $request->validate([
            'prompt' => 'required|string',
        ]);

        // Cari chat yang sedang diproses (dari store method) atau buat baru
        $chat = $project->chats()
            ->where('prompt', $request->prompt)
            ->where('status', 'processing')
            ->where(function($q) {
                $q->whereNull('response')->orWhere('response', '');
            })
            ->latest()
            ->first();

        if (!$chat) {
            $chat = AiChat::create([
                'ai_project_id' => $project->id,
                'prompt' => $request->prompt,
                'status' => 'processing'
            ]);
        }

        return response()->stream(function () use ($request, $project, $chat) {
            try {
                // Format history to [ {role: user, content: prompt}, {role: model, content: response} ]
                $formattedHistory = [];
                $pastChats = $project->chats()->where('id', '!=', $chat->id)->where('status', 'completed')->orderBy('created_at')->get();
                foreach ($pastChats as $pastChat) {
                    $formattedHistory[] = ['role' => 'user', 'content' => $pastChat->prompt];
                    $formattedHistory[] = ['role' => 'model', 'content' => $pastChat->response];
                }

                $stream = $this->aiWorkerService->generateStream([
                    'project_id' => (string) $project->id,
                    'prompt' => $request->prompt,
                    'history' => $formattedHistory
                ]);

                $fullResponse = "";

                while (!$stream->eof()) {
                    $chunk = $stream->read(1024);
                    $fullResponse .= $chunk;
                    echo $chunk;
                    ob_flush();
                    flush();
                }

                // Update chat when stream finishes
                $chat->update([
                    'response' => $fullResponse,
                    'status' => 'completed'
                ]);
            } catch (\Exception $e) {
                // Return a clean error message to the frontend instead of HTML
                $errorMsg = "Gagal terhubung ke AI Worker Server. Pastikan VPS 2 berjalan dan URL/Token sudah benar.";
                echo $errorMsg;
                ob_flush();
                flush();
                
                $chat->update([
                    'response' => $errorMsg,
                    'status' => 'error',
                    'error_message' => $e->getMessage()
                ]);
            }
        }, 200, [
            'Cache-Control' => 'no-cache',
            'Content-Type' => 'text/event-stream',
            'X-Accel-Buffering' => 'no' // Important for Nginx
        ]);
    }

    public function hostToKodaidev(Request $request, $id)
    {
        $project = AiProject::with('chats')->findOrFail($id);

        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        // Ambil chat terakhir yang selesai
        $latestChat = $project->chats()->where('status', 'completed')->latest()->first();

        if (!$latestChat || empty($latestChat->response)) {
            return back()->with('error', 'Belum ada hasil generate kode yang selesai.');
        }

        // Ekstrak HTML menggunakan Regex
        $pattern = '/```(?:html)?\n([\s\S]*?)(?:```|$)/i';
        preg_match($pattern, $latestChat->response, $matches);
        
        $cleanCode = $latestChat->response;
        if (!empty($matches[1])) {
            $cleanCode = $matches[1];
        } else {
            $cleanCode = str_replace(['```html', '```'], '', $cleanCode);
        }
        $cleanCode = trim($cleanCode);

        // --- SISTEM SELF-HEALING UNTUK HOSTED ENVIRONMENT ---
        // 1. Perbaiki URL CDN React yang salah ketik oleh AI
        $cleanCode = str_replace('react.production.js', 'react.production.min.js', $cleanCode);
        $cleanCode = str_replace('react-dom.production.js', 'react-dom.production.min.js', $cleanCode);

        // 2. Matikan data-type="module" agar Babel tidak menggunakan module browser
        $cleanCode = preg_replace('/<script\s+type="text\/babel"\s+data-type="module"/i', '<script type="text/babel"', $cleanCode);

        // 3. Konfigurasi Preset Babel secara Programatis untuk memaksa CLASSIC RUNTIME
        $babelConfig = <<<HTML
        <script>
            if (window.Babel && window.Babel.availablePresets) {
                window.Babel.registerPreset('classic-react', {
                    presets: [ [window.Babel.availablePresets['react'], { "runtime": "classic" }] ]
                });
            }
        </script>
HTML;
        $cleanCode = preg_replace('/<script\s+type="text\/babel"[^>]*>/i', $babelConfig . "\n" . '<script type="text/babel" data-presets="env,classic-react">', $cleanCode);
        // ----------------------------------------------------

        // Buat subdomain dasar
        $baseSlug = Str::slug($project->name);
        $subdomain = $baseSlug;
        
        $counter = 1;
        while (\App\Models\Project::where('subdomain', $subdomain)->exists()) {
            $subdomain = $baseSlug . '-' . $counter;
            $counter++;
        }

        // Simpan data proyek sebagai tipe 'static'
        $newProject = $request->user()->projects()->create([
            'name' => $project->name . ' (AI)',
            'subdomain' => $subdomain,
            'project_type' => 'static',
            'run_migration' => false,
            'status' => 'pending'
        ]);

        $projectDir = '/home/fathurrangga92/kodaidev-apps/' . $subdomain;

        try {
            // Buat direktori jika belum ada
            if (!\Illuminate\Support\Facades\File::exists($projectDir)) {
                \Illuminate\Support\Facades\File::makeDirectory($projectDir, 0755, true);
            }

            // Tulis index.html
            \Illuminate\Support\Facades\File::put($projectDir . '/index.html', $cleanCode);

            // Log deployment
            $newProject->deployments()->create([
                'status' => 'success',
                'log_output' => "Deploy instan via AI Builder berhasil!\nFile terbuat di: {$projectDir}\nTipe: Static Mode Nginx"
            ]);

            // Buat Server Block Nginx dan SSL
            $newProject->configureNginxAndSsl();
            $newProject->update(['status' => 'active']);

            return redirect()->route('dashboard')->with('success', 'Proyek AI berhasil di-hosting ke Kodaidev!');
            
        } catch (\Exception $e) {
            $newProject->update(['status' => 'failed']);
            $newProject->deployments()->create([
                'status' => 'failed',
                'log_output' => "Gagal deploy AI project: " . $e->getMessage()
            ]);
            return back()->with('error', 'Gagal mempublikasikan proyek: ' . $e->getMessage());
        }
    }
}
