"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { trackSimulatorAction } from "@/lib/telemetry";

const STORAGE_KEY = "metablazt.simulator.session";
const OPENING_HAND_SIZE = 7;
const MIN_HAND_SIZE = 3;
const MAX_LOG_LENGTH = 120;

export type SimulatorZone = "library" | "hand" | "battlefield" | "graveyard" | "exile";

export type SimulatorCard = {
  instanceId: string;
  cardId: string;
  name: string;
  imageUrl?: string | null;
};

export type SimulatorDeckInputCard = {
  cardId: string;
  name: string;
  quantity: number;
  imageUrl?: string | null;
};

export type SimulatorDeckInput = {
  id?: string | null;
  name?: string;
  source?: "draft" | "manual" | "import";
  cards: SimulatorDeckInputCard[];
};

type SimulatorLogEntry = {
  id: string;
  message: string;
  timestamp: string;
};

type SimulatorState = {
  hydrated: boolean;
  loaded: boolean;
  deckId: string | null;
  deckName: string;
  deckSource: "draft" | "manual" | "import";
  originalCards: SimulatorCard[];
  library: SimulatorCard[];
  hand: SimulatorCard[];
  battlefield: SimulatorCard[];
  graveyard: SimulatorCard[];
  exile: SimulatorCard[];
  turn: number;
  mulligans: number;
  history: SimulatorLogEntry[];
  lastUpdatedAt: string | null;
};

type LoadFromStorageAction = {
  type: "LOAD_FROM_STORAGE";
  payload: SimulatorState;
};

type MarkHydratedAction = {
  type: "MARK_HYDRATED";
};

type LoadDeckAction = {
  type: "LOAD_DECK";
  payload: {
    deckId: string | null;
    deckName: string;
    deckSource: "draft" | "manual" | "import";
    cards: SimulatorCard[];
  };
};

type ShuffleAction = {
  type: "SHUFFLE_LIBRARY";
};

type DrawAction = {
  type: "DRAW";
  payload: {
    count: number;
    suppressLog?: boolean;
  };
};

type MulliganAction = {
  type: "MULLIGAN";
};

type NextTurnAction = {
  type: "NEXT_TURN";
};

type MoveCardAction = {
  type: "MOVE_CARD";
  payload: {
    instanceId: string;
    destination: SimulatorZone;
    position?: "top" | "bottom";
  };
};

type ResetAction = {
  type: "RESET_SESSION";
};

type ClearAction = {
  type: "CLEAR_SESSION";
};

type LogAction = {
  type: "ADD_LOG";
  payload: SimulatorLogEntry;
};

type SimulatorAction =
  | LoadFromStorageAction
  | MarkHydratedAction
  | LoadDeckAction
  | ShuffleAction
  | DrawAction
  | MulliganAction
  | NextTurnAction
  | MoveCardAction
  | ResetAction
  | ClearAction
  | LogAction;

const initialState: SimulatorState = {
  hydrated: false,
  loaded: false,
  deckId: null,
  deckName: "",
  deckSource: "manual",
  originalCards: [],
  library: [],
  hand: [],
  battlefield: [],
  graveyard: [],
  exile: [],
  turn: 1,
  mulligans: 0,
  history: [],
  lastUpdatedAt: null,
};

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function timestamp() {
  return new Date().toISOString();
}

