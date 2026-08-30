export interface MemberRecord {
  id: string;
  name: string;
  pinyin?: string;
  roomId?: string;
  liveRoomId?: string;
  account?: string;
  group: string;
  team?: string;
  period?: string;
  avatar?: string;
}

export interface MemberDirectoryData {
  buildTime: string;
  members: MemberRecord[];
  source: string;
}

export interface LiveSummary {
  liveId: string;
  title: string;
  memberName?: string;
  memberId?: string;
  roomId?: string;
  time?: string;
  status: string;
  cover?: string;
  liveType?: number;
  liveMode?: number;
}

export interface LiveListPage {
  items: LiveSummary[];
  next: string;
  status: 'live' | 'recording';
  groupId: number;
}

export interface LiveDetail {
  liveId: string;
  title: string;
  memberName?: string;
  memberId?: string;
  roomId?: string;
  time?: string;
  endTime?: string;
  status: string;
  cover?: string;
  playCount?: string;
}

export interface PerformanceSummary {
  liveId: string;
  title: string;
  subtitle?: string;
  time?: string;
  status: string;
}

export interface PerformanceListPage {
  items: PerformanceSummary[];
  next: string;
  record: boolean;
  groupId: number;
}

export interface ToolError {
  code: string;
  type: string;
  message: string;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}
