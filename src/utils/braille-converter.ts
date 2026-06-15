import {
  BrailleCell,
  BrailleLine,
  BrailleDocument,
  ValidationError,
  DotPosition,
  CELL_COLS,
  CELL_ROWS,
  DEFAULT_DOT_RADIUS,
  DEFAULT_LINE_SPACING,
  DEFAULT_CHAR_SPACING,
  DEFAULT_PLATE_PADDING,
} from '../types/braille.js';
import {
  LETTER_DOTS,
  NUMBER_DOTS,
  NUMBER_SIGN_DOTS,
  LETTER_SIGN_DOTS,
  PUNCTUATION_DOTS,
  PINYIN_INITIALS,
  PINYIN_FINALS,
  CHAR_PINYIN_MAP,
  UNKNOWN_DOTS,
  EMPTY_DOTS,
} from '../data/braille-mapping.js';

let idCounter = 0;
function genId(prefix: string): string {
  idCounter++;
  return `${prefix}_${idCounter}_${Date.now().toString(36)}`;
}

export function cloneDots(dots: boolean[][]): boolean[][] {
  return dots.map((row) => [...row]);
}

export function createEmptyDots(): boolean[][] {
  return cloneDots(EMPTY_DOTS);
}

export function isAllEmptyDots(dots: boolean[][]): boolean {
  for (let r = 0; r < dots.length; r++) {
    for (let c = 0; c < dots[r].length; c++) {
      if (dots[r][c]) return false;
    }
  }
  return true;
}

export function dotsEqual(a: boolean[][], b: boolean[][]): boolean {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

function charToCells(char: string): BrailleCell[] {
  const cells: BrailleCell[] = [];

  if (PUNCTUATION_DOTS[char]) {
    cells.push({
      id: genId('cell'),
      sourceChar: char,
      dots: cloneDots(PUNCTUATION_DOTS[char]),
      isUnknown: false,
    });
    return cells;
  }

  const lowerChar = char.toLowerCase();
  if (LETTER_DOTS[lowerChar]) {
    if (/[A-Z]/.test(char)) {
      cells.push({
        id: genId('cell'),
        sourceChar: '',
        dots: cloneDots(LETTER_SIGN_DOTS),
        isUnknown: false,
        isLetterSign: true,
      });
    }
    cells.push({
      id: genId('cell'),
      sourceChar: char,
      dots: cloneDots(LETTER_DOTS[lowerChar]),
      isUnknown: false,
    });
    return cells;
  }

  if (NUMBER_DOTS[char]) {
    cells.push({
      id: genId('cell'),
      sourceChar: '',
      dots: cloneDots(NUMBER_SIGN_DOTS),
      isUnknown: false,
      isNumberSign: true,
    });
    cells.push({
      id: genId('cell'),
      sourceChar: char,
      dots: cloneDots(NUMBER_DOTS[char]),
      isUnknown: false,
    });
    return cells;
  }

  if (CHAR_PINYIN_MAP[char]) {
    const pinyin = CHAR_PINYIN_MAP[char];
    if (typeof pinyin === 'string') {
      if (PINYIN_FINALS[pinyin]) {
        cells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(PINYIN_FINALS[pinyin]),
          isUnknown: false,
        });
      } else if (PINYIN_INITIALS[pinyin]) {
        cells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(PINYIN_INITIALS[pinyin]),
          isUnknown: false,
        });
      } else {
        cells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(UNKNOWN_DOTS),
          isUnknown: true,
        });
      }
    } else {
      const [initial, final] = pinyin;
      const initialDots = PINYIN_INITIALS[initial];
      const finalDots = PINYIN_FINALS[final];
      if (initialDots) {
        cells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(initialDots),
          isUnknown: false,
        });
      }
      if (finalDots) {
        cells.push({
          id: genId('cell'),
          sourceChar: initialDots ? '' : char,
          dots: cloneDots(finalDots),
          isUnknown: false,
        });
      }
      if (!initialDots && !finalDots) {
        cells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(UNKNOWN_DOTS),
          isUnknown: true,
        });
      }
    }
    return cells;
  }

  cells.push({
    id: genId('cell'),
    sourceChar: char,
    dots: cloneDots(UNKNOWN_DOTS),
    isUnknown: true,
  });
  return cells;
}

