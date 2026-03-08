import { DatabaseStorage } from './server/storage';

async function testDepositApproval() {
  console.log('🧪 Testing deposit approval flow...\n');
  
  const storage = new DatabaseStorage();
  await storage.init();
  
  const depositRequestId = '16a4e0f4-137a-453b-8038-76dd80bbf72c';
  const agentId = 'd678bd1c-4c92-4ec3-ae20-d342e03334de'; // agent@test.com
  
  console.log('📋 Deposit Request ID:', depositRequestId);
  console.log('👤 Agent ID:', agentId);
  console.log('\n🔍 Checking agent activities BEFORE approval...');
  
  const activitiesBefore = await storage.getAgentActivities(agentId, 1, 100);
  console.log('Activities count:', activitiesBefore.total);
  console.log('Activities:', JSON.stringify(activitiesBefore.activities, null, 2));
  
  console.log('\n✅ Approving deposit request...');
  
  try {
    const result = await storage.atomicApproveDepositRequest(
      depositRequestId,
      agentId,
      'Test approval for bug fix verification'
    );
    
    console.log('\n✅ Approval result:', JSON.stringify(result, null, 2));
    
    console.log('\n🔍 Checking agent activities AFTER approval...');
    const activitiesAfter = await storage.getAgentActivities(agentId, 1, 100);
    console.log('Activities count:', activitiesAfter.total);
    console.log('Activities:', JSON.stringify(activitiesAfter.activities, null, 2));
    
    console.log('\n✅ Test completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testDepositApproval().catch(console.error);
