/**
 * Fixture listings for the prompt eval suite.
 *
 * Each fixture has:
 *  - input: ListingInput sent to generate()
 *  - label: short human-readable name for the report
 *  - musts: per-variant assertions that must be true for every returned variant
 *  - shouldMention: strings that should appear in AT LEAST ONE variant (soft signal)
 */

import type { ListingInput } from "../../src/lib/types";

export interface Fixture {
  label: string;
  input: ListingInput;
  /** Strings that should appear in at least one variant (case-insensitive). */
  shouldMention: string[];
}

export const fixtures: Fixture[] = [
  {
    label: "Standard suburban family home (professional)",
    input: {
      address: "1428 Elmwood Drive, Springfield",
      beds: 3,
      baths: 2,
      sqft: 1850,
      lotSize: "0.22 acres",
      yearBuilt: 2012,
      features:
        "Open-concept kitchen with quartz counters and stainless appliances, hardwood floors on the main level, primary suite with walk-in closet, finished basement, fenced backyard with patio, two-car attached garage, quiet cul-de-sac, walking distance to Lincoln Elementary.",
      tone: "professional",
    },
    shouldMention: ["cul-de-sac", "quartz"],
  },
  {
    label: "Historic bungalow with minimal info (warm)",
    input: {
      address: "82 Cherry Lane, Maplewood",
      beds: 2,
      baths: 1,
      sqft: null,
      lotSize: null,
      yearBuilt: 1926,
      features:
        "Original hardwood floors, built-in bookshelves, clawfoot tub in the bathroom, front porch with swing, mature oak trees in the front yard, updated kitchen with farmhouse sink, walkable neighborhood.",
      tone: "warm",
    },
    shouldMention: ["1926", "porch"],
  },
  {
    label: "Luxury waterfront property (luxury)",
    input: {
      address: "7 Harbor Point Road, Kennebunkport",
      beds: 5,
      baths: 4.5,
      sqft: 4800,
      lotSize: "1.3 acres",
      yearBuilt: 2018,
      features:
        "Private deepwater dock with 60-foot slip, floor-to-ceiling windows overlooking the bay, chef's kitchen with Wolf range and Sub-Zero refrigerator, primary suite with fireplace and ocean-view terrace, heated infinity pool, four-car garage, wine cellar, smart home automation, professionally landscaped grounds.",
      tone: "luxury",
    },
    shouldMention: ["dock", "pool"],
  },
  {
    label: "Downtown condo (professional)",
    input: {
      address: "450 Market Street, Unit 1802, Portland",
      beds: 1,
      baths: 1,
      sqft: 780,
      lotSize: null,
      yearBuilt: 2019,
      features:
        "Floor-to-ceiling windows with city and river views, engineered hardwood, quartz kitchen counters, in-unit washer/dryer, building amenities include gym, rooftop deck, and 24-hour concierge, one deeded parking space, walkable to restaurants and transit.",
      tone: "professional",
    },
    shouldMention: ["concierge", "rooftop"],
  },
  {
    label: "Starter home on small lot (warm)",
    input: {
      address: "215 Birch Street, Cedar Falls",
      beds: 2,
      baths: 1,
      sqft: 950,
      lotSize: "0.12 acres",
      yearBuilt: 1958,
      features:
        "Updated kitchen with new appliances, fresh paint throughout, refinished original hardwood floors, one-car detached garage, small fenced backyard with garden beds, quiet residential street, close to downtown shops.",
      tone: "warm",
    },
    shouldMention: ["hardwood", "garden"],
  },
];
