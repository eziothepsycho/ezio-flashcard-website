<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CardResource;
use App\Models\Card;
use App\Models\Set;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * Flashcards. A card belongs to the account that owns its set, so card routes
 * are resolved through the user's own relation and another account's card id
 * comes back as 404.
 */
class CardController extends Controller
{
    public function index(Request $request, string $setId): AnonymousResourceCollection
    {
        $cards = $this->ownedSet($request, $setId)
            ->cards()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return CardResource::collection($cards);
    }

    public function store(Request $request, string $setId): JsonResponse
    {
        $set = $this->ownedSet($request, $setId);

        $data = $request->validate([
            'term' => ['required', 'string'],
            'definition' => ['required', 'string'],
            'id' => ['sometimes', 'uuid'],
        ], [
            'term.required' => 'Term is required.',
            'definition.required' => 'Definition is required.',
        ]);

        $card = $set->cards()->create($this->cardAttributes($data) + array_filter([
            'id' => $data['id'] ?? null,
        ]));

        return (new CardResource($card))->response()->setStatusCode(201);
    }

    /**
     * The TAB-import path: the client parses the pasted text with
     * parseFlashcardImport and posts the rows that parsed cleanly.
     */
    public function bulk(Request $request, string $setId): JsonResponse
    {
        $set = $this->ownedSet($request, $setId);

        $data = $request->validate([
            'cards' => ['required', 'array', 'min:1', 'max:500'],
            'cards.*.term' => ['required', 'string'],
            'cards.*.definition' => ['required', 'string'],
        ], [
            'cards.required' => 'No flashcards to import.',
            'cards.max' => 'Import at most 500 flashcards at a time.',
            'cards.*.term.required' => 'Term is required.',
            'cards.*.definition.required' => 'Definition is required.',
        ]);

        $created = collect($data['cards'])->map(
            fn (array $row) => $set->cards()->create($this->cardAttributes($row))
        );

        return CardResource::collection($created)->response()->setStatusCode(201);
    }

    public function update(Request $request, string $cardId): CardResource
    {
        $card = $this->ownedCard($request, $cardId);

        $data = $request->validate([
            'term' => ['sometimes', 'string'],
            'definition' => ['sometimes', 'string'],
            'learningStatus' => ['sometimes', 'nullable', 'in:known,learning'],
        ]);

        $attributes = [];

        if (array_key_exists('term', $data) || array_key_exists('definition', $data)) {
            $attributes = $this->cardAttributes([
                'term' => $data['term'] ?? $card->term,
                'definition' => $data['definition'] ?? $card->definition,
            ]);
        }

        if (array_key_exists('learningStatus', $data)) {
            $attributes['learning_status'] = $data['learningStatus'];
        }

        $card->fill($attributes)->save();

        return new CardResource($card);
    }

    public function destroy(Request $request, string $cardId): Response
    {
        $this->ownedCard($request, $cardId)->delete();

        return response()->noContent();
    }

    /**
     * Trim both sides and reject blanks, exactly like the website's card form.
     *
     * @param  array<string, mixed>  $row
     * @return array<string, string>
     */
    private function cardAttributes(array $row): array
    {
        $term = trim((string) $row['term']);
        $definition = trim((string) $row['definition']);

        if ($term === '') {
            throw ValidationException::withMessages(['term' => 'Term is required.']);
        }
        if ($definition === '') {
            throw ValidationException::withMessages(['definition' => 'Definition is required.']);
        }

        return ['term' => $term, 'definition' => $definition];
    }

    private function ownedSet(Request $request, string $setId): Set
    {
        return $request->user()->sets()->findOrFail($setId);
    }

    private function ownedCard(Request $request, string $cardId): Card
    {
        return $request->user()->cards()->findOrFail($cardId);
    }
}
