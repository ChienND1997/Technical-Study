-- One-off: the 13 rebuilt migrations differ byte-wise from the lost originals, so align the recorded checksums.
-- Run once:  Get-Content db\resync_checksums.sql | docker exec -i kemtech-db-1 psql -U kemtech kemtech

UPDATE schema_migrations SET checksum = '9066d58a59471bf8b2c8b0bd3b5dd4dc9ff6af3342f28bbc32c03adbdf6361d6' WHERE version = '0001_extensions.sql';
UPDATE schema_migrations SET checksum = '612a51c0fe369dab4e852c63f65ede631a0789e0041c0262041c154312f07e6c' WHERE version = '0002_content.sql';
UPDATE schema_migrations SET checksum = '4e7e4924f7c0015e78d21a819204570622fa6e32decc787636d9530a555d8fb2' WHERE version = '0003_plans.sql';
UPDATE schema_migrations SET checksum = '06deb4fe2b0ccafa1f0cfc5252d3b09a3b811cd0c44fb5cebc233bcac2b8958f' WHERE version = '0005_section_rewards.sql';
UPDATE schema_migrations SET checksum = 'e28a52ac0a64fa371687745fe8a0112addc21484c6ae96dac37ad998a845d0fb' WHERE version = '0006_topic_icon.sql';
UPDATE schema_migrations SET checksum = '785685ee45968e65cc4e61f6a5b6ddab156692d9902d294a4c8c044f84bb0ee2' WHERE version = '0007_auth.sql';
UPDATE schema_migrations SET checksum = '2facb75e9dfcd5edf6f76f25756de84ed2aae597715b37a7ec4be4be0a1f5e51' WHERE version = '0008_game_journal.sql';
UPDATE schema_migrations SET checksum = '20c3ee72cbd5aee8a70aeb96f1d43a54c44ef7df2ace132be6954ab0476d1f6e' WHERE version = '0009_drop_password.sql';
UPDATE schema_migrations SET checksum = 'c1ee6fb009250ef1e976e50ae8ede132a4bea0bbbbc2c5dd533bfd8bba275fd9' WHERE version = '0010_roles_blog_posts.sql';
UPDATE schema_migrations SET checksum = 'f3a39b46c4f0d6e9d23ad4fa990bf61a397573d030b239540f4ae85b228b80d8' WHERE version = '0011_password_login.sql';
UPDATE schema_migrations SET checksum = '3c12324fd70d0f23aa63ae9eb32ceaad63b60063a5ab0a7f6d0840cf43d1e751' WHERE version = '0012_blog_comments.sql';
UPDATE schema_migrations SET checksum = '831b3bb236c3c45a8ed9380f2787eb3abcfd5dd1bfdb129c8b4ef509a6e3a436' WHERE version = '0014_drop_journal.sql';
UPDATE schema_migrations SET checksum = '21b5599334a6837cca123378349c2b09402322047c15858483937e1470370073' WHERE version = '0016_notification_count.sql';
