<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Card;
use App\Models\Set;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * One-shot migration of the data a browser already holds in localStorage
 * (see docs/migration.md). The client sends what it has; the server decides who
 * owns it — the caller — and skips anything already present, so running the
 * import twice changes nothing the second time.
 */
class ImportController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(
            [
                'sets' => ['required', 'array', 'max:500'],
                'sets.*.id' => ['required', 'uuid'],
                'sets.*.title' => ['required', 'string', 'max:255'],
                'sets.*.description' => ['sometimes', 'nullable', 'string'],
                'sets.*.createdAt' => ['sometimes', 'nullable', 'date'],
                'sets.*.updatedAt' => ['sometimes', 'nullable', 'date'],
                'sets.*.cards' => ['sometimes', 'array', 'max:500'],
                'sets.*.cards.*.id' => ['required', 'uuid'],
                'sets.*.cards.*.term' => ['required', 'string'],
                'sets.*.cards.*.definition' => ['required', 'string'],
                'sets.*.cards.*.learningStatus' => ['sometimes', 'nullable', 'in:known,learning'],
                'sets.*.cards.*.createdAt' => ['sometimes', 'nullable', 'date'],
                'sets.*.cards.*.updatedAt' => ['sometimes', 'nullable', 'date'],
            ],
            [
                'sets.required' => 'Nothing to import.',
                'sets.max' => 'Import at most 500 sets at a time.',
                'sets.*.id.uuid' => 'Every set needs the id it already has.',
                'sets.*.title.required' => 'Every set needs a title.',
                'sets.*.cards.*.id.uuid' => 'Every flashcard needs the id it already has.',
                'sets.*.cards.*.term.required' => 'Term is required.',
                'sets.*.cards.*.definition.required' => 'Definition is required.',
            ]
        );

        $user = $request->user();
        $importedSets = 0;
        $importedCards = 0;
        $skipped = 0;

        DB::transaction(function () use ($user, $data, &$importedSets, &$importedCards, &$skipped): void {
            foreach ($data['sets'] as $incoming) {
                $cards = $incoming['cards'] ?? [];

                // Ids are checked across the whole table: if a set with this id
                // already exists it belongs to whoever put it there, and an import
                // must never take it over.
                if (Set::whereKey($incoming['id'])->exists()) {
                    $skipped += 1 + count($cards);
                    continue;
                }

                $set = new Set([
                    'title' => $incoming['title'],
                    'description' => $incoming['description'] ?? '',
                ]);
                // Explicit assignment, not mass assignment: created_at/updated_at
                // are not fillable and would otherwise be silently dropped.
                $set->id = $incoming['id'];
                if (! empty($incoming['createdAt'])) {
                    $set->created_at = $incoming['createdAt'];
                }
                if (! empty($incoming['updatedAt'])) {
                    $set->updated_at = $incoming['updatedAt'];
                }

                $user->sets()->save($set);
                $importedSets += 1;

                foreach ($cards as $row) {
                    if (Card::whereKey($row['id'])->exists()) {
                        $skipped += 1;
                        continue;
                    }

                    $card = new Card([
                        'term' => $row['term'],
                        'definition' => $row['definition'],
                    ]);
                    $card->id = $row['id'];
                    $card->set_id = $set->id;
                    $card->learning_status = $row['learningStatus'] ?? null;
                    if (! empty($row['createdAt'])) {
                        $card->created_at = $row['createdAt'];
                    }
                    if (! empty($row['updatedAt'])) {
                        $card->updated_at = $row['updatedAt'];
                    }

                    $card->save();
                    $importedCards += 1;
                }
            }
        });

        return response()->json([
            'importedSets' => $importedSets,
            'importedCards' => $importedCards,
            'skipped' => $skipped,
        ]);
    }
}
