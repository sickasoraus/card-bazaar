export type CatalogCard = {
  id: string;
  name: string;
  setCode: string;
  manaCost: string | null;
  cmc: number | null;
  typeLine: string;
  cardTypes: string[];
  subtypes: string[];
  colorIdentity: string[];
  colors: string[];
  rarity: string;
  imageUrl: string | null;
  oracleText: string | null;
  formats: string[];
  popularity: number | null;
  priceLow: number | null;
  priceHigh: number | null;
};

export type CatalogFacet = {
  value: string;
  count: number;
};

export type CatalogFacets = {
  formats: CatalogFacet[];
  colors: CatalogFacet[];
  types: CatalogFacet[];
  rarities: CatalogFacet[];
};

export type CatalogPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CatalogResponse = {
  data: CatalogCard[];
  pagination: CatalogPagination;
  facets: CatalogFacets;
  meta: {
    hasDatabase: boolean;
    fallback: boolean;
  };
};

export type CatalogQuery = {
  search?: string | null;
  formats?: string[];
  colors?: string[];
  types?: string[];
  rarities?: string[];
  cmcMin?: number | null;
  cmcMax?: number | null;
  page?: number;
  pageSize?: number;
  sort?: "relevance" | "name" | "cmc" | "price" | "popularity";
};
