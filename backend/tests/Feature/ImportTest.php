<?php

namespace Tests\Feature;

use App\Models\Card;
use App\Models\Set;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The one-shot migration endpoint (docs/migration.md): a browser sends the sets
 * and cards it already holds, with the ids and timestamps it used locally, and
 * the server decides who owns them.
 */
class ImportTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        $this->token = $this->postJson('/api/register', [
            'username' => 'importer',
            'password' => 'hunter2x',
        ])->assertCreated()->json('token');

        $this->user = User::where('username', 'importer')->firstOrFail();
    }

    /**
     * A payload shaped exactly like the browser's localStorage: uuid ids,
     * camelCase fields and the timestamps the local data was saved with.
     *
     * @return array{setId: string, cardIds: array<int, string>, payload: array<string, mixed>}
     */
    private function payload(): array
    {
        $setId = (string) Str::uuid();
        $graded = (string) Str::uuid();
        $ungraded = (string) Str::uuid();

        return [
            'setId' => $setId,
            'cardIds' => [$graded, $ungraded],
            'payload' => [
                'sets' => [
                    [
                        'id' => $setId,
                        'title' => 'JavaScript',
                        'description' => 'from the browser',
                        'createdAt' => '2024-01-01T00:00:00.000Z',
                        'updatedAt' => '2024-01-02T00:00:00.000Z',
                        'cards' => [
                            [
                                'id' => $graded,
                                'term' => 'let',
                                'definition' => 'block scope',
                                'learningStatus' => 'known',
                                'createdAt' => '2024-01-01T00:00:00.000Z',
                                'updatedAt' => '2024-01-01T00:00:00.000Z',
                            ],
                            [
                                'id' => $ungraded,
                                'term' => 'const',
                                'definition' => 'cannot be reassigned',
                                'createdAt' => '2024-01-01T00:00:00.000Z',
                                'updatedAt' => '2024-01-01T00:00:00.000Z',
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    private function import(array $payload, ?string $token = null)
    {
        return $this->withToken($token ?? $this->token)->postJson('/api/import', $payload);
    }

    /** A second, unrelated account, to prove nothing crosses over. */
    private function otherToken(): string
    {
        Cache::flush();

        return $this->postJson('/api/register', [
            'username' => 'other',
            'password' => 'hunter2x',
        ])->assertCreated()->json('token');
    }

    public function test_importing_brings_sets_and_cards_across_unchanged(): void
    {
        ['setId' => $setId, 'cardIds' => $cardIds, 'payload' => $payload] = $this->payload();

        $this->import($payload)
            ->assertOk()
            ->assertExactJson(['importedSets' => 1, 'importedCards' => 2, 'skipped' => 0]);

        $set = Set::findOrFail($setId);
        $this->assertSame('JavaScript', $set->title);
        $this->assertSame('from the browser', $set->description);
        $this->assertSame('2024-01-01 00:00:00', $set->created_at->toDateTimeString());
        $this->assertSame('2024-01-02 00:00:00', $set->updated_at->toDateTimeString());

        $this->assertSame('block scope', Card::findOrFail($cardIds[0])->definition);
        $this->assertSame('known', Card::findOrFail($cardIds[0])->learning_status);
        $this->assertNull(Card::findOrFail($cardIds[1])->learning_status);
    }

    public function test_the_imported_data_belongs_to_the_calling_account(): void
    {
        ['setId' => $setId, 'payload' => $payload] = $this->payload();

        $this->import($payload)->assertOk();

        $this->assertSame($this->user->id, Set::findOrFail($setId)->user_id);

        $listed = $this->withToken($this->token)->getJson('/api/sets')->assertOk()->json();
        $this->assertSame([$setId], array_column($listed, 'id'));

        $other = $this->otherToken();
        $this->withToken($other)->getJson('/api/sets')->assertOk()->assertExactJson([]);
        $this->withToken($other)->getJson("/api/sets/{$setId}")->assertStatus(404);
    }

    public function test_importing_twice_skips_everything_the_second_time(): void
    {
        ['payload' => $payload] = $this->payload();

        $this->import($payload)
            ->assertOk()
            ->assertJson(['importedSets' => 1, 'importedCards' => 2]);

        $this->import($payload)
            ->assertOk()
            ->assertExactJson(['importedSets' => 0, 'importedCards' => 0, 'skipped' => 3]);

        $this->assertSame(1, Set::count());
        $this->assertSame(2, Card::count());
    }

    public function test_another_account_cannot_take_over_the_same_ids(): void
    {
        ['setId' => $setId, 'payload' => $payload] = $this->payload();

        $this->import($payload)->assertOk();

        $other = $this->otherToken();

        $this->withToken($other)
            ->postJson('/api/import', $payload)
            ->assertOk()
            ->assertExactJson(['importedSets' => 0, 'importedCards' => 0, 'skipped' => 3]);

        // Still the first account's set, and the second account has nothing.
        $this->assertSame($this->user->id, Set::findOrFail($setId)->user_id);
        $this->withToken($other)->getJson('/api/sets')->assertOk()->assertExactJson([]);
    }

    public function test_a_card_id_that_is_already_used_is_skipped(): void
    {
        ['cardIds' => $cardIds, 'payload' => $payload] = $this->payload();

        $this->import($payload)->assertOk();

        // Local copies can end up reusing a card id; the import must not duplicate it.
        $secondSetId = (string) Str::uuid();
        $freshCardId = (string) Str::uuid();

        $this->import([
            'sets' => [[
                'id' => $secondSetId,
                'title' => 'Copy',
                'cards' => [
                    ['id' => $cardIds[0], 'term' => 'let', 'definition' => 'block scope'],
                    ['id' => $freshCardId, 'term' => 'new', 'definition' => 'card'],
                ],
            ]],
        ])
            ->assertOk()
            ->assertExactJson(['importedSets' => 1, 'importedCards' => 1, 'skipped' => 1]);

        $this->assertSame(1, Card::whereKey($cardIds[0])->count());
        $this->assertSame(1, Card::where('set_id', $secondSetId)->count());
        $this->assertSame($secondSetId, Card::findOrFail($freshCardId)->set_id);
    }

    public function test_import_requires_authentication(): void
    {
        ['payload' => $payload] = $this->payload();

        $this->postJson('/api/import', $payload)
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');

        $this->assertSame(0, Set::count());
    }

    public function test_import_validates_its_payload(): void
    {
        $this->import(['sets' => []])
            ->assertStatus(422)
            ->assertJsonPath('error.fields.sets', 'Nothing to import.');

        // Field keys for nested rows look like "sets.0.id", which a dot-path
        // cannot express, so the map is asserted directly.
        $fields = $this->import(['sets' => [['id' => 'not-a-uuid', 'title' => 'Nope']]])
            ->assertStatus(422)
            ->json('error.fields');
        $this->assertSame(['sets.0.id' => 'Every set needs the id it already has.'], $fields);

        $fields = $this->import(['sets' => [['id' => (string) Str::uuid()]]])
            ->assertStatus(422)
            ->json('error.fields');
        $this->assertSame(['sets.0.title' => 'Every set needs a title.'], $fields);

        $this->import(['sets' => [[
            'id' => (string) Str::uuid(),
            'title' => 'Set',
            'cards' => [['id' => (string) Str::uuid(), 'term' => 'only a term']],
        ]]])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertSame(0, Set::count());
        $this->assertSame(0, Card::count());
    }
}
