"use client";

/**
 * ListingForm — collects all property fields and fires onSubmit(input).
 *
 * Editorial style: underline-only inputs, serif values, eyebrow labels.
 * Parent owns the fetch + isGenerating state so this component stays pure
 * form/UI. Submit button is disabled while isGenerating to prevent double-
 * click (spec edge case #4).
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

const FEATURES_SOFT_WARN = 400;
const FEATURES_HARD_LIMIT = 500;

const INK_BORDER = "rgba(var(--ink-rgb),0.3)";
const INK_BORDER_STRONG = "rgba(var(--ink-rgb),0.8)";
const INK_BORDER_LIGHT = "rgba(var(--ink-rgb),0.15)";

function eyebrowStyle(): React.CSSProperties {
  return { color: "rgba(var(--ink-rgb),0.6)" };
}

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
        ? "The document could not be read. Try a clearer scan, or enter the particulars by hand."
        : `Filled ${filled.join(", ")}. Revise anything before drafting.`
    );
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setExtractError(null);
    setExtractNotice(null);

    if (file.size > MAX_UPLOAD_BYTES) {
      setExtractError("File exceeds 5 MB. Please upload a smaller file.");
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

  const underlineInput =
    "w-full bg-transparent border-0 border-b focus:outline-none py-2 font-serif text-xl transition-colors disabled:opacity-60";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10">
      {/* Intake */}
      <section>
        <div className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: "var(--accent)" }}>
          Section I — Intake
        </div>
        <h3 className="font-serif text-3xl mb-5 leading-tight">
          Begin with a document, or begin by hand.
        </h3>
        <label
          htmlFor="document"
          className="block border border-dashed p-8 text-center cursor-pointer transition-colors hover:border-[color:var(--accent)]"
          style={{ borderColor: INK_BORDER }}
        >
          <div className="font-serif italic text-lg mb-2" style={{ color: "rgba(var(--ink-rgb),0.7)" }}>
            Upload a tax card or property report
          </div>
          <div className="text-xs tracking-wide" style={{ color: "rgba(var(--ink-rgb),0.5)" }}>
            PDF or image, up to 5 MB. We&apos;ll auto-fill what we can read — revise anything before drafting.
          </div>
          <input
            id="document"
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            disabled={isExtracting || isGenerating}
            className="sr-only"
          />
          {isExtracting && (
            <div className="mt-3 text-xs tracking-widest uppercase" style={{ color: "rgba(var(--ink-rgb),0.6)" }}>
              Reading document…
            </div>
          )}
          {extractNotice && !isExtracting && (
            <div className="mt-3 font-serif italic text-sm" style={{ color: "var(--accent)" }}>
              {extractNotice}
            </div>
          )}
          {extractError && !isExtracting && (
            <div className="mt-3 text-xs" style={{ color: "#a33a3a" }}>
              {extractError}
            </div>
          )}
        </label>
      </section>

      {/* Particulars */}
      <section>
        <div className="text-[10px] tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: "var(--accent)" }}>
          Section II — Particulars
        </div>
        <h3 className="font-serif text-3xl mb-6 leading-tight">
          The property, in its own words.
        </h3>

        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="address" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
              Address <span style={{ color: "var(--accent)" }}>· required</span>
            </label>
            <input
              id="address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="847 Chestnut Grove Ln · Springfield, OH"
              className={underlineInput}
              style={{ borderColor: INK_BORDER }}
              onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
              onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label htmlFor="beds" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
                Bedrooms <span style={{ color: "var(--accent)" }}>· required</span>
              </label>
              <input
                id="beds"
                type="number"
                min="0"
                step="1"
                required
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="4"
                className={underlineInput}
                style={{ borderColor: INK_BORDER }}
                onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
                onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label htmlFor="baths" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
                Bathrooms <span style={{ color: "var(--accent)" }}>· required</span>
              </label>
              <input
                id="baths"
                type="number"
                min="0"
                step="0.5"
                required
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                placeholder="2.5"
                className={underlineInput}
                style={{ borderColor: INK_BORDER }}
                onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
                onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label htmlFor="sqft" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
                Square Feet
              </label>
              <input
                id="sqft"
                type="number"
                min="0"
                step="1"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="2,480"
                className={underlineInput}
                style={{ borderColor: INK_BORDER }}
                onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
                onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label htmlFor="lotSize" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
                Lot Size
              </label>
              <input
                id="lotSize"
                type="text"
                value={lotSize}
                onChange={(e) => setLotSize(e.target.value)}
                placeholder="0.34 ac"
                className={underlineInput}
                style={{ borderColor: INK_BORDER }}
                onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
                onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label htmlFor="yearBuilt" className="block text-[10px] tracking-[0.3em] uppercase mb-2" style={eyebrowStyle()}>
                Year Built
              </label>
              <input
                id="yearBuilt"
                type="number"
                min="1600"
                max="2100"
                step="1"
                value={yearBuilt}
                onChange={(e) => setYearBuilt(e.target.value)}
                placeholder="1974"
                className={underlineInput}
                style={{ borderColor: INK_BORDER }}
                onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
                onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER)}
                disabled={isGenerating}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="features" className="block text-[10px] tracking-[0.3em] uppercase" style={eyebrowStyle()}>
                Features &amp; Notes <span style={{ color: "var(--accent)" }}>· required</span>
              </label>
              <span
                className="text-[10px] tracking-[0.2em] uppercase font-mono"
                style={{
                  color: featuresOverHard
                    ? "#a33a3a"
                    : featuresOverSoft
                      ? "#a8772a"
                      : "rgba(var(--ink-rgb),0.5)",
                }}
              >
                {featureWordCount} / 500 words
              </span>
            </div>
            <textarea
              id="features"
              required
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={5}
              placeholder="Renovated kitchen with quartz counters and gas range. Original white oak floors. Screened back porch. Basement finished in 2021. Walk to Wittenberg and the downtown square."
              className="w-full bg-transparent border focus:outline-none p-4 font-serif text-base leading-relaxed resize-y transition-colors disabled:opacity-60"
              style={{ borderColor: INK_BORDER_LIGHT }}
              onFocus={(e) => (e.currentTarget.style.borderColor = INK_BORDER_STRONG)}
              onBlur={(e) => (e.currentTarget.style.borderColor = INK_BORDER_LIGHT)}
              disabled={isGenerating}
            />
            {featuresOverHard && (
              <div className="mt-1 text-xs" style={{ color: "#a33a3a" }}>
                Over the {FEATURES_HARD_LIMIT}-word limit. Please trim before drafting.
              </div>
            )}
            {!featuresOverHard && featuresOverSoft && (
              <div className="mt-1 text-xs" style={{ color: "#a8772a" }}>
                Growing long. The server caps at {FEATURES_HARD_LIMIT} words.
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-6">
          <button
            type="submit"
            disabled={isGenerating || featuresOverHard}
            className={`px-10 py-3 text-[11px] tracking-[0.3em] uppercase border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ld-press hover:border-[color:var(--accent)] ${isGenerating ? "ld-pulse-brass" : ""}`}
            style={{
              background: "var(--header-bg)",
              color: "var(--header-fg)",
              borderColor: "rgba(212,161,74,0.4)",
            }}
          >
            {isGenerating ? (
              <>Drafting <span style={{ color: "var(--accent)" }}>—</span> please wait</>
            ) : (
              <>Generate <span style={{ color: "var(--accent)" }}>—</span> Variants</>
            )}
          </button>
          <span className="font-serif italic text-sm" style={{ color: "rgba(var(--ink-rgb),0.55)" }}>
            Three compositions will be drafted.
          </span>
        </div>
      </section>
    </form>
  );
}
