import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state, query, queryAll } from 'lit/decorators.js';
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
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/avatar/avatar.js';
import '@shoelace-style/shoelace/dist/components/tag/tag.js';
import '@shoelace-style/shoelace/dist/components/radio-group/radio-group.js';
import '@shoelace-style/shoelace/dist/components/radio/radio.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
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
  PaginatedDocument,
  CalibrationConfig,
  DEFAULT_CALIBRATION,
  HistoryManagerState,
  HistoryEntry,
  HighlightInfo,
  ReviewState,
  ReviewIssue,
  ReviewIssueStatus,
  ReviewIssueSeverity,
  ReviewComment,
  Reviewer,
  ReviewSignature,
  VersionDiff,
  createInitialReviewState,
  ReviewStatus,
} from '../types/braille.js';
import {
  textToBraille,
  toggleDot,
  validateDocument,
  validatePaginatedDocument,
  validateMirrorConsistency,
  validateThreeViewConsistency,
  findManualModifications,
  brailleToReverseText,
  calculateLayout,
  brailleDocumentToUnicode,
  getModifiedCells,
  dotsToUnicodeBraille,
  paginateDocument,
  createHistoryManager,
  pushHistoryEntry,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
  cloneDocument,
  getHistoryDescriptions,
  createReviewIssue,
  addReviewComment,
  updateIssueStatus,
  assignIssue,
  filterIssues,
  getIssueCounts,
  createVersionDiff,
  createReviewSignature,
  updateReviewStatus,
  addIssueToState,
  updateIssueInState,
  addSignatureToState,
  addVersionToState,
  getSeverityColor,
  getSeverityLabel,
  getStatusLabel,
  getReviewStatusLabel,
} from '../utils/braille-converter.js';
import type { BrailleCanvas } from './braille-canvas.js';

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

    .header-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .header-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }

    .app-body {
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 20px;
      padding: 20px;
      max-width: 2000px;
      margin: 0 auto;
    }

    @media (max-width: 1400px) {
      .app-body {
        grid-template-columns: 360px 1fr;
      }
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
      max-height: 220px;
      overflow-y: auto;
    }

    .error-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 12px;
      line-height: 1.5;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .error-item:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .error-item.severity-error {
      background: rgba(231, 76, 60, 0.1);
      border-left: 3px solid #e74c3c;
      color: #c0392b;
    }

    .error-item.severity-error:hover {
      background: rgba(231, 76, 60, 0.18);
    }

    .error-item.severity-warning {
      background: rgba(243, 156, 18, 0.1);
      border-left: 3px solid #f39c12;
      color: #d68910;
    }

    .error-item.severity-warning:hover {
      background: rgba(243, 156, 18, 0.18);
    }

    .error-item-action {
      margin-left: auto;
      opacity: 0.6;
      font-size: 11px;
      color: inherit;
      flex-shrink: 0;
    }

    .error-item:hover .error-item-action {
      opacity: 1;
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .stat-grid-3 {
      grid-template-columns: repeat(3, 1fr);
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

    .page-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 16px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05));
      border-bottom: 1px solid #eee;
    }

    .page-nav sl-button::part(base) {
      height: 32px;
    }

    .page-info {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      padding: 0 12px;
      min-width: 100px;
      text-align: center;
    }

    .page-range {
      font-size: 11px;
      color: #888;
      background: rgba(255, 255, 255, 0.8);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .calibration-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 8px;
    }

    .calibration-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
    }

    .calibration-label {
      font-size: 13px;
      color: #555;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .color-preview {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      flex-shrink: 0;
    }

    .history-panel {
      max-height: 160px;
      overflow-y: auto;
      background: #f8f9fa;
      border-radius: 6px;
      padding: 8px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 11px;
      line-height: 1.6;
      color: #555;
    }

    .history-empty {
      text-align: center;
      color: #aaa;
      padding: 20px;
      font-size: 12px;
    }

    .consistency-check {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }

    .consistency-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: #f8f9fa;
    }

    .consistency-item.pass {
      background: rgba(39, 174, 96, 0.1);
      color: #1e8449;
    }

    .consistency-item.fail {
      background: rgba(231, 76, 60, 0.1);
      color: #c0392b;
    }

    .consistency-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .compare-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }

    @media (max-width: 1400px) {
      .compare-3col {
        grid-template-columns: 1fr;
      }
    }

    .compare-card {
      background: #fff;
      border-radius: 8px;
      border: 1px solid #eee;
      overflow: hidden;
    }

    .compare-card-header {
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .compare-card.reading .compare-card-header {
      background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(41, 128, 185, 0.1));
      color: #2471a3;
    }

    .compare-card.plate .compare-card-header {
      background: linear-gradient(135deg, rgba(184, 134, 11, 0.1), rgba(139, 105, 20, 0.1));
      color: #7d6608;
    }

    .compare-card.imprint .compare-card-header {
      background: linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(30, 132, 73, 0.1));
      color: #196f3d;
    }

    .toolbar-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .undo-redo-group {
      display: flex;
      gap: 4px;
    }

    .review-sidebar {
      position: fixed;
      right: 0;
      top: 0;
      height: 100vh;
      width: 380px;
      background: #fff;
      box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
      z-index: 100;
      display: flex;
      flex-direction: column;
      transition: transform 0.3s ease;
    }

    .review-sidebar.collapsed {
      transform: translateX(100%);
    }

    .review-sidebar-toggle {
      position: fixed;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      z-index: 99;
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 6px;
      border-radius: 8px 0 0 8px;
      cursor: pointer;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
      transition: right 0.3s ease;
    }

    .review-sidebar.collapsed + .review-sidebar-toggle {
      right: 0;
    }

    .review-sidebar:not(.collapsed) + .review-sidebar-toggle {
      right: 380px;
    }

    .review-header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .review-header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      flex: 1;
    }

    .review-header .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .review-tabs {
      border-bottom: 1px solid #eee;
      background: #f8f9fa;
    }

    .review-tabs sl-tab-group::part(base) {
      --indicator-color: #667eea;
    }

    .review-tabs sl-tab::part(base) {
      font-size: 13px;
      padding: 0 16px;
    }

    .review-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .review-filter-row {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }

    .review-filter-row sl-select::part(control) {
      font-size: 12px;
      height: 32px;
    }

    .issue-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .issue-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }

    .issue-card:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transform: translateX(-2px);
    }

    .issue-card::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
    }

    .issue-card.severity-critical::before {
      background: #e74c3c;
    }

    .issue-card.severity-major::before {
      background: #e67e22;
    }

    .issue-card.severity-minor::before {
      background: #f39c12;
    }

    .issue-card.severity-suggestion::before {
      background: #3498db;
    }

    .issue-card-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }

    .issue-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #667eea;
      color: white;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .issue-title {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      flex: 1;
      line-height: 1.4;
    }

    .issue-status-badge {
      flex-shrink: 0;
    }

    .issue-meta {
      display: flex;
      gap: 10px;
      font-size: 11px;
      color: #888;
      flex-wrap: wrap;
    }

    .issue-meta-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }

    .issue-empty {
      text-align: center;
      padding: 40px 20px;
      color: #aaa;
      font-size: 13px;
    }

    .issue-empty sl-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.3;
    }

    .timeline {
      position: relative;
      padding-left: 24px;
    }

    .timeline::before {
      content: '';
      position: absolute;
      left: 8px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e8e8e8;
    }

    .timeline-item {
      position: relative;
      padding-bottom: 16px;
    }

    .timeline-item::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #667eea;
      border: 2px solid white;
      box-shadow: 0 0 0 2px #667eea;
    }

    .timeline-item.action-comment::before {
      background: #3498db;
      box-shadow: 0 0 0 2px #3498db;
    }

    .timeline-item.action-status::before {
      background: #27ae60;
      box-shadow: 0 0 0 2px #27ae60;
    }

    .timeline-item.action-assign::before {
      background: #f39c12;
      box-shadow: 0 0 0 2px #f39c12;
    }

    .timeline-content {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
    }

    .timeline-author {
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .timeline-time {
      font-size: 11px;
      color: #999;
      margin-left: 8px;
      font-weight: normal;
    }

    .timeline-text {
      color: #555;
      line-height: 1.5;
    }

    .version-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .version-item {
      background: #f8f9fa;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .version-item:hover {
      background: #eef2ff;
    }

    .version-item.selected {
      background: rgba(102, 126, 234, 0.1);
      border: 1px solid #667eea;
    }

    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .version-desc {
      font-weight: 600;
      color: #2c3e50;
    }

    .version-time {
      font-size: 11px;
      color: #888;
    }

    .version-author {
      font-size: 11px;
      color: #667eea;
    }

    .version-changes {
      font-size: 11px;
      color: #888;
      margin-top: 4px;
    }

    .signature-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .signature-item {
      background: linear-gradient(135deg, rgba(39, 174, 96, 0.05), rgba(46, 204, 113, 0.05));
      border: 1px solid rgba(39, 174, 96, 0.2);
      border-radius: 8px;
      padding: 12px;
    }

    .signature-item.rejected {
      background: linear-gradient(135deg, rgba(231, 76, 60, 0.05), rgba(192, 57, 43, 0.05));
      border-color: rgba(231, 76, 60, 0.2);
    }

    .signature-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }

    .signature-name {
      font-weight: 600;
      color: #2c3e50;
      font-size: 13px;
    }

    .signature-role {
      font-size: 11px;
      color: #888;
    }

    .signature-time {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .signature-comment {
      font-size: 12px;
      color: #555;
      background: rgba(255, 255, 255, 0.5);
      padding: 8px;
      border-radius: 4px;
      margin-top: 8px;
    }

    .review-summary {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .review-summary-title {
      font-size: 13px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .review-summary-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .review-summary-stat {
      background: white;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }

    .review-summary-stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #667eea;
    }

    .review-summary-stat-label {
      font-size: 11px;
      color: #888;
      margin-top: 2px;
    }

    .review-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .review-actions sl-button {
      flex: 1;
    }

    .issue-detail-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .issue-detail-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 16px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .issue-detail-title {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      line-height: 1.4;
      flex: 1;
    }

    .issue-detail-meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .issue-detail-meta-item {
      font-size: 12px;
    }

    .issue-detail-meta-label {
      color: #888;
      margin-bottom: 2px;
    }

    .issue-detail-meta-value {
      color: #2c3e50;
      font-weight: 500;
    }

    .issue-detail-description {
      font-size: 13px;
      color: #555;
      line-height: 1.6;
      padding: 12px;
      background: #fff;
      border: 1px solid #eee;
      border-radius: 6px;
      margin-bottom: 16px;
    }

    .issue-detail-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .comment-input-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .comment-input-row sl-textarea {
      flex: 1;
    }

    .issue-actions-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #eee;
    }

    .compare-versions-select {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .compare-versions-select sl-select {
      width: 100%;
    }

    .compare-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      max-height: 400px;
      overflow: auto;
    }

    .compare-side {
      border: 1px solid #eee;
      border-radius: 8px;
      overflow: hidden;
    }

    .compare-side-header {
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #2c3e50;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
    }

    .compare-side-body {
      padding: 12px;
      font-family: monospace;
      font-size: 14px;
      line-height: 1.8;
    }

    .diff-cell {
      display: inline-block;
      padding: 0 2px;
      margin: 0 1px;
      border-radius: 3px;
    }

    .diff-cell.added {
      background: rgba(39, 174, 96, 0.2);
      border: 1px solid #27ae60;
    }

    .diff-cell.removed {
      background: rgba(231, 76, 60, 0.2);
      border: 1px solid #e74c3c;
      text-decoration: line-through;
    }

    .app-body.with-review-sidebar {
      padding-right: 400px;
    }

    @media (max-width: 1400px) {
      .app-body.with-review-sidebar {
        padding-right: 380px;
      }
    }

    @media (max-width: 1200px) {
      .app-body.with-review-sidebar {
        padding-right: 0;
      }
    }
  `;

  @property({ type: String })
  inputText: string = '你好，世界！Hello World 123 盲文铜版制版校验器\n这是第二行文本用于测试自动分页功能\n当内容过多超出单页边界时会自动拆分到下一页\n支持多页铜版排版和页码切换预览\n\n测试更多内容来触发分页效果：\n第一页的内容在这里...\n第二行继续...\n第三行...\n第四行...\n第五行...\n第六行...\n第七行...\n第八行...\n第九行...\n第十行...';

  @state()
  brailleDoc: BrailleDocument = textToBraille(
    '你好，世界！Hello World 123 盲文铜版制版校验器\n这是第二行文本用于测试自动分页功能\n当内容过多超出单页边界时会自动拆分到下一页\n支持多页铜版排版和页码切换预览\n\n测试更多内容来触发分页效果：\n第一页的内容在这里...\n第二行继续...\n第三行...\n第四行...\n第五行...\n第六行...\n第七行...\n第八行...\n第九行...\n第十行...'
  );

  @state()
  paginatedDoc: PaginatedDocument = { pages: [], pageLineRanges: [], overflow: false };

  @state()
  currentPageIndex: number = 0;

  @state()
  validationErrors: ValidationError[] = [];

  @state()
  plateWidth: number = 900;

  @state()
  plateHeight: number = 600;

  @state()
  activeTab: string = 'reading';

  @state()
  calibration: CalibrationConfig = { ...DEFAULT_CALIBRATION };

  @state()
  history: HistoryManagerState = createHistoryManager();

  @state()
  highlights: HighlightInfo[] = [];

  @state()
  reviewState: ReviewState = createInitialReviewState();

  @state()
  showAddIssueDialog: boolean = false;

  @state()
  showIssueDetailDialog: boolean = false;

  @state()
  showVersionCompareDialog: boolean = false;

  @state()
  showSignatureDialog: boolean = false;

  @state()
  selectedIssue: ReviewIssue | null = null;

  @state()
  newIssueTitle: string = '';

  @state()
  newIssueDescription: string = '';

  @state()
  newIssueSeverity: ReviewIssueSeverity = 'major';

  @state()
  newIssueAssignee: string = '';

  @state()
  newComment: string = '';

  @state()
  signatureComment: string = '';

  @state()
  compareVersionA: VersionDiff | null = null;

  @state()
  compareVersionB: VersionDiff | null = null;

  @state()
  reviewTab: string = 'issues';

  @state()
  reviewSidebarOpen: boolean = true;

  @state()
  isSelectingIssuePosition: boolean = false;

  @state()
  newIssueLineIndex: number = 0;

  @state()
  newIssueCellIndex: number | undefined = undefined;

  @state()
  newIssueDotRow: number | undefined = undefined;

  @state()
  newIssueDotCol: number | undefined = undefined;

  @state()
  private _lastVersionTimestamp: number = 0;

  @state()
  private _tempLineSpacing: number | null = null;

  @state()
  private _tempCharSpacing: number | null = null;

  @queryAll('braille-canvas')
  canvasElements!: NodeListOf<BrailleCanvas>;

  override firstUpdated() {
    this.repaginate();
    this.revalidate();
    this.initSampleReviewData();
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleKeydown(e: KeyboardEvent) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      this.handleUndo();
    } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      this.handleRedo();
    }
  }

  private repaginate() {
    this.paginatedDoc = paginateDocument(
      this.brailleDoc,
      this.plateWidth,
      this.plateHeight
    );
    if (this.currentPageIndex >= this.paginatedDoc.pages.length) {
      this.currentPageIndex = Math.max(0, this.paginatedDoc.pages.length - 1);
    }
  }

  private revalidate() {
    this.repaginate();
    const pageErrors = validatePaginatedDocument(
      this.paginatedDoc,
      this.plateWidth,
      this.plateHeight
    );
    const mirrorErrors = validateMirrorConsistency(this.brailleDoc);
    this.validationErrors = [...pageErrors, ...mirrorErrors];
  }

  private pushHistory(
    action: HistoryEntry['action'],
    description: string,
    before: BrailleDocument,
    after: BrailleDocument,
    metadata?: Record<string, any>,
    plateSize?: {
      widthBefore?: number;
      widthAfter?: number;
      heightBefore?: number;
      heightAfter?: number;
    }
  ) {
    this.history = pushHistoryEntry(this.history, {
      action,
      description,
      documentBefore: before,
      documentAfter: after,
      plateWidthBefore: plateSize?.widthBefore,
      plateWidthAfter: plateSize?.widthAfter,
      plateHeightBefore: plateSize?.heightBefore,
      plateHeightAfter: plateSize?.heightAfter,
      metadata,
    });
  }

  private handleTextInput(e: Event) {
    const target = e.target as HTMLTextAreaElement | any;
    const value = target.value ?? '';
    const before = cloneDocument(this.brailleDoc);
    this.inputText = value;
    this.brailleDoc = textToBraille(value);
    this.pushHistory(
      'input_text',
      `修改输入文本 (${value.length} 字符)`,
      before,
      cloneDocument(this.brailleDoc)
    );
    this.clearHighlights();
    this.revalidate();
  }

  private handleLineSpacing(e: Event) {
    const target = e.target as any;
    const rawValue = Number(target.value);
    if (isNaN(rawValue)) return;
    this._tempLineSpacing = rawValue;
    const before = cloneDocument(this.brailleDoc);
    if (rawValue <= 0) {
      this.brailleDoc = { ...this.brailleDoc, lineSpacing: rawValue };
      this.revalidate();
      setTimeout(() => {
        const before2 = cloneDocument(this.brailleDoc);
        this.brailleDoc = { ...this.brailleDoc, lineSpacing: 1 };
        this.pushHistory(
          'change_spacing',
          `行距恢复为 1px`,
          before2,
          cloneDocument(this.brailleDoc)
        );
        this.revalidate();
      }, 1500);
    } else {
      this._tempLineSpacing = null;
      this.brailleDoc = { ...this.brailleDoc, lineSpacing: rawValue };
      this.pushHistory(
        'change_spacing',
        `调整行距为 ${rawValue}px`,
        before,
        cloneDocument(this.brailleDoc)
      );
      this.revalidate();
    }
  }

  private handleCharSpacing(e: Event) {
    const target = e.target as any;
    const rawValue = Number(target.value);
    if (isNaN(rawValue)) return;
    this._tempCharSpacing = rawValue;
    const before = cloneDocument(this.brailleDoc);
    if (rawValue <= 0) {
      this.brailleDoc = { ...this.brailleDoc, charSpacing: rawValue };
      this.revalidate();
      setTimeout(() => {
        const before2 = cloneDocument(this.brailleDoc);
        this.brailleDoc = { ...this.brailleDoc, charSpacing: 1 };
        this.pushHistory(
          'change_spacing',
          `字距恢复为 1px`,
          before2,
          cloneDocument(this.brailleDoc)
        );
        this.revalidate();
      }, 1500);
    } else {
      this._tempCharSpacing = null;
      this.brailleDoc = { ...this.brailleDoc, charSpacing: rawValue };
      this.pushHistory(
        'change_spacing',
        `调整字距为 ${rawValue}px`,
        before,
        cloneDocument(this.brailleDoc)
      );
      this.revalidate();
    }
  }

  private handleDotRadius(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value > 2 && value < 30) {
      const before = cloneDocument(this.brailleDoc);
      this.brailleDoc = { ...this.brailleDoc, dotRadius: value };
      this.pushHistory(
        'change_radius',
        `调整点位半径为 ${value}px`,
        before,
        cloneDocument(this.brailleDoc)
      );
      this.revalidate();
    }
  }

  private handlePlateWidth(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value >= 300) {
      const before = cloneDocument(this.brailleDoc);
      const oldWidth = this.plateWidth;
      this.plateWidth = value;
      this.pushHistory(
        'change_plate_size',
        `调整铜版宽度 ${oldWidth}px → ${value}px`,
        before,
        cloneDocument(this.brailleDoc),
        { oldWidth, newWidth: value },
        { widthBefore: oldWidth, widthAfter: value }
      );
      this.revalidate();
    }
  }

  private handlePlateHeight(e: Event) {
    const target = e.target as any;
    const value = Number(target.value);
    if (!isNaN(value) && value >= 200) {
      const before = cloneDocument(this.brailleDoc);
      const oldHeight = this.plateHeight;
      this.plateHeight = value;
      this.pushHistory(
        'change_plate_size',
        `调整铜版高度 ${oldHeight}px → ${value}px`,
        before,
        cloneDocument(this.brailleDoc),
        { oldHeight, newHeight: value },
        { heightBefore: oldHeight, heightAfter: value }
      );
      this.revalidate();
    }
  }

  private handleDotToggle(e: Event) {
    const customEvent = e as CustomEvent<{ position: DotPosition; value: boolean; pageIndex: number }>;
    const { position, pageIndex } = customEvent.detail;

    if (this.isSelectingIssuePosition) {
      e.stopPropagation();
      e.preventDefault();
      const pageLineRange = this.paginatedDoc.pageLineRanges[pageIndex];
      const globalLineIndex = pageLineRange ? pageLineRange.startLine + position.lineIndex : position.lineIndex;
      this.newIssueLineIndex = globalLineIndex;
      this.newIssueCellIndex = position.cellIndex;
      this.newIssueDotRow = position.dotRow;
      this.newIssueDotCol = position.dotCol;
      this.isSelectingIssuePosition = false;

      const highlight: HighlightInfo = {
        pageIndex: pageIndex,
        lineIndex: position.lineIndex,
        cellIndex: position.cellIndex,
        dotRow: position.dotRow,
        dotCol: position.dotCol,
        type: 'selection',
        color: 'rgba(155, 89, 182, 0.5)',
      };
      this.highlights = [highlight];
      this.requestUpdate();
      setTimeout(() => this.resumeAddIssueDialog(), 200);
      return;
    }

    const pageLineRange = this.paginatedDoc.pageLineRanges[pageIndex];
    const globalLineIndex = pageLineRange ? pageLineRange.startLine + position.lineIndex : position.lineIndex;
    const globalPosition: DotPosition = {
      ...position,
      lineIndex: globalLineIndex,
    };

    const cell = this.brailleDoc.lines[globalLineIndex]?.cells[position.cellIndex];
    if (!cell) return;

    const before = cloneDocument(this.brailleDoc);
    this.brailleDoc = toggleDot(this.brailleDoc, globalPosition);
    
    const dotLabel = `行${globalLineIndex + 1}格${position.cellIndex + 1}点${position.dotRow + 1}${String.fromCharCode(65 + position.dotCol)}`;
    this.pushHistory(
      'toggle_dot',
      `${customEvent.detail.value ? '激活' : '取消'} ${dotLabel}`,
      before,
      cloneDocument(this.brailleDoc),
      { position: globalPosition, value: customEvent.detail.value }
    );

    const now = Date.now();
    if (now - this._lastVersionTimestamp > 30000) {
      const versionDiff = createVersionDiff({
        description: `点位修改: ${dotLabel}`,
        documentBefore: before,
        documentAfter: cloneDocument(this.brailleDoc),
        author: this.reviewState.currentUser.name,
      });
      this.reviewState = addVersionToState(this.reviewState, versionDiff);
      this._lastVersionTimestamp = now;
    }

    this.revalidate();
    this.requestUpdate();
  }

  private handleReset() {
    const before = cloneDocument(this.brailleDoc);
    this.brailleDoc = {
      ...this.brailleDoc,
      lineSpacing: DEFAULT_LINE_SPACING,
      charSpacing: DEFAULT_CHAR_SPACING,
      dotRadius: DEFAULT_DOT_RADIUS,
    };
    this.pushHistory(
      'reset',
      '重置排版参数',
      before,
      cloneDocument(this.brailleDoc)
    );
    this.revalidate();
  }

  private handleClearAll() {
    const before = cloneDocument(this.brailleDoc);
    this.inputText = '';
    this.brailleDoc = textToBraille('');
    this.pushHistory(
      'input_text',
      '清空所有内容',
      before,
      cloneDocument(this.brailleDoc)
    );
    this.clearHighlights();
    this.revalidate();
  }

  private handleUndo() {
    const result = undoHistory(this.history);
    if (result.document) {
      this.history = result.state;
      this.brailleDoc = result.document;
      if (result.plateWidth != null) {
        this.plateWidth = result.plateWidth;
      }
      if (result.plateHeight != null) {
        this.plateHeight = result.plateHeight;
      }
      this.clearHighlights();
      this.revalidate();
    }
  }

  private handleRedo() {
    const result = redoHistory(this.history);
    if (result.document) {
      this.history = result.state;
      this.brailleDoc = result.document;
      if (result.plateWidth != null) {
        this.plateWidth = result.plateWidth;
      }
      if (result.plateHeight != null) {
        this.plateHeight = result.plateHeight;
      }
      this.clearHighlights();
      this.revalidate();
    }
  }

  private handlePageChange(delta: number) {
    const newIndex = this.currentPageIndex + delta;
    if (newIndex >= 0 && newIndex < this.paginatedDoc.pages.length) {
      this.currentPageIndex = newIndex;
      this.clearHighlights();
    }
  }

  private handleGoToPage(pageIndex: number) {
    if (pageIndex >= 0 && pageIndex < this.paginatedDoc.pages.length) {
      this.currentPageIndex = pageIndex;
    }
  }

  private handleErrorClick(error: ValidationError) {
    const pageIdx = error.pageIndex ?? 0;
    this.handleGoToPage(pageIdx);

    const lineOffset = this.paginatedDoc.pageLineRanges[pageIdx]?.startLine ?? 0;
    const localLineIndex = error.lineIndex >= 0 ? error.lineIndex - lineOffset : 0;

    const highlight: HighlightInfo = {
      pageIndex: pageIdx,
      lineIndex: Math.max(0, localLineIndex),
      cellIndex: error.cellIndex,
      type: error.severity === 'error' ? 'error' : 'warning',
    };

    this.highlights = [highlight];

    setTimeout(() => {
      this.canvasElements.forEach((canvas) => {
        if (canvas.pageIndex === pageIdx || this.paginatedDoc.pages.length <= 1) {
          canvas.scrollToHighlight(highlight);
        }
      });
    }, 100);
  }

  private clearHighlights() {
    this.highlights = [];
  }

  private handleCalibrationChange(key: keyof CalibrationConfig, value: any) {
    this.calibration = {
      ...this.calibration,
      [key]: value,
    };
  }

  private handleExportCurrentPage(format: 'png' | 'jpeg') {
    const tabToCanvasMap = new Map<string, BrailleCanvas>();
    this.canvasElements.forEach((canvas) => {
      tabToCanvasMap.set(`${canvas.isMirror}-${canvas.pageIndex}`, canvas);
    });

    const targetCanvas = this.activeTab === 'reading'
      ? tabToCanvasMap.get(`false-${this.currentPageIndex}`)
      : tabToCanvasMap.get(`true-${this.currentPageIndex}`);

    const canvas = targetCanvas ?? Array.from(this.canvasElements)[0];
    if (canvas) {
      const viewName = this.activeTab === 'reading' ? '阅读视图' : this.activeTab === 'plate' ? '制版视图' : '视图';
      const filename = `盲文铜版_${viewName}_第${this.currentPageIndex + 1}页_${new Date().toISOString().slice(0, 10)}`;
      canvas.downloadImage(filename, format);
    }
  }

  private handleExportAllPages(format: 'png' | 'jpeg') {
    const canvases = Array.from(this.canvasElements);
    const readingCanvases = canvases.filter(c => !c.isMirror);
    
    readingCanvases.forEach((canvas, idx) => {
      setTimeout(() => {
        const filename = `盲文铜版_阅读视图_第${idx + 1}页_${new Date().toISOString().slice(0, 10)}`;
        canvas.downloadImage(filename, format);
      }, idx * 300);
    });
  }

  private getBraillePreviewHtml(isReverse: boolean, pageIndex: number = 0): string {
    const doc = this.paginatedDoc.pages[pageIndex] ?? this.brailleDoc;
    const lineOffset = this.paginatedDoc.pageLineRanges[pageIndex]?.startLine ?? 0;
    const modifiedCells = getModifiedCells(this.brailleDoc, this.inputText);
    const linesHtml: string[] = [];

    for (let li = 0; li < doc.lines.length; li++) {
      const line = doc.lines[li];
      const cellsHtml: string[] = [];
      const globalLi = lineOffset + li;

      for (let ci = 0; ci < line.cells.length; ci++) {
        const cell = line.cells[ci];
        const key = `${globalLi}-${ci}`;
        const isModified = modifiedCells.has(key);
        const isUnknown = cell.isUnknown;
        const brailleChar = isReverse
          ? dotsToUnicodeBraille(cell.dots.map(r => [...r].reverse()))
          : dotsToUnicodeBraille(cell.dots);

        let style = '';
        let title = '';
        if (isModified) {
          style = 'background: rgba(231, 76, 60, 0.18); border: 1px solid #e74c3c; border-radius: 4px; padding: 0 2px; margin: 0 1px;';
          title = `第${globalLi + 1}行第${ci + 1}格 - 已手动修改`;
        } else if (isUnknown) {
          style = 'background: rgba(243, 156, 18, 0.18); border: 1px dashed #f39c12; border-radius: 4px; padding: 0 2px; margin: 0 1px;';
          title = `第${globalLi + 1}行第${ci + 1}格 - 未识别字符: "${cell.sourceChar}"`;
        } else {
          style = 'padding: 0 2px; margin: 0 1px;';
          if (cell.sourceChar) {
            title = `第${globalLi + 1}行第${ci + 1}格 - 原字符: "${cell.sourceChar}"`;
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
      pages: this.paginatedDoc.pages.length,
    };
  }

  private getErrorCountBySeverity() {
    return {
      errors: this.validationErrors.filter((e) => e.severity === 'error').length,
      warnings: this.validationErrors.filter((e) => e.severity === 'warning').length,
    };
  }

  private getConsistencyChecks() {
    const pageDoc = this.paginatedDoc.pages[this.currentPageIndex] ?? this.brailleDoc;
    const currentPageErrors = validateDocument(
      pageDoc,
      this.plateWidth,
      this.plateHeight,
      this.currentPageIndex
    );

    const threeViewResult = validateThreeViewConsistency(this.brailleDoc);
    const manualModifications = findManualModifications(this.brailleDoc);
    const modificationCount = manualModifications.length;

    const mirrorErrors = threeViewResult.errors.filter(e => e.type === 'mirror_mismatch');
    const imprintErrors = threeViewResult.errors.filter(e => e.type === 'imprint_mismatch');

    let modificationText = '无手动修改';
    if (modificationCount > 0) {
      modificationText = `检测到 ${modificationCount} 处手动修改`;
    }

    return [
      {
        pass: currentPageErrors.filter(e => e.severity === 'error').length === 0,
        text: '当前页边界检查',
      },
      {
        pass: mirrorErrors.length === 0,
        text: `镜像关系一致性 (${mirrorErrors.length} 处不一致)`,
      },
      {
        pass: imprintErrors.length === 0 && threeViewResult.details.readingMatchesImprint,
        text: `阅读↔制版↔压印三方联动 (${modificationText})`,
      },
      {
        pass: this.getErrorCountBySeverity().errors === 0,
        text: '全局错误清零',
      },
    ];
  }

  private getPageLineRangeText(pageIndex: number): string {
    const range = this.paginatedDoc.pageLineRanges[pageIndex];
    if (!range) return '';
    if (range.endLine < range.startLine) return '空白页';
    const start = range.startLine + 1;
    const end = range.endLine + 1;
    if (start === end) return `第 ${start} 行`;
    return `第 ${start}-${end} 行`;
  }

  private initSampleReviewData() {
    const sampleIssues: ReviewIssue[] = [
      createReviewIssue({
        title: '第一行盲文点位错误',
        description: '第1行第3格的盲文点位有误，请核对原文后修正。建议检查拼音编码是否正确。',
        severity: 'critical',
        pageIndex: 0,
        lineIndex: 0,
        cellIndex: 2,
        reporter: { id: 'user_1', name: '张审校', role: '高级审校员' },
        assignee: { id: 'user_2', name: '李制作', role: '制版工程师' },
        tags: ['点位错误', '拼音编码'],
      }),
      createReviewIssue({
        title: '行距需要调整',
        description: '当前行距过小，建议增加5px以提高可读性。参考GB/T 15720-2008标准。',
        severity: 'major',
        pageIndex: 0,
        lineIndex: 2,
        reporter: { id: 'user_1', name: '张审校', role: '高级审校员' },
        tags: ['排版', '行距'],
      }),
      createReviewIssue({
        title: '建议增加页码标识',
        description: '建议在每页底部添加页码，方便阅读时定位。',
        severity: 'suggestion',
        pageIndex: 0,
        lineIndex: 5,
        reporter: { id: 'user_3', name: '王编辑', role: '责任编辑' },
        tags: ['优化建议', '页码'],
      }),
    ];

    sampleIssues[0] = addReviewComment(
      sampleIssues[0],
      { id: 'user_2', name: '李制作', role: '制版工程师' },
      '收到，我来检查一下拼音编码是否正确。'
    );
    sampleIssues[0] = updateIssueStatus(sampleIssues[0], 'confirmed');

    sampleIssues[2] = addReviewComment(
      sampleIssues[2],
      { id: 'user_1', name: '张审校', role: '高级审校员' },
      '这个建议很好，我们在下一版中考虑。'
    );
    sampleIssues[2] = updateIssueStatus(sampleIssues[2], 'resolved');

    this.reviewState = {
      ...this.reviewState,
      issues: sampleIssues,
      reviewStatus: 'in_review',
      signatures: [
        createReviewSignature({
          reviewer: { id: 'user_3', name: '王编辑', role: '责任编辑' },
          signatureType: 'approval',
          comment: '内容基本正确，请制作方按审校意见修改。',
        }),
      ],
      currentUser: { id: 'user_1', name: '当前用户', role: '高级审校员' },
    };
  }

  private toggleReviewSidebar() {
    this.reviewSidebarOpen = !this.reviewSidebarOpen;
  }

  private openAddIssueDialog() {
    this.newIssueTitle = '';
    this.newIssueDescription = '';
    this.newIssueSeverity = 'major';
    this.newIssueAssignee = '';
    this.newIssueLineIndex = 0;
    this.newIssueCellIndex = undefined;
    this.newIssueDotRow = undefined;
    this.newIssueDotCol = undefined;
    this.isSelectingIssuePosition = false;
    this.showAddIssueDialog = true;
  }

  private closeAddIssueDialog() {
    this.showAddIssueDialog = false;
    this.isSelectingIssuePosition = false;
  }

  private startSelectIssuePosition() {
    this.isSelectingIssuePosition = true;
    this.showAddIssueDialog = false;
  }

  private resumeAddIssueDialog() {
    this.showAddIssueDialog = true;
  }

  private handleAddIssue() {
    if (!this.newIssueTitle.trim()) return;

    const newIssue = createReviewIssue({
      title: this.newIssueTitle,
      description: this.newIssueDescription,
      severity: this.newIssueSeverity,
      pageIndex: this.currentPageIndex,
      lineIndex: this.newIssueLineIndex,
      cellIndex: this.newIssueCellIndex,
      dotRow: this.newIssueDotRow,
      dotCol: this.newIssueDotCol,
      reporter: this.reviewState.currentUser,
      assignee: this.newIssueAssignee ? { id: this.newIssueAssignee, name: this.newIssueAssignee === 'user_2' ? '李制作' : '王审校', role: '处理人' } : undefined,
      versionSnapshot: cloneDocument(this.brailleDoc),
    });

    this.reviewState = addIssueToState(this.reviewState, newIssue);

    const versionDiff = createVersionDiff({
      description: `新增审校问题: ${this.newIssueTitle}`,
      documentBefore: cloneDocument(this.brailleDoc),
      documentAfter: cloneDocument(this.brailleDoc),
      author: this.reviewState.currentUser.name,
    });
    this.reviewState = addVersionToState(this.reviewState, versionDiff);

    this.closeAddIssueDialog();
    this.clearHighlights();
  }

  private openIssueDetail(issue: ReviewIssue) {
    this.selectedIssue = issue;
    this.showIssueDetailDialog = true;
    this.newComment = '';
    this.handleIssueLocate(issue);
  }

  private closeIssueDetail() {
    this.showIssueDetailDialog = false;
    this.selectedIssue = null;
  }

  private handleIssueLocate(issue: ReviewIssue) {
    this.currentPageIndex = issue.pageIndex;

    const lineOffset = this.paginatedDoc.pageLineRanges[issue.pageIndex]?.startLine ?? 0;
    const localLineIndex = issue.lineIndex - lineOffset;

    const highlight: HighlightInfo = {
      pageIndex: issue.pageIndex,
      lineIndex: Math.max(0, localLineIndex),
      cellIndex: issue.cellIndex,
      dotRow: issue.dotRow,
      dotCol: issue.dotCol,
      type: 'selection',
      color: 'rgba(155, 89, 182, 0.3)',
    };

    this.highlights = [highlight];
    this.reviewState = { ...this.reviewState, activeIssueId: issue.id };

    setTimeout(() => {
      this.canvasElements.forEach((canvas) => {
        if (canvas.pageIndex === issue.pageIndex || this.paginatedDoc.pages.length <= 1) {
          canvas.scrollToHighlight(highlight);
        }
      });
    }, 100);
  }

  private handleAddComment() {
    if (!this.selectedIssue || !this.newComment.trim()) return;

    const updatedIssue = addReviewComment(
      this.selectedIssue,
      this.reviewState.currentUser,
      this.newComment
    );

    this.selectedIssue = updatedIssue;
    this.reviewState = updateIssueInState(this.reviewState, updatedIssue);
    this.newComment = '';
  }

  private handleUpdateIssueStatus(status: ReviewIssueStatus) {
    if (!this.selectedIssue) return;

    const updatedIssue = updateIssueStatus(this.selectedIssue, status, this.reviewState.currentUser);
    this.selectedIssue = updatedIssue;
    this.reviewState = updateIssueInState(this.reviewState, updatedIssue);
  }

  private handleAssignIssue(assigneeId: string, assigneeName: string) {
    if (!this.selectedIssue) return;

    const assignee: Reviewer = {
      id: assigneeId,
      name: assigneeName,
      role: '处理人',
    };

    const updatedIssue = assignIssue(this.selectedIssue, assignee);
    this.selectedIssue = updatedIssue;
    this.reviewState = updateIssueInState(this.reviewState, updatedIssue);
  }

  private handleStatusFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement | any;
    const value = target.value as ReviewIssueStatus | 'all';
    this.reviewState = { ...this.reviewState, selectedIssueFilter: value };
  }

  private handleSeverityFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement | any;
    const value = target.value as ReviewIssueSeverity | 'all';
    this.reviewState = { ...this.reviewState, selectedSeverityFilter: value };
  }

  private handleToggleIssueMarkers() {
    this.reviewState = { ...this.reviewState, showIssueMarkers: !this.reviewState.showIssueMarkers };
  }

  private openSignatureDialog() {
    this.signatureComment = '';
    this.showSignatureDialog = true;
  }

  private closeSignatureDialog() {
    this.showSignatureDialog = false;
  }

  private handleSign(type: 'approval' | 'rejection') {
    const signature = createReviewSignature({
      reviewer: this.reviewState.currentUser,
      signatureType: type,
      comment: this.signatureComment,
    });

    this.reviewState = addSignatureToState(this.reviewState, signature);
    this.reviewState = updateReviewStatus(
      this.reviewState,
      type === 'approval' ? 'approved' : 'rejected'
    );

    this.closeSignatureDialog();
  }

  private openVersionCompare() {
    this.showVersionCompareDialog = true;
    if (this.reviewState.versionHistory.length >= 2) {
      this.compareVersionA = this.reviewState.versionHistory[0];
      this.compareVersionB = this.reviewState.versionHistory[this.reviewState.versionHistory.length - 1];
    }
  }

  private closeVersionCompare() {
    this.showVersionCompareDialog = false;
  }

  private getFilteredIssues(): ReviewIssue[] {
    return filterIssues(
      this.reviewState.issues,
      this.reviewState.selectedIssueFilter,
      this.reviewState.selectedSeverityFilter
    );
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getIssueIndex(issueId: string): number {
    return this.reviewState.issues.findIndex((i) => i.id === issueId) + 1;
  }

  override render() {
    const stats = this.getStats();
    const errorCount = this.getErrorCountBySeverity();
    const layout = calculateLayout(this.brailleDoc, this.plateWidth, this.plateHeight);
    const currentDoc = this.paginatedDoc.pages[this.currentPageIndex] ?? this.brailleDoc;
    const totalPages = this.paginatedDoc.pages.length;
    const consistencyChecks = this.getConsistencyChecks();
    const historyList = getHistoryDescriptions(this.history);

    return html`
      ${this.isSelectingIssuePosition ? html`
        <div class="position-selecting-overlay" style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999; padding: 16px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4); display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 500;">
            <sl-icon name="hand-index-thumb" style="font-size: 22px;"></sl-icon>
            <div>
              <div style="font-weight: 600;">正在选择问题位置</div>
              <div style="font-size: 12px; opacity: 0.9; font-weight: 400;">请在下方任意盲文画布上点击具体出错的点位</div>
            </div>
          </div>
          <sl-button size="small" variant="neutral" @click=${() => { this.isSelectingIssuePosition = false; this.showAddIssueDialog = true; }}>
            <sl-icon name="x" slot="prefix"></sl-icon>
            取消选择
          </sl-button>
        </div>
      ` : ''}

      <div class="app-header">
        <div class="header-row">
          <h1 class="header-title">
            <span class="icon-wrap">
              <sl-icon name="braille"></sl-icon>
            </span>
            盲文铜版制版校验器
          </h1>
          <div class="header-toolbar">
            <div class="undo-redo-group">
              <sl-tooltip content="撤销 (Ctrl+Z)">
                <sl-button
                  size="small"
                  variant="default"
                  ?disabled=${!canUndo(this.history)}
                  @click=${this.handleUndo}
                >
                  <sl-icon name="arrow-counterclockwise" slot="prefix"></sl-icon>
                  撤销
                </sl-button>
              </sl-tooltip>
              <sl-tooltip content="重做 (Ctrl+Y)">
                <sl-button
                  size="small"
                  variant="default"
                  ?disabled=${!canRedo(this.history)}
                  @click=${this.handleRedo}
                >
                  <sl-icon name="arrow-clockwise" slot="prefix"></sl-icon>
                  重做
                </sl-button>
              </sl-tooltip>
            </div>

            <sl-dropdown>
              <sl-button slot="trigger" size="small" variant="primary" caret>
                <sl-icon name="download" slot="prefix"></sl-icon>
                导出图片
              </sl-button>
              <sl-menu>
                <sl-menu-item @click=${() => this.handleExportCurrentPage('png')}>
                  <sl-icon slot="prefix" name="image"></sl-icon>
                  当前页 (PNG)
                </sl-menu-item>
                <sl-menu-item @click=${() => this.handleExportCurrentPage('jpeg')}>
                  <sl-icon slot="prefix" name="image"></sl-icon>
                  当前页 (JPEG)
                </sl-menu-item>
                <sl-divider style="margin: 4px 0;"></sl-divider>
                <sl-menu-item @click=${() => this.handleExportAllPages('png')}>
                  <sl-icon slot="prefix" name="files"></sl-icon>
                  全部阅读页 (PNG) - ${totalPages} 张
                </sl-menu-item>
              </sl-menu>
            </sl-dropdown>

            <sl-button size="small" variant="success" @click=${this.toggleReviewSidebar}>
              <sl-icon name="people" slot="prefix"></sl-icon>
              协作审校
              <sl-badge slot="suffix" variant="danger" pill style="margin-left: 4px;">
                ${getIssueCounts(this.reviewState.issues).pending}
              </sl-badge>
            </sl-button>
          </div>
        </div>
        <div class="header-sub">
          支持多页自动分页 · 制版校准 · 撤销重做 · 错误定位 · 三方联动检查 · 协作审校 · 图片导出 ｜ 所有修改实时更新
        </div>
      </div>

      <div class="app-body ${this.reviewSidebarOpen ? 'with-review-sidebar' : ''}">
        <div class="left-panel">
          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">文字输入</div>
            </div>

            <sl-textarea
              .value=${this.inputText}
              @sl-input=${this.handleTextInput}
              placeholder="请输入中文、英文、数字或标点符号..."
              rows="4"
              resize="vertical"
              help-text="支持中文（拼音盲文编码）、英文字母、数字和常用标点符号"
            ></sl-textarea>

            <div style="margin-top: 12px;" class="tip-box">
              💡 <b>使用提示：</b>点击视图中的<b>点位</b>可以手动切换状态。
              制版视图为<b>左右镜像</b>，压印后与阅读视图一致。支持 Ctrl+Z / Ctrl+Y 撤销重做。
              点击错误项可<b>自动跳转并高亮</b>对应位置。
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
              <div class="card-title">制版校准</div>
            </div>

            <div class="calibration-group">
              <div class="calibration-row">
                <span class="calibration-label">
                  <span class="color-preview" style="background: ${this.calibration.baselineColor};"></span>
                  显示基准线
                </span>
                <sl-checkbox
                  ?checked=${this.calibration.showBaselines}
                  @sl-change=${(e: any) => this.handleCalibrationChange('showBaselines', e.target.checked)}
                ></sl-checkbox>
              </div>

              <div class="calibration-row">
                <span class="calibration-label">
                  <span class="color-preview" style="background: ${this.calibration.holeColor};"></span>
                  显示定位孔
                </span>
                <sl-checkbox
                  ?checked=${this.calibration.showRegistrationHoles}
                  @sl-change=${(e: any) => this.handleCalibrationChange('showRegistrationHoles', e.target.checked)}
                ></sl-checkbox>
              </div>

              <div class="calibration-row">
                <span class="calibration-label">
                  <span class="color-preview" style="background: ${this.calibration.marginColor};"></span>
                  显示安全边距
                </span>
                <sl-checkbox
                  ?checked=${this.calibration.showSafetyMargin}
                  @sl-change=${(e: any) => this.handleCalibrationChange('showSafetyMargin', e.target.checked)}
                ></sl-checkbox>
              </div>

              <div class="control-row" style="margin-top: 8px;">
                <div class="control-label">
                  <span>安全边距大小</span>
                  <span class="control-value">${this.calibration.safetyMarginSize}px</span>
                </div>
                <sl-range
                  min="5"
                  max="60"
                  step="1"
                  .value=${this.calibration.safetyMarginSize}
                  @sl-change=${(e: any) => this.handleCalibrationChange('safetyMarginSize', Number(e.target.value))}
                  @sl-input=${(e: any) => this.handleCalibrationChange('safetyMarginSize', Number(e.target.value))}
                ></sl-range>
              </div>
            </div>
          </sl-card>

          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">修改记录</div>
            </div>

            <div class="button-group" style="margin-bottom: 10px;">
              <sl-button
                size="small"
                variant="default"
                ?disabled=${!canUndo(this.history)}
                @click=${this.handleUndo}
              >
                <sl-icon name="arrow-counterclockwise" slot="prefix"></sl-icon>
                撤销 (${this.history.currentIndex + 1}/${this.history.entries.length})
              </sl-button>
              <sl-button
                size="small"
                variant="default"
                ?disabled=${!canRedo(this.history)}
                @click=${this.handleRedo}
              >
                <sl-icon name="arrow-clockwise" slot="prefix"></sl-icon>
                重做
              </sl-button>
            </div>

            ${historyList.length === 0
              ? html`<div class="history-empty">暂无修改记录</div>`
              : html`
                  <div class="history-panel">
                    ${historyList.slice().reverse().map((line) => html`
                      <div>${line}</div>
                    `)}
                  </div>
                `
            }
          </sl-card>

          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">统计信息</div>
            </div>
            <div class="stat-grid stat-grid-3">
              <div class="stat-item">
                <div class="stat-value">${stats.pages}</div>
                <div class="stat-label">总页数</div>
              </div>
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
              <div class="stat-item">
                <div class="stat-value" style="color: #27ae60;">${this.currentPageIndex + 1}</div>
                <div class="stat-label">当前页</div>
              </div>
            </div>

            <div style="margin-top: 12px; font-size: 12px; color: #777;">
              <div>内容宽度: <b>${layout.totalWidth.toFixed(0)}px</b> / 铜版宽度: <b>${this.plateWidth}px</b></div>
              <div style="margin-top: 4px;">内容高度: <b>${layout.totalHeight.toFixed(0)}px</b> / 铜版高度: <b>${this.plateHeight}px</b></div>
            </div>
          </sl-card>

          <sl-card style="margin-bottom: 16px;">
            <div slot="header">
              <div class="card-title">
                三方联动检查
              </div>
            </div>
            <div class="consistency-check">
              ${consistencyChecks.map(
                (check) => html`
                  <div class="consistency-item ${check.pass ? 'pass' : 'fail'}">
                    <span class="consistency-icon">${check.pass ? '✅' : '⚠️'}</span>
                    <span><b>${check.pass ? '通过' : '未通过'}</b> - ${check.text}</span>
                  </div>
                `
              )}
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
                      (err, idx) => html`
                        <div
                          class="error-item severity-${err.severity}"
                          @click=${() => this.handleErrorClick(err)}
                        >
                          <sl-icon
                            name=${err.severity === 'error' ? 'exclamation-octagon-fill' : 'exclamation-triangle-fill'}
                            style="font-size: 16px; flex-shrink: 0; margin-top: 1px;"
                          ></sl-icon>
                          <span style="flex: 1;">${err.message}</span>
                          <span class="error-item-action">
                            <sl-icon name="cursor" style="font-size: 12px;"></sl-icon>
                            定位
                          </span>
                        </div>
                      `
                    )}
                  </div>
                `}
          </sl-card>
        </div>

        <div class="right-panel">
          <div class="canvas-wrapper">
            <div class="page-nav">
              <sl-button
                size="small"
                variant="default"
                ?disabled=${this.currentPageIndex <= 0}
                @click=${() => this.handlePageChange(-1)}
              >
                <sl-icon name="chevron-left" slot="prefix"></sl-icon>
                上一页
              </sl-button>
              <div class="page-info">
                第 ${this.currentPageIndex + 1} / ${totalPages} 页
                <span class="page-range" style="margin-left: 8px;">
                  ${this.getPageLineRangeText(this.currentPageIndex)}
                </span>
              </div>
              <sl-button
                size="small"
                variant="default"
                ?disabled=${this.currentPageIndex >= totalPages - 1}
                @click=${() => this.handlePageChange(1)}
              >
                下一页
                <sl-icon name="chevron-right" slot="suffix"></sl-icon>
              </sl-button>

              <sl-divider vertical style="height: 24px; margin: 0 8px;"></sl-divider>

              <span style="font-size: 12px; color: #888; margin-right: 8px;">跳转:</span>
              ${this.paginatedDoc.pageLineRanges.map((_, idx) => html`
                <sl-button
                  size="small"
                  variant=${idx === this.currentPageIndex ? 'primary' : 'default'}
                  ?outline=${idx !== this.currentPageIndex}
                  @click=${() => this.handleGoToPage(idx)}
                  style="min-width: 32px; padding: 0;"
                >
                  ${idx + 1}
                </sl-button>
              `)}
            </div>

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
                对比视图（阅读+制版+压印）
              </sl-tab>

              <sl-tab-panel name="reading">
                <div class="canvas-wrap-inner">
                  <braille-canvas
                    .document=${currentDoc}
                    .plateWidth=${this.plateWidth}
                    .plateHeight=${this.plateHeight}
                    ?isMirror=${false}
                    ?editable=${true}
                    label="📖 阅读视图 - 正面（实际阅读方向）"
                    .pageIndex=${this.currentPageIndex}
                    .totalPages=${totalPages}
                    .calibration=${this.calibration}
                    .highlights=${this.highlights}
                    .reviewIssues=${this.reviewState.issues}
                    .showIssueMarkers=${this.reviewState.showIssueMarkers}
                    @dot-toggle=${this.handleDotToggle}
                  ></braille-canvas>
                </div>
              </sl-tab-panel>

              <sl-tab-panel name="plate">
                <div class="canvas-wrap-inner">
                  <braille-canvas
                    .document=${currentDoc}
                    .plateWidth=${this.plateWidth}
                    .plateHeight=${this.plateHeight}
                    ?isMirror=${true}
                    ?editable=${true}
                    label="🔨 制版视图 - 左右镜像（铜版实际雕刻方向）"
                    .pageIndex=${this.currentPageIndex}
                    .totalPages=${totalPages}
                    .calibration=${this.calibration}
                    .highlights=${this.highlights}
                    .reviewIssues=${this.reviewState.issues}
                    .showIssueMarkers=${this.reviewState.showIssueMarkers}
                    @dot-toggle=${this.handleDotToggle}
                  ></braille-canvas>
                </div>
              </sl-tab-panel>

              <sl-tab-panel name="compare">
                <div class="canvas-wrap-inner">
                  <div class="compare-3col" style="margin-bottom: 16px;">
                    <div class="compare-card reading">
                      <div class="compare-card-header">
                        <sl-icon name="eye"></sl-icon>
                        📖 阅读视图（正面）
                      </div>
                      <div style="padding: 8px;">
                        <braille-canvas
                          style="transform: scale(0.85); transform-origin: top left;"
                          .document=${currentDoc}
                          .plateWidth=${Math.floor(this.plateWidth * 0.85)}
                          .plateHeight=${Math.floor(this.plateHeight * 0.85)}
                          ?isMirror=${false}
                          ?editable=${true}
                          label="阅读"
                          .pageIndex=${this.currentPageIndex}
                          .totalPages=${totalPages}
                          .calibration=${this.calibration}
                          .highlights=${this.highlights}
                          .reviewIssues=${this.reviewState.issues}
                          .showIssueMarkers=${this.reviewState.showIssueMarkers}
                          @dot-toggle=${this.handleDotToggle}
                        ></braille-canvas>
                      </div>
                    </div>

                    <div class="compare-card plate">
                      <div class="compare-card-header">
                        <sl-icon name="grid-3x3-gap"></sl-icon>
                        🔨 制版视图（左右镜像）
                      </div>
                      <div style="padding: 8px;">
                        <braille-canvas
                          style="transform: scale(0.85); transform-origin: top left;"
                          .document=${currentDoc}
                          .plateWidth=${Math.floor(this.plateWidth * 0.85)}
                          .plateHeight=${Math.floor(this.plateHeight * 0.85)}
                          ?isMirror=${true}
                          ?editable=${true}
                          label="制版"
                          .pageIndex=${this.currentPageIndex}
                          .totalPages=${totalPages}
                          .calibration=${this.calibration}
                          .highlights=${this.highlights}
                          .reviewIssues=${this.reviewState.issues}
                          .showIssueMarkers=${this.reviewState.showIssueMarkers}
                          @dot-toggle=${this.handleDotToggle}
                        ></braille-canvas>
                      </div>
                    </div>

                    <div class="compare-card imprint">
                      <div class="compare-card-header">
                        <sl-icon name="stamp"></sl-icon>
                        🖨️ 压印预览（模拟纸张效果）
                      </div>
                      <div style="padding: 16px;">
                        <div style="
                          background: #fff;
                          padding: 20px;
                          border-radius: 8px;
                          min-height: ${this.plateHeight * 0.85 - 32}px;
                          box-shadow: inset 0 2px 10px rgba(0,0,0,0.1);
                          border: 1px solid #ddd;
                        ">
                          <div style="font-family: monospace; white-space: pre-wrap; word-break: break-all; font-size: 22px; color: #2c3e50; line-height: 1.8; letter-spacing: 2px;">
                            ${unsafeHTML(this.getBraillePreviewHtml(false, this.currentPageIndex))}
                          </div>
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: #777; text-align: center;">
                          铜版翻转压印后，盲文点位恢复为正常阅读顺序
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style="padding: 16px; border-top: 1px solid #eee;">
                    <div class="card-title" style="margin-bottom: 10px;">
                      🔄 制版 ↔ 压印 详细对比
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
                          ${unsafeHTML(this.getBraillePreviewHtml(true, this.currentPageIndex))}
                        </div>
                      </div>
                      <div style="padding: 14px; background: #eafaf1; border-radius: 8px; border: 2px dashed #27ae60;">
                        <div style="font-size: 12px; color: #1e8449; font-weight: 600; margin-bottom: 6px;">
                          纸张（压印后 · 正面阅读）
                        </div>
                        <div style="font-family: monospace; white-space: pre-wrap; word-break: break-all; font-size: 24px; color: #145a32; line-height: 1.8; letter-spacing: 2px;">
                          ${unsafeHTML(this.getBraillePreviewHtml(false, this.currentPageIndex))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </sl-tab-panel>
            </sl-tab-group>
          </div>
        </div>
      </div>

      <div class="review-sidebar ${this.reviewSidebarOpen ? '' : 'collapsed'}">
        <div class="review-header">
          <sl-icon name="people" style="font-size: 20px;"></sl-icon>
          <h2>协作审校</h2>
          <sl-tooltip content="关闭">
            <button class="close-btn" @click=${this.toggleReviewSidebar}>×</button>
          </sl-tooltip>
        </div>

        <div class="review-tabs">
          <sl-tab-group @sl-tab-show=${(e: any) => { this.reviewTab = e.detail.name; }}>
            <sl-tab slot="nav" panel="issues" .active=${this.reviewTab === 'issues'}>
              <sl-icon name="list-check" style="margin-right: 4px;"></sl-icon>
              问题列表
            </sl-tab>
            <sl-tab slot="nav" panel="timeline">
              <sl-icon name="clock-history" style="margin-right: 4px;"></sl-icon>
              时间线
            </sl-tab>
            <sl-tab slot="nav" panel="versions">
              <sl-icon name="git-branch" style="margin-right: 4px;"></sl-icon>
              版本
            </sl-tab>
            <sl-tab slot="nav" panel="signatures">
              <sl-icon name="pen" style="margin-right: 4px;"></sl-icon>
              签字
            </sl-tab>

            <sl-tab-panel name="issues">
              <div class="review-content">
                <div class="review-summary">
                  <div class="review-summary-title">
                    <sl-icon name="info-circle"></sl-icon>
                    审校概览
                  </div>
                  <div class="review-summary-stats">
                    <div class="review-summary-stat">
                      <div class="review-summary-stat-value">${getIssueCounts(this.reviewState.issues).total}</div>
                      <div class="review-summary-stat-label">总问题</div>
                    </div>
                    <div class="review-summary-stat">
                      <div class="review-summary-stat-value" style="color: #e74c3c;">${getIssueCounts(this.reviewState.issues).pending}</div>
                      <div class="review-summary-stat-label">待处理</div>
                    </div>
                    <div class="review-summary-stat">
                      <div class="review-summary-stat-value" style="color: #27ae60;">${getIssueCounts(this.reviewState.issues).confirmed}</div>
                      <div class="review-summary-stat-label">已确认</div>
                    </div>
                    <div class="review-summary-stat">
                      <div class="review-summary-stat-value" style="color: #95a5a6;">${getIssueCounts(this.reviewState.issues).resolved}</div>
                      <div class="review-summary-stat-label">已解决</div>
                    </div>
                  </div>
                </div>

                <div class="review-actions">
                  <sl-button size="small" variant="primary" @click=${this.openAddIssueDialog}>
                    <sl-icon name="plus-circle" slot="prefix"></sl-icon>
                    新建问题
                  </sl-button>
                  <sl-button size="small" variant="default" @click=${this.handleToggleIssueMarkers}>
                    <sl-icon name=${this.reviewState.showIssueMarkers ? 'eye' : 'eye-slash'} slot="prefix"></sl-icon>
                    ${this.reviewState.showIssueMarkers ? '隐藏标记' : '显示标记'}
                  </sl-button>
                </div>

                <div class="review-filter-row">
                  <sl-select
                    size="small"
                    .value=${this.reviewState.selectedIssueFilter}
                    @sl-change=${this.handleStatusFilterChange}
                    style="flex: 1; min-width: 100px;"
                  >
                    <sl-option value="all">全部状态</sl-option>
                    <sl-option value="pending">待处理</sl-option>
                    <sl-option value="confirmed">已确认</sl-option>
                    <sl-option value="resolved">已解决</sl-option>
                    <sl-option value="rejected">已驳回</sl-option>
                  </sl-select>
                  <sl-select
                    size="small"
                    .value=${this.reviewState.selectedSeverityFilter}
                    @sl-change=${this.handleSeverityFilterChange}
                    style="flex: 1; min-width: 100px;"
                  >
                    <sl-option value="all">全部级别</sl-option>
                    <sl-option value="critical">严重</sl-option>
                    <sl-option value="major">重要</sl-option>
                    <sl-option value="minor">次要</sl-option>
                    <sl-option value="suggestion">建议</sl-option>
                  </sl-select>
                </div>

                ${this.getFilteredIssues().length === 0
                  ? html`
                      <div class="issue-empty">
                        <sl-icon name="inbox"></sl-icon>
                        <div>暂无审校问题</div>
                        <div style="font-size: 12px; margin-top: 4px;">点击"新建问题"添加第一个审校意见</div>
                      </div>
                    `
                  : html`
                      <div class="issue-list">
                        ${this.getFilteredIssues().map((issue, idx) => html`
                          <div
                            class="issue-card severity-${issue.severity}"
                            @click=${() => this.openIssueDetail(issue)}
                          >
                            <div class="issue-card-header">
                              <div class="issue-number">${this.getIssueIndex(issue.id)}</div>
                              <div class="issue-title">${issue.title}</div>
                              <sl-badge
                                class="issue-status-badge"
                                variant=${issue.status === 'pending' ? 'warning' : issue.status === 'confirmed' ? 'primary' : issue.status === 'resolved' ? 'success' : 'neutral'}
                                pill
                              >
                                ${getStatusLabel(issue.status)}
                              </sl-badge>
                            </div>
                            <div class="issue-meta">
                              <span class="issue-meta-item">
                                <sl-icon name="exclamation-triangle" style="font-size: 12px; color: ${getSeverityColor(issue.severity)};"></sl-icon>
                                ${getSeverityLabel(issue.severity)}
                              </span>
                              <span class="issue-meta-item">
                                <sl-icon name="file-page" style="font-size: 12px;"></sl-icon>
                                第${issue.pageIndex + 1}页
                              </span>
                              <span class="issue-meta-item">
                                <sl-icon name="person" style="font-size: 12px;"></sl-icon>
                                ${issue.assigneeName || '未分配'}
                              </span>
                              <span class="issue-meta-item">
                                <sl-icon name="chat-dots" style="font-size: 12px;"></sl-icon>
                                ${issue.comments.length}
                              </span>
                            </div>
                          </div>
                        `)}
                      </div>
                    `
                }
              </div>
            </sl-tab-panel>

            <sl-tab-panel name="timeline">
              <div class="review-content">
                <div class="issue-detail-section-title">
                  <sl-icon name="clock-history"></sl-icon>
                  审校活动时间线
                </div>
                <div class="timeline">
                  ${this.reviewState.issues.slice().sort((a, b) => b.createdAt - a.createdAt).flatMap((issue) => [
                    html`
                      <div class="timeline-item action-status">
                        <div class="timeline-content">
                          <div class="timeline-author">
                            ${issue.reporterName}
                            <span class="timeline-time">${this.formatTime(issue.createdAt)}</span>
                          </div>
                          <div class="timeline-text">
                            创建了问题 <b>#${this.getIssueIndex(issue.id)} ${issue.title}</b>
                          </div>
                        </div>
                      </div>
                    `,
                    ...issue.comments.map((comment) => html`
                      <div class="timeline-item action-comment">
                        <div class="timeline-content">
                          <div class="timeline-author">
                            ${comment.authorName}
                            <span class="timeline-time">${this.formatTime(comment.timestamp)}</span>
                          </div>
                          <div class="timeline-text">${comment.content}</div>
                        </div>
                      </div>
                    `)
                  ])}
                </div>
              </div>
            </sl-tab-panel>

            <sl-tab-panel name="versions">
              <div class="review-content">
                <div class="review-actions">
                  <sl-button size="small" variant="primary" @click=${this.openVersionCompare} ?disabled=${this.reviewState.versionHistory.length < 2}>
                    <sl-icon name="layout-split" slot="prefix"></sl-icon>
                    版本对比
                  </sl-button>
                </div>

                ${this.reviewState.versionHistory.length === 0
                  ? html`
                      <div class="issue-empty">
                        <sl-icon name="git-branch"></sl-icon>
                        <div>暂无版本记录</div>
                        <div style="font-size: 12px; margin-top: 4px;">修改内容后会自动记录版本</div>
                      </div>
                    `
                  : html`
                      <div class="version-list">
                        ${this.reviewState.versionHistory.slice().reverse().map((version) => html`
                          <div class="version-item">
                            <div class="version-header">
                              <span class="version-desc">${version.description}</span>
                              <span class="version-time">${this.formatTime(version.timestamp)}</span>
                            </div>
                            <div class="version-author">${version.author}</div>
                            <div class="version-changes">
                              ${version.modifiedCells.length} 处修改
                            </div>
                          </div>
                        `)}
                      </div>
                    `
                }
              </div>
            </sl-tab-panel>

            <sl-tab-panel name="signatures">
              <div class="review-content">
                <div class="review-summary">
                  <div class="review-summary-title">
                    <sl-icon name="shield-check"></sl-icon>
                    审校状态
                  </div>
                  <div style="text-align: center; padding: 12px 0;">
                    <sl-badge
                      variant=${this.reviewState.reviewStatus === 'approved' ? 'success' : this.reviewState.reviewStatus === 'rejected' ? 'danger' : this.reviewState.reviewStatus === 'in_review' ? 'primary' : 'neutral'}
                      pill
                      style="--sl-font-size-small: 14px; padding: 6px 16px;"
                    >
                      ${getReviewStatusLabel(this.reviewState.reviewStatus)}
                    </sl-badge>
                  </div>
                </div>

                <div class="review-actions">
                  <sl-button size="small" variant="success" @click=${() => { this.signatureComment = ''; this.showSignatureDialog = true; }}>
                    <sl-icon name="check-circle" slot="prefix"></sl-icon>
                    签字通过
                  </sl-button>
                  <sl-button size="small" variant="danger" @click=${() => { this.signatureComment = ''; this.showSignatureDialog = true; }}>
                    <sl-icon name="x-circle" slot="prefix"></sl-icon>
                    签字驳回
                  </sl-button>
                </div>

                <div class="issue-detail-section-title" style="margin-top: 16px;">
                  <sl-icon name="pen"></sl-icon>
                  签字记录
                </div>

                ${this.reviewState.signatures.length === 0
                  ? html`
                      <div class="issue-empty">
                        <sl-icon name="pen"></sl-icon>
                        <div>暂无签字记录</div>
                      </div>
                    `
                  : html`
                      <div class="signature-list">
                        ${this.reviewState.signatures.map((sig) => html`
                          <div class="signature-item ${sig.signatureType === 'rejection' ? 'rejected' : ''}">
                            <div class="signature-header">
                              <sl-avatar initials=${sig.reviewerName.slice(0, 1)} label=${sig.reviewerName}></sl-avatar>
                              <div>
                                <div class="signature-name">${sig.reviewerName}</div>
                                <div class="signature-role">${sig.reviewerRole}</div>
                              </div>
                              <sl-badge variant=${sig.signatureType === 'approval' ? 'success' : 'danger'} pill>
                                ${sig.signatureType === 'approval' ? '通过' : '驳回'}
                              </sl-badge>
                            </div>
                            <div class="signature-time">
                              <sl-icon name="clock" style="font-size: 12px; margin-right: 4px;"></sl-icon>
                              ${this.formatTime(sig.timestamp)}
                            </div>
                            ${sig.comment ? html`
                              <div class="signature-comment">${sig.comment}</div>
                            ` : ''}
                          </div>
                        `)}
                      </div>
                    `
                }
              </div>
            </sl-tab-panel>
          </sl-tab-group>
        </div>
      </div>

      <sl-dialog
        .open=${this.showAddIssueDialog}
        @sl-request-close=${this.closeAddIssueDialog}
        label="新建审校问题"
        style="--width: 520px;"
      >
        <div style="padding: 8px 0;">
          <div class="control-row">
            <div class="control-label">
              <span>问题标题</span>
            </div>
            <sl-input
              .value=${this.newIssueTitle}
              @sl-input=${(e: any) => { this.newIssueTitle = e.target.value; }}
              placeholder="请输入问题标题..."
            ></sl-input>
          </div>

          <div class="control-row">
            <div class="control-label">
              <span>问题描述</span>
            </div>
            <sl-textarea
              .value=${this.newIssueDescription}
              @sl-input=${(e: any) => { this.newIssueDescription = e.target.value; }}
              placeholder="请详细描述问题..."
              rows="4"
            ></sl-textarea>
          </div>

          <div class="control-row">
            <div class="control-label">
              <span>严重级别</span>
            </div>
            <sl-radio-group
              .value=${this.newIssueSeverity}
              @sl-change=${(e: any) => { this.newIssueSeverity = e.target.value as ReviewIssueSeverity; }}
            >
              <sl-radio value="critical">
                <span style="color: #e74c3c;">● 严重</span>
              </sl-radio>
              <sl-radio value="major">
                <span style="color: #e67e22;">● 重要</span>
              </sl-radio>
              <sl-radio value="minor">
                <span style="color: #f39c12;">● 次要</span>
              </sl-radio>
              <sl-radio value="suggestion">
                <span style="color: #3498db;">● 建议</span>
              </sl-radio>
            </sl-radio-group>
          </div>

          <div class="control-row">
            <div class="control-label">
              <span>分配处理人</span>
            </div>
            <sl-select
              .value=${this.newIssueAssignee}
              @sl-change=${(e: any) => { this.newIssueAssignee = e.target.value; }}
              placeholder="选择处理人（可选）"
              clearable
            >
              <sl-option value="user_2">李制作（制版工程师）</sl-option>
              <sl-option value="user_3">王审校（审校专员）</sl-option>
              <sl-option value="user_1">张设计（设计师）</sl-option>
            </sl-select>
          </div>

          <div class="control-row">
            <div class="control-label">
              <span>问题位置</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <div style="flex: 1; padding: 10px 12px; background: #f8f9fa; border-radius: 6px; border: 1px solid #e9ecef; font-size: 13px; line-height: 1.6;">
                <div><b>页面：</b>第${this.currentPageIndex + 1}页</div>
                <div><b>行：</b>第${this.newIssueLineIndex + 1}行${this.newIssueCellIndex !== undefined ? `，<b>单元格：</b>第${this.newIssueCellIndex + 1}格` : ''}</div>
                ${this.newIssueDotRow !== undefined && this.newIssueDotCol !== undefined
                  ? `<div><b>点位：</b>第${this.newIssueDotRow + 1}行${String.fromCharCode(65 + this.newIssueDotCol)}列</div>`
                  : ''}
              </div>
              <sl-button variant="default" @click=${this.startSelectIssuePosition}>
                <sl-icon name="pin-map" slot="prefix"></sl-icon>
                点击画布选择
              </sl-button>
            </div>
          </div>

          <div class="tip-box" style="margin-top: 12px;">
            💡 <b>提示：</b>点击「点击画布选择」按钮，然后在盲文画布上点击具体的点位来精确标记问题位置。
          </div>

          ${this.isSelectingIssuePosition ? html`
            <div class="position-selecting-banner" style="margin-top: 12px; padding: 12px 16px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 8px; font-weight: 500;">
              <sl-icon name="hand-index-thumb" style="margin-right: 6px; vertical-align: -2px;"></sl-icon>
              请在左侧盲文画布上点击具体出错的点位...
            </div>
          ` : ''}
        </div>
        <sl-button slot="footer" variant="default" @click=${this.closeAddIssueDialog}>取消</sl-button>
        <sl-button slot="footer" variant="primary" @click=${this.handleAddIssue} ?disabled=${!this.newIssueTitle.trim()}>
          提交问题
        </sl-button>
      </sl-dialog>

      <sl-dialog
        .open=${this.showIssueDetailDialog && this.selectedIssue !== null}
        @sl-request-close=${this.closeIssueDetail}
        label="问题详情"
        style="--width: 560px;"
      >
        ${this.selectedIssue ? html`
          <div class="issue-detail-header">
            <div class="issue-detail-number">${this.getIssueIndex(this.selectedIssue.id)}</div>
            <div class="issue-detail-title">${this.selectedIssue.title}</div>
            <sl-badge
              variant=${this.selectedIssue.status === 'pending' ? 'warning' : this.selectedIssue.status === 'confirmed' ? 'primary' : this.selectedIssue.status === 'resolved' ? 'success' : 'neutral'}
              pill
            >
              ${getStatusLabel(this.selectedIssue.status)}
            </sl-badge>
          </div>

          <div class="issue-detail-meta">
            <div class="issue-detail-meta-item">
              <div class="issue-detail-meta-label">严重级别</div>
              <div class="issue-detail-meta-value" style="color: ${getSeverityColor(this.selectedIssue.severity)};">
                ● ${getSeverityLabel(this.selectedIssue.severity)}
              </div>
            </div>
            <div class="issue-detail-meta-item">
              <div class="issue-detail-meta-label">问题位置</div>
              <div class="issue-detail-meta-value">
                第${this.selectedIssue.pageIndex + 1}页 第${this.selectedIssue.lineIndex + 1}行${this.selectedIssue.cellIndex !== undefined ? `，第${this.selectedIssue.cellIndex + 1}格` : ''}
                ${this.selectedIssue.dotRow !== undefined && this.selectedIssue.dotCol !== undefined ? `，点${this.selectedIssue.dotRow + 1}${String.fromCharCode(65 + this.selectedIssue.dotCol)}` : ''}
              </div>
            </div>
            <div class="issue-detail-meta-item">
              <div class="issue-detail-meta-label">报告人</div>
              <div class="issue-detail-meta-value">${this.selectedIssue.reporterName}</div>
            </div>
            <div class="issue-detail-meta-item">
              <div class="issue-detail-meta-label">处理人</div>
              <div class="issue-detail-meta-value" style="display: flex; gap: 8px; align-items: center;">
                <span>${this.selectedIssue.assigneeName || '未分配'}</span>
                <sl-dropdown>
                  <sl-button size="small" variant="default" slot="trigger" caret>
                    <sl-icon name="person-plus" slot="prefix"></sl-icon>
                    分配
                  </sl-button>
                  <sl-menu>
                    <sl-menu-item @click=${() => this.handleAssignIssue('user_2', '李制作')}>
                      <sl-icon name="person" slot="prefix"></sl-icon>
                      李制作（制版工程师）
                    </sl-menu-item>
                    <sl-menu-item @click=${() => this.handleAssignIssue('user_3', '王审校')}>
                      <sl-icon name="person" slot="prefix"></sl-icon>
                      王审校（审校专员）
                    </sl-menu-item>
                    <sl-menu-item @click=${() => this.handleAssignIssue('user_1', '张设计')}>
                      <sl-icon name="person" slot="prefix"></sl-icon>
                      张设计（设计师）
                    </sl-menu-item>
                    <sl-divider></sl-divider>
                    <sl-menu-item @click=${() => this.handleAssignIssue('', '')}>
                      <sl-icon name="person-x" slot="prefix"></sl-icon>
                      取消分配
                    </sl-menu-item>
                  </sl-menu>
                </sl-dropdown>
              </div>
            </div>
          </div>

          <div class="issue-detail-section-title">
            <sl-icon name="info-circle"></sl-icon>
            问题描述
          </div>
          <div class="issue-detail-description">
            ${this.selectedIssue.description || '暂无描述'}
          </div>

          <div class="issue-detail-section-title">
            <sl-icon name="chat-dots"></sl-icon>
            讨论记录 (${this.selectedIssue.comments.length})
          </div>

          <div class="timeline" style="max-height: 250px; overflow-y: auto;">
            <div class="timeline-item action-status">
              <div class="timeline-content">
                <div class="timeline-author">
                  ${this.selectedIssue.reporterName}
                  <span class="timeline-time">${this.formatTime(this.selectedIssue.createdAt)}</span>
                </div>
                <div class="timeline-text">创建了此问题</div>
              </div>
            </div>
            ${this.selectedIssue.comments.map((comment) => html`
              <div class="timeline-item action-comment">
                <div class="timeline-content">
                  <div class="timeline-author">
                    ${comment.authorName}
                    <span class="timeline-time">${this.formatTime(comment.timestamp)}</span>
                  </div>
                  <div class="timeline-text">${comment.content}</div>
                </div>
              </div>
            `)}
          </div>

          <div class="comment-input-row">
            <sl-textarea
              .value=${this.newComment}
              @sl-input=${(e: any) => { this.newComment = e.target.value; }}
              placeholder="输入评论..."
              rows="2"
              style="flex: 1;"
            ></sl-textarea>
            <sl-button
              variant="primary"
              @click=${this.handleAddComment}
              ?disabled=${!this.newComment.trim()}
              style="align-self: flex-end;"
            >
              发送
            </sl-button>
          </div>

          <div class="issue-actions-row">
            <sl-button size="small" variant="warning" @click=${() => this.handleUpdateIssueStatus('pending')} ?disabled=${this.selectedIssue.status === 'pending'}>
              <sl-icon name="clock" slot="prefix"></sl-icon>
              设为待处理
            </sl-button>
            <sl-button size="small" variant="primary" @click=${() => this.handleUpdateIssueStatus('confirmed')} ?disabled=${this.selectedIssue.status === 'confirmed'}>
              <sl-icon name="check-circle" slot="prefix"></sl-icon>
              确认问题
            </sl-button>
            <sl-button size="small" variant="success" @click=${() => this.handleUpdateIssueStatus('resolved')} ?disabled=${this.selectedIssue.status === 'resolved'}>
              <sl-icon name="check2-circle" slot="prefix"></sl-icon>
              标记解决
            </sl-button>
            <sl-button size="small" variant="neutral" @click=${() => this.handleUpdateIssueStatus('rejected')} ?disabled=${this.selectedIssue.status === 'rejected'}>
              <sl-icon name="x-circle" slot="prefix"></sl-icon>
              驳回
            </sl-button>
          </div>
        ` : ''}
      </sl-dialog>

      <sl-dialog
        .open=${this.showVersionCompareDialog}
        @sl-request-close=${this.closeVersionCompare}
        label="版本对比"
        style="--width: 700px;"
      >
        <div class="compare-versions-select">
          <div>
            <div class="control-label" style="margin-bottom: 6px;">版本 A</div>
            <sl-select
              .value=${this.compareVersionA?.versionId || ''}
              @sl-change=${(e: any) => {
                const version = this.reviewState.versionHistory.find(v => v.versionId === e.target.value);
                this.compareVersionA = version || null;
              }}
            >
              ${this.reviewState.versionHistory.map((v) => html`
                <sl-option .value=${v.versionId}>
                  ${v.description} - ${this.formatTime(v.timestamp)}
                </sl-option>
              `)}
            </sl-select>
          </div>
          <div>
            <div class="control-label" style="margin-bottom: 6px;">版本 B</div>
            <sl-select
              .value=${this.compareVersionB?.versionId || ''}
              @sl-change=${(e: any) => {
                const version = this.reviewState.versionHistory.find(v => v.versionId === e.target.value);
                this.compareVersionB = version || null;
              }}
            >
              ${this.reviewState.versionHistory.map((v) => html`
                <sl-option .value=${v.versionId}>
                  ${v.description} - ${this.formatTime(v.timestamp)}
                </sl-option>
              `)}
            </sl-select>
          </div>
        </div>

        ${this.compareVersionA && this.compareVersionB
          ? html`
              <div class="compare-content">
                <div class="compare-side">
                  <div class="compare-side-header" style="background: rgba(231, 76, 60, 0.1);">
                    <sl-icon name="dash-circle" style="margin-right: 4px; color: #e74c3c;"></sl-icon>
                    版本 A - ${this.compareVersionA.description}
                  </div>
                  <div class="compare-side-body">
                    ${unsafeHTML(this.getBraillePreviewHtml(false, 0))}
                  </div>
                </div>
                <div class="compare-side">
                  <div class="compare-side-header" style="background: rgba(39, 174, 96, 0.1);">
                    <sl-icon name="plus-circle" style="margin-right: 4px; color: #27ae60;"></sl-icon>
                    版本 B - ${this.compareVersionB.description}
                  </div>
                  <div class="compare-side-body">
                    ${unsafeHTML(this.getBraillePreviewHtml(false, 0))}
                  </div>
                </div>
              </div>
              <div style="margin-top: 12px; font-size: 12px; color: #666;">
                <sl-icon name="info-circle" style="margin-right: 4px;"></sl-icon>
                共检测到 ${this.compareVersionB.modifiedCells.length} 处点位变更
              </div>
            `
          : html`
              <div class="issue-empty">
                <sl-icon name="layout-split"></sl-icon>
                <div>请选择两个版本进行对比</div>
              </div>
            `
        }
        <sl-button slot="footer" variant="primary" @click=${this.closeVersionCompare}>关闭</sl-button>
      </sl-dialog>

      <sl-dialog
        .open=${this.showSignatureDialog}
        @sl-request-close=${this.closeSignatureDialog}
        label="签字确认"
        style="--width: 450px;"
      >
        <div style="padding: 8px 0;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
            <sl-avatar initials=${this.reviewState.currentUser.name.slice(0, 1)} label=${this.reviewState.currentUser.name} style="--size: 48px;"></sl-avatar>
            <div>
              <div style="font-weight: 600; color: #2c3e50;">${this.reviewState.currentUser.name}</div>
              <div style="font-size: 12px; color: #888;">${this.reviewState.currentUser.role}</div>
            </div>
          </div>

          <div class="control-row">
            <div class="control-label">
              <span>签字意见</span>
            </div>
            <sl-textarea
              .value=${this.signatureComment}
              @sl-input=${(e: any) => { this.signatureComment = e.target.value; }}
              placeholder="请输入签字意见（可选）..."
              rows="3"
            ></sl-textarea>
          </div>
        </div>
        <sl-button slot="footer" variant="default" @click=${this.closeSignatureDialog}>取消</sl-button>
        <sl-button slot="footer" variant="danger" @click=${() => this.handleSign('rejection')}>
          <sl-icon name="x-circle" slot="prefix"></sl-icon>
          驳回签字
        </sl-button>
        <sl-button slot="footer" variant="success" @click=${() => this.handleSign('approval')}>
          <sl-icon name="check-circle" slot="prefix"></sl-icon>
          通过签字
        </sl-button>
      </sl-dialog>
    `;
  }
}
