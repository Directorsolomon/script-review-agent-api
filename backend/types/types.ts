export type Region = 'NG' | 'KE' | 'GH' | 'ZA' | 'GLOBAL';
export type Platform = 'YouTube' | 'Cinema' | 'VOD' | 'TV';
export type DocType = 'rubric' | 'style' | 'platform' | 'legal' | 'playbook' | 'other';

export interface DocRecord {
  id: string;
  title: string;
  version: string;
  doc_type: DocType;
  region?: Region;
  platform?: Platform;
  tags: string[];
  status: 'active' | 'inactive' | 'experimental';
  s3_key: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionRecord {
  id: string;
  writer_name: string;
  writer_email: string;
  script_title: string;
  format: 'feature' | 'series' | 'youtube_movie';
  draft_version: '1st' | '2nd' | '3rd';
  genre?: string;
  region?: Region;
  platform?: Platform;
  file_s3_key?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface ReportRecord {
  submission_id: string;
  overall_score?: number;
  report_json?: any;
  created_at: string;
  updated_at: string;
}

export interface AgentReview {
  name: string;
  score: number;
  findings: Array<{
    id: string;
    summary: string;
    evidence: Array<{
      scene_index?: number;
      page_range?: number[];
      text_excerpt?: string;
    }>;
    severity: 'info' | 'minor' | 'major' | 'critical';
  }>;
  recommendations: string[];
  citations: Array<{
    source_id: string;
    version: string;
    section?: string;
    line_range?: number[];
  }>;
  confidence: number;
}

export interface FinalReport {
  submission_id: string;
  overall_score: number;
  buckets: Array<{ name: string; score: number }>;
  highlights: string[];
  risks: string[];
  action_plan: Array<{
    description: string;
    priority: 'high' | 'med' | 'low';
    owner?: string;
  }>;
  references: Array<{
    source_id: string;
    version: string;
    section?: string;
    line_range?: number[];
  }>;
  delivery?: {
    pdf_uri?: string | null;
    html_uri?: string | null;
  };
}
