-- Insert sample documentation to help with initial testing and deployment
-- This ensures the system has some reference documents for analysis

INSERT INTO docs (id, title, version, doc_type, region, platform, tags, status, s3_key, created_at, updated_at)
VALUES 
  (
    'sample-rubric-001',
    'YouTube Script Evaluation Rubric',
    '1.0',
    'rubric',
    'GLOBAL',
    'YouTube',
    ARRAY['evaluation', 'scoring', 'youtube', 'structure'],
    'active',
    'sample/rubric.txt',
    NOW(),
    NOW()
  ),
  (
    'sample-style-001', 
    'Nollywood Style Guidelines',
    '1.0',
    'style',
    'NG',
    'YouTube',
    ARRAY['nollywood', 'style', 'dialogue', 'cultural'],
    'active',
    'sample/style.txt',
    NOW(),
    NOW()
  ),
  (
    'sample-platform-001',
    'YouTube Content Guidelines',
    '1.0', 
    'platform',
    'GLOBAL',
    'YouTube',
    ARRAY['youtube', 'platform', 'retention', 'engagement'],
    'active',
    'sample/platform.txt',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  version = EXCLUDED.version,
  doc_type = EXCLUDED.doc_type,
  region = EXCLUDED.region,
  platform = EXCLUDED.platform,
  tags = EXCLUDED.tags,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Insert sample chunks for the documents to enable immediate functionality
INSERT INTO admin_doc_chunks (doc_id, section, line_start, line_end, text, priority_weight, embedding)
VALUES 
  (
    'sample-rubric-001',
    'Structure Evaluation',
    1,
    10,
    'Structure Evaluation Criteria: Assess the three-act structure, inciting incident timing, midpoint turns, and climax effectiveness. YouTube scripts should have strong hooks within the first 30 seconds and maintain engagement throughout. Score 1-10 based on clarity of story beats and pacing effectiveness.',
    1.0,
    NULL
  ),
  (
    'sample-rubric-001', 
    'Character Development',
    11,
    20,
    'Character Development Assessment: Evaluate protagonist goals, character arcs, and relationship dynamics. Strong characters have clear motivations, face meaningful obstacles, and show growth. YouTube content benefits from relatable, engaging characters that connect with the target audience.',
    1.0,
    NULL
  ),
  (
    'sample-style-001',
    'Dialogue Guidelines',
    1,
    15,
    'Nollywood Dialogue Standards: Authentic dialogue should reflect Nigerian speech patterns, cultural references, and social dynamics. Avoid stereotypes while embracing cultural specificity. Code-switching between English and local languages should feel natural and serve character development.',
    1.0,
    NULL
  ),
  (
    'sample-style-001',
    'Cultural Representation', 
    16,
    30,
    'Cultural Authenticity: Stories should represent Nigerian culture with depth and respect. Avoid clichés and one-dimensional portrayals. Include authentic details about family structures, religious practices, social hierarchies, and contemporary issues facing Nigerian society.',
    1.0,
    NULL
  ),
  (
    'sample-platform-001',
    'YouTube Optimization',
    1,
    12,
    'YouTube Content Strategy: Scripts should be optimized for viewer retention with strong openings, regular engagement beats, and clear value propositions. Consider thumbnail and title implications. Structure content for 8-15 minute optimal length with natural break points.',
    1.0,
    NULL
  ),
  (
    'sample-platform-001',
    'Audience Engagement',
    13,
    25,
    'Engagement Techniques: Use cliffhangers, questions, and emotional hooks to maintain viewer attention. Include clear calls-to-action and community building elements. Content should be shareable and discussion-worthy to maximize organic reach and engagement.',
    1.0,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
