import type { Metadata } from "next";
import PokemonBrowser from "./PokemonBrowser";

export const metadata: Metadata = {
  title: "Pokédex | OpenDayCare",
  description: "Explorador de Pokémon con navegación por la Pokédex.",
};

export default function PokemonPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-accent-soft opacity-70" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-info-bg opacity-45" />
      <div className="relative z-10 w-full">
        <PokemonBrowser />
      </div>
    </main>
  );
}
