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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // Nama proyek (misal: Toko Online)
            $table->string('github_repo'); // URL repo (misal: fathur/toko)
            $table->string('branch')->default('main'); // Branch yang di-deploy
            $table->string('subdomain')->unique(); // misal: "toko-online" -> toko-online.kodaidev.my.id
            $table->string('custom_domain')->nullable()->unique(); // Jika user punya domain sendiri
            $table->string('status')->default('pending'); // pending, building, active, failed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
