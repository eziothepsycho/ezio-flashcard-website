<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

/**
 * Authentication over the real HTTP stack (routes, middleware, throttling) and
 * against MySQL, so the case-insensitive username collation behaves exactly as
 * it does in development.
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Throttle counters live in the cache, so every test starts clean.
        Cache::flush();
    }

    private function register(string $username = 'mark', string $password = 'hunter2x')
    {
        return $this->postJson('/api/register', [
            'username' => $username,
            'password' => $password,
        ]);
    }

    private function login(string $username = 'mark', string $password = 'hunter2x')
    {
        return $this->postJson('/api/login', [
            'username' => $username,
            'password' => $password,
        ]);
    }

    public function test_registration_creates_an_account_and_signs_it_in(): void
    {
        $response = $this->register()->assertCreated();

        $response->assertJsonPath('user.username', 'mark');
        $this->assertNotEmpty($response->json('token'));

        // Exactly three fields: no email, no phone, no profile of any kind.
        $this->assertSame(['id', 'username', 'createdAt'], array_keys($response->json('user')));

        // The token works immediately, because registering signs you in.
        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.username', 'mark');
    }

    public function test_registration_stores_a_hash_and_never_returns_it(): void
    {
        $response = $this->register()->assertCreated();

        $user = User::where('username', 'mark')->firstOrFail();

        $this->assertNotSame('hunter2x', $user->password_hash);
        $this->assertTrue(Hash::check('hunter2x', $user->password_hash));
        $this->assertStringStartsWith('$2y$', $user->password_hash);

        $this->assertStringNotContainsString('password_hash', $response->getContent());
        $this->assertStringNotContainsString('hunter2x', $response->getContent());
    }

    public function test_registration_rejects_a_duplicate_username_ignoring_case(): void
    {
        $this->register('mark')->assertCreated();

        $this->register('MARK')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed')
            ->assertJsonPath('error.fields.username', 'That username is already taken.');

        $this->assertSame(1, User::count());
    }

    public function test_registration_validates_the_username(): void
    {
        $cases = [
            '' => 'Username is required.',
            '   ' => 'Username is required.',
            'ab' => 'Usernames need to be 3-20 characters.',
            str_repeat('a', 21) => 'Usernames need to be 3-20 characters.',
            'bad name' => 'Usernames can only use letters, numbers and underscores.',
            'mark!' => 'Usernames can only use letters, numbers and underscores.',
        ];

        foreach ($cases as $username => $message) {
            // Every registration attempt counts towards the limiter, even one that
            // fails validation, so start each case with a clean slate.
            Cache::flush();

            $this->register($username)
                ->assertStatus(422)
                ->assertJsonPath('error.fields.username', $message);
        }

        $this->assertSame(0, User::count());
    }

    public function test_registration_validates_the_password(): void
    {
        $this->register('mark', '')
            ->assertStatus(422)
            ->assertJsonPath('error.fields.password', 'Password is required.');

        $this->register('mark', 'x')
            ->assertStatus(422)
            ->assertJsonPath('error.fields.password', 'Passwords need to be at least 4 characters.');

        $this->assertSame(0, User::count());
    }

    public function test_usernames_are_trimmed_before_they_are_stored(): void
    {
        $this->register('  mark  ')
            ->assertCreated()
            ->assertJsonPath('user.username', 'mark');

        $this->assertSame('mark', User::sole()->username);
    }

    public function test_login_returns_a_token_for_a_case_insensitive_username(): void
    {
        $this->register('mark')->assertCreated();

        $response = $this->login('MARK')->assertOk();

        $this->assertNotEmpty($response->json('token'));
        $this->assertSame('mark', $response->json('user.username'));

        $this->withToken($response->json('token'))
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('user.username', 'mark');
    }

    public function test_invalid_credentials_never_reveal_which_part_was_wrong(): void
    {
        $this->register('mark')->assertCreated();

        $wrongPassword = $this->login('mark', 'not-the-password')->assertStatus(401);
        $unknownUser = $this->login('nobody', 'not-the-password')->assertStatus(401);

        $wrongPassword->assertJsonPath('error.code', 'invalid_credentials');
        $this->assertSame($wrongPassword->getContent(), $unknownUser->getContent());
        $this->assertSame('Invalid username or password.', $wrongPassword->json('error.message'));
    }

    public function test_login_requires_both_fields(): void
    {
        $this->login('', '')
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
    }

    public function test_me_needs_a_real_token(): void
    {
        $this->getJson('/api/me')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');

        $this->withToken('1|nonsense')->getJson('/api/me')->assertStatus(401);
        $this->withToken('not-even-a-token')->getJson('/api/me')->assertStatus(401);
    }

    public function test_logout_revokes_only_the_token_it_was_given(): void
    {
        // Registering signs you in, so there are three tokens: the one from
        // signing up plus the two logins below.
        $this->register('mark')->assertCreated();
        $first = $this->login()->assertOk()->json('token');
        $second = $this->login()->assertOk()->json('token');

        // Two devices signed in...
        $this->withToken($first)->getJson('/api/me')->assertOk();
        $this->withToken($second)->getJson('/api/me')->assertOk();
        $this->assertSame(3, PersonalAccessToken::count());

        // ...one signs out.
        $this->withToken($first)->postJson('/api/logout')->assertNoContent();

        $this->withToken($first)->getJson('/api/me')->assertStatus(401);
        $this->withToken($second)->getJson('/api/me')->assertOk();
        $this->assertSame(2, PersonalAccessToken::count());
    }

    public function test_a_token_expires_after_thirty_days(): void
    {
        $token = $this->register('mark')->assertCreated()->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk();

        $this->travel(29)->days();
        $this->withToken($token)->getJson('/api/me')->assertOk();

        $this->travel(2)->days();
        $this->withToken($token)->getJson('/api/me')->assertStatus(401);
    }

    public function test_login_is_throttled_per_username_and_address(): void
    {
        $this->register('mark')->assertCreated();

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->login('mark', 'wrong-password')->assertStatus(401);
        }

        $blocked = $this->login('mark', 'wrong-password')
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'too_many_attempts');

        $blocked->assertHeader('Retry-After');

        // Another account is a different bucket, so it can still try.
        $this->login('john', 'wrong-password')->assertStatus(401);
    }

    public function test_registration_is_throttled_per_address(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->register("mark{$i}")->assertCreated();
        }

        $this->register('mark4')
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'too_many_attempts');

        $this->assertSame(3, User::count());
    }

    public function test_tokens_belong_to_their_own_account(): void
    {
        $markToken = $this->register('mark')->assertCreated()->json('token');
        $johnToken = $this->register('john')->assertCreated()->json('token');

        $this->withToken($markToken)->getJson('/api/me')->assertJsonPath('user.username', 'mark');
        $this->withToken($johnToken)->getJson('/api/me')->assertJsonPath('user.username', 'john');

        // Signing one account out leaves the other signed in.
        $this->withToken($markToken)->postJson('/api/logout')->assertNoContent();

        $this->withToken($markToken)->getJson('/api/me')->assertStatus(401);
        $this->withToken($johnToken)->getJson('/api/me')->assertOk();
    }
}
