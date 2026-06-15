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
  type: 'unknown_char' | 'out_of_bounds' | 'invalid_spacing' | 'mirror_mismatch' | 'imprint_mismatch';
  lineIndex: number;
  cellIndex?: number;
  pageIndex?: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface DotPosition {
  lineIndex: number;
  cellIndex: number;
  dotRow: number;
  dotCol: number;
}

export interface CellPosition {
  pageIndex: number;
  lineIndex: number;
  cellIndex: number;
}

export interface PaginatedDocument {
  pages: BrailleDocument[];
  pageLineRanges: { startLine: number; endLine: number }[];
  overflow: boolean;
}

export interface CalibrationConfig {
  showBaselines: boolean;
  showRegistrationHoles: boolean;
  showSafetyMargin: boolean;
  safetyMarginSize: number;
  baselineColor: string;
  holeColor: string;
  marginColor: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: 'toggle_dot' | 'input_text' | 'change_spacing' | 'change_radius' | 'change_plate_size' | 'reset';
  description: string;
  documentBefore: BrailleDocument;
  documentAfter: BrailleDocument;
  plateWidthBefore?: number;
  plateWidthAfter?: number;
  plateHeightBefore?: number;
  plateHeightAfter?: number;
  metadata?: Record<string, any>;
}

export interface HistoryManagerState {
  entries: HistoryEntry[];
  currentIndex: number;
}

export interface HighlightInfo {
  pageIndex: number;
  lineIndex: number;
  cellIndex?: number;
  dotRow?: number;
  dotCol?: number;
  type: 'error' | 'warning' | 'info' | 'selection';
  color?: string;
}

export const CELL_COLS = 2;
export const CELL_ROWS = 3;
export const DEFAULT_DOT_RADIUS = 10;
export const DEFAULT_LINE_SPACING = 40;
export const DEFAULT_CHAR_SPACING = 20;
export const DEFAULT_PLATE_PADDING = 30;

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  showBaselines: false,
  showRegistrationHoles: false,
  showSafetyMargin: false,
  safetyMarginSize: 20,
  baselineColor: '#3498db',
  holeColor: '#e74c3c',
  marginColor: '#27ae60',
};

export type ReviewIssueStatus = 'pending' | 'confirmed' | 'rejected' | 'resolved';
export type ReviewIssueSeverity = 'critical' | 'major' | 'minor' | 'suggestion';
export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export interface Reviewer {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

export interface ReviewComment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: number;
  attachments?: string[];
}

export interface ReviewIssue {
  id: string;
  title: string;
  description: string;
  status: ReviewIssueStatus;
  severity: ReviewIssueSeverity;
  pageIndex: number;
  lineIndex: number;
  cellIndex?: number;
  dotRow?: number;
  dotCol?: number;
  assigneeId?: string;
  assigneeName?: string;
  reporterId: string;
  reporterName: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  comments: ReviewComment[];
  versionSnapshot?: BrailleDocument;
  tags?: string[];
}

export interface ReviewSignature {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  timestamp: number;
  signatureType: 'approval' | 'rejection';
  comment?: string;
}

export interface VersionDiff {
  versionId: string;
  timestamp: number;
  description: string;
  documentBefore: BrailleDocument;
  documentAfter: BrailleDocument;
  modifiedCells: { lineIndex: number; cellIndex: number; dotsBefore: boolean[][]; dotsAfter: boolean[][] }[];
  author: string;
}

export interface ReviewState {
  issues: ReviewIssue[];
  currentUser: Reviewer;
  reviewStatus: ReviewStatus;
  signatures: ReviewSignature[];
  versionHistory: VersionDiff[];
  activeIssueId?: string;
  showIssueMarkers: boolean;
  selectedIssueFilter: ReviewIssueStatus | 'all';
  selectedSeverityFilter: ReviewIssueSeverity | 'all';
}

export const DEFAULT_REVIEWER: Reviewer = {
  id: 'user_1',
  name: '当前用户',
  role: '审校员',
};

export function createInitialReviewState(): ReviewState {
  return {
    issues: [],
    currentUser: DEFAULT_REVIEWER,
    reviewStatus: 'draft',
    signatures: [],
    versionHistory: [],
    showIssueMarkers: true,
    selectedIssueFilter: 'all',
    selectedSeverityFilter: 'all',
  };
}
