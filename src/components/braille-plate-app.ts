import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/range/range.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/card/card.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/themes/light.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
import './braille-canvas.js';
import {
  BrailleDocument,
  BrailleCell,
  ValidationError,
  DotPosition,
  DEFAULT_LINE_SPACING,
  DEFAULT_CHAR_SPACING,
  DEFAULT_DOT_RADIUS,
} from '../types/braille.js';
import {
  textToBraille,
  toggleDot,
  validateDocument,
  brailleToReverseText,
  calculateLayout,
  brailleDocumentToUnicode,
  getModifiedCells,
  dotsToUnicodeBraille,
} from '../utils/braille-converter.js';

setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/');

@customElement('braille-plate-app')
export class BraillePlateApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 0;
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
        'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    }

    .app-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 16px 28px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 22px;
      font-weight: 700;
      color: #2c3e50;
      margin: 0;
    }

    .header-title .icon-wrap {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 20px;
    }

    .header-sub {
      font-size: 13px;
      color: #7f8c8d;
      margin-top: 4px;
    }

    .app-body {
      display: grid;
      grid-template-columns: 360px 1fr;
      gap: 20px;
      padding: 20px;
      max-width: 1800px;
      margin: 0 auto;
    }

    @media (max-width: 1200px) {
      .app-body {
        grid-template-columns: 1fr;
      }
    }

    sl-card {
      --border-color: rgba(0, 0, 0, 0.08);
    }

    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: #34495e;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title::before {
      content: '';
      width: 4px;
      height: 18px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 2px;
    }

    .control-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }

    .control-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 500;
      color: #555;
    }

    .control-value {
      font-size: 12px;
      color: #667eea;
      font-weight: 600;
      background: rgba(102, 126, 234, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
    }

    sl-range::part(base) {
      --track-color-active: #667eea;
    }

    sl-input-number::part(base) {
      --border-color: #e0e0e0;
    }

    .button-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    sl-button::part(base) {
      font-size: 13px;
    }

    .error-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 200px;
      overflow-y: auto;
    }

    .error-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.5;
    }

    .error-item.severity-error {
      background: rgba(231, 76, 60, 0.1);
      border-left: 3px solid #e74c3c;
      color: #c0392b;
    }

    .error-item.severity-warning {
      background: rgba(243, 156, 18, 0.1);
      border-left: 3px solid #f39c12;
      color: #d68910;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .stat-item {
      padding: 10px 12px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
      border-radius: 8px;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
    }

    .stat-label {
      font-size: 11px;
      color: #888;
      margin-top: 2px;
    }

    .canvas-tabs {
      margin-bottom: 0;
    }

    .canvas-wrapper {
      background: #fff;
      border-radius: 10px;
      padding: 0;
      overflow: hidden;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }

    .canvas-wrap-inner {
      padding: 16px;
      overflow: auto;
      max-height: calc(100vh - 260px);
    }

    .tip-box {
      background: rgba(102, 126, 234, 0.06);
      border: 1px solid rgba(102, 126, 234, 0.2);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 12px;
      color: #555;
      line-height: 1.7;
    }

    .tip-box b {
      color: #667eea;
    }

    .plate-size-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .info-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(46, 204, 113, 0.1));
      border: 1px solid rgba(39, 174, 96, 0.25);
      border-radius: 8px;
      color: #1e8449;
      font-size: 13px;
      margin-bottom: 14px;
    }

    .info-banner.error {
      background: linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(231, 76, 60, 0.1));
      border-color: rgba(231, 76, 60, 0.25);
      color: #c0392b;
    }

    sl-tab::part(base) {
      font-size: 14px;
    }

    sl-tab-group {
      --indicator-color: #667eea;
    }

    sl-tab-panel {
      padding-top: 16px;
    }
  `;

  @property({ type: String })
  inputText: string = '你好，世界！Hello World 123 盲文铜版制版校验器';

  @state()
  brailleDoc: BrailleDocument = textToBraille('你好，世界！Hello World 123 盲文铜版制版校验器');

  @state()
  validationErrors: ValidationError[] = [];

  @state()
  plateWidth: number = 900;

  @state()
  plateHeight: number = 600;

  @state()
  activeTab: string = 'reading';

  @state()
  private _tempLineSpacing: number | null = null;

  @state()
  private _tempCharSpacing: number | null = null;

  override firstUpdated() {
    this.revalidate();
  }

  private revalidate() {
    this.validationErrors = validateDocument(
      this.brailleDoc,
      this.plateWidth,
      this.plateHeight
    );
  }

  private handleTextInput(e: Event) {
    const target = e.target as HTMLTextAreaElement | any;
    const value = target.value ?? '';
    this.inputText = value;
    this.brailleDoc = textToBraille(value);
    this.revalidate();
  }

  private handleLineSpacing(e: Event) {
    const target = e.target as any;
    const rawValue = Number(target.value);
    if (isNaN(rawValue)) return;
    this._tempLineSpacing = rawValue;
    if (rawValue <= 0) {
      this.brailleDoc = { ...this.brailleDoc, lineSpacing: rawValue };
      this.revalidate();
      setTimeout(() => {
        this.brailleDoc = { ...this.brailleDoc, lineSpacing: 1 };
        this.revalidate();
      }, 1500);
    } else {
      this._tempLineSpacing = null;
      this.brailleDoc = { ...this.brailleDoc, lineSpacing: rawValue };
      this.revalidate();
    }
  }

  private handleCharSpacing(e: Event) {
    const target = e.target as any;
    const rawValue = Number(target.value);
    if (isNaN(rawValue)) return;
    this._tempCharSpacing = rawValue;
    if (rawValue <= 0) {
      this.brailleDoc = { ...this.brailleDoc, charSpacing: rawValue };
      this.revalidate();
      setTimeout(() => {
        this.brailleDoc = { ...this.brailleDoc, charSpacing: 1 };
        this.revalidate();
      }, 1500);
    } else {
      this._tempCharSpacing = null;
      this.brailleDoc = { ...this.brailleDoc, charSpacing: rawValue };
      this.revalidate();
    }
  }

  private handleDotRadius(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value > 2 && value < 30) {
      this.brailleDoc = { ...this.brailleDoc, dotRadius: value };
      this.revalidate();
    }
  }

  private handlePlateWidth(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value >= 300) {
      this.plateWidth = value;
      this.revalidate();
    }
  }

  private handlePlateHeight(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value >= 200) {
      this.plateHeight = value;
      this.revalidate();
    }
  }

  private handleDotToggle(e: Event) {
    const customEvent = e as CustomEvent<{ position: DotPosition; value: boolean }>;
    const { position } = customEvent.detail;

    const cell = this.brailleDoc.lines[position.lineIndex]?.cells[position.cellIndex];
    if (!cell) return;

    const currentValue = cell.dots[position.dotRow][position.dotCol];
    if (currentValue !== customEvent.detail.value || true) {
      this.brailleDoc = toggleDot(this.brailleDoc, position);
      this.revalidate();
      this.requestUpdate();
    }
  }

  private handleReset() {
    this.brailleDoc = {
      ...this.brailleDoc,
      lineSpacing: DEFAULT_LINE_SPACING,
      charSpacing: DEFAULT_CHAR_SPACING,
      dotRadius: DEFAULT_DOT_RADIUS,
    };
    this.revalidate();
  }

  private handleClearAll() {
    this.inputText = '';
    this.brailleDoc = textToBraille('');
    this.revalidate();
  }

  private getBraillePreviewHtml(isReverse: boolean): string {
    const modifiedCells = getModifiedCells(this.brailleDoc, this.inputText);
    const linesHtml: string[] = [];

    for (let li = 0; li < this.brailleDoc.lines.length; li++) {
      const line = this.brailleDoc.lines[li];
      const cellsHtml: string[] = [];

      for (let ci = 0; ci < line.cells.length; ci++) {
        const cell = line.cells[ci];
        const key = `${li}-${ci}`;
        const isModified = modifiedCells.has(key);
        const isUnknown = cell.isUnknown;
        const brailleChar = isReverse
          ? dotsToUnicodeBraille(cell.dots.map(r => [...r].reverse()))
          : dotsToUnicodeBraille(cell.dots);

        let style = '';
        let title = '';
        if (isModified) {
          style = 'background: rgba(231, 76, 60, 0.18); border: 1px solid #e74c3c; border-radius: 4px; padding: 0 2px; margin: 0 1px;';
          title = `第${li + 1}行第${ci + 1}格 - 已手动修改`;
        } else if (isUnknown) {
          style = 'background: rgba(243, 156, 18, 0.18); border: 1px dashed #f39c12; border-radius: 4px; padding: 0 2px; margin: 0 1px;';
          title = `第${li + 1}行第${ci + 1}格 - 未识别字符: "${cell.sourceChar}"`;
        } else {
          style = 'padding: 0 2px; margin: 0 1px;';
          if (cell.sourceChar) {
            title = `第${li + 1}行第${ci + 1}格 - 原字符: "${cell.sourceChar}"`;
          }
        }

        cellsHtml.push(`<span style="${style}" title="${title}">${brailleChar}</span>`);
      }

      const lineStyle = isReverse
        ? 'direction: rtl; unicode-bidi: bidi-override; text-align: right;'
        : '';
      linesHtml.push(`<div style="${lineStyle}">${cellsHtml.join('')}</div>`);
    }

    return linesHtml.join('');
  }

  private getStats() {
    let totalCells = 0;
    let activeDots = 0;
    let unknownCells = 0;
    for (const line of this.brailleDoc.lines) {
      for (const cell of line.cells) {
        totalCells++;
        if (cell.isUnknown) unknownCells++;
        for (const row of cell.dots) {
          for (const dot of row) {
            if (dot) activeDots++;
          }
        }
      }
    }
    return {
      lines: this.brailleDoc.lines.length,
      cells: totalCells,
      dots: activeDots,
      unknown: unknownCells,
    };
  }

  private getErrorCountBySeverity() {
    return {
      errors: this.validationErrors.filter((e) => e.severity === 'error').length,
      warnings: this.validationErrors.filter((e) => e.severity === 'warning').length,
    };
  }

  private getReversePreview(): string {
    return brailleToReverseText(this.brailleDoc);
  }

  override render() {
    const stats = this.getStats();
    const errorCount = this.getErrorCountBySeverity();
    const layout = calculateLayout(this.brailleDoc, this.plateWidth, this.plateHeight);

    return html`
      <div class="app-header">
        <h1 class="header-title">
          <span class="icon-wrap">
            <sl-icon name="braille"></sl-icon>
          </span>
          盲文铜版制版校验器
        </h1>
        <div class="header-sub">
          用于盲文印刷人员设计铜版点位并检查压印后的阅读方向和排版错误
        </div>
      </div>

      <div class="app-body">
        <div class="left-panel">
          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">文字输入</div>
            </div>

            <sl-textarea
              .value=${this.inputText}
              @sl-input=${this.handleTextInput}
              placeholder="请输入中文、英文、数字或标点符号..."
              rows="5"
              resize="vertical"
              help-text="支持中文（拼音盲文编码）、英文字母、数字和常用标点符号"
            ></sl-textarea>

            <div style="margin-top: 12px;" class="tip-box">
              💡 <b>使用提示：</b>点击视图中的<b>点位</b>可以手动切换状态（激活/取消）。
              支持鼠标拖拽连续修改多个点位。制版视图为<b>左右镜像</b>，压印后与阅读视图一致。
            </div>
          </sl-card>

          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">排版参数</div>
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>行距 (Line Spacing)</span>
                <span class="control-value">${this.brailleDoc.lineSpacing}px</span>
              </div>
              <sl-range
                min="-20"
                max="100"
                step="1"
                .value=${this.brailleDoc.lineSpacing}
                @sl-change=${this.handleLineSpacing}
                @sl-input=${this.handleLineSpacing}
              ></sl-range>
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>字距 (Char Spacing)</span>
                <span class="control-value">${this.brailleDoc.charSpacing}px</span>
              </div>
              <sl-range
                min="-20"
                max="80"
                step="1"
                .value=${this.brailleDoc.charSpacing}
                @sl-change=${this.handleCharSpacing}
                @sl-input=${this.handleCharSpacing}
              ></sl-range>
            </div>

            <div class="control-row">
              <div class="control-label">
                <span>点位半径 (Dot Radius)</span>
                <span class="control-value">${this.brailleDoc.dotRadius}px</span>
              </div>
              <sl-range
                min="4"
                max="20"
                step="0.5"
                .value=${this.brailleDoc.dotRadius}
                @sl-change=${this.handleDotRadius}
                @sl-input=${this.handleDotRadius}
              ></sl-range>
            </div>

            <sl-divider style="margin: 14px 0;"></sl-divider>

            <div class="card-title" style="margin-bottom: 12px;">铜版尺寸</div>

            <div class="plate-size-row">
              <sl-input
                label="宽度 (px)"
                type="number"
                min="300"
                max="3000"
                step="50"
                .value=${String(this.plateWidth)}
                @sl-change=${this.handlePlateWidth}
                @sl-input=${this.handlePlateWidth}
              ></sl-input>
              <sl-input
                label="高度 (px)"
                type="number"
                min="200"
                max="3000"
                step="50"
                .value=${String(this.plateHeight)}
                @sl-change=${this.handlePlateHeight}
                @sl-input=${this.handlePlateHeight}
              ></sl-input>
            </div>

            <sl-divider style="margin: 14px 0;"></sl-divider>

            <div class="button-group">
              <sl-button variant="primary" @click=${this.handleReset}>
                <sl-icon slot="prefix" name="arrow-counterclockwise"></sl-icon>
                重置参数
              </sl-button>
              <sl-button variant="default" @click=${this.handleClearAll}>
                <sl-icon slot="prefix" name="trash"></sl-icon>
                清空内容
              </sl-button>
            </div>
          </sl-card>

          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">统计信息</div>
            </div>
            <div class="stat-grid">
              <div class="stat-item">
                <div class="stat-value">${stats.lines}</div>
                <div class="stat-label">总行数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.cells}</div>
                <div class="stat-label">总单元</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${stats.dots}</div>
                <div class="stat-label">活跃点位</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" style="${stats.unknown > 0 ? 'color: #e74c3c;' : ''}">${stats.unknown}</div>
                <div class="stat-label">未知字符</div>
              </div>
            </div>

            <div style="margin-top: 12px; font-size: 12px; color: #777;">
              <div>内容宽度: <b>${layout.totalWidth.toFixed(0)}px</b> / 铜版宽度: <b>${this.plateWidth}px</b></div>
              <div style="margin-top: 4px;">内容高度: <b>${layout.totalHeight.toFixed(0)}px</b> / 铜版高度: <b>${this.plateHeight}px</b></div>
            </div>
          </sl-card>

          <sl-card>
            <div slot="header">
              <div class="card-title">
                校验结果
                <span style="margin-left: auto;">
                  ${errorCount.errors > 0
                    ? html`<sl-badge variant="danger" pill>${errorCount.errors} 错误</sl-badge>`
                    : ''}
                  ${errorCount.warnings > 0
                    ? html`<sl-badge variant="warning" pill style="margin-left: 4px;">${errorCount.warnings} 警告</sl-badge>`
                    : ''}
                  ${errorCount.errors === 0 && errorCount.warnings === 0
                    ? html`<sl-badge variant="success" pill>通过</sl-badge>`
                    : ''}
                </span>
              </div>
            </div>

            ${errorCount.errors === 0 && errorCount.warnings === 0
              ? html`
                  <div class="info-banner">
                    <sl-icon name="check-circle-fill" style="font-size: 18px;"></sl-icon>
                    <div>
                      <b>校验通过！</b><br/>
                      排版参数正确，所有点位在铜版边界内，未发现无法识别的字符。
                    </div>
                  </div>
                `
              : html`
                  <div class="error-list">
                    ${this.validationErrors.map(
                      (err) => html`
                        <div class="error-item severity-${err.severity}">
                          <sl-icon
                            name=${err.severity === 'error' ? 'exclamation-octagon-fill' : 'exclamation-triangle-fill'}
                            style="font-size: 16px; flex-shrink: 0; margin-top: 1px;"
                          ></sl-icon>
                          <span>${err.message}</span>
                        </div>
                      `
                    )}
                  </div>
                `}
          </sl-card>
        </div>

        <div class="right-panel">
          <div class="canvas-wrapper">
            <sl-tab-group class="canvas-tabs" @sl-tab-show=${(e: any) => { this.activeTab = e.detail.name; }}>
              <sl-tab slot="nav" panel="reading" .active=${this.activeTab === 'reading'}>
                <sl-icon name="eye" style="margin-right: 6px;"></sl-icon>
                阅读视图（正面）
              </sl-tab>
              <sl-tab slot="nav" panel="plate">
                <sl-icon name="grid-3x3-gap" style="margin-right: 6px;"></sl-icon>
                制版视图（反向镜像）
              </sl-tab>
              <sl-tab slot="nav" panel="compare">
                <sl-icon name="layout-split" style="margin-right: 6px;"></sl-icon>
                对比视图
              </sl-tab>

              <sl-tab-panel name="reading">
                <div class="canvas-wrap-inner">
                  <braille-canvas
                    .document=${this.brailleDoc}
                    .plateWidth=${this.plateWidth}
                    .plateHeight=${this.plateHeight}
                    ?isMirror=${false}
                    ?editable=${true}
                    label="📖 阅读视图 - 正面（实际阅读方向）"
                    @dot-toggle=${this.handleDotToggle}
                  ></braille-canvas>
                </div>
              </sl-tab-panel>

              <sl-tab-panel name="plate">
                <div class="canvas-wrap-inner">
                  <braille-canvas
                    .document=${this.brailleDoc}
                    .plateWidth=${this.plateWidth}
                    .plateHeight=${this.plateHeight}
                    ?isMirror=${true}
                    ?editable=${true}
                    label="🔨 制版视图 - 左右镜像（铜版实际雕刻方向）"
                    @dot-toggle=${this.handleDotToggle}
                  ></braille-canvas>
                </div>
              </sl-tab-panel>

              <sl-tab-panel name="compare">
                <div class="canvas-wrap-inner" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div>
                    <div style="font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                      📖 正面阅读视图
                    </div>
                    <braille-canvas
                      style="transform: scale(0.9); transform-origin: top left;"
                      .document=${this.brailleDoc}
                      .plateWidth=${Math.floor(this.plateWidth * 0.9)}
                      .plateHeight=${Math.floor(this.plateHeight * 0.9)}
                      ?isMirror=${false}
                      ?editable=${true}
                      label="阅读"
                      @dot-toggle=${this.handleDotToggle}
                    ></braille-canvas>
                  </div>
                  <div>
                    <div style="font-size: 13px; font-weight: 600; color: #2c3e50; margin-bottom: 8px;">
                      🔨 反向制版视图
                    </div>
                    <braille-canvas
                      style="transform: scale(0.9); transform-origin: top left;"
                      .document=${this.brailleDoc}
                      .plateWidth=${Math.floor(this.plateWidth * 0.9)}
                      .plateHeight=${Math.floor(this.plateHeight * 0.9)}
                      ?isMirror=${true}
                      ?editable=${true}
                      label="制版"
                      @dot-toggle=${this.handleDotToggle}
                    ></braille-canvas>
                  </div>
                </div>

                <div style="padding: 16px; border-top: 1px solid #eee;">
                  <div class="card-title" style="margin-bottom: 10px;">
                    🔄 模拟压印预览（铜版翻转后在纸上的效果）
                  </div>
                  <div style="margin-bottom: 10px; font-size: 12px; color: #666;">
                    <span style="display: inline-flex; align-items: center; gap: 4px; margin-right: 16px;">
                      <span style="display:inline-block;width:14px;height:14px;background:rgba(231,76,60,0.18);border:1px solid #e74c3c;border-radius:3px;"></span>
                      已手动修改
                    </span>
                    <span style="display: inline-flex; align-items: center; gap: 4px;">
                      <span style="display:inline-block;width:14px;height:14px;background:rgba(243,156,18,0.18);border:1px dashed #f39c12;border-radius:3px;"></span>
                      未识别字符
                    </span>
                  </div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div style="padding: 14px; background: #fef9e7; border-radius: 8px; border: 2px dashed #d4ac0d;">
                      <div style="font-size: 12px; color: #b7950b; font-weight: 600; margin-bottom: 6px;">
                        铜版（制版侧 · 左右镜像）
                      </div>
                      <div style="font-family: monospace; white-space: pre-wrap; word-break: break-all; font-size: 24px; color: #7d6608; line-height: 1.8; letter-spacing: 2px;">
                        ${unsafeHTML(this.getBraillePreviewHtml(true))}
                      </div>
                    </div>
                    <div style="padding: 14px; background: #eafaf1; border-radius: 8px; border: 2px dashed #27ae60;">
                      <div style="font-size: 12px; color: #1e8449; font-weight: 600; margin-bottom: 6px;">
                        纸张（压印后 · 正面阅读）
                      </div>
                      <div style="font-family: monospace; white-space: pre-wrap; word-break: break-all; font-size: 24px; color: #145a32; line-height: 1.8; letter-spacing: 2px;">
                        ${unsafeHTML(this.getBraillePreviewHtml(false))}
                      </div>
                    </div>
                  </div>
                </div>
              </sl-tab-panel>
            </sl-tab-group>
          </div>
        </div>
      </div>
    `;
  }
}
