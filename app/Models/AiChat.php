<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiChat extends Model
{
    protected $guarded = [];

    public function aiProject()
    {
        return $this->belongsTo(AiProject::class);
    }
}
