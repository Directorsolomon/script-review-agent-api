-- Remove sample documentation
DELETE FROM admin_doc_chunks WHERE doc_id IN ('sample-rubric-001', 'sample-style-001', 'sample-platform-001');
DELETE FROM docs WHERE id IN ('sample-rubric-001', 'sample-style-001', 'sample-platform-001');
