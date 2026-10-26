<?php

namespace App\Services;

use App\Models\Credential;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class FcmService
{
    public function sendToUser(User $user, string $title, string $body, array $data = []): array
    {
        $token = trim((string) ($user->fcm_token ?? ''));
        if ($token === '') {
            return ['success' => false, 'reason' => 'no_token'];
        }

        $serviceAccount = $this->resolveServiceAccount();
        if (!$serviceAccount) {
            return ['success' => false, 'reason' => 'no_service_account'];
        }

        return $this->send($serviceAccount, $token, $title, $body, $data);
    }

    public function sendToUsers(iterable $users, string $title, string $body, array $data = []): array
    {
        $results = [];
        foreach ($users as $user) {
            if ($user instanceof User) {
                $results[$user->id] = $this->sendToUser($user, $title, $body, $data);
            }
        }
        return $results;
    }

    protected function resolveServiceAccount(): ?array
    {
        if (Schema::hasTable('credentials')) {
            try {
                $rows = Credential::query()->get();
                foreach ($rows as $row) {
                    foreach (['private', 'desc', 'api', 'public'] as $field) {
                        $value = (string) ($row->{$field} ?? '');
                        $parsed = $this->parseServiceAccount($value);
                        if ($parsed) {
                            return $parsed;
                        }
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('FCM credential lookup failed: '.$e->getMessage());
            }
        }

        $base = base_path('firebasekey');
        if (is_dir($base)) {
            foreach (glob($base.DIRECTORY_SEPARATOR.'*.json') ?: [] as $path) {
                $parsed = $this->parseServiceAccount((string) @file_get_contents($path));
                if ($parsed) {
                    return $parsed;
                }
            }
        }

        return null;
    }

    protected function parseServiceAccount(?string $raw): ?array
    {
        $raw = trim((string) $raw);
        if ($raw === '') {
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            if (preg_match('/\{.*\}/s', $raw, $m)) {
                $decoded = json_decode($m[0], true);
            }
        }

        if (is_array($decoded)
            && !empty($decoded['client_email'])
            && !empty($decoded['private_key'])
            && !empty($decoded['project_id'])) {
            return $decoded;
        }

        return null;
    }

    protected function send(array $serviceAccount, string $token, string $title, string $body, array $data): array
    {
        try {
            $accessToken = $this->accessToken($serviceAccount);
            if ($accessToken === '') {
                return ['success' => false, 'reason' => 'no_access_token'];
            }

            $message = [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
            ];

            if (!empty($data)) {
                $message['data'] = [];
                foreach ($data as $k => $v) {
                    $message['data'][(string) $k] = (string) $v;
                }
            }

            $url = 'https://fcm.googleapis.com/v1/projects/'
                .rawurlencode($serviceAccount['project_id']).'/messages:send';

            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->post($url, ['message' => $message]);

            if ($response->successful()) {
                return ['success' => true, 'response' => $response->json()];
            }

            Log::warning('FCM send failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return ['success' => false, 'status' => $response->status(), 'body' => $response->body()];
        } catch (\Throwable $e) {
            Log::error('FCM send exception: '.$e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function accessToken(array $serviceAccount): string
    {
        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $serviceAccount['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $signingInput = $header.'.'.$claims;

        $privateKey = openssl_pkey_get_private($serviceAccount['private_key']);
        if ($privateKey === false) {
            throw new \RuntimeException('Invalid Firebase private key.');
        }

        $signature = '';
        if (!openssl_sign($signingInput, $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Unable to sign Firebase JWT.');
        }

        $jwt = $signingInput.'.'.$this->base64UrlEncode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (!$response->successful()) {
            Log::warning('FCM OAuth token failed', ['body' => $response->body()]);
            return '';
        }

        return (string) ($response->json('access_token') ?? '');
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
