const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testText = "Hello world, this is a test of the ReelGen API!";

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method: method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 'NETWORK_ERROR',
      error: error.response?.data || error.message
    };
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  const result = await apiCall('GET', '/health');
  
  if (result.success) {
    console.log('✅ Health check passed');
    console.log('Status:', result.data.status);
  } else {
    console.log('❌ Health check failed');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

async function testPipelineStatus() {
  console.log('\n🔍 Testing Pipeline Status...');
  const result = await apiCall('GET', '/api/pipeline/status');
  
  if (result.success) {
    console.log('✅ Pipeline status retrieved');
    console.log('Directories:', Object.keys(result.data.directories));
  } else {
    console.log('❌ Pipeline status failed');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

async function testCompleteNPipeline() {
  console.log('\n🔍 Testing Complete Pipeline...');
  const result = await apiCall('POST', '/api/pipeline/run-all', {
    text: testText
  });
  
  if (result.success) {
    console.log('✅ Complete pipeline executed successfully');
    console.log('Completed steps:', result.data.completedSteps);
    console.log('Final videos:', result.data.finalVideos.length);
  } else {
    console.log('❌ Complete pipeline failed');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

async function testIndividualSteps() {
  console.log('\n🔍 Testing Individual Pipeline Steps...');
  
  // Step 1: Generate
  console.log('Step 1: Generate...');
  let result = await apiCall('POST', '/api/pipeline/generate', {
    text: testText
  });
  
  if (!result.success) {
    console.log('❌ Generate step failed:', result.error);
    return false;
  }
  console.log('✅ Generate step completed');
  
  // Step 2: Subtitles
  console.log('Step 2: Subtitles...');
  result = await apiCall('POST', '/api/pipeline/subtitles', {});
  
  if (!result.success) {
    console.log('❌ Subtitles step failed:', result.error);
    return false;
  }
  console.log('✅ Subtitles step completed');
  
  // Step 3: Burn subtitles
  console.log('Step 3: Burn subtitles...');
  result = await apiCall('POST', '/api/pipeline/burn-subtitles', {});
  
  if (!result.success) {
    console.log('❌ Burn subtitles step failed:', result.error);
    return false;
  }
  console.log('✅ Burn subtitles step completed');
  
  // Step 4: Chunk
  console.log('Step 4: Chunk...');
  result = await apiCall('POST', '/api/pipeline/chunk', {});
  
  if (!result.success) {
    console.log('❌ Chunk step failed:', result.error);
    return false;
  }
  console.log('✅ Chunk step completed');
  
  // Step 5: Overlay
  console.log('Step 5: Overlay...');
  result = await apiCall('POST', '/api/pipeline/overlay', {
    text: testText
  });
  
  if (!result.success) {
    console.log('❌ Overlay step failed:', result.error);
    return false;
  }
  console.log('✅ Overlay step completed');
  
  console.log('✅ All individual steps completed successfully');
  return true;
}

async function testCleanup() {
  console.log('\n🔍 Testing Cleanup...');
  const result = await apiCall('DELETE', '/api/pipeline/cleanup', {
    directories: ['output', 'processed_videos']
  });
  
  if (result.success) {
    console.log('✅ Cleanup completed');
    console.log('Results:', result.data.results.length, 'directories cleaned');
  } else {
    console.log('❌ Cleanup failed');
    console.log('Error:', result.error);
  }
  
  return result.success;
}

// Main test runner
async function runTests() {
  console.log('🚀 ReelGen API Test Suite');
  console.log('=========================');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Pipeline Status', fn: testPipelineStatus },
    { name: 'Complete Pipeline', fn: testCompleteNPipeline },
    { name: 'Individual Steps', fn: testIndividualSteps },
    { name: 'Cleanup', fn: testCleanup }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({
        name: test.name,
        success: result
      });
    } catch (error) {
      console.log(`❌ Test "${test.name}" threw an error:`, error.message);
      results.push({
        name: test.name,
        success: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('======================');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the API server and dependencies.');
  }
}

// Command line options
const args = process.argv.slice(2);
const testName = args[0];

if (testName) {
  // Run specific test
  const testMap = {
    'health': testHealthCheck,
    'status': testPipelineStatus,
    'complete': testCompleteNPipeline,
    'steps': testIndividualSteps,
    'cleanup': testCleanup
  };
  
  if (testMap[testName]) {
    console.log(`🔍 Running ${testName} test...`);
    testMap[testName]().then(() => {
      console.log('✅ Test completed');
    }).catch(error => {
      console.log('❌ Test failed:', error.message);
    });
  } else {
    console.log('❌ Unknown test name. Available tests:');
    console.log('  health, status, complete, steps, cleanup');
  }
} else {
  // Run all tests
  runTests().then(() => {
    console.log('\n🏁 Test suite completed');
  }).catch(error => {
    console.log('❌ Test suite failed:', error.message);
  });
} 