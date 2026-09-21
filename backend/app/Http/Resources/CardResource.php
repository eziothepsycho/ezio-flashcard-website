<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The exact card shape both clients expect (docs/api.md). learningStatus is null
 * until Study Mode grades the card, which is how the browser has always treated
 * a missing value.
 */
class CardResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'setId' => $this->set_id,
            'term' => $this->term,
            'definition' => $this->definition,
            'learningStatus' => $this->learning_status,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
