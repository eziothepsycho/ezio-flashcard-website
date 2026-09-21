<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SetResource;
use App\Models\Set;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

/**
 * Flashcard sets. Every query goes through the authenticated user's own
 * relation, so another account's set id is simply "not found" (404) rather than
 * "forbidden" — the same invisibility the browser data layer has always had.
 */
class SetController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        // Oldest first, matching the order the browser has always listed them in.
        $sets = $request->user()->sets()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return SetResource::collection($sets);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validatedAttributes($request);

        $set = new Set([
            'title' => $data['title'],
            'description' => $data['description'],
        ]);

        // A client may bring its own id and timestamps (the Phase 8 import does).
        // They are assigned directly rather than mass assigned: Eloquent silently
        // drops non-fillable keys, so create([...]) would lose them.
        if (isset($data['id'])) {
            $set->id = $data['id'];
        }
        if (isset($data['createdAt'])) {
            $set->created_at = $data['createdAt'];
        }
        if (isset($data['updatedAt'])) {
            $set->updated_at = $data['updatedAt'];
        }

        $request->user()->sets()->save($set);

        return (new SetResource($set))->response()->setStatusCode(201);
    }

    public function show(Request $request, string $setId): SetResource
    {
        return new SetResource($this->ownedSet($request, $setId));
    }

    public function update(Request $request, string $setId): SetResource
    {
        $set = $this->ownedSet($request, $setId);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
        ], [
            'title.string' => 'Give the set a title.',
            'title.max' => 'Titles can be at most 255 characters.',
        ]);

        if (array_key_exists('title', $data)) {
            $title = trim($data['title']);
            if ($title === '') {
                throw ValidationException::withMessages(['title' => 'Give the set a title.']);
            }
            $data['title'] = $title;
        }

        $set->fill($data)->save();

        return new SetResource($set);
    }

    public function destroy(Request $request, string $setId): Response
    {
        // The foreign key cascade removes the set's cards with it.
        $this->ownedSet($request, $setId)->delete();

        return response()->noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedAttributes(Request $request): array
    {
        // id / createdAt / updatedAt are accepted so the Phase 8 import can keep
        // the ids and timestamps the browser already has.
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'id' => ['sometimes', 'uuid'],
            'createdAt' => ['sometimes', 'date'],
            'updatedAt' => ['sometimes', 'date'],
        ], [
            'title.required' => 'Give the set a title.',
            'title.max' => 'Titles can be at most 255 characters.',
        ]);

        $title = trim($data['title']);
        if ($title === '') {
            throw ValidationException::withMessages(['title' => 'Give the set a title.']);
        }

        $attributes = [
            'title' => $title,
            'description' => isset($data['description']) ? trim((string) $data['description']) : '',
        ];

        if (isset($data['id'])) {
            $attributes['id'] = $data['id'];
        }
        if (isset($data['createdAt'])) {
            $attributes['createdAt'] = $data['createdAt'];
        }
        if (isset($data['updatedAt'])) {
            $attributes['updatedAt'] = $data['updatedAt'];
        }

        return $attributes;
    }

    private function ownedSet(Request $request, string $setId): Set
    {
        return $request->user()->sets()->findOrFail($setId);
    }
}
