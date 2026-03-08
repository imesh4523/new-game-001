-- ⚠️ DANGER: Transaction Clearing Scripts
-- Run these in Digital Ocean Database Console
-- These operations are IRREVERSIBLE - make sure to backup first!

-- ============================================
-- Script 1: Clear ALL transactions for ALL users
-- ============================================
-- WARNING: This deletes ALL transaction history from the system!

DELETE FROM transactions;

-- Verify deletion:
SELECT COUNT(*) as remaining_transactions FROM transactions;


-- ============================================
-- Script 2: Clear transactions for a SPECIFIC user
-- ============================================
-- Replace 'USER_ID_HERE' with the actual user ID

DELETE FROM transactions 
WHERE user_id = 'USER_ID_HERE';

-- Verify deletion for that user:
SELECT COUNT(*) as remaining_transactions 
FROM transactions 
WHERE user_id = 'USER_ID_HERE';


-- ============================================
-- Script 3: Clear transactions by Telegram ID
-- ============================================
-- Replace 'TELEGRAM_ID_HERE' with the actual Telegram ID

DELETE FROM transactions 
WHERE user_id IN (
  SELECT id FROM users WHERE telegram_id = 'TELEGRAM_ID_HERE'
);

-- Verify deletion:
SELECT COUNT(*) as remaining_transactions 
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.telegram_id = 'TELEGRAM_ID_HERE';


-- ============================================
-- Script 4: Clear only FAILED transactions
-- ============================================
-- This removes only failed transactions (safer option)

DELETE FROM transactions 
WHERE status = 'failed';

-- Verify:
SELECT COUNT(*) as remaining_transactions FROM transactions;
SELECT status, COUNT(*) as count FROM transactions GROUP BY status;


-- ============================================
-- Script 5: Clear only PENDING transactions older than 24 hours
-- ============================================
-- This removes stuck pending transactions

DELETE FROM transactions 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '24 hours';

-- Verify:
SELECT 
  status, 
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM transactions 
GROUP BY status;


-- ============================================
-- Script 6: View user's transactions before deletion
-- ============================================
-- Check what will be deleted first

SELECT 
  t.id,
  t.type,
  t.amount,
  t.currency,
  t.status,
  t.created_at,
  u.telegram_id,
  u.username
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.telegram_id = 'TELEGRAM_ID_HERE'
ORDER BY t.created_at DESC;


-- ============================================
-- Script 7: Backup transactions before deletion
-- ============================================
-- Create a backup table first

CREATE TABLE transactions_backup_20251125 AS 
SELECT * FROM transactions;

-- Then delete:
DELETE FROM transactions;

-- To restore if needed:
-- INSERT INTO transactions SELECT * FROM transactions_backup_20251125;


-- ============================================
-- Script 8: Clear transactions and reset user balances
-- ============================================
-- ⚠️ EXTREME DANGER: This resets everything!

-- Clear all transactions
DELETE FROM transactions;

-- Reset all user balances to 0
UPDATE users SET balance = 0, frozen_balance = 0;

-- Verify:
SELECT 
  COUNT(*) as total_users,
  SUM(balance) as total_balance,
  SUM(frozen_balance) as total_frozen
FROM users;


-- ============================================
-- Script 9: Archive old transactions (safer than deletion)
-- ============================================
-- Move old transactions to archive table instead of deleting

-- Create archive table (run once):
CREATE TABLE IF NOT EXISTS transactions_archive (LIKE transactions INCLUDING ALL);

-- Move transactions older than 30 days:
INSERT INTO transactions_archive 
SELECT * FROM transactions 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Delete from main table:
DELETE FROM transactions 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Verify:
SELECT 
  'Active' as table_name, COUNT(*) as count 
FROM transactions
UNION ALL
SELECT 
  'Archive' as table_name, COUNT(*) as count 
FROM transactions_archive;
