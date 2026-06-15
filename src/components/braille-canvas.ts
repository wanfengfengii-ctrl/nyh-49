import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  BrailleDocument,
  DotPosition,
  CELL_COLS,
  CELL_ROWS,
  DEFAULT_PLATE_PADDING,
} from '../types/braille.js';
import {
  calculateLayout,
  getLineY,
  getCellX,
  getDotCenter,
  mirrorDots,
  hitTestDot,
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
      changedProperties.has('hoveredDot')
    ) {
      this.renderCanvas();
    }
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
    this.drawPlateBorder(ctx);
    this.drawCells(ctx);
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
      const event = new CustomEvent<{ position: DotPosition; value: boolean }>('dot-toggle', {
        detail: { position: pos, value: this.dragValue },
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
      const event = new CustomEvent<{ position: DotPosition; value: boolean }>('dot-toggle', {
        detail: { position: pos, value: this.dragValue },
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
