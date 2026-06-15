export interface BrailleDot {
  row: number;
  col: number;
  active: boolean;
}

export interface BrailleCell {
  id: string;
  sourceChar: string;
  dots: boolean[][];
  originalDots?: boolean[][];
  isUnknown: boolean;
  isNumberSign?: boolean;
  isLetterSign?: boolean;
}

export interface BrailleLine {
  id: string;
  cells: BrailleCell[];
}

export interface BrailleDocument {
  lines: BrailleLine[];
  lineSpacing: number;
  charSpacing: number;
  dotRadius: number;
  cellCols: number;
  cellRows: number;
}

export interface ValidationError {
  type: 'unknown_char' | 'out_of_bounds' | 'invalid_spacing';
  lineIndex: number;
  cellIndex?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface DotPosition {
  lineIndex: number;
  cellIndex: number;
  dotRow: number;
  dotCol: number;
}

export const CELL_COLS = 2;
export const CELL_ROWS = 3;
export const DEFAULT_DOT_RADIUS = 10;
export const DEFAULT_LINE_SPACING = 40;
export const DEFAULT_CHAR_SPACING = 20;
export const DEFAULT_PLATE_PADDING = 30;