function shuffle(cards: SimulatorCard[]): SimulatorCard[] {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function addLog(state: SimulatorState, message: string): SimulatorState {
  const entry: SimulatorLogEntry = {
    id: randomId(),
    message,
    timestamp: timestamp(),
  };
  const nextHistory = [entry, ...state.history];
  if (nextHistory.length > MAX_LOG_LENGTH) {
    nextHistory.length = MAX_LOG_LENGTH;
  }
  return { ...state, history: nextHistory, lastUpdatedAt: entry.timestamp };
}

function expandCards(cards: SimulatorDeckInputCard[]): SimulatorCard[] {
  const expanded: SimulatorCard[] = [];
  cards.forEach((card) => {
    const safeQuantity = Number.isFinite(card.quantity) ? Math.max(0, Math.floor(card.quantity)) : 0;
    for (let i = 0; i < safeQuantity; i += 1) {
      expanded.push({
        instanceId: `${card.cardId}-${i}-${randomId()}`,
        cardId: card.cardId,
        name: card.name,
        imageUrl: card.imageUrl ?? null,
      });
    }
  });
  return expanded;
}

function removeCardFromState(state: SimulatorState, instanceId: string) {
  const zones: SimulatorZone[] = ["hand", "battlefield", "graveyard", "exile", "library"];
  for (const zone of zones) {
    const cards = state[zone];
    const index = cards.findIndex((card) => card.instanceId === instanceId);
    if (index !== -1) {
      const [card] = cards.splice(index, 1);
      return { card, zone, state };
    }
  }
  return { card: null, zone: null, state } as const;
}

function simulatorReducer(state: SimulatorState, action: SimulatorAction): SimulatorState {
  switch (action.type) {
    case "LOAD_FROM_STORAGE": {
      return { ...action.payload, hydrated: true };
    }
    case "MARK_HYDRATED": {
      return { ...state, hydrated: true };
    }
    case "LOAD_DECK": {
      const shuffledDeck = shuffle(action.payload.cards);
      const nextState: SimulatorState = {
        ...state,
        hydrated: true,
        loaded: true,
        deckId: action.payload.deckId,
        deckName: action.payload.deckName,
        deckSource: action.payload.deckSource,
        originalCards: [...action.payload.cards],
        library: shuffledDeck,
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        turn: 1,
        mulligans: 0,
        history: [],
        lastUpdatedAt: timestamp(),
      };
      return addLog(nextState, `Loaded ${action.payload.deckName} (${action.payload.cards.length} cards).`);
    }
    case "SHUFFLE_LIBRARY": {
      if (!state.loaded) {
        return state;
      }
      const shuffled = shuffle(state.library);
      return addLog({ ...state, library: shuffled }, "Shuffled library.");
    }
    case "DRAW": {
      if (!state.loaded || action.payload.count <= 0) {
        return state;
      }
      if (state.library.length === 0) {
        return addLog(state, "Attempted to draw but library is empty.");
      }
      const nextLibrary = [...state.library];
      const drawn: SimulatorCard[] = [];
      for (let i = 0; i < action.payload.count; i += 1) {
        const card = nextLibrary.shift();
        if (!card) {
          break;
        }
        drawn.push(card);
      }
      const nextState = {
        ...state,
        library: nextLibrary,
        hand: [...state.hand, ...drawn],
      };
      if (action.payload.suppressLog) {
        return nextState;
      }
      if (drawn.length === 0) {
        return addLog(nextState, "No cards drawn.");
      }
      const names = drawn.map((card) => card.name).join(", ");
      const message = drawn.length === 1 ? `Drew ${names}.` : `Drew ${drawn.length} cards (${names}).`;
      return addLog(nextState, message);
    }
    case "MULLIGAN": {
      if (!state.loaded) {
        return state;
      }
      const nextMulligan = Math.min(state.mulligans + 1, OPENING_HAND_SIZE - MIN_HAND_SIZE);
      const returning = [...state.hand];
      const combined = shuffle([...state.library, ...returning]);
      const handSize = Math.max(OPENING_HAND_SIZE - nextMulligan, MIN_HAND_SIZE);
      const nextHand = combined.slice(0, handSize);
      const nextLibrary = combined.slice(handSize);
      const message = `Mulligan to ${handSize} (mulligans: ${nextMulligan}).`;
      return addLog({
        ...state,
        library: nextLibrary,
        hand: nextHand,
        battlefield: state.battlefield,
        graveyard: state.graveyard,
        exile: state.exile,
        mulligans: nextMulligan,
        turn: 1,
      }, message);
    }
    case "NEXT_TURN": {
      if (!state.loaded) {
        return state;
      }
      const turn = state.turn + 1;
      let interimState: SimulatorState = addLog({ ...state, turn }, `Advanced to turn ${turn}.`);
      interimState = simulatorReducer(interimState, { type: "DRAW", payload: { count: 1, suppressLog: true } });
      if (interimState === state) {
        return state;
      }
      const drawn = interimState.hand.slice(-1)[0];
      if (drawn) {
        interimState = addLog(interimState, `Turn draw: ${drawn.name}.`);
      }
      return interimState;
    }
    case "MOVE_CARD": {
      if (!state.loaded) {
        return state;
      }
      const { card, zone } = removeCardFromState({
        ...state,
        hand: [...state.hand],
        battlefield: [...state.battlefield],
        graveyard: [...state.graveyard],
        exile: [...state.exile],
        library: [...state.library],
      }, action.payload.instanceId);
      if (!card) {
        return state;
      }
      const nextState: SimulatorState = {
        ...state,
        hand: [...state.hand.filter((c) => c.instanceId !== card.instanceId)],
        battlefield: [...state.battlefield.filter((c) => c.instanceId !== card.instanceId)],
        graveyard: [...state.graveyard.filter((c) => c.instanceId !== card.instanceId)],
        exile: [...state.exile.filter((c) => c.instanceId !== card.instanceId)],
        library: [...state.library.filter((c) => c.instanceId !== card.instanceId)],
      };

      const destination = action.payload.destination;
      if (destination === "library") {
        if (action.payload.position === "bottom") {
          nextState.library = [...nextState.library, card];
        } else {
          nextState.library = [card, ...nextState.library];
        }
      } else if (destination === "hand") {
        nextState.hand = [...nextState.hand, card];
      } else if (destination === "battlefield") {
        nextState.battlefield = [...nextState.battlefield, card];
      } else if (destination === "graveyard") {
        nextState.graveyard = [card, ...nextState.graveyard];
      } else if (destination === "exile") {
        nextState.exile = [card, ...nextState.exile];
      }
      const message = `Moved ${card.name} from ${zone ?? "unknown"} to ${destination}.`;
      return addLog(nextState, message);
    }
    case "RESET_SESSION": {
      if (!state.loaded) {
        return state;
      }
      const shuffled = shuffle(state.originalCards);
      return addLog({
        ...state,
        library: shuffled,
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        turn: 1,
        mulligans: 0,
      }, "Reset simulator session.");
    }
    case "CLEAR_SESSION": {
      return { ...initialState, hydrated: true };
    }
    case "ADD_LOG": {
      return addLog(state, action.payload.message);
    }
    default:
      return state;
  }
}

function isValidStoredState(value: unknown): value is SimulatorState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Partial<SimulatorState>;
  return Array.isArray(candidate.library) && Array.isArray(candidate.originalCards);
}

