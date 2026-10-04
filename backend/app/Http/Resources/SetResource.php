<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The exact set shape both clients expect (docs/api.md), using camelCase so no
 * frontend component ever needs renaming.
 */
class SetResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'userId' => $this->user_id,
            'title' => $this->title,
            'description' => $this->description,
            // How many cards the set holds. Only present when the query asked for
            // it (SetController::index uses withCount('cards')), so listing sets
            // costs one extra query instead of one per set.
            'cardsCount' => $this->whenCounted('cards'),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
