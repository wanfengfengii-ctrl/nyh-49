import {
  BrailleCell,
  BrailleLine,
  BrailleDocument,
  ValidationError,
  DotPosition,
  PaginatedDocument,
  HistoryEntry,
  HistoryManagerState,
  CELL_COLS,
  CELL_ROWS,
  DEFAULT_DOT_RADIUS,
  DEFAULT_LINE_SPACING,
  DEFAULT_CHAR_SPACING,
  DEFAULT_PLATE_PADDING,
  ReviewIssue,
  ReviewComment,
  ReviewIssueStatus,
  ReviewIssueSeverity,
  ReviewSignature,
  VersionDiff,
  ReviewState,
  ReviewStatus,
  Reviewer,
  createInitialReviewState,
  DEFAULT_REVIEWER,
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

export function cloneDocument(doc: BrailleDocument): BrailleDocument {
  return {
    ...doc,
    lines: doc.lines.map((line) => ({
      ...line,
      cells: line.cells.map((cell) => ({
        ...cell,
        dots: cloneDots(cell.dots),
        originalDots: cell.originalDots ? cloneDots(cell.originalDots) : undefined,
      })),
    })),
  };
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

  const finalLines = lines.map(line => ({
    ...line,
    cells: line.cells.map(cell => ({
      ...cell,
      originalDots: cell.originalDots ? cloneDots(cell.originalDots) : cloneDots(cell.dots),
    })),
  }));

  return {
    lines: finalLines,
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
        return {
          ...cell,
          dots: newDots,
          originalDots: cell.originalDots ? cloneDots(cell.originalDots) : cloneDots(cell.dots),
        };
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

export function paginateDocument(
  doc: BrailleDocument,
  plateWidth: number,
  plateHeight: number
): PaginatedDocument {
  const wrappedDoc = wrapLongLines(doc, plateWidth);
  const layout = calculateLayout(wrappedDoc, plateWidth, plateHeight);
  const padding = layout.padding;
  const lineHeight = layout.lineHeight;
  const availableHeight = plateHeight - padding * 2;
  const linesPerPage = Math.max(1, Math.floor(availableHeight / lineHeight));

  const pages: BrailleDocument[] = [];
  const pageLineRanges: { startLine: number; endLine: number }[] = [];
  let overflow = false;

  let currentLine = 0;

  while (currentLine < wrappedDoc.lines.length) {
    const pageLines: BrailleLine[] = [];
    const startLine = currentLine;
    let remainingLines = linesPerPage;

    while (remainingLines > 0 && currentLine < wrappedDoc.lines.length) {
      const line = wrappedDoc.lines[currentLine];
      pageLines.push(line);
      currentLine++;
      remainingLines--;
    }

    pages.push({
      ...wrappedDoc,
      lines: pageLines,
    });
    pageLineRanges.push({ startLine, endLine: currentLine - 1 });
  }

  if (pages.length === 0) {
    pages.push({
      ...wrappedDoc,
      lines: [],
    });
    pageLineRanges.push({ startLine: 0, endLine: -1 });
  }

  if (pages.length > 1) {
    overflow = true;
  }

  return { pages, pageLineRanges, overflow };
}

export function wrapLongLines(
  doc: BrailleDocument,
  plateWidth: number
): BrailleDocument {
  const layout = calculateLayout(doc, plateWidth, plateWidth);
  const availableWidth = plateWidth - layout.padding * 2;
  const cellWidth = layout.cellWidth;
  const charSpacing = doc.charSpacing;

  const maxCellsPerLine = Math.max(
    1,
    Math.floor((availableWidth + charSpacing) / (cellWidth + charSpacing))
  );

  const newLines: BrailleLine[] = [];

  for (const line of doc.lines) {
    const totalCells = line.cells.length;
    if (totalCells <= maxCellsPerLine) {
      newLines.push(line);
      continue;
    }

    let offset = 0;
    while (offset < totalCells) {
      const chunkCells = line.cells.slice(offset, offset + maxCellsPerLine);
      newLines.push({
        id: `${line.id}-part-${Math.floor(offset / maxCellsPerLine)}`,
        cells: chunkCells,
      });
      offset += maxCellsPerLine;
    }
  }

  return {
    ...doc,
    lines: newLines,
  };
}

export function validateDocument(
  doc: BrailleDocument,
  plateWidth: number,
  plateHeight: number,
  pageIndex: number = 0
): ValidationError[] {
  const errors: ValidationError[] = [];
  const layout = calculateLayout(doc, plateWidth, plateHeight);

  if (doc.lineSpacing <= 0) {
    errors.push({
      type: 'invalid_spacing',
      lineIndex: -1,
      pageIndex,
      message: `行距必须大于 0，当前值: ${doc.lineSpacing}`,
      severity: 'error',
    });
  }

  if (doc.charSpacing <= 0) {
    errors.push({
      type: 'invalid_spacing',
      lineIndex: -1,
      pageIndex,
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
          pageIndex,
          message: `第 ${pageIndex + 1} 页第 ${li + 1} 行第 ${ci + 1} 格存在无法识别的字符: "${cell.sourceChar}"`,
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
        pageIndex,
        message: `第 ${pageIndex + 1} 页第 ${li + 1} 行超出铜版宽度边界 (超出 ${(lineWidth + layout.padding * 2 - plateWidth).toFixed(1)}px)`,
        severity: 'error',
      });
    }
  }

  if (layout.totalHeight > plateHeight) {
    errors.push({
      type: 'out_of_bounds',
      lineIndex: -1,
      pageIndex,
      message: `第 ${pageIndex + 1} 页内容超出铜版高度边界 (超出 ${(layout.totalHeight - plateHeight).toFixed(1)}px)`,
      severity: 'error',
    });
  }

  return errors;
}

export function validatePaginatedDocument(
  paginated: PaginatedDocument,
  plateWidth: number,
  plateHeight: number
): ValidationError[] {
  const allErrors: ValidationError[] = [];
  for (let pi = 0; pi < paginated.pages.length; pi++) {
    const pageErrors = validateDocument(
      paginated.pages[pi],
      plateWidth,
      plateHeight,
      pi
    );
    allErrors.push(...pageErrors);
  }
  return allErrors;
}

export function findManualModifications(doc: BrailleDocument): {
  lineIndex: number;
  cellIndex: number;
  originalDots: boolean[][];
  currentDots: boolean[][];
}[] {
  const modifications: {
    lineIndex: number;
    cellIndex: number;
    originalDots: boolean[][];
    currentDots: boolean[][];
  }[] = [];

  for (let li = 0; li < doc.lines.length; li++) {
    for (let ci = 0; ci < doc.lines[li].cells.length; ci++) {
      const cell = doc.lines[li].cells[ci];
      if (cell.originalDots && !dotsEqual(cell.dots, cell.originalDots)) {
        modifications.push({
          lineIndex: li,
          cellIndex: ci,
          originalDots: cloneDots(cell.originalDots),
          currentDots: cloneDots(cell.dots),
        });
      }
    }
  }
  return modifications;
}

export function validateThreeViewConsistency(doc: BrailleDocument): {
  pass: boolean;
  modifications: ReturnType<typeof findManualModifications>;
  errors: ValidationError[];
  details: {
    readingMatchesImprint: boolean;
    plateIsMirrorOfReading: boolean;
    imprintIsMirrorOfPlate: boolean;
  };
} {
  const modifications = findManualModifications(doc);
  const errors: ValidationError[] = [];
  let readingMatchesImprint = true;
  let plateIsMirrorOfReading = true;
  let imprintIsMirrorOfPlate = true;

  for (let li = 0; li < doc.lines.length; li++) {
    for (let ci = 0; ci < doc.lines[li].cells.length; ci++) {
      const cell = doc.lines[li].cells[ci];
      const readingDots = cell.dots;
      const plateDots = mirrorDots(cell.dots);
      const imprintDots = mirrorDots(plateDots);

      if (!dotsEqual(readingDots, imprintDots)) {
        readingMatchesImprint = false;
        errors.push({
          type: 'imprint_mismatch',
          lineIndex: li,
          cellIndex: ci,
          message: `第 ${li + 1} 行第 ${ci + 1} 格：阅读视图与压印预览不一致`,
          severity: 'error',
        });
      }

      if (!dotsEqual(plateDots, mirrorDots(readingDots))) {
        plateIsMirrorOfReading = false;
        errors.push({
          type: 'mirror_mismatch',
          lineIndex: li,
          cellIndex: ci,
          message: `第 ${li + 1} 行第 ${ci + 1} 格：制版视图不是阅读视图的镜像`,
          severity: 'error',
        });
      }

      if (!dotsEqual(imprintDots, mirrorDots(plateDots))) {
        imprintIsMirrorOfPlate = false;
        errors.push({
          type: 'mirror_mismatch',
          lineIndex: li,
          cellIndex: ci,
          message: `第 ${li + 1} 行第 ${ci + 1} 格：压印预览不是制版视图的镜像`,
          severity: 'error',
        });
      }
    }
  }

  const pass = errors.length === 0;

  return {
    pass,
    modifications,
    errors,
    details: {
      readingMatchesImprint,
      plateIsMirrorOfReading,
      imprintIsMirrorOfPlate,
    },
  };
}

export function validateMirrorConsistency(doc: BrailleDocument): ValidationError[] {
  const result = validateThreeViewConsistency(doc);
  return result.errors;
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

export function createHistoryManager(): HistoryManagerState {
  return {
    entries: [],
    currentIndex: -1,
  };
}

export function pushHistoryEntry(
  state: HistoryManagerState,
  entry: Omit<HistoryEntry, 'id' | 'timestamp'>
): HistoryManagerState {
  const newEntry: HistoryEntry = {
    ...entry,
    id: genId('history'),
    timestamp: Date.now(),
  };

  const newEntries = state.currentIndex < state.entries.length - 1
    ? state.entries.slice(0, state.currentIndex + 1)
    : [...state.entries];

  newEntries.push(newEntry);

  const MAX_HISTORY = 100;
  if (newEntries.length > MAX_HISTORY) {
    const overflow = newEntries.length - MAX_HISTORY;
    return {
      entries: newEntries.slice(overflow),
      currentIndex: MAX_HISTORY - 1,
    };
  }

  return {
    entries: newEntries,
    currentIndex: newEntries.length - 1,
  };
}

export function undoHistory(
  state: HistoryManagerState
): {
  state: HistoryManagerState;
  document: BrailleDocument | null;
  plateWidth: number | null;
  plateHeight: number | null;
} {
  if (state.currentIndex < 0) {
    return { state, document: null, plateWidth: null, plateHeight: null };
  }

  const entry = state.entries[state.currentIndex];
  const newIndex = state.currentIndex - 1;

  return {
    state: {
      ...state,
      currentIndex: newIndex,
    },
    document: cloneDocument(entry.documentBefore),
    plateWidth: entry.plateWidthBefore ?? null,
    plateHeight: entry.plateHeightBefore ?? null,
  };
}

export function redoHistory(
  state: HistoryManagerState
): {
  state: HistoryManagerState;
  document: BrailleDocument | null;
  plateWidth: number | null;
  plateHeight: number | null;
} {
  if (state.currentIndex >= state.entries.length - 1) {
    return { state, document: null, plateWidth: null, plateHeight: null };
  }

  const newIndex = state.currentIndex + 1;
  const entry = state.entries[newIndex];

  return {
    state: {
      ...state,
      currentIndex: newIndex,
    },
    document: cloneDocument(entry.documentAfter),
    plateWidth: entry.plateWidthAfter ?? null,
    plateHeight: entry.plateHeightAfter ?? null,
  };
}

export function canUndo(state: HistoryManagerState): boolean {
  return state.currentIndex >= 0;
}

export function canRedo(state: HistoryManagerState): boolean {
  return state.currentIndex < state.entries.length - 1;
}

export function getHistoryDescriptions(state: HistoryManagerState): string[] {
  return state.entries.map((e, i) => {
    const marker = i === state.currentIndex ? '● ' : '  ';
    const time = new Date(e.timestamp).toLocaleTimeString();
    return `${marker}[${time}] ${e.description}`;
  });
}

export function exportCanvasToImage(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.95
): string {
  const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return canvas.toDataURL(type, quality);
}

export function downloadCanvasImage(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpeg' = 'png'
): void {
  const dataUrl = exportCanvasToImage(canvas, format);
  const link = document.createElement('a');
  link.download = `${filename}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function createReviewIssue(params: {
  title: string;
  description: string;
  severity: ReviewIssueSeverity;
  pageIndex: number;
  lineIndex: number;
  cellIndex?: number;
  dotRow?: number;
  dotCol?: number;
  reporter: Reviewer;
  assignee?: Reviewer;
  versionSnapshot?: BrailleDocument;
  tags?: string[];
}): ReviewIssue {
  const now = Date.now();
  return {
    id: genId('issue'),
    title: params.title,
    description: params.description,
    status: 'pending',
    severity: params.severity,
    pageIndex: params.pageIndex,
    lineIndex: params.lineIndex,
    cellIndex: params.cellIndex,
    dotRow: params.dotRow,
    dotCol: params.dotCol,
    reporterId: params.reporter.id,
    reporterName: params.reporter.name,
    assigneeId: params.assignee?.id,
    assigneeName: params.assignee?.name,
    createdAt: now,
    updatedAt: now,
    comments: [],
    versionSnapshot: params.versionSnapshot ? cloneDocument(params.versionSnapshot) : undefined,
    tags: params.tags,
  };
}

export function addReviewComment(
  issue: ReviewIssue,
  author: Reviewer,
  content: string
): ReviewIssue {
  const comment: ReviewComment = {
    id: genId('comment'),
    issueId: issue.id,
    authorId: author.id,
    authorName: author.name,
    content,
    timestamp: Date.now(),
  };
  return {
    ...issue,
    comments: [...issue.comments, comment],
    updatedAt: Date.now(),
  };
}

export function updateIssueStatus(
  issue: ReviewIssue,
  status: ReviewIssueStatus,
  resolver?: Reviewer
): ReviewIssue {
  return {
    ...issue,
    status,
    updatedAt: Date.now(),
    resolvedAt: status === 'resolved' || status === 'confirmed' ? Date.now() : undefined,
  };
}

export function assignIssue(issue: ReviewIssue, assignee: Reviewer): ReviewIssue {
  return {
    ...issue,
    assigneeId: assignee.id,
    assigneeName: assignee.name,
    updatedAt: Date.now(),
  };
}

export function filterIssues(
  issues: ReviewIssue[],
  statusFilter: ReviewIssueStatus | 'all',
  severityFilter: ReviewIssueSeverity | 'all',
  pageIndex?: number
): ReviewIssue[] {
  return issues.filter((issue) => {
    if (statusFilter !== 'all' && issue.status !== statusFilter) return false;
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (pageIndex !== undefined && issue.pageIndex !== pageIndex) return false;
    return true;
  });
}

export function getIssueCounts(issues: ReviewIssue[]): {
  total: number;
  pending: number;
  confirmed: number;
  rejected: number;
  resolved: number;
  critical: number;
  major: number;
  minor: number;
  suggestion: number;
} {
  const counts = {
    total: issues.length,
    pending: 0,
    confirmed: 0,
    rejected: 0,
    resolved: 0,
    critical: 0,
    major: 0,
    minor: 0,
    suggestion: 0,
  };
  for (const issue of issues) {
    counts[issue.status]++;
    counts[issue.severity]++;
  }
  return counts;
}

export function createVersionDiff(params: {
  description: string;
  documentBefore: BrailleDocument;
  documentAfter: BrailleDocument;
  author: string;
}): VersionDiff {
  const modifiedCells: VersionDiff['modifiedCells'] = [];
  const maxLines = Math.max(params.documentBefore.lines.length, params.documentAfter.lines.length);

  for (let li = 0; li < maxLines; li++) {
    const lineBefore = params.documentBefore.lines[li];
    const lineAfter = params.documentAfter.lines[li];
    const maxCells = Math.max(lineBefore?.cells.length ?? 0, lineAfter?.cells.length ?? 0);

    for (let ci = 0; ci < maxCells; ci++) {
      const cellBefore = lineBefore?.cells[ci];
      const cellAfter = lineAfter?.cells[ci];

      const dotsBefore = cellBefore?.dots ?? createEmptyDots();
      const dotsAfter = cellAfter?.dots ?? createEmptyDots();

      if (!dotsEqual(dotsBefore, dotsAfter)) {
        modifiedCells.push({
          lineIndex: li,
          cellIndex: ci,
          dotsBefore: cloneDots(dotsBefore),
          dotsAfter: cloneDots(dotsAfter),
        });
      }
    }
  }

  return {
    versionId: genId('version'),
    timestamp: Date.now(),
    description: params.description,
    documentBefore: cloneDocument(params.documentBefore),
    documentAfter: cloneDocument(params.documentAfter),
    modifiedCells,
    author: params.author,
  };
}

export function createReviewSignature(params: {
  reviewer: Reviewer;
  signatureType: 'approval' | 'rejection';
  comment?: string;
}): ReviewSignature {
  return {
    id: genId('signature'),
    reviewerId: params.reviewer.id,
    reviewerName: params.reviewer.name,
    reviewerRole: params.reviewer.role,
    timestamp: Date.now(),
    signatureType: params.signatureType,
    comment: params.comment,
  };
}

export function updateReviewStatus(state: ReviewState, status: ReviewStatus): ReviewState {
  return {
    ...state,
    reviewStatus: status,
  };
}

export function addIssueToState(state: ReviewState, issue: ReviewIssue): ReviewState {
  return {
    ...state,
    issues: [...state.issues, issue],
  };
}

export function updateIssueInState(state: ReviewState, issue: ReviewIssue): ReviewState {
  return {
    ...state,
    issues: state.issues.map((i) => (i.id === issue.id ? issue : i)),
  };
}

export function addSignatureToState(state: ReviewState, signature: ReviewSignature): ReviewState {
  return {
    ...state,
    signatures: [...state.signatures, signature],
  };
}

export function addVersionToState(state: ReviewState, version: VersionDiff): ReviewState {
  return {
    ...state,
    versionHistory: [...state.versionHistory, version],
  };
}

export function getSeverityColor(severity: ReviewIssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '#e74c3c';
    case 'major':
      return '#e67e22';
    case 'minor':
      return '#f39c12';
    case 'suggestion':
      return '#3498db';
    default:
      return '#95a5a6';
  }
}

export function getSeverityLabel(severity: ReviewIssueSeverity): string {
  switch (severity) {
    case 'critical':
      return '严重';
    case 'major':
      return '重要';
    case 'minor':
      return '次要';
    case 'suggestion':
      return '建议';
    default:
      return severity;
  }
}

export function getStatusLabel(status: ReviewIssueStatus): string {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'confirmed':
      return '已确认';
    case 'rejected':
      return '已驳回';
    case 'resolved':
      return '已解决';
    default:
      return status;
  }
}

export function getReviewStatusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'in_review':
      return '审校中';
    case 'approved':
      return '已通过';
    case 'rejected':
      return '已驳回';
    default:
      return status;
  }
}
