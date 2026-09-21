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
 * Sets and cards over the real HTTP stack, including the ownership matrix: what
 * one account can reach, and what another account gets when it goes looking.
 */
class FlashcardApiTest extends TestCase
{
    use RefreshDatabase;

    private User $mark;

    private User $john;

    private string $markToken;

    private string $johnToken;

    protected function setUp(): void
    {
        parent::setUp();

        Cache::flush();

        [$this->mark, $this->markToken] = $this->account('mark');
        [$this->john, $this->johnToken] = $this->account('john');
    }

    /**
     * Register an account the way a client would, and keep its token.
     *
     * @return array{0: User, 1: string}
     */
    private function account(string $username): array
    {
        $token = $this->postJson('/api/register', [
            'username' => $username,
            'password' => 'hunter2x',
        ])->assertCreated()->json('token');

        return [User::where('username', $username)->firstOrFail(), $token];
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function createSet(string $token, array $attributes = []): array
    {
        return $this->withToken($token)
            ->postJson('/api/sets', array_merge(['title' => 'JavaScript'], $attributes))
            ->assertCreated()
            ->json();
    }

    /**
     * @return array<string, mixed>
     */
    private function createCard(
        string $token,
        string $setId,
        string $term = 'let',
        string $definition = 'block scope'
    ): array {
        return $this->withToken($token)
            ->postJson("/api/sets/{$setId}/cards", [
                'term' => $term,
                'definition' => $definition,
            ])
            ->assertCreated()
            ->json();
    }

    public function test_sets_and_cards_require_authentication(): void
    {
        $this->getJson('/api/sets')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');

        $this->postJson('/api/sets', ['title' => 'JavaScript'])->assertStatus(401);
        $this->getJson('/api/sets/'.Str::uuid())->assertStatus(401);
        $this->getJson('/api/sets/'.Str::uuid().'/cards')->assertStatus(401);
        $this->patchJson('/api/cards/'.Str::uuid(), ['term' => 'let'])->assertStatus(401);
    }

    public function test_a_new_set_has_the_shape_both_clients_expect(): void
    {
        $set = $this->createSet($this->markToken, ['title' => 'JavaScript', 'description' => 'notes']);

        $this->assertSame(
            ['id', 'userId', 'title', 'description', 'createdAt', 'updatedAt'],
            array_keys($set)
        );

        $this->assertTrue(Str::isUuid($set['id']));
        $this->assertSame($this->mark->id, $set['userId']);
        $this->assertSame('JavaScript', $set['title']);
        $this->assertSame('notes', $set['description']);
        $this->assertMatchesRegularExpression(
            '/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/',
            $set['createdAt']
        );
    }

    public function test_sets_are_listed_oldest_first_and_only_for_their_owner(): void
    {
        $first = $this->createSet($this->markToken, ['title' => 'Programming']);

        // A second apart, so "oldest first" is deterministic rather than decided
        // by the id tie-break within the same millisecond.
        $this->travel(1)->seconds();

        $second = $this->createSet($this->markToken, ['title' => 'Networking']);

        $markSets = $this->withToken($this->markToken)->getJson('/api/sets')->assertOk()->json();

        $this->assertSame([$first['id'], $second['id']], array_column($markSets, 'id'));

        $this->withToken($this->johnToken)->getJson('/api/sets')->assertOk()->assertExactJson([]);
    }

    public function test_a_set_can_be_read_updated_and_deleted(): void
    {
        $set = $this->createSet($this->markToken);

        $this->withToken($this->markToken)
            ->getJson("/api/sets/{$set['id']}")
            ->assertOk()
            ->assertJsonPath('id', $set['id']);

        // A second later, so the refreshed updatedAt is provably different.
        $this->travel(1)->seconds();

        $updated = $this->withToken($this->markToken)
            ->patchJson("/api/sets/{$set['id']}", [
                'title' => 'JavaScript II',
                'description' => 'edited',
            ])
            ->assertOk();

        $updated->assertJsonPath('title', 'JavaScript II')
            ->assertJsonPath('description', 'edited');

        $this->assertNotSame($set['updatedAt'], $updated->json('updatedAt'));

        $this->withToken($this->markToken)->deleteJson("/api/sets/{$set['id']}")->assertNoContent();
        $this->withToken($this->markToken)->getJson("/api/sets/{$set['id']}")->assertStatus(404);
        $this->assertSame(0, Set::count());
    }

    public function test_a_set_title_is_trimmed_and_blank_titles_are_rejected(): void
    {
        $this->withToken($this->markToken)
            ->postJson('/api/sets', ['title' => '   '])
            ->assertStatus(422)
            ->assertJsonPath('error.fields.title', 'Give the set a title.');

        $this->withToken($this->markToken)
            ->postJson('/api/sets', ['title' => '  Biology  '])
            ->assertCreated()
            ->assertJsonPath('title', 'Biology');
    }

    public function test_an_import_can_supply_ids_and_timestamps(): void
    {
        $id = (string) Str::uuid();

        $this->withToken($this->markToken)
            ->postJson('/api/sets', [
                'id' => $id,
                'title' => 'Legacy set',
                'createdAt' => '2024-01-01T00:00:00.000Z',
                'updatedAt' => '2024-01-02T00:00:00.000Z',
            ])
            ->assertCreated()
            ->assertJsonPath('id', $id);

        $stored = Set::findOrFail($id);
        $this->assertSame('2024-01-01 00:00:00', $stored->created_at->toDateTimeString());
        $this->assertSame('2024-01-02 00:00:00', $stored->updated_at->toDateTimeString());

        // A malformed id is rejected rather than trusted.
        $this->withToken($this->markToken)
            ->postJson('/api/sets', ['id' => 'not-a-uuid', 'title' => 'Nope'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
    }

    public function test_deleting_a_set_takes_its_cards_with_it(): void
    {
        $set = $this->createSet($this->markToken);
        $this->createCard($this->markToken, $set['id'], 'let', 'block scope');
        $this->createCard($this->markToken, $set['id'], 'const', 'cannot be reassigned');

        $this->assertSame(2, Card::count());

        $this->withToken($this->markToken)->deleteJson("/api/sets/{$set['id']}")->assertNoContent();

        $this->assertSame(0, Card::count());
    }

    public function test_cards_can_be_added_listed_edited_graded_and_deleted(): void
    {
        $set = $this->createSet($this->markToken);

        $card = $this->createCard($this->markToken, $set['id'], 'let', 'block scope');

        $this->assertSame(
            ['id', 'setId', 'term', 'definition', 'learningStatus', 'createdAt', 'updatedAt'],
            array_keys($card)
        );
        $this->assertSame($set['id'], $card['setId']);
        $this->assertNull($card['learningStatus'], 'a new card is ungraded');

        // A second apart, so the listed order is deterministic.
        $this->travel(1)->seconds();

        $second = $this->createCard($this->markToken, $set['id'], 'const', 'cannot be reassigned');

        $listed = $this->withToken($this->markToken)
            ->getJson("/api/sets/{$set['id']}/cards")
            ->assertOk()
            ->json();

        $this->assertSame([$card['id'], $second['id']], array_column($listed, 'id'));

        // Editing the two sides...
        $this->withToken($this->markToken)
            ->patchJson("/api/cards/{$card['id']}", [
                'term' => 'let / const',
                'definition' => 'block scoped',
            ])
            ->assertOk()
            ->assertJsonPath('term', 'let / const');

        // ...and grading in Study Mode is just learningStatus.
        $this->withToken($this->markToken)
            ->patchJson("/api/cards/{$card['id']}", ['learningStatus' => 'known'])
            ->assertOk()
            ->assertJsonPath('learningStatus', 'known');

        $this->assertSame('known', Card::findOrFail($card['id'])->learning_status);

        // A null clears the grade again.
        $this->withToken($this->markToken)
            ->patchJson("/api/cards/{$card['id']}", ['learningStatus' => null])
            ->assertOk()
            ->assertJsonPath('learningStatus', null);

        $this->assertNull(Card::findOrFail($card['id'])->learning_status);

        $this->withToken($this->markToken)->deleteJson("/api/cards/{$card['id']}")->assertNoContent();

        $this->withToken($this->markToken)
            ->getJson("/api/sets/{$set['id']}/cards")
            ->assertOk()
            ->assertJsonCount(1);
    }

    public function test_cards_can_be_imported_in_bulk(): void
    {
        $set = $this->createSet($this->markToken);

        $imported = $this->withToken($this->markToken)
            ->postJson("/api/sets/{$set['id']}/cards/bulk", [
                'cards' => [
                    ['term' => 'let', 'definition' => 'block scope'],
                    ['term' => 'const', 'definition' => 'cannot be reassigned'],
                    ['term' => 'var', 'definition' => 'function scope'],
                ],
            ])
            ->assertCreated()
            ->json();

        $this->assertCount(3, $imported);
        $this->assertSame('let', $imported[0]['term']);
        $this->assertSame($set['id'], $imported[2]['setId']);
        $this->assertSame(3, Card::count());

        // A row missing its definition is rejected before anything is saved.
        $this->withToken($this->markToken)
            ->postJson("/api/sets/{$set['id']}/cards/bulk", [
                'cards' => [['term' => 'only a term']],
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertSame(3, Card::count());

        // An empty import is refused rather than quietly doing nothing.
        $this->withToken($this->markToken)
            ->postJson("/api/sets/{$set['id']}/cards/bulk", ['cards' => []])
            ->assertStatus(422)
            ->assertJsonPath('error.fields.cards', 'No flashcards to import.');
    }

    public function test_blank_card_sides_are_rejected(): void
    {
        $set = $this->createSet($this->markToken);

        $this->withToken($this->markToken)
            ->postJson("/api/sets/{$set['id']}/cards", [
                'term' => '   ',
                'definition' => 'something',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.fields.term', 'Term is required.');

        $this->withToken($this->markToken)
            ->postJson("/api/sets/{$set['id']}/cards", [
                'term' => 'something',
                'definition' => '  ',
            ])
            ->assertStatus(422)
            ->assertJsonPath('error.fields.definition', 'Definition is required.');

        $this->assertSame(0, Card::count());
    }

    public function test_a_card_only_ever_appears_in_its_own_set(): void
    {
        $first = $this->createSet($this->markToken, ['title' => 'First']);
        $second = $this->createSet($this->markToken, ['title' => 'Second']);

        $this->createCard($this->markToken, $first['id'], 'let', 'block scope');

        $this->withToken($this->markToken)
            ->getJson("/api/sets/{$second['id']}/cards")
            ->assertOk()
            ->assertExactJson([]);
    }

    public function test_another_account_cannot_see_or_touch_my_data(): void
    {
        $set = $this->createSet($this->markToken, ['title' => 'JavaScript']);
        $card = $this->createCard($this->markToken, $set['id'], 'let', 'block scope');

        // Mark's own list still has just that one set...
        $markSets = $this->withToken($this->markToken)->getJson('/api/sets')->assertOk()->json();
        $this->assertSame([$set['id']], array_column($markSets, 'id'));

        // ...and every way John might reach it looks like a 404.
        $notFound = fn ($response) => $response->assertStatus(404)->assertJsonPath('error.code', 'not_found');

        $this->withToken($this->johnToken)->getJson('/api/sets')->assertOk()->assertExactJson([]);

        $notFound($this->withToken($this->johnToken)->getJson("/api/sets/{$set['id']}"));
        $notFound($this->withToken($this->johnToken)->patchJson("/api/sets/{$set['id']}", ['title' => 'hijacked']));
        $notFound($this->withToken($this->johnToken)->deleteJson("/api/sets/{$set['id']}"));
        $notFound($this->withToken($this->johnToken)->getJson("/api/sets/{$set['id']}/cards"));
        $notFound($this->withToken($this->johnToken)->postJson("/api/sets/{$set['id']}/cards", [
            'term' => 'x',
            'definition' => 'y',
        ]));
        $notFound($this->withToken($this->johnToken)->postJson("/api/sets/{$set['id']}/cards/bulk", [
            'cards' => [['term' => 'x', 'definition' => 'y']],
        ]));
        $notFound($this->withToken($this->johnToken)->patchJson("/api/cards/{$card['id']}", ['term' => 'hijacked']));
        $notFound($this->withToken($this->johnToken)->patchJson("/api/cards/{$card['id']}", ['learningStatus' => 'known']));
        $notFound($this->withToken($this->johnToken)->deleteJson("/api/cards/{$card['id']}"));

        // Nothing of Mark's changed, and nothing was created for John.
        $this->assertSame('JavaScript', Set::findOrFail($set['id'])->title);
        $this->assertSame(1, Card::count());
        $this->assertSame('let', Card::findOrFail($card['id'])->term);
        $this->assertNull(Card::findOrFail($card['id'])->learning_status);
        $this->assertSame(0, $this->john->sets()->count(), 'john still owns no sets');

        // Mark can still do all of it himself.
        $this->withToken($this->markToken)->getJson("/api/sets/{$set['id']}")->assertOk();
        $this->withToken($this->markToken)
            ->patchJson("/api/cards/{$card['id']}", ['term' => 'let / const'])
            ->assertOk();
        $this->withToken($this->markToken)->deleteJson("/api/sets/{$set['id']}")->assertNoContent();
    }

    public function test_missing_or_malformed_ids_are_not_found(): void
    {
        $notFound = fn ($response) => $response->assertStatus(404)->assertJsonPath('error.code', 'not_found');

        $notFound($this->withToken($this->markToken)->getJson('/api/sets/'.Str::uuid()));
        $notFound($this->withToken($this->markToken)->getJson('/api/sets/not-a-uuid'));
        $notFound($this->withToken($this->markToken)->deleteJson('/api/sets/'.Str::uuid()));
        $notFound($this->withToken($this->markToken)->patchJson('/api/cards/not-a-uuid', ['term' => 'let']));
        $notFound($this->withToken($this->markToken)->deleteJson('/api/cards/'.Str::uuid()));
        $notFound($this->withToken($this->markToken)->getJson('/api/sets/'.Str::uuid().'/cards'));
    }
}
