import { fetchCardByName, fetchCardsSearch, fetchRandomFromSet, getCardImage, getCardPrice } from './scryfall.mjs';

export const api = {
  cards: {
    byName: fetchCardByName,
    search: fetchCardsSearch,
    randomFromSet: fetchRandomFromSet,
  },
};

export { getCardImage, getCardPrice };
