"use client";

/**
 * ListingForm — collects all property fields and fires onSubmit(input).
 *
 * Parent owns the fetch + isGenerating state so this component stays
 * pure form/UI. Submit button is disabled while isGenerating to prevent
 * double-click (spec edge case #4).
 */

import { useState, type FormEvent } from "react";
import type { ListingInput, Tone } from "@/lib/types";

interface Props {
  onSubmit: (input: ListingInput) => void;
  isGenerating: boolean;
}

const FEATURES_SOFT_WARN = 400; // words — soft warning threshold in UI
const FEATURES_HARD_LIMIT = 500; // matches server-side cap in generate.ts

const TONES: { value: Tone; label: string; description: string }[] = [
  { value: "professional", label: "Professional", description: "Factual, polished" },
  { value: "warm", label: "Warm", description: "Inviting, lifestyle" },
  { value: "luxury", label: "Luxury", description: "Elevated, exclusive" },
];

export default function ListingForm({ onSubmit, isGenerating }: Props) {
  const [address, setAddress] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [features, setFeatures] = useState("");
  const [tone, setTone] = useState<Tone>("professional");

  const featureWordCount = features.trim()
    ? features.trim().split(/\s+/).length
    : 0;
  const featuresOverSoft = featureWordCount > FEATURES_SOFT_WARN;
  const featuresOverHard = featureWordCount > FEATURES_HARD_LIMIT;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isGenerating) return;
    if (featuresOverHard) return;

    const input: ListingInput = {
      address: address.trim(),
      beds: parseFloat(beds),
      baths: parseFloat(baths),
      sqft: sqft.trim() ? parseInt(sqft, 10) : null,
      lotSize: lotSize.trim() || null,
      yearBuilt: yearBuilt.trim() ? parseInt(yearBuilt, 10) : null,
      features: features.trim(),
      tone,
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label htmlFor="address" className="block text-sm font-medium mb-1">
          Address <span className="text-red-500">*</span>
        </label>
        <input
          id="address"
          type="text"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main Street, Springfield"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          disabled={isGenerating}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="beds" className="block text-sm font-medium mb-1">
            Beds <span className="text-red-500">*</span>
          </label>
          <input
            id="beds"
            type="number"
            min="0"
            step="1"
            required
            value={beds}
            onChange={(e) => setBeds(e.target.value)}
            placeholder="3"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label htmlFor="baths" className="block text-sm font-medium mb-1">
            Baths <span className="text-red-500">*</span>
          </label>
          <input
            id="baths"
            type="number"
            min="0"
            step="0.5"
            required
            value={baths}
            onChange={(e) => setBaths(e.target.value)}
            placeholder="2"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            disabled={isGenerating}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="sqft" className="block text-sm font-medium mb-1">
            Sqft
          </label>
          <input
            id="sqft"
            type="number"
            min="0"
            step="1"
            value={sqft}
            onChange={(e) => setSqft(e.target.value)}
            placeholder="1800"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label htmlFor="lotSize" className="block text-sm font-medium mb-1">
            Lot size
          </label>
          <input
            id="lotSize"
            type="text"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            placeholder="0.25 acres"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            disabled={isGenerating}
          />
        </div>
        <div>
          <label htmlFor="yearBuilt" className="block text-sm font-medium mb-1">
            Year built
          </label>
          <input
            id="yearBuilt"
            type="number"
            min="1600"
            max="2100"
            step="1"
            value={yearBuilt}
            onChange={(e) => setYearBuilt(e.target.value)}
            placeholder="2010"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            disabled={isGenerating}
          />
        </div>
      </div>

      <div>
        <label htmlFor="features" className="block text-sm font-medium mb-1">
          Key features <span className="text-red-500">*</span>
        </label>
        <textarea
          id="features"
          required
          value={features}
          onChange={(e) => setFeatures(e.target.value)}
          rows={5}
          placeholder="Updated kitchen with quartz counters, hardwood throughout, fenced backyard, two-car garage, walking distance to Roosevelt Elementary..."
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 resize-y"
          disabled={isGenerating}
        />
        <div
          className={`mt-1 text-xs ${
            featuresOverHard
              ? "text-red-600 dark:text-red-400"
              : featuresOverSoft
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          {featureWordCount} {featureWordCount === 1 ? "word" : "words"}
          {featuresOverHard &&
            ` — over the ${FEATURES_HARD_LIMIT}-word limit. Please trim before generating.`}
          {!featuresOverHard &&
            featuresOverSoft &&
            ` — getting long. The server caps at ${FEATURES_HARD_LIMIT} words.`}
        </div>
      </div>

      <fieldset>
        <legend className="block text-sm font-medium mb-2">Tone</legend>
        <div className="grid grid-cols-3 gap-3">
          {TONES.map((t) => (
            <label
              key={t.value}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors ${
                tone === t.value
                  ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:border-zinc-500"
              }`}
            >
              <input
                type="radio"
                name="tone"
                value={t.value}
                checked={tone === t.value}
                onChange={() => setTone(t.value)}
                className="sr-only"
                disabled={isGenerating}
              />
              <div className="font-medium">{t.label}</div>
              <div
                className={`text-xs ${
                  tone === t.value
                    ? "text-zinc-300 dark:text-zinc-600"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {t.description}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isGenerating || featuresOverHard}
        className="rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:bg-zinc-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? "Generating..." : "Generate variants"}
      </button>
    </form>
  );
}
