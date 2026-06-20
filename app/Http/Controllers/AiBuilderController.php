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
            'prompt' => 'required|string',
        ]);

        // Create a new AI project
        $project = AiProject::create([
            'user_id' => auth()->id(),
            'name' => 'Project ' . now()->format('YmdHis'),
            'slug' => Str::slug('Project ' . now()->format('YmdHis') . '-' . Str::random(5)),
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

    public function generateStream(Request $request, $id)
    {
        $project = AiProject::findOrFail($id);
        
        if ($project->user_id !== auth()->id()) {
            abort(403);
        }

        $request->validate([
            'prompt' => 'required|string',
        ]);

        $chat = AiChat::create([
            'ai_project_id' => $project->id,
            'prompt' => $request->prompt,
            'status' => 'processing'
        ]);

        return response()->stream(function () use ($request, $project, $chat) {
            try {
                $stream = $this->aiWorkerService->generateStream([
                    'project_id' => (string) $project->id,
                    'prompt' => $request->prompt,
                    'history' => $project->chats()->where('id', '!=', $chat->id)->get()->toArray()
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
}
