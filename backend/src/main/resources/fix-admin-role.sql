-- ============================================================
--  Run this directly in MySQL if you still get 403 on /admin
--  mysql -u root -p cyberbank < fix-admin-role.sql
-- ============================================================

USE cyberbank;

-- 1. Check what role the admin currently has
SELECT id, username, email, role, is_active FROM users WHERE username = 'admin';

-- 2. Force-set the admin role
UPDATE users SET role = 'ADMIN', is_active = TRUE WHERE username = 'admin';

-- 3. Confirm the fix
SELECT id, username, role, is_active FROM users WHERE username = 'admin';

-- 4. Show all users and their roles
SELECT id, username, role, is_active FROM users ORDER BY id;
