-- Fix user IDs: map local UUIDs to production UUIDs
-- student@aiexam.uz: local -> prod
UPDATE exam_platform.exam_attempts SET user_id = 'e49dfe7b-b6f9-4661-aed7-7bda3190bfd7' WHERE user_id = '12707bcf-024e-4232-bf12-e1c920604a45';
-- admin@aiexam.uz: local -> prod
UPDATE exam_platform.exam_attempts SET user_id = 'dd3e54fb-3def-4074-b3c9-282944d21a06' WHERE user_id = 'fb1e25aa-a963-4519-8673-b09d4baea306';
-- bobomurod@aiexam.uz: local -> prod
UPDATE exam_platform.exam_attempts SET user_id = 'f117fdda-aed0-48b1-b11a-8cd09227f113' WHERE user_id = '9314aaa8-2ce0-4556-841c-a79b731d4ded';
-- faxriddin@aiexam.uz: local -> prod
UPDATE exam_platform.exam_attempts SET user_id = '09e51c95-3578-4894-90c4-15710f4d7840' WHERE user_id = '86f95287-37c6-4955-afb4-0b310d0f1f80';