export function textToBraille(text: string): BrailleDocument {
  const rawLines = text.split(/\r?\n/);
  const lines: BrailleLine[] = [];

  let lastWasNumber = false;

  for (const rawLine of rawLines) {
    const lineCells: BrailleCell[] = [];
    let lineLastWasNumber: boolean = lastWasNumber;

    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];

      if (char === ' ') {
        lineLastWasNumber = false;
        lineCells.push({
          id: genId('cell'),
          sourceChar: ' ',
          dots: createEmptyDots(),
          isUnknown: false,
        });
        continue;
      }

      if (/\d/.test(char)) {
        if (!lineLastWasNumber) {
          lineCells.push({
            id: genId('cell'),
            sourceChar: '',
            dots: cloneDots(NUMBER_SIGN_DOTS),
            isUnknown: false,
            isNumberSign: true,
          });
          lineLastWasNumber = true;
        }
        lineCells.push({
          id: genId('cell'),
          sourceChar: char,
          dots: cloneDots(NUMBER_DOTS[char]),
          isUnknown: false,
        });
        continue;
      } else {
        if (lineLastWasNumber && !/[，。、；：！？\s,.!?;:)（]/.test(char)) {
          lineLastWasNumber = false;
        }
      }

      const cells = charToCells(char);
      lineCells.push(...cells);
    }

    lastWasNumber = lineLastWasNumber;

    lines.push({
      id: genId('line'),
      cells: lineCells,
    });
  }

  return {
    lines,
    lineSpacing: DEFAULT_LINE_SPACING,
    charSpacing: DEFAULT_CHAR_SPACING,
    dotRadius: DEFAULT_DOT_RADIUS,
    cellCols: CELL_COLS,
    cellRows: CELL_ROWS,
  };
}

export function mirrorDots(dots: boolean[][]): boolean[][] {
  return dots.map((row) => [...row].reverse());
}

export function toggleDot(
  doc: BrailleDocument,
  pos: DotPosition
): BrailleDocument {
  const newLines = doc.lines.map((line, li) => {
    if (li !== pos.lineIndex) return line;
    return {
      ...line,
      cells: line.cells.map((cell, ci) => {
        if (ci !== pos.cellIndex) return cell;
        const newDots = cloneDots(cell.dots);
        if (
          pos.dotRow >= 0 &&
          pos.dotRow < CELL_ROWS &&
          pos.dotCol >= 0 &&
          pos.dotCol < CELL_COLS
        ) {
          newDots[pos.dotRow][pos.dotCol] = !newDots[pos.dotRow][pos.dotCol];
        }
        return { ...cell, dots: newDots };
      }),
    };
  });
  return { ...doc, lines: newLines };
}

export interface LayoutMetrics {
  cellWidth: number;
  cellHeight: number;
  lineHeight: number;
  totalWidth: number;
  totalHeight: number;
  padding: number;
  maxLineWidth: number;
}

export function calculateLayout(
  doc: BrailleDocument,
  plateWidth: number,
  plateHeight: number
): LayoutMetrics {
  const padding = DEFAULT_PLATE_PADDING;
  const dotDiameter = doc.dotRadius * 2;
  const dotSpacingV = doc.dotRadius * 2.4;
  const dotSpacingH = doc.dotRadius * 2.4;

  const cellWidth =
    dotDiameter + dotSpacingH * (CELL_COLS - 1) + doc.dotRadius * 2;
  const cellHeight =
    dotDiameter + dotSpacingV * (CELL_ROWS - 1) + doc.dotRadius * 2;
  const lineHeight = cellHeight + doc.lineSpacing;

  let maxLineWidth = 0;
  for (const line of doc.lines) {
    const lineWidth =
      line.cells.length * cellWidth +
      Math.max(0, line.cells.length - 1) * doc.charSpacing;
    if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
  }

  const totalWidth = maxLineWidth + padding * 2;
  const totalHeight = doc.lines.length * lineHeight + padding * 2;

  return {
    cellWidth,
    cellHeight,
    lineHeight,
    totalWidth,
    totalHeight,
    padding,
    maxLineWidth,
  };
}

export function validateDocument(
  doc: BrailleDocument,
  plateWidth: number,
  plateHeight: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const layout = calculateLayout(doc, plateWidth, plateHeight);

  if (doc.lineSpacing <= 0) {
    errors.push({
      type: 'invalid_spacing',
      lineIndex: -1,
      message: `行距必须大于 0，当前值: ${doc.lineSpacing}`,
      severity: 'error',
    });
  }

  if (doc.charSpacing <= 0) {
    errors.push({
      type: 'invalid_spacing',
      lineIndex: -1,
      message: `字距必须大于 0，当前值: ${doc.charSpacing}`,
      severity: 'error',
    });
  }

  for (let li = 0; li < doc.lines.length; li++) {
    const line = doc.lines[li];
    for (let ci = 0; ci < line.cells.length; ci++) {
      const cell = line.cells[ci];
      if (cell.isUnknown && cell.sourceChar) {
        errors.push({
          type: 'unknown_char',
          lineIndex: li,
          cellIndex: ci,
          message: `第 ${li + 1} 行第 ${ci + 1} 格存在无法识别的字符: "${cell.sourceChar}"`,
          severity: 'warning',
        });
      }
    }

    const lineWidth =
      line.cells.length * layout.cellWidth +
      Math.max(0, line.cells.length - 1) * doc.charSpacing;
    if (lineWidth + layout.padding * 2 > plateWidth) {
      errors.push({
        type: 'out_of_bounds',
        lineIndex: li,
        message: `第 ${li + 1} 行超出铜版宽度边界 (超出 ${(lineWidth + layout.padding * 2 - plateWidth).toFixed(1)}px)`,
        severity: 'error',
      });
    }
  }

  if (layout.totalHeight > plateHeight) {
    errors.push({
      type: 'out_of_bounds',
      lineIndex: -1,
      message: `内容超出铜版高度边界 (超出 ${(layout.totalHeight - plateHeight).toFixed(1)}px)`,
      severity: 'error',
    });
  }

  return errors;
}

