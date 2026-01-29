/*
  # Update Currency Default to INR

  1. Changes
    - Update the default currency for expenses table from USD to INR
    - This only affects new expenses created after this migration
    - Existing expenses retain their current currency values

  2. Notes
    - INR (Indian Rupee) is now the default currency
    - Users can still select any supported currency when creating expenses
*/

-- Update the default value for currency column in expenses table
ALTER TABLE expenses 
ALTER COLUMN currency SET DEFAULT 'INR';
