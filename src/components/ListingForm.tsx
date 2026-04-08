"use client";

/**
 * ListingForm — collects all property fields and fires onSubmit(input).
 *
 * Parent owns the fetch + isGenerating state so this component stays
 * pure form/UI. Submit button is disabled while isGenerating to prevent
 * double-click (spec edge case #4).
 */

import { useState, type FormEvent, type ChangeEvent } from "react";
import type {
  ListingInput,
  ExtractResponse,
  ExtractedFields,
} from "@/lib/types";
import { isApiError } from "@/lib/types";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = "application/pdf,image/png,image/jpeg,image/webp";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected file reader result."));
        return;
      }
      // Strip "data:<mime>;base64," prefix
      const comma = result.indexOf(",");
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(file);
  });
}

interface Props {
  onSubmit: (input: ListingInput) => void;
  isGenerating: boolean;
}

const FEATURES_SOFT_WARN = 400; // words — soft warning threshold in UI
const FEATURES_HARD_LIMIT = 500; // matches server-side cap in generate.ts

export default function ListingForm({ onSubmit, isGenerating }: Props) {
  const [address, setAddress] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [yearBuilt, setYearBuilt] = useState("");
  const [features, setFeatures] = useState("");

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractNotice, setExtractNotice] = useState<string | null>(null);

  function applyExtractedFields(fields: ExtractedFields) {
    const filled: string[] = [];
    if (fields.address !== undefined) {
      setAddress(fields.address);
      filled.push("address");
    }
    if (fields.beds !== undefined) {
      setBeds(String(fields.beds));
      filled.push("beds");
    }
    if (fields.baths !== undefined) {
      setBaths(String(fields.baths));
      filled.push("baths");
    }
    if (fields.sqft !== undefined && fields.sqft !== null) {
      setSqft(String(fields.sqft));
      filled.push("sqft");
    }
    if (fields.lotSize !== undefined && fields.lotSize !== null) {
      setLotSize(fields.lotSize);
      filled.push("lot size");
    }
    if (fields.yearBuilt !== undefined && fields.yearBuilt !== null) {
      setYearBuilt(String(fields.yearBuilt));
      filled.push("year built");
    }
    if (fields.features !== undefined) {
      setFeatures((prev) =>
        prev.trim() ? `${prev.trim()}\n${fields.features}` : fields.features!
      );
      filled.push("features");
    }
    setExtractNotice(
      filled.length === 0
        ? "Couldn't read any fields from that document. Try a clearer scan or fill the form manually."
        : `Filled ${filled.join(", ")}. Edit anything before generating.`
    );
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-upload of the same file
    if (!file) return;
    setExtractError(null);
    setExtractNotice(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setExtractError("File is over 5 MB. Please upload a smaller file.");
      return;
    }
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setExtractError("Unsupported file type. Upload a PDF or image.");
      return;
    }

    setIsExtracting(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64,
          mediaType: file.type,
          kind: isPdf ? "pdf" : "image",
        }),
      });
      const data: ExtractResponse = await res.json();
      if (!res.ok || isApiError(data)) {
        const msg = isApiError(data)
          ? data.error
          : `Extraction failed (status ${res.status}).`;
        setExtractError(msg);
        return;
      }
      applyExtractedFields(data.fields);
    } catch (err) {
      setExtractError(
        err instanceof Error ? err.message : "Could not upload file."
      );
    } finally {
      setIsExtracting(false);
    }
  }

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
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="rounded-md border border-dashed border-zinc-300 dark:border-zinc-700 p-4">
        <label htmlFor="document" className="block text-sm font-medium mb-1">
          Upload a tax card or property report (optional)
        </label>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          PDF or image, up to 5 MB. We&apos;ll auto-fill what we can read — you can
          still edit everything before generating.
        </p>
        <input
          id="document"
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          disabled={isExtracting || isGenerating}
          className="block w-full text-sm text-zinc-700 dark:text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:dark:bg-zinc-100 file:text-white file:dark:text-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-zinc-700 dark:hover:file:bg-zinc-300 disabled:opacity-60"
        />
        {isExtracting && (
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Reading document...
          </div>
        )}
        {extractNotice && !isExtracting && (
          <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
            {extractNotice}
          </div>
        )}
        {extractError && !isExtracting && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            {extractError}
          </div>
        )}
      </div>

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

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        You&apos;ll get three variants — Professional, Warm, and Story — so you can pick the voice that fits the listing.
      </p>

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
