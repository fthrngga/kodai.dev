<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('github_id')->nullable()->unique();
            $table->string('github_token')->nullable();
            $table->string('github_refresh_token')->nullable();
            // Ubah password jadi nullable karena login via GitHub tidak butuh password
            $table->string('password')->nullable()->change(); 
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['github_id', 'github_token', 'github_refresh_token']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
