import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  BrailleDocument,
  DotPosition,
  CELL_COLS,
  CELL_ROWS,
  DEFAULT_PLATE_PADDING,
  CalibrationConfig,
  DEFAULT_CALIBRATION,
  HighlightInfo,
  ReviewIssue,
  DiffCellInfo,
} from '../types/braille.js';
import { getSeverityColor } from '../utils/braille-converter.js';
import {
  calculateLayout,
  getLineY,
  getCellX,
  getDotCenter,
  mirrorDots,
  hitTestDot,
  exportCanvasToImage,
  downloadCanvasImage,
  cloneDots,
  dotsEqual,
  isAllEmptyDots,
} from '../utils/braille-converter.js';

@customElement('braille-canvas')
export class BrailleCanvas extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #f5f5f5;
      border-radius: 8px;
    }
    canvas {
      display: block;
      cursor: pointer;
    }
    .view-label {
      position: absolute;
      top: 8px;
      left: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #555;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px 10px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 10;
    }
    .page-label {
      position: absolute;
      top: 8px;
      right: 12px;
      font-size: 12px;
      font-weight: 500;
      color: #667eea;
      background: rgba(102, 126, 234, 0.1);
      padding: 4px 10px;
      border-radius: 4px;
      pointer-events: none;
      z-index: 10;
    }
  `;

  @property({ type: Object })
  document!: BrailleDocument;

  @property({ type: Boolean })
  isMirror: boolean = false;

  @property({ type: Number })
  plateWidth: number = 900;

  @property({ type: Number })
  plateHeight: number = 600;

  @property({ type: Boolean })
  editable: boolean = true;

  @property({ type: String })
  label: string = '';

  @property({ type: Number })
  pageIndex: number = 0;

  @property({ type: Number })
  totalPages: number = 1;

  @property({ type: Object })
  calibration: CalibrationConfig = { ...DEFAULT_CALIBRATION };

  @property({ type: Array })
  highlights: HighlightInfo[] = [];

  @property({ type: Array })
  reviewIssues: ReviewIssue[] = [];

  @property({ type: Boolean })
  showIssueMarkers: boolean = true;

  @property({ type: Boolean })
  diffMode: boolean = false;

  @property({ type: Object })
  diffDocument?: BrailleDocument;

  @property({ type: String })
  diffSide: 'left' | 'right' | 'overlay' = 'overlay';

  @query('canvas')
  canvasEl!: HTMLCanvasElement;

  @state()
  hoveredDot: DotPosition | null = null;

  private isDragging: boolean = false;
  private dragValue: boolean = false;

  override firstUpdated() {
    this.renderCanvas();
  }

  override updated(changedProperties: PropertyValues) {
    if (
      changedProperties.has('document') ||
      changedProperties.has('isMirror') ||
      changedProperties.has('plateWidth') ||
      changedProperties.has('plateHeight') ||
      changedProperties.has('hoveredDot') ||
      changedProperties.has('calibration') ||
      changedProperties.has('highlights') ||
      changedProperties.has('pageIndex') ||
      changedProperties.has('reviewIssues') ||
      changedProperties.has('showIssueMarkers') ||
      changedProperties.has('diffMode') ||
      changedProperties.has('diffDocument') ||
      changedProperties.has('diffSide')
    ) {
      this.renderCanvas();
    }
  }

  exportImage(format: 'png' | 'jpeg' = 'png'): string {
    if (!this.canvasEl) return '';
    return exportCanvasToImage(this.canvasEl, format);
  }

  downloadImage(filename: string, format: 'png' | 'jpeg' = 'png') {
    if (!this.canvasEl) return;
    downloadCanvasImage(this.canvasEl, filename, format);
  }

  getCanvasElement(): HTMLCanvasElement | null {
    return this.canvasEl;
  }

  scrollToHighlight(highlight: HighlightInfo): void {
    if (!this.canvasEl || !this.document) return;
    const layout = calculateLayout(this.document, this.plateWidth, this.plateHeight);

    const container = this.canvasEl.parentElement;
    if (!container) return;

    let targetScrollX = 0;
    let targetScrollY = 0;

    if (highlight.lineIndex >= 0) {
      targetScrollY = getLineY(highlight.lineIndex, layout);
    }

    if (highlight.cellIndex != null && highlight.cellIndex >= 0 && highlight.lineIndex >= 0) {
      const cellX = layout.padding + highlight.cellIndex * (layout.cellWidth + this.document.charSpacing);
      targetScrollX = cellX;
    }

    const margin = 60;
    const finalScrollY = Math.max(0, targetScrollY - margin);
    const finalScrollX = Math.max(0, targetScrollX - margin);

    container.scrollTo({
      top: finalScrollY,
      left: finalScrollX,
      behavior: 'smooth',
    });
  }

  private renderCanvas() {
    if (!this.canvasEl || !this.document) return;

    const canvas = this.canvasEl;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.plateWidth * dpr;
    canvas.height = this.plateHeight * dpr;
    canvas.style.width = `${this.plateWidth}px`;
    canvas.style.height = `${this.plateHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawCalibration(ctx);
    this.drawPlateBorder(ctx);
    this.drawHighlights(ctx);
    if (this.diffMode && this.diffDocument) {
      this.drawDiffOverlay(ctx);
    }
    this.drawCells(ctx);
    if (this.showIssueMarkers) {
      this.drawIssueMarkers(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, this.plateWidth, this.plateHeight);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x <= this.plateWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.plateHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.plateHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.plateWidth, y);
      ctx.stroke();
    }
  }

  private drawCalibration(ctx: CanvasRenderingContext2D) {
    if (!this.calibration) return;
    const padding = DEFAULT_PLATE_PADDING;

    if (this.calibration.showSafetyMargin) {
      const margin = this.calibration.safetyMarginSize;
      ctx.save();
      ctx.strokeStyle = this.calibration.marginColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.strokeRect(
        padding + margin,
        padding + margin,
        this.plateWidth - (padding + margin) * 2,
        this.plateHeight - (padding + margin) * 2
      );
      ctx.setLineDash([]);

      ctx.fillStyle = this.calibration.marginColor;
      ctx.font = '10px sans-serif';
      ctx.fillText(
        `安全边距 ${margin}px`,
        padding + margin + 4,
        padding + margin + 12
      );
      ctx.restore();
    }

    if (this.calibration.showBaselines) {
      ctx.save();
      ctx.strokeStyle = this.calibration.baselineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.globalAlpha = 0.7;

      const centerY = this.plateHeight / 2;
      const centerX = this.plateWidth / 2;

      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(this.plateWidth, centerY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, this.plateHeight);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = this.calibration.baselineColor;
      ctx.font = '10px sans-serif';
      ctx.fillText('水平基准线', 8, centerY - 4);
      ctx.save();
      ctx.translate(centerX + 4, this.plateHeight - 8);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('垂直基准线', 0, 0);
      ctx.restore();
      ctx.restore();
    }

    if (this.calibration.showRegistrationHoles) {
      ctx.save();
      const holeRadius = 6;
      const holeMargin = 15;
      const positions = [
        { x: padding + holeMargin, y: padding + holeMargin },
        { x: this.plateWidth - padding - holeMargin, y: padding + holeMargin },
        { x: padding + holeMargin, y: this.plateHeight - padding - holeMargin },
        { x: this.plateWidth - padding - holeMargin, y: this.plateHeight - padding - holeMargin },
      ];

      ctx.fillStyle = this.calibration.holeColor;
      ctx.strokeStyle = this.calibration.holeColor;

      for (const pos of positions) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, holeRadius + 3, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = this.calibration.holeColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = this.calibration.holeColor;
        ctx.fill();
      }

      ctx.fillStyle = this.calibration.holeColor;
      ctx.font = '10px sans-serif';
      ctx.fillText(
        '定位孔 (Registration)',
        padding + holeMargin + 15,
        padding + holeMargin + 4
      );
      ctx.restore();
    }
  }

  private drawPlateBorder(ctx: CanvasRenderingContext2D) {
    const padding = DEFAULT_PLATE_PADDING;
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      padding,
      padding,
      this.plateWidth - padding * 2,
      this.plateHeight - padding * 2
    );
    ctx.setLineDash([]);

    ctx.fillStyle = '#c0392b';
    ctx.font = '11px sans-serif';
    ctx.fillText('铜版边界', padding + 4, padding - 6);
  }

  private drawHighlights(ctx: CanvasRenderingContext2D) {
    if (!this.highlights || this.highlights.length === 0) return;
    const layout = calculateLayout(this.document, this.plateWidth, this.plateHeight);

    for (const hl of this.highlights) {
      if (hl.pageIndex !== this.pageIndex && hl.pageIndex !== undefined) continue;
      if (hl.lineIndex < 0) continue;

      const lineY = getLineY(hl.lineIndex, layout);
      let color = hl.color;
      if (!color) {
        switch (hl.type) {
          case 'error':
            color = 'rgba(231, 76, 60, 0.25)';
            break;
          case 'warning':
            color = 'rgba(243, 156, 18, 0.25)';
            break;
          case 'selection':
            color = 'rgba(52, 152, 219, 0.35)';
            break;
          default:
            color = 'rgba(46, 204, 113, 0.25)';
        }
      }

      if (hl.cellIndex !== undefined && hl.cellIndex >= 0) {
        const cellX = getCellX(hl.cellIndex, layout, this.document.charSpacing);
        let borderColor = hl.type === 'error' ? '#e74c3c' : hl.type === 'warning' ? '#f39c12' : '#3498db';
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2.5;
        ctx.fillRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
        ctx.strokeRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
        ctx.restore();

        if (hl.dotRow !== undefined && hl.dotCol !== undefined) {
          const { x, y } = getDotCenter(
            hl.dotRow,
            hl.dotCol,
            cellX,
            lineY,
            this.document.dotRadius
          );
          ctx.save();
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 3;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, y, this.document.dotRadius * 1.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.fillStyle = color;
        ctx.fillRect(
          layout.padding,
          lineY,
          this.plateWidth - layout.padding * 2,
          layout.cellHeight
        );
        ctx.restore();
      }
    }
  }

  private drawIssueMarkers(ctx: CanvasRenderingContext2D) {
    if (!this.reviewIssues || this.reviewIssues.length === 0) return;
    const layout = calculateLayout(this.document, this.plateWidth, this.plateHeight);

    const pageIssues = this.reviewIssues.filter(issue => issue.pageIndex === this.pageIndex);

    for (const issue of pageIssues) {
      if (issue.lineIndex < 0 || issue.lineIndex >= this.document.lines.length) continue;

      const lineY = getLineY(issue.lineIndex, layout);
      const color = getSeverityColor(issue.severity);

      let cellX: number | null = null;
      if (issue.cellIndex !== undefined && issue.cellIndex >= 0) {
        const line = this.document.lines[issue.lineIndex];
        if (issue.cellIndex < line.cells.length) {
          cellX = getCellX(issue.cellIndex, layout, this.document.charSpacing);
        }
      }

      ctx.save();

      if (cellX !== null) {
        const markerSize = 16;
        const markerX = cellX + layout.cellWidth - markerSize / 2;
        const markerY = lineY - markerSize / 2;

        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(markerX, markerY, markerSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const issueIndex = this.reviewIssues.indexOf(issue) + 1;
        ctx.fillText(String(issueIndex), markerX, markerY);
      } else {
        const markerSize = 12;
        const markerX = layout.padding - markerSize - 4;
        const markerY = lineY + layout.cellHeight / 2;

        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(markerX - markerSize / 2, markerY - markerSize / 2);
        ctx.lineTo(markerX + markerSize / 2, markerY);
        ctx.lineTo(markerX - markerSize / 2, markerY + markerSize / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawDiffOverlay(ctx: CanvasRenderingContext2D) {
    if (!this.diffDocument) return;
    const layout = calculateLayout(this.document, this.plateWidth, this.plateHeight);
    const docA = this.diffDocument;
    const docB = this.document;

    const maxLines = Math.max(docA.lines.length, docB.lines.length);

    for (let li = 0; li < maxLines; li++) {
      const lineA = docA.lines[li];
      const lineB = docB.lines[li];
      const lineY = getLineY(li, layout);
      const maxCells = Math.max(lineA?.cells.length ?? 0, lineB?.cells.length ?? 0);

      for (let ci = 0; ci < maxCells; ci++) {
        const cellA = lineA?.cells[ci];
        const cellB = lineB?.cells[ci];

        const dotsA = cellA?.dots ?? [
          [false, false],
          [false, false],
          [false, false],
        ];
        const dotsB = cellB?.dots ?? [
          [false, false],
          [false, false],
          [false, false],
        ];

        const hasActiveA = !isAllEmptyDots(dotsA);
        const hasActiveB = !isAllEmptyDots(dotsB);
        const hasDiff = !dotsEqual(dotsA, dotsB);

        if (!hasDiff) continue;

        const cellX = getCellX(ci, layout, this.document.charSpacing);

        if (!hasActiveA && hasActiveB) {
          ctx.save();
          ctx.fillStyle = 'rgba(39, 174, 96, 0.2)';
          ctx.strokeStyle = '#27ae60';
          ctx.lineWidth = 2;
          ctx.fillRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.strokeRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.restore();
        } else if (hasActiveA && !hasActiveB) {
          ctx.save();
          ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
          ctx.strokeStyle = '#e74c3c';
          ctx.lineWidth = 2;
          ctx.fillRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.strokeRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 2;
          ctx.fillRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.strokeRect(cellX, lineY, layout.cellWidth, layout.cellHeight);
          ctx.restore();
        }

        if (hasDiff) {
          for (let dr = 0; dr < CELL_ROWS; dr++) {
            for (let dc = 0; dc < CELL_COLS; dc++) {
              const activeA = dotsA[dr]?.[dc] ?? false;
              const activeB = dotsB[dr]?.[dc] ?? false;

              if (activeA !== activeB) {
                const displayDc = this.isMirror ? CELL_COLS - 1 - dc : dc;
                const { x, y } = getDotCenter(
                  dr,
                  displayDc,
                  cellX,
                  lineY,
                  this.document.dotRadius
                );

                ctx.save();
                if (activeB) {
                  ctx.fillStyle = 'rgba(39, 174, 96, 0.6)';
                  ctx.strokeStyle = '#27ae60';
                } else {
                  ctx.fillStyle = 'rgba(231, 76, 60, 0.6)';
                  ctx.strokeStyle = '#e74c3c';
                }
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, this.document.dotRadius * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              }
            }
          }
        }
      }
    }
  }

  private drawCells(ctx: CanvasRenderingContext2D) {
    const layout = calculateLayout(
      this.document,
      this.plateWidth,
      this.plateHeight
    );
    const doc = this.document;

    for (let li = 0; li < doc.lines.length; li++) {
      const line = doc.lines[li];
      const lineY = getLineY(li, layout);

      for (let ci = 0; ci < line.cells.length; ci++) {
        const cell = line.cells[ci];
        const cellX = getCellX(ci, layout, doc.charSpacing);

        this.drawCellBorder(ctx, cellX, lineY, layout.cellWidth, layout.cellHeight, cell.isUnknown);
        this.drawCellDots(ctx, cellX, lineY, cell.dots, li, ci, cell.isUnknown);
      }
    }
  }

  private drawCellBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    isUnknown: boolean
  ) {
    ctx.strokeStyle = isUnknown ? 'rgba(231, 76, 60, 0.5)' : 'rgba(52, 152, 219, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash(isUnknown ? [3, 3] : []);
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.setLineDash([]);
  }

  private drawCellDots(
    ctx: CanvasRenderingContext2D,
    cellX: number,
    cellY: number,
    dots: boolean[][],
    lineIndex: number,
    cellIndex: number,
    isUnknown: boolean
  ) {
    const displayDots = this.isMirror ? mirrorDots(dots) : dots;

    for (let dr = 0; dr < CELL_ROWS; dr++) {
      for (let dc = 0; dc < CELL_COLS; dc++) {
        const originalDC = this.isMirror ? CELL_COLS - 1 - dc : dc;
        const { x, y } = getDotCenter(dr, dc, cellX, cellY, this.document.dotRadius);

        const isHovered =
          this.hoveredDot &&
          this.hoveredDot.lineIndex === lineIndex &&
          this.hoveredDot.cellIndex === cellIndex &&
          this.hoveredDot.dotRow === dr &&
          this.hoveredDot.dotCol === originalDC;

        const active = displayDots[dr][dc];

        if (active) {
          if (this.isMirror) {
            const gradient = ctx.createRadialGradient(
              x - 2, y - 2, 1,
              x, y, this.document.dotRadius
            );
            gradient.addColorStop(0, '#d4a574');
            gradient.addColorStop(0.5, '#b8860b');
            gradient.addColorStop(1, '#8b6914');
            ctx.fillStyle = isHovered ? '#e67e22' : gradient;
          } else {
            ctx.fillStyle = isHovered ? '#2980b9' : '#2c3e50';
          }

          ctx.beginPath();
          ctx.arc(x, y, this.document.dotRadius, 0, Math.PI * 2);
          ctx.fill();

          if (this.isMirror) {
            ctx.strokeStyle = '#6b4e0a';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        } else {
          ctx.strokeStyle = isHovered
            ? 'rgba(52, 152, 219, 0.8)'
            : isUnknown
            ? 'rgba(231, 76, 60, 0.4)'
            : 'rgba(44, 62, 80, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(x, y, this.document.dotRadius * 0.6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (isHovered && this.editable) {
          ctx.strokeStyle = '#f39c12';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, this.document.dotRadius * 1.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  }

  private getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasEl;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if (e instanceof TouchEvent) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.editable) return;
    const { x, y } = this.getCanvasCoords(e);
    const pos = hitTestDot(
      this.document,
      x,
      y,
      this.plateWidth,
      this.plateHeight,
      this.isMirror
    );
    this.hoveredDot = pos;

    if (this.isDragging && pos) {
      const event = new CustomEvent<{ position: DotPosition; value: boolean; pageIndex: number }>('dot-toggle', {
        detail: { position: pos, value: this.dragValue, pageIndex: this.pageIndex },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }

  private handleMouseLeave() {
    this.hoveredDot = null;
    this.isDragging = false;
  }

  private handleMouseDown(e: MouseEvent) {
    if (!this.editable) return;
    const { x, y } = this.getCanvasCoords(e);
    const pos = hitTestDot(
      this.document,
      x,
      y,
      this.plateWidth,
      this.plateHeight,
      this.isMirror
    );
    if (pos) {
      this.isDragging = true;
      const cell = this.document.lines[pos.lineIndex]?.cells[pos.cellIndex];
      if (cell) {
        this.dragValue = !cell.dots[pos.dotRow][pos.dotCol];
      }
      const event = new CustomEvent<{ position: DotPosition; value: boolean; pageIndex: number }>('dot-toggle', {
        detail: { position: pos, value: this.dragValue, pageIndex: this.pageIndex },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }

  private handleMouseUp() {
    this.isDragging = false;
  }

  override render() {
    return html`
      <div class="canvas-container">
        ${this.label ? html`<div class="view-label">${this.label}</div>` : ''}
        ${this.totalPages > 1
          ? html`<div class="page-label">第 ${this.pageIndex + 1} / ${this.totalPages} 页</div>`
          : ''}
        <canvas
          @mousemove=${this.handleMouseMove}
          @mouseleave=${this.handleMouseLeave}
          @mousedown=${this.handleMouseDown}
          @mouseup=${this.handleMouseUp}
        ></canvas>
      </div>
    `;
  }
}
