export enum GameState {
  INTRO = 'INTRO',
  LOADING_MODEL = 'LOADING_MODEL',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export interface FoodItem {
  id: string;
  x: number;
  y: number;
  emoji: string;
  points: number;
  speed: number;
  sound: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface MouthBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FOOD_TYPES = [
  { emoji: '🍎', points: 1, speed: 3, sound: 'crunch' },
  { emoji: '🍌', points: 1, speed: 3.5, sound: 'squish' },
  { emoji: '🍇', points: 2, speed: 4, sound: 'pop' },
  { emoji: '🍔', points: 3, speed: 5, sound: 'chomp' },
  { emoji: '🍕', points: 3, speed: 5, sound: 'chomp' },
  { emoji: '🍩', points: 4, speed: 6, sound: 'yum' },
  { emoji: '🧁', points: 4, speed: 6, sound: 'yum' },
  { emoji: '💎', points: 5, speed: 8, sound: 'ding' }, // Bonus!
];