const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAutoMessages() {
  try {
    console.log('Starting auto_messages updates...\n');

    // Update first record (20:00:00) to 2025-12-09
    console.log('Updating first record (20:00:00) to scheduled_date: 2025-12-09');
    const { data: update1, error: error1 } = await supabase
      .from('auto_messages')
      .update({ scheduled_date: '2025-12-09' })
      .eq('id', '34805ddb-e3a7-4acb-8488-7e806a9fb22a')
      .select();

    if (error1) {
      console.error('Error updating first record:', error1);
    } else {
      console.log('✓ First record updated successfully:', update1);
    }

    // Update second record (19:30:00) to 2025-12-08
    console.log('\nUpdating second record (19:30:00) to scheduled_date: 2025-12-08');
    const { data: update2, error: error2 } = await supabase
      .from('auto_messages')
      .update({ scheduled_date: '2025-12-08' })
      .eq('id', 'be0d0ee5-7574-4905-821e-1e09208b7ba5')
      .select();

    if (error2) {
      console.error('Error updating second record:', error2);
    } else {
      console.log('✓ Second record updated successfully:', update2);
    }

    // Verify the updates by querying both records
    console.log('\n=== Verification: Querying updated records ===');

    const { data: records, error: queryError } = await supabase
      .from('auto_messages')
      .select('id, scheduled_date, scheduled_time, message, created_at')
      .in('id', ['34805ddb-e3a7-4acb-8488-7e806a9fb22a', 'be0d0ee5-7574-4905-821e-1e09208b7ba5'])
      .order('scheduled_time', { ascending: false });

    if (queryError) {
      console.error('Error querying records:', queryError);
    } else {
      console.log('Updated records:');
      records.forEach((record, index) => {
        console.log(`\nRecord ${index + 1}:`);
        console.log(`  ID: ${record.id}`);
        console.log(`  Scheduled Date: ${record.scheduled_date}`);
        console.log(`  Scheduled Time: ${record.scheduled_time}`);
        console.log(`  Message: ${record.message?.substring(0, 100)}...`);
        console.log(`  Created At: ${record.created_at}`);
      });
    }

    console.log('\n=== Update process completed ===');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the update function
updateAutoMessages();