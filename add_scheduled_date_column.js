const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function addScheduledDateColumn() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Connected successfully!');

    // First, check the current structure of the auto_messages table
    console.log('\nChecking current auto_messages table structure...');
    const { data: currentStructure, error: structureError } = await supabase
      .rpc('get_table_structure', { table_name: 'auto_messages' });

    if (structureError) {
      // Try alternative approach using a direct query
      const { data: altStructure, error: altError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'auto_messages')
        .order('ordinal_position');

      if (altError) {
        console.log('Cannot query table structure directly. Let\'s try to describe the table...');
        // Try to select from the table to understand its structure
        const { data: sampleData, error: sampleError } = await supabase
          .from('auto_messages')
          .select('*')
          .limit(1);

        if (sampleError) {
          console.error('Error accessing auto_messages table:', sampleError.message);
          console.log('Proceeding to add the column anyway...');
        } else {
          console.log('Sample record from auto_messages table:');
          console.log(sampleData[0] || 'No records found');
          if (sampleData[0] && sampleData[0].scheduled_date !== undefined) {
            console.log('Column "scheduled_date" already exists!');
            return;
          }
        }
      } else {
        console.log('Current auto_messages table structure:');
        console.table(altStructure);

        const columnExists = altStructure.some(row => row.column_name === 'scheduled_date');
        if (columnExists) {
          console.log('\nColumn "scheduled_date" already exists!');
          return;
        }
      }
    } else {
      console.log('Current auto_messages table structure:');
      console.table(currentStructure);

      const columnExists = currentStructure.some(row => row.column_name === 'scheduled_date');
      if (columnExists) {
        console.log('\nColumn "scheduled_date" already exists!');
        return;
      }
    }

    // Add the scheduled_date column using SQL
    console.log('\nAdding scheduled_date column...');
    const { data: alterResult, error: alterError } = await supabase
      .rpc('execute_sql', {
        sql_query: 'ALTER TABLE auto_messages ADD COLUMN scheduled_date DATE;'
      });

    if (alterError) {
      console.error('Error adding column with RPC:', alterError.message);
      console.log('Note: This might be expected if RPC function doesn\'t exist or permissions are limited.');
      console.log('You may need to run this SQL command manually in the Supabase dashboard:');
      console.log('ALTER TABLE auto_messages ADD COLUMN scheduled_date DATE;');
    } else {
      console.log('Successfully added scheduled_date column!');
    }

    // Try to verify the column was added by attempting to select from it
    console.log('\nVerifying the new column...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('auto_messages')
      .select('id, scheduled_date')
      .limit(1);

    if (verifyError) {
      if (verifyError.message.includes('scheduled_date')) {
        console.log('Column was not added successfully. You\'ll need to add it manually.');
        console.log('Please run this SQL command in your Supabase SQL editor:');
        console.log('ALTER TABLE auto_messages ADD COLUMN scheduled_date DATE;');
      } else {
        console.log('Verification error (but column might still exist):', verifyError.message);
      }
    } else {
      console.log('✓ Column "scheduled_date" verified successfully!');
    }

    // Final structure check
    console.log('\nFinal verification - attempting to query both date and time columns...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('auto_messages')
      .select('id, scheduled_date, scheduled_time')
      .limit(1);

    if (finalError) {
      console.log('Final check result:', finalError.message);
    } else {
      console.log('✓ Both scheduled_date (DATE) and scheduled_time columns are accessible!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the script
addScheduledDateColumn();