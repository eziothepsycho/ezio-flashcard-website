<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Username + password accounts, exactly as the website has them: no email,
 * no phone, no profile. Passwords are hashed here (bcrypt) and never leave
 * the server; clients only ever hold a bearer token.
 */
class AuthController extends Controller
{
    /**
     * One message whether the account is missing or the password is wrong, so
     * login cannot be used to find out which usernames exist.
     */
    private const LOGIN_ERROR = 'Invalid username or password.';

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'username' => ['required', 'string', 'min:3', 'max:20', 'regex:/^[A-Za-z0-9_]+$/'],
                'password' => ['required', 'string', 'min:4'],
            ],
            [
                'username.required' => 'Username is required.',
                'username.min' => 'Usernames need to be 3-20 characters.',
                'username.max' => 'Usernames need to be 3-20 characters.',
                'username.regex' => 'Usernames can only use letters, numbers and underscores.',
                'password.required' => 'Password is required.',
                'password.min' => 'Passwords need to be at least 4 characters.',
            ]
        );

        $username = trim($data['username']);

        // The column collation is case-insensitive, so this also catches "MARK".
        if (User::where('username', $username)->exists()) {
            throw ValidationException::withMessages([
                'username' => 'That username is already taken.',
            ]);
        }

        // The model generates the UUID key (App\Models\Concerns\HasUuidKey).
        $user = User::create([
            'username' => $username,
            'password_hash' => Hash::make($data['password']),
        ]);

        // Creating an account signs you in, exactly like the website does.
        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $this->publicUser($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('username', trim($data['username']))->first();

        if (! $user || ! Hash::check($data['password'], $user->password_hash)) {
            return response()->json([
                'error' => [
                    'code' => 'invalid_credentials',
                    'message' => self::LOGIN_ERROR,
                ],
            ], 401);
        }

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $this->publicUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Only the token that made this request: other devices stay signed in.
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->publicUser($request->user())]);
    }

    /**
     * The only fields a client ever sees. The hash stays on the server.
     *
     * @return array<string, mixed>
     */
    private function publicUser(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'createdAt' => $user->created_at?->toISOString(),
        ];
    }
}
