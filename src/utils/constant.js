export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  ADMIN: "ADMIN",
  AGENT: "AGENT", // same as user
};

export const ITINERARY_TYPES = {
  DOMESTIC: "domestic",
  INTERNATIONAL: "international",
};

export const PUBLIC_CARD_FIELDS = [
  "_id",
  "title",
  "slug",
  "country",
  "type",
  "coverImageUrl",
  "shortDescription",
  "priceFrom",
  "durationDays",
];