export function getLineY(
  lineIndex: number,
  layout: LayoutMetrics
): number {
  return layout.padding + lineIndex * layout.lineHeight;
}

export function getCellX(
  cellIndex: number,
  layout: LayoutMetrics,
  charSpacing: number
): number {
  return (
    layout.padding +
    cellIndex * layout.cellWidth +
    cellIndex * charSpacing
  );
}

export function getDotCenter(
  dotRow: number,
  dotCol: number,
  cellX: number,
  cellY: number,
  dotRadius: number
): { x: number; y: number } {
  const dotSpacingV = dotRadius * 2.4;
  const dotSpacingH = dotRadius * 2.4;
  return {
    x: cellX + dotRadius + dotCol * (dotRadius * 2 + dotSpacingH),
    y: cellY + dotRadius + dotRow * (dotRadius * 2 + dotSpacingV),
  };
}

export function hitTestDot(
  doc: BrailleDocument,
  x: number,
  y: number,
  plateWidth: number,
  plateHeight: number,
  isMirror: boolean = false
): DotPosition | null {
  const layout = calculateLayout(doc, plateWidth, plateHeight);

  const effectiveX = isMirror ? plateWidth - x : x;

  for (let li = 0; li < doc.lines.length; li++) {
    const lineY = getLineY(li, layout);
    if (y < lineY || y > lineY + layout.cellHeight) continue;

    const line = doc.lines[li];
    for (let ci = 0; ci < line.cells.length; ci++) {
      const cellX = getCellX(ci, layout, doc.charSpacing);
      if (effectiveX < cellX || effectiveX > cellX + layout.cellWidth) continue;

      for (let dr = 0; dr < CELL_ROWS; dr++) {
        for (let dc = 0; dc < CELL_COLS; dc++) {
          const effectiveDC = isMirror ? CELL_COLS - 1 - dc : dc;
          const { x: dx, y: dy } = getDotCenter(
            dr,
            effectiveDC,
            cellX,
            lineY,
            doc.dotRadius
          );
          const dist = Math.sqrt(
            Math.pow(effectiveX - dx, 2) + Math.pow(y - dy, 2)
          );
          if (dist <= doc.dotRadius * 1.3) {
            return {
              lineIndex: li,
              cellIndex: ci,
              dotRow: dr,
              dotCol: dc,
            };
          }
        }
      }
    }
  }
  return null;
}

export function brailleToReverseText(doc: BrailleDocument): string {
  const lines: string[] = [];
  for (const line of doc.lines) {
    let lineText = '';
    for (const cell of line.cells) {
      if (cell.sourceChar) {
        lineText += cell.sourceChar;
      }
    }
    lines.push(lineText);
  }
  return lines.join('\n');
}

export function dotsToUnicodeBraille(dots: boolean[][]): string {
  let code = 0x2800;
  if (dots[0]?.[0]) code |= 0x01;
  if (dots[1]?.[0]) code |= 0x02;
  if (dots[2]?.[0]) code |= 0x04;
  if (dots[0]?.[1]) code |= 0x08;
  if (dots[1]?.[1]) code |= 0x10;
  if (dots[2]?.[1]) code |= 0x20;
  return String.fromCharCode(code);
}

export function brailleDocumentToUnicode(doc: BrailleDocument): string {
  const lines: string[] = [];
  for (const line of doc.lines) {
    let lineText = '';
    for (const cell of line.cells) {
      lineText += dotsToUnicodeBraille(cell.dots);
      lineText += '\u2004';
    }
    lines.push(lineText);
  }
  return lines.join('\n');
}

export function isDocumentModified(doc: BrailleDocument, originalText: string): boolean {
  const originalDoc = textToBraille(originalText);
  if (originalDoc.lines.length !== doc.lines.length) return true;
  for (let li = 0; li < doc.lines.length; li++) {
    if (originalDoc.lines[li].cells.length !== doc.lines[li].cells.length) return true;
    for (let ci = 0; ci < doc.lines[li].cells.length; ci++) {
      if (!dotsEqual(originalDoc.lines[li].cells[ci].dots, doc.lines[li].cells[ci].dots)) {
        return true;
      }
    }
  }
  return false;
}

export function getModifiedCells(doc: BrailleDocument, originalText: string): Set<string> {
  const modified = new Set<string>();
  const originalDoc = textToBraille(originalText);
  if (originalDoc.lines.length !== doc.lines.length) return modified;
  for (let li = 0; li < doc.lines.length; li++) {
    if (originalDoc.lines[li].cells.length !== doc.lines[li].cells.length) continue;
    for (let ci = 0; ci < doc.lines[li].cells.length; ci++) {
      if (!dotsEqual(originalDoc.lines[li].cells[ci].dots, doc.lines[li].cells[ci].dots)) {
        modified.add(`${li}-${ci}`);
      }
    }
  }
  return modified;
}
