/*
  # Travel Expense Splitting App Schema

  ## Overview
  This migration creates the database schema for a travel expense splitting application
  where one organizer manages trips, members, and expenses.

  ## New Tables
  
  ### 1. `trips`
  Stores information about each trip created by users
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Trip name/title
  - `created_by` (uuid) - User who created the trip (references auth.users)
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `members`
  Stores trip participants (non-authenticated users, just names)
  - `id` (uuid, primary key) - Unique identifier
  - `trip_id` (uuid) - References trips table
  - `name` (text) - Member's display name
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `expenses`
  Stores individual expenses within a trip
  - `id` (uuid, primary key) - Unique identifier
  - `trip_id` (uuid) - References trips table
  - `name` (text) - Expense description/name
  - `amount` (decimal) - Total expense amount
  - `currency` (text) - Currency code (USD, EUR, INR, etc.)
  - `paid_by_member_id` (uuid) - References members table
  - `date` (date) - Expense date
  - `category` (text) - Optional category
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `expense_splits`
  Tracks how each expense is split among members
  - `id` (uuid, primary key) - Unique identifier
  - `expense_id` (uuid) - References expenses table
  - `member_id` (uuid) - References members table
  - `share_amount` (decimal) - Amount this member owes for this expense
  - `created_at` (timestamptz) - Creation timestamp

  ## Security
  
  1. Enable RLS on all tables
  2. Users can only access trips they created
  3. Users can only access members, expenses, and splits for their trips
  4. All policies check authentication and ownership

  ## Notes
  - Multi-currency support included
  - Flexible split amounts allow for equal or custom splits
  - Soft deletes not implemented (can be added later if needed)
  - Indexes added for foreign keys to improve query performance
*/

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount decimal(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'USD',
  paid_by_member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text DEFAULT 'Other',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create expense_splits table
CREATE TABLE IF NOT EXISTS expense_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  share_amount decimal(12, 2) NOT NULL CHECK (share_amount >= 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(expense_id, member_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trips_created_by ON trips(created_by);
CREATE INDEX IF NOT EXISTS idx_members_trip_id ON members(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by_member_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_member_id ON expense_splits(member_id);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trips table
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- RLS Policies for members table
CREATE POLICY "Users can view members of own trips"
  ON members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = members.trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can add members to own trips"
  ON members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update members in own trips"
  ON members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = members.trip_id
      AND trips.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete members from own trips"
  ON members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = members.trip_id
      AND trips.created_by = auth.uid()
    )
  );

-- RLS Policies for expenses table
CREATE POLICY "Users can view expenses in own trips"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = expenses.trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can add expenses to own trips"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update expenses in own trips"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = expenses.trip_id
      AND trips.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = trip_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete expenses from own trips"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips
      WHERE trips.id = expenses.trip_id
      AND trips.created_by = auth.uid()
    )
  );

-- RLS Policies for expense_splits table
CREATE POLICY "Users can view splits in own trip expenses"
  ON expense_splits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trips ON trips.id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can add splits to own trip expenses"
  ON expense_splits FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trips ON trips.id = expenses.trip_id
      WHERE expenses.id = expense_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update splits in own trip expenses"
  ON expense_splits FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trips ON trips.id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trips.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trips ON trips.id = expenses.trip_id
      WHERE expenses.id = expense_id
      AND trips.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete splits from own trip expenses"
  ON expense_splits FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      JOIN trips ON trips.id = expenses.trip_id
      WHERE expenses.id = expense_splits.expense_id
      AND trips.created_by = auth.uid()
    )
  );