export function useDeckSimulator() {
  const [state, dispatch] = useReducer(simulatorReducer, initialState);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (isValidStoredState(parsed)) {
          dispatch({ type: "LOAD_FROM_STORAGE", payload: parsed });
          hasHydratedRef.current = true;
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to hydrate simulator session", error);
    }
    dispatch({ type: "MARK_HYDRATED" });
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || !state.hydrated) {
      return;
    }
    try {
      const payload = JSON.stringify(state);
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (error) {
      console.warn("Failed to persist simulator session", error);
    }
  }, [state]);

  const loadDeck = useCallback((input: SimulatorDeckInput) => {
    const expanded = expandCards(input.cards);
    dispatch({
      type: "LOAD_DECK",
      payload: {
        deckId: input.id ?? null,
        deckName: input.name && input.name.trim().length ? input.name.trim() : "Untitled Deck",
        deckSource: input.source ?? "manual",
        cards: expanded,
      },
    });
    trackSimulatorAction({ action: "load_deck", deckId: input.id ?? undefined, cardCount: expanded.length });
  }, []);

  const shuffleLibrary = useCallback(() => {
    dispatch({ type: "SHUFFLE_LIBRARY" });
    trackSimulatorAction({ action: "shuffle" });
  }, []);

  const drawCards = useCallback((count = 1) => {
    dispatch({ type: "DRAW", payload: { count } });
    trackSimulatorAction({ action: "draw", count });
  }, []);

  const drawOpeningHand = useCallback(() => {
    dispatch({ type: "RESET_SESSION" });
    dispatch({ type: "DRAW", payload: { count: OPENING_HAND_SIZE } });
    trackSimulatorAction({ action: "draw_opening_hand" });
  }, []);

  const mulligan = useCallback(() => {
    dispatch({ type: "MULLIGAN" });
    trackSimulatorAction({ action: "mulligan" });
  }, []);

  const nextTurn = useCallback(() => {
    dispatch({ type: "NEXT_TURN" });
    trackSimulatorAction({ action: "next_turn" });
  }, []);

  const moveCard = useCallback(
    (instanceId: string, destination: SimulatorZone, position: "top" | "bottom" = "top") => {
      dispatch({ type: "MOVE_CARD", payload: { instanceId, destination, position } });
      trackSimulatorAction({ action: "move_card", destination });
    },
    [],
  );

  const resetSession = useCallback(() => {
    dispatch({ type: "RESET_SESSION" });
    trackSimulatorAction({ action: "reset" });
  }, []);

  const clearSession = useCallback(() => {
    dispatch({ type: "CLEAR_SESSION" });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear simulator storage", error);
    }
    trackSimulatorAction({ action: "clear" });
  }, []);

  const summary = useMemo(
    () => ({
      library: state.library.length,
      hand: state.hand.length,
      battlefield: state.battlefield.length,
      graveyard: state.graveyard.length,
      exile: state.exile.length,
      turn: state.turn,
      mulligans: state.mulligans,
      loaded: state.loaded,
    }),
    [state],
  );

  return {
    state,
    summary,
    loadDeck,
    shuffleLibrary,
    drawCards,
    drawOpeningHand,
    mulligan,
    nextTurn,
    moveCard,
    resetSession,
    clearSession,
  };
}

export type UseDeckSimulatorReturn = ReturnType<typeof useDeckSimulator>;

