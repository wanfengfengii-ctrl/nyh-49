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
  type: 'error' | 'warning' | 'info' | 'selection' | 'diff-added' | 'diff-removed';
  color?: string;
}

export type DiffHighlightType = 'added' | 'removed' | 'modified';

export interface DiffCellInfo {
  lineIndex: number;
  cellIndex: number;
  type: DiffHighlightType;
  dotsBefore?: boolean[][];
  dotsAfter?: boolean[][];
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

export type StatusLogAction =
  | 'created'
  | 'status_changed'
  | 'assignee_changed'
  | 'comment_added'
  | 'severity_changed'
  | 'version_snapshot';

export interface StatusLogEntry {
  id: string;
  issueId: string;
  action: StatusLogAction;
  authorId: string;
  authorName: string;
  timestamp: number;
  oldValue?: string;
  newValue?: string;
  description: string;
  metadata?: Record<string, any>;
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
  statusLogs: StatusLogEntry[];
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

export interface ReviewStatistics {
  totalIssues: number;
  pendingIssues: number;
  confirmedIssues: number;
  resolvedIssues: number;
  rejectedIssues: number;
  criticalIssues: number;
  majorIssues: number;
  minorIssues: number;
  suggestionIssues: number;
  issuesByPage: Record<number, number>;
  issuesByAssignee: Record<string, number>;
  issuesBySeverity: Record<ReviewIssueSeverity, number>;
  issuesByStatus: Record<ReviewIssueStatus, number>;
  resolutionRate: number;
  avgResolutionTime?: number;
  totalSignatures: number;
  versionCount: number;
  reviewCycleDays?: number;
}

export interface IssueFilterOptions {
  status: ReviewIssueStatus | 'all';
  severity: ReviewIssueSeverity | 'all';
  pageIndex: number | 'all';
  assigneeId: string | 'all';
  reporterId: string | 'all';
  keyword: string;
}

export interface ReviewState {
  issues: ReviewIssue[];
  currentUser: Reviewer;
  reviewers: Reviewer[];
  reviewStatus: ReviewStatus;
  signatures: ReviewSignature[];
  versionHistory: VersionDiff[];
  activeIssueId?: string;
  showIssueMarkers: boolean;
  selectedIssueFilter: ReviewIssueStatus | 'all';
  selectedSeverityFilter: ReviewIssueSeverity | 'all';
  selectedPageFilter: number | 'all';
  selectedAssigneeFilter: string | 'all';
  showDiffView: boolean;
  diffVersionA?: string;
  diffVersionB?: string;
  linkWithValidation: boolean;
  linkWithPlateView: boolean;
  showStatsPanel: boolean;
}

export const DEFAULT_REVIEWER: Reviewer = {
  id: 'user_1',
  name: '当前用户',
  role: '审校员',
};

export const DEFAULT_REVIEWERS: Reviewer[] = [
  { id: 'user_1', name: '张审校', role: '高级审校员' },
  { id: 'user_2', name: '李制作', role: '制版工程师' },
  { id: 'user_3', name: '王编辑', role: '责任编辑' },
  { id: 'user_4', name: '赵质检', role: '质量检查员' },
];

export function createInitialReviewState(): ReviewState {
  return {
    issues: [],
    currentUser: DEFAULT_REVIEWERS[0],
    reviewers: DEFAULT_REVIEWERS,
    reviewStatus: 'draft',
    signatures: [],
    versionHistory: [],
    showIssueMarkers: true,
    selectedIssueFilter: 'all',
    selectedSeverityFilter: 'all',
    selectedPageFilter: 'all',
    selectedAssigneeFilter: 'all',
    showDiffView: false,
    linkWithValidation: true,
    linkWithPlateView: true,
    showStatsPanel: false,
  };
}
