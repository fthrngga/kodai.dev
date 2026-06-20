<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiWorkerService
{
    protected string $baseUrl;
    protected string $token;

    public function __construct()
    {
        $this->baseUrl = config('services.vps2.url');
        $this->token = config('services.vps2.token');
    }

    /**
     * Send a prompt to the AI Worker and return the response.
     */
    public function generate(array $payload)
    {
        try {
            $baseUrl = rtrim($this->baseUrl, '/');
            if (str_ends_with($baseUrl, '/api/v1/generate')) {
                $baseUrl = substr($baseUrl, 0, -16);
            } elseif (str_ends_with($baseUrl, '/api/v1/generate/stream')) {
                $baseUrl = substr($baseUrl, 0, -23);
            }

            $response = Http::withToken($this->token)
                ->timeout(120) // Provide a longer timeout for AI generation
                ->post("{$baseUrl}/api/v1/generate", $payload);

            if ($response->successful()) {
                return $response->json();
            }

            Log::error('AI Worker generation failed: ' . $response->body());
            return null;
        } catch (\Exception $e) {
            Log::error('AI Worker connection error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Send a prompt to the AI Worker and stream the response back.
     */
    public function generateStream(array $payload)
    {
        try {
            $baseUrl = rtrim($this->baseUrl, '/');
            if (str_ends_with($baseUrl, '/api/v1/generate')) {
                $baseUrl = substr($baseUrl, 0, -16);
            } elseif (str_ends_with($baseUrl, '/api/v1/generate/stream')) {
                $baseUrl = substr($baseUrl, 0, -23);
            }

            $response = Http::withToken($this->token)
                ->timeout(120)
                ->withOptions(['stream' => true])
                ->post("{$baseUrl}/api/v1/generate/stream", $payload);

            return $response->toPsrResponse()->getBody();
        } catch (\Exception $e) {
            Log::error('AI Worker streaming connection error: ' . $e->getMessage());
            throw $e;
        }
    }
}
