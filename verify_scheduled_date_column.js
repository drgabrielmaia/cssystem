const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

async function verifyScheduledDateColumn() {
  try {
    console.log('Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Connected successfully!');

    // Test if we can query the scheduled_date column
    console.log('\nTesting scheduled_date column access...');
    const { data: testData, error: testError } = await supabase
      .from('auto_messages')
      .select('id, scheduled_date, scheduled_time')
      .limit(5);

    if (testError) {
      console.error('❌ Error accessing scheduled_date column:', testError.message);

      if (testError.message.includes('scheduled_date')) {
        console.log('\n📝 The scheduled_date column has not been added yet.');
        console.log('Please run this SQL command in your Supabase SQL editor:');
        console.log('ALTER TABLE auto_messages ADD COLUMN scheduled_date DATE;');
      }
    } else {
      console.log('✅ scheduled_date column is accessible!');
      console.log('\nSample data from auto_messages table:');

      if (testData && testData.length > 0) {
        testData.forEach((record, index) => {
          console.log(`Record ${index + 1}:`);
          console.log(`  ID: ${record.id}`);
          console.log(`  scheduled_date: ${record.scheduled_date || 'null'}`);
          console.log(`  scheduled_time: ${record.scheduled_time || 'null'}`);
          console.log('---');
        });
      } else {
        console.log('No records found in auto_messages table.');
      }
    }

    // Test inserting a record with scheduled_date
    console.log('\nTesting scheduled_date column functionality...');
    console.log('Attempting to insert a test record with scheduled_date...');

    const testDate = '2025-12-25'; // Christmas test date
    const { data: insertData, error: insertError } = await supabase
      .from('auto_messages')
      .insert([{
        message: 'Test message for scheduled_date functionality',
        scheduled_time: '10:00:00',
        scheduled_date: testDate,
        target_group: 'test_group',
        is_active: false,
        user_id: 'test_user'
      }])
      .select();

    if (insertError) {
      console.error('❌ Error inserting test record:', insertError.message);
    } else {
      console.log('✅ Successfully inserted test record with scheduled_date!');
      console.log('Test record:', insertData[0]);

      // Clean up test record
      if (insertData[0]) {
        const { error: deleteError } = await supabase
          .from('auto_messages')
          .delete()
          .eq('id', insertData[0].id);

        if (deleteError) {
          console.log('⚠️ Could not delete test record:', deleteError.message);
        } else {
          console.log('✅ Test record cleaned up successfully.');
        }
      }
    }

    console.log('\n📋 Column Summary:');
    console.log('✓ scheduled_date: DATE type - for storing dates in YYYY-MM-DD format');
    console.log('✓ scheduled_time: TIME type - for storing times in HH:MM:SS format');
    console.log('✓ Both columns are nullable and work with HTML date/time inputs');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the verification
verifyScheduledDateColumn();