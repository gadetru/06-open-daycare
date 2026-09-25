"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const POKE_API_URL = "https://pokeapi.co/api/v2";
const FIRST_POKEMON_ID = 1;

type PokemonType = {
  slot: number;
  type: {
    name: string;
    url: string;
  };
};

type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string | null;
    official_artwork?: {
      front_default: string | null;
    };
    other?: {
      "official-artwork"?: {
        front_default: string | null;
      };
    };
  };
  types: PokemonType[];
};

type PokemonList = {
  count: number;
};

function formatPokemonName(name: string) {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatHeight(height: number) {
  return `${(height / 10).toFixed(1).replace(".0", "")} m`;
}

function formatWeight(weight: number) {
  return `${(weight / 10).toFixed(1).replace(".0", "")} kg`;
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function PokemonBrowser() {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [pokemonId, setPokemonId] = useState(FIRST_POKEMON_ID);
  const [totalPokemon, setTotalPokemon] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadPokemonCount() {
      try {
        const response = await fetch(`${POKE_API_URL}/pokemon?limit=1`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo obtener la cantidad de Pokémon");
        }

        const pokemonList = (await response.json()) as PokemonList;
        if (abortController.signal.aborted) {
          return;
        }

        setTotalPokemon(pokemonList.count);
      } catch (error) {
        if (isAbortError(error) || abortController.signal.aborted) {
          return;
        }

        setTotalPokemon(0);
      }
    }

    void loadPokemonCount();

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadPokemon() {
      try {
        const response = await fetch(
          `${POKE_API_URL}/pokemon/${pokemonId}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error("PokéAPI no pudo responder");
        }

        const pokemonData = (await response.json()) as Pokemon;
        if (abortController.signal.aborted) {
          return;
        }

        setPokemon(pokemonData);
      } catch (error) {
        if (isAbortError(error) || abortController.signal.aborted) {
          return;
        }

        setError(
          "No pudimos cargar el Pokémon. Revisá tu conexión e intentá de nuevo.",
        );
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPokemon();

    return () => abortController.abort();
  }, [pokemonId, requestVersion]);

  function changePokemon(nextPokemonId: number) {
    const isOutsidePokedex =
      nextPokemonId < FIRST_POKEMON_ID ||
      (totalPokemon > 0 && nextPokemonId > totalPokemon);

    if (isOutsidePokedex || isLoading) {
      return;
    }

    setPokemonId(nextPokemonId);
    setError("");
    setIsLoading(true);
  }

  function showPreviousPokemon() {
    changePokemon(pokemonId - 1);
  }

  function showNextPokemon() {
    changePokemon(pokemonId + 1);
  }

  function retryRequest() {
    setError("");
    setIsLoading(true);
    setRequestVersion((currentVersion) => currentVersion + 1);
  }

  const pokemonImage =
    pokemon?.sprites.other?.["official-artwork"]?.front_default ??
    pokemon?.sprites.official_artwork?.front_default ??
    pokemon?.sprites.front_default;
  const isPreviousDisabled =
    isLoading || pokemonId === FIRST_POKEMON_ID;
  const isNextDisabled =
    isLoading || (totalPokemon > 0 && pokemonId >= totalPokemon);

  return (
    <section className="w-full max-w-[540px] overflow-hidden rounded-[30px] border border-border bg-surface shadow-[0_24px_70px_-34px_rgba(120,90,60,.55)]">
      <div className="px-6 pb-5 pt-7 text-center sm:px-9">
        <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[2px] text-coral-deep">
          Explorador
        </p>
        <h1 className="font-heading text-[34px] font-semibold text-ink">
          Pokédex
        </h1>
        <p className="mx-auto mt-2 max-w-[390px] text-[14.5px] leading-6 text-ink-muted">
          Recorré la Pokédex y descubrí el Pokémon que está en pantalla.
        </p>
      </div>

      <div className="min-h-[390px] bg-surface-soft px-5 pb-7 sm:px-8">
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-alert-icon-bg bg-alert-bg px-4 py-3 text-[13px] font-semibold text-alert-text"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={retryRequest}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[12px] font-extrabold text-coral-deep transition-colors hover:bg-accent-soft"
            >
              Reintentar
            </button>
          </div>
        )}

        {!pokemon && isLoading && (
          <p
            role="status"
            className="py-20 text-center text-[14px] text-ink-muted"
          >
            Cargando Pokémon...
          </p>
        )}

        {pokemon ? (
          <article
            aria-busy={isLoading}
            className={`rounded-[24px] bg-surface p-5 shadow-[0_14px_34px_-25px_rgba(120,90,60,.6)] transition-opacity sm:p-6 ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="relative flex h-[190px] items-center justify-center">
              {pokemonImage ? (
                <Image
                  src={pokemonImage}
                  alt={`Ilustración de ${formatPokemonName(pokemon.name)}`}
                  width={475}
                  height={475}
                  sizes="190px"
                  className="h-full w-full object-contain drop-shadow-[0_16px_14px_rgba(67,56,45,.18)]"
                />
              ) : (
                <span className="text-[14px] text-ink-muted">
                  No hay imagen disponible
                </span>
              )}

              {isLoading && (
                <div
                  role="status"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <span className="rounded-full bg-surface px-4 py-2 text-[13px] font-bold text-ink-muted shadow-sm">
                    Cargando...
                  </span>
                </div>
              )}
            </div>

            <div className="mb-5 text-center">
              <output
                aria-live="polite"
                className="text-[12px] font-extrabold uppercase tracking-[1.4px] text-ink-soft"
              >
                Pokémon #{String(pokemon.id).padStart(3, "0")}
              </output>
              <h2 className="mt-1 font-heading text-[30px] font-semibold capitalize text-ink">
                {formatPokemonName(pokemon.name)}
              </h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {pokemon.types.map(({ type }) => (
                  <span
                    key={type.url}
                    className="rounded-full bg-accent-soft px-3 py-1 text-[12px] font-extrabold capitalize text-coral-deep"
                  >
                    {type.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border-soft bg-surface-soft px-4 py-3 text-center">
                <span className="block text-[11px] font-bold uppercase tracking-[.8px] text-ink-soft">
                  Altura
                </span>
                <strong className="mt-1 block font-heading text-[18px] text-ink">
                  {formatHeight(pokemon.height)}
                </strong>
              </div>
              <div className="rounded-2xl border border-border-soft bg-surface-soft px-4 py-3 text-center">
                <span className="block text-[11px] font-bold uppercase tracking-[.8px] text-ink-soft">
                  Peso
                </span>
                <strong className="mt-1 block font-heading text-[18px] text-ink">
                  {formatWeight(pokemon.weight)}
                </strong>
              </div>
            </div>
          </article>
        ) : (
          !isLoading && !error && (
            <p className="py-20 text-center text-[14px] text-ink-muted">
              No hay un Pokémon para mostrar.
            </p>
          )
        )}

        <nav
          aria-label="Navegación de la Pokédex"
          className="mt-5 flex items-center gap-3"
        >
          <button
            type="button"
            onClick={showPreviousPokemon}
            disabled={isPreviousDisabled}
            className="flex-1 rounded-[14px] border border-border bg-surface px-4 py-3 text-[14px] font-extrabold text-ink transition-colors hover:border-accent hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            type="button"
            onClick={showNextPokemon}
            disabled={isNextDisabled}
            className="flex-1 rounded-[14px] border border-accent bg-accent px-4 py-3 text-[14px] font-extrabold text-white shadow-[0_8px_18px_-10px_rgba(238,129,100,.9)] transition-colors hover:bg-accent-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </nav>
      </div>
    </section>
  );
}
