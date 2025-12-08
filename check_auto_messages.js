const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAutoMessages() {
    try {
        console.log('Connecting to Supabase database...');
        console.log('URL:', supabaseUrl);
        console.log('');

        // Query all records from auto_messages table
        console.log('Querying auto_messages table...');
        const { data, error } = await supabase
            .from('auto_messages')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Error querying auto_messages table:', error);
            return;
        }

        console.log('=== AUTO_MESSAGES TABLE DATA ===');
        console.log('Total records found:', data.length);
        console.log('');

        if (data.length === 0) {
            console.log('No records found in auto_messages table.');
            return;
        }

        // Show table structure first
        if (data.length > 0) {
            console.log('Table columns:');
            Object.keys(data[0]).forEach(column => {
                console.log(`- ${column}`);
            });
            console.log('');
        }

        // Display each record
        data.forEach((record, index) => {
            console.log(`=== Record ${index + 1} ===`);
            console.log('ID:', record.id);
            console.log('Message:', record.message);
            console.log('Scheduled Date:', record.scheduled_date || 'null');
            console.log('Scheduled Time:', record.scheduled_time);
            console.log('Target Group:', record.target_group);
            console.log('Status:', record.status);
            console.log('Created At:', record.created_at);
            console.log('Updated At:', record.updated_at);

            // Show any additional fields
            Object.keys(record).forEach(key => {
                if (!['id', 'message', 'scheduled_date', 'scheduled_time', 'target_group', 'status', 'created_at', 'updated_at'].includes(key)) {
                    console.log(`${key}:`, record[key]);
                }
            });
            console.log('');
        });

        // Summary statistics
        console.log('=== SUMMARY ===');
        console.log('Total records:', data.length);

        // Count by status
        const statusCounts = {};
        data.forEach(record => {
            statusCounts[record.status] = (statusCounts[record.status] || 0) + 1;
        });
        console.log('Status distribution:', statusCounts);

        // Count by target_group
        const groupCounts = {};
        data.forEach(record => {
            groupCounts[record.target_group] = (groupCounts[record.target_group] || 0) + 1;
        });
        console.log('Target group distribution:', groupCounts);

        // Check scheduled_date values
        const scheduledDateValues = [...new Set(data.map(record => record.scheduled_date))];
        console.log('Unique scheduled_date values:', scheduledDateValues);

        // Check scheduled_time values
        const scheduledTimeValues = [...new Set(data.map(record => record.scheduled_time))];
        console.log('Unique scheduled_time values:', scheduledTimeValues);

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

// Run the check
checkAutoMessages();