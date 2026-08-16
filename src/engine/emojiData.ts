export type EmojiCategory =
  | "smileys"
  | "people"
  | "animals"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols"
  | "nature";

export interface Emoji {
  char: string;
  name: string;
  category: EmojiCategory;
  keywords: string[];
}

/**
 * A curated, hand-tagged emoji set. Kept intentionally compact so the engine's
 * search/scoring behaviour is easy to reason about and unit test, while still
 * covering every category the UI exposes.
 */
export const EMOJIS: Emoji[] = [
  // smileys
  { char: "😀", name: "grinning face", category: "smileys", keywords: ["happy", "smile", "grin"] },
  { char: "😂", name: "face with tears of joy", category: "smileys", keywords: ["laugh", "lol", "cry", "funny"] },
  { char: "😍", name: "smiling face with heart-eyes", category: "smileys", keywords: ["love", "crush", "adore"] },
  { char: "😎", name: "smiling face with sunglasses", category: "smileys", keywords: ["cool", "sunglasses", "chill"] },
  { char: "🤔", name: "thinking face", category: "smileys", keywords: ["think", "hmm", "consider"] },
  { char: "😴", name: "sleeping face", category: "smileys", keywords: ["sleep", "tired", "zzz"] },
  { char: "🥳", name: "partying face", category: "smileys", keywords: ["party", "celebrate", "birthday"] },
  { char: "😭", name: "loudly crying face", category: "smileys", keywords: ["cry", "sad", "sob"] },
  { char: "😅", name: "grinning face with sweat", category: "smileys", keywords: ["relief", "phew", "nervous"] },
  { char: "🙃", name: "upside-down face", category: "smileys", keywords: ["silly", "sarcasm", "irony"] },

  // people
  { char: "👋", name: "waving hand", category: "people", keywords: ["hello", "hi", "wave", "bye"] },
  { char: "👍", name: "thumbs up", category: "people", keywords: ["yes", "ok", "approve", "like"] },
  { char: "👎", name: "thumbs down", category: "people", keywords: ["no", "bad", "dislike"] },
  { char: "🙏", name: "folded hands", category: "people", keywords: ["thanks", "please", "pray"] },
  { char: "👏", name: "clapping hands", category: "people", keywords: ["applause", "clap", "bravo"] },
  { char: "💪", name: "flexed biceps", category: "people", keywords: ["strong", "muscle", "power"] },
  { char: "🤝", name: "handshake", category: "people", keywords: ["deal", "agree", "partner"] },
  { char: "🫶", name: "heart hands", category: "people", keywords: ["love", "care", "support"] },

  // animals & nature
  { char: "🐶", name: "dog face", category: "animals", keywords: ["dog", "puppy", "pet"] },
  { char: "🐱", name: "cat face", category: "animals", keywords: ["cat", "kitten", "pet"] },
  { char: "🦊", name: "fox", category: "animals", keywords: ["fox", "clever"] },
  { char: "🐼", name: "panda", category: "animals", keywords: ["panda", "bear"] },
  { char: "🦁", name: "lion", category: "animals", keywords: ["lion", "king", "roar"] },
  { char: "🐢", name: "turtle", category: "animals", keywords: ["turtle", "slow"] },
  { char: "🦄", name: "unicorn", category: "animals", keywords: ["unicorn", "magic", "fantasy"] },
  { char: "🐝", name: "honeybee", category: "animals", keywords: ["bee", "buzz", "honey"] },
  { char: "🌵", name: "cactus", category: "nature", keywords: ["cactus", "plant", "desert"] },
  { char: "🌸", name: "cherry blossom", category: "nature", keywords: ["flower", "spring", "sakura"] },
  { char: "🌈", name: "rainbow", category: "nature", keywords: ["rainbow", "color", "pride"] },
  { char: "🔥", name: "fire", category: "nature", keywords: ["fire", "hot", "lit", "flame"] },
  { char: "⭐", name: "star", category: "nature", keywords: ["star", "favorite", "night"] },
  { char: "🌙", name: "crescent moon", category: "nature", keywords: ["moon", "night", "sleep"] },

  // food
  { char: "🍕", name: "pizza", category: "food", keywords: ["pizza", "food", "cheese"] },
  { char: "🍔", name: "hamburger", category: "food", keywords: ["burger", "food", "fast food"] },
  { char: "🍣", name: "sushi", category: "food", keywords: ["sushi", "japanese", "food"] },
  { char: "🍩", name: "doughnut", category: "food", keywords: ["donut", "sweet", "dessert"] },
  { char: "🍎", name: "red apple", category: "food", keywords: ["apple", "fruit", "healthy"] },
  { char: "☕", name: "hot beverage", category: "food", keywords: ["coffee", "tea", "morning"] },
  { char: "🍦", name: "soft ice cream", category: "food", keywords: ["ice cream", "sweet", "cold"] },
  { char: "🥑", name: "avocado", category: "food", keywords: ["avocado", "healthy", "toast"] },

  // travel
  { char: "🚀", name: "rocket", category: "travel", keywords: ["rocket", "launch", "space", "fast"] },
  { char: "✈️", name: "airplane", category: "travel", keywords: ["plane", "flight", "travel"] },
  { char: "🚗", name: "automobile", category: "travel", keywords: ["car", "drive", "vehicle"] },
  { char: "🏝️", name: "desert island", category: "travel", keywords: ["island", "beach", "vacation"] },
  { char: "🗻", name: "mount fuji", category: "travel", keywords: ["mountain", "fuji", "climb"] },
  { char: "🏠", name: "house", category: "travel", keywords: ["home", "house", "building"] },

  // activities
  { char: "⚽", name: "soccer ball", category: "activities", keywords: ["soccer", "football", "sport"] },
  { char: "🏀", name: "basketball", category: "activities", keywords: ["basketball", "sport", "hoops"] },
  { char: "🎮", name: "video game", category: "activities", keywords: ["game", "gaming", "controller"] },
  { char: "🎨", name: "artist palette", category: "activities", keywords: ["art", "paint", "design", "color"] },
  { char: "🎸", name: "guitar", category: "activities", keywords: ["guitar", "music", "rock"] },
  { char: "🎯", name: "direct hit", category: "activities", keywords: ["target", "goal", "bullseye"] },

  // objects
  { char: "💡", name: "light bulb", category: "objects", keywords: ["idea", "bulb", "light", "bright"] },
  { char: "💻", name: "laptop", category: "objects", keywords: ["laptop", "computer", "code", "work"] },
  { char: "📱", name: "mobile phone", category: "objects", keywords: ["phone", "mobile", "call"] },
  { char: "📷", name: "camera", category: "objects", keywords: ["camera", "photo", "picture"] },
  { char: "🎁", name: "wrapped gift", category: "objects", keywords: ["gift", "present", "birthday"] },
  { char: "🔑", name: "key", category: "objects", keywords: ["key", "unlock", "access"] },
  { char: "💰", name: "money bag", category: "objects", keywords: ["money", "cash", "rich"] },
  { char: "📚", name: "books", category: "objects", keywords: ["books", "read", "study", "learn"] },

  // symbols
  { char: "❤️", name: "red heart", category: "symbols", keywords: ["love", "heart", "like"] },
  { char: "✨", name: "sparkles", category: "symbols", keywords: ["sparkle", "shine", "magic", "new"] },
  { char: "✅", name: "check mark button", category: "symbols", keywords: ["done", "check", "yes", "ok"] },
  { char: "❌", name: "cross mark", category: "symbols", keywords: ["no", "wrong", "cancel", "x"] },
  { char: "⚡", name: "high voltage", category: "symbols", keywords: ["fast", "lightning", "energy", "power"] },
  { char: "💯", name: "hundred points", category: "symbols", keywords: ["100", "perfect", "score"] },
  { char: "❓", name: "question mark", category: "symbols", keywords: ["question", "help", "what"] },
  { char: "💬", name: "speech balloon", category: "symbols", keywords: ["chat", "talk", "message"] },
];

export const CATEGORIES: EmojiCategory[] = [
  "smileys",
  "people",
  "animals",
  "nature",
  "food",
  "travel",
  "activities",
  "objects",
  "symbols",
];

export const CATEGORY_LABELS: Record<EmojiCategory, string> = {
  smileys: "Smileys",
  people: "People",
  animals: "Animals",
  nature: "Nature",
  food: "Food",
  travel: "Travel",
  activities: "Activities",
  objects: "Objects",
  symbols: "Symbols",
};